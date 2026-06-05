import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Volume2, VolumeX, Mic, MicOff, ThumbsUp, ThumbsDown, Trash2, History, Clock, X, MessageSquare } from 'lucide-react';
import { ChatMessage, FAQ } from '../types';

export default function BotChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      text: "Hello! I'm your Security-first Intelligent FAQ assistant. Ask me anything about accounts, billing, security, or platform integrations!",
      sender: 'bot',
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [recentQueries, setRecentQueries] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load cached recent queries on mount
  useEffect(() => {
    const cached = localStorage.getItem('faq_recent_queries');
    if (cached) {
      try {
        setRecentQueries(JSON.parse(cached));
      } catch (e) {
        console.error('Error loading recent queries:', e);
      }
    }
  }, []);

  const clearRecentQueries = () => {
    setRecentQueries([]);
    localStorage.removeItem('faq_recent_queries');
  };

  const deleteIndividualRecentQuery = (e: React.MouseEvent, qToRemove: string) => {
    e.stopPropagation(); // Prevent executing query on delete click
    setRecentQueries(prev => {
      const updated = prev.filter(q => q !== qToRemove);
      localStorage.setItem('faq_recent_queries', JSON.stringify(updated));
      return updated;
    });
  };

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Autocomplete suggestions as client types
  useEffect(() => {
    if (inputText.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggestions?q=${encodeURIComponent(inputText)}`);
        if (res.ok) {
          const list = await res.json();
          setSuggestions(list);
        }
      } catch (err) {
        console.error(err);
      }
    }, 150);

    return () => clearTimeout(delayDebounce);
  }, [inputText]);

  // Web Speech Synthesis (TTS) Helper
  const speakText = (text: string) => {
    if (!ttsEnabled) return;
    try {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/&#39;/g, "'").replace(/&quot;/g, '"');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('TTS not supported or failed', e);
    }
  };

  // Web Speech Recognition (STT) Initialization
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event: any) => {
        const resultText = event.results[0][0].transcript;
        setInputText(resultText);
        setIsListening(false);
      };

      rec.onerror = () => {
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      setRecognition(rec);
    }
  }, []);

  const toggleListening = () => {
    if (!recognition) {
      alert('Speech-to-text recognition is not supported in the active web browser context.');
      return;
    }
    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  const handleSend = async (textToSend: string) => {
    const query = textToSend.trim();
    if (!query) return;

    // Save query to local storage 'recent queries' cache
    setRecentQueries(prev => {
      const filtered = prev.filter(q => q.toLowerCase() !== query.toLowerCase());
      const updated = [query, ...filtered].slice(0, 8); // Hold up to last 8 items
      localStorage.setItem('faq_recent_queries', JSON.stringify(updated));
      return updated;
    });

    // Flush fields and suggestions immediately
    setInputText('');
    setSuggestions([]);

    const userMessage: ChatMessage = {
      id: `m_${Date.now()}_u`,
      text: query,
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Server returned warning state.');
      }

      const scoreResult = await response.json();
      
      const botMessage: ChatMessage = {
        id: `m_${Date.now()}_b`,
        text: scoreResult.answer,
        sender: 'bot',
        confidence: scoreResult.confidence,
        matchedFAQId: scoreResult.matchedFAQId,
        isFallback: scoreResult.isFallback,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, botMessage]);
      speakText(scoreResult.answer);

    } catch (err: any) {
      const systemErrorMessage: ChatMessage = {
        id: `m_${Date.now()}_err`,
        text: err.message || 'A network error occurred. Please test connection parameters.',
        sender: 'system',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, systemErrorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleFeedback = async (messageId: string, logId: string | undefined, option: 'up' | 'down') => {
    if (!logId) return;

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId, rating: option })
      });

      if (res.ok) {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === messageId ? { ...msg, feedback: option } : msg
          )
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome',
        text: "Chat transcript cleared. Let's start fresh! Go ahead and ask an FAQ question.",
        sender: 'bot',
        timestamp: new Date().toISOString()
      }
    ]);
  };

  return (
    <div id="bot_chat_workspace" className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
      
      {/* LEFT COLUMN: Recent Queries List panel */}
      <div id="recent_queries_section" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col h-auto lg:h-[580px]">
        <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-4">
          <h4 className="text-[11px] font-mono font-bold tracking-wider text-slate-400 uppercase flex items-center gap-2">
            <History className="w-3.5 h-3.5 text-indigo-400" /> Recent Queries
          </h4>
          {recentQueries.length > 0 && (
            <button
              onClick={clearRecentQueries}
              className="text-[10px] text-slate-500 hover:text-rose-400 font-mono transition cursor-pointer hover:underline"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Scrollable cache view list */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar text-xs max-h-48 lg:max-h-full">
          {recentQueries.length > 0 ? (
            recentQueries.map((query, idx) => (
              <div 
                key={idx}
                className="group flex items-center justify-between gap-2 p-2.5 bg-slate-950/60 hover:bg-indigo-950/20 border border-slate-800/85 hover:border-indigo-900/50 rounded-xl transition cursor-pointer"
                onClick={() => handleSend(query)}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Clock className="w-3 h-3 text-slate-500 shrink-0 group-hover:text-indigo-400 transition" />
                  <p className="text-slate-300 font-medium truncate group-hover:text-slate-150 transition text-[11px] select-none" title={query}>
                    {query}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => deleteIndividualRecentQuery(e, query)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-rose-450 text-slate-600 hover:text-rose-400 transition cursor-pointer"
                  title="Remove cached item"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-10 lg:py-0 text-center text-slate-500 space-y-3">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/40">
                <MessageSquare className="w-6 h-6 text-slate-600 animate-pulse" />
              </div>
              <div>
                <p className="text-[11px] font-mono leading-relaxed max-w-[170px] mx-auto text-slate-500">
                  No query history captured. Ask queries to fill session cache!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic guide badge */}
        <div className="mt-4 pt-3.5 border-t border-slate-800/80 hidden lg:block text-[10px] text-slate-550 font-mono leading-relaxed">
          <span className="text-indigo-400 font-semibold uppercase block mb-0.5">🚀 Core Match Engine</span>
          Click any historical inquiry to run quick similarity matching on target knowledge bases.
        </div>
      </div>

      {/* RIGHT COLUMN: Chat viewport */}
      <div id="bot_chat_viewport" className="lg:col-span-3 flex flex-col h-[580px] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
        
        {/* Header Bar */}
        <div id="chat_header" className="flex justify-between items-center px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold">
                AI
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950"></span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100 font-display">FAQ Virtual Assistant</h3>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-400" /> NLP Semantic Engine
              </span>
            </div>
          </div>

          {/* Audio controls + clear */}
          <div className="flex items-center gap-2">
            {/* Audio TTS toggle */}
            <button
              id="tts_toggle"
              onClick={() => {
                if (!ttsEnabled) {
                  setTtsEnabled(true);
                  speakText("Voice response enabled!");
                } else {
                  window.speechSynthesis.cancel();
                  setTtsEnabled(false);
                }
              }}
              title={ttsEnabled ? "Disable Voice Responses" : "Enable Voice Responses"}
              className={`p-2 rounded-lg transition ${
                ttsEnabled ? 'bg-indigo-950/80 text-indigo-400 border border-indigo-800/60' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            
            {/* Flush Chat History */}
            <button
              id="clear_chat"
              onClick={clearChat}
              title="Clear Chat Log"
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition animate-pulse"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages Scroll viewport */}
        <div id="messages_scroll" className="flex-1 overflow-y-auto px-6 py-4 space-y-4 scrollbar">
          {messages.map(msg => {
            const isUser = msg.sender === 'user';
            const isSystem = msg.sender === 'system';

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <div className="bg-rose-950/40 border border-rose-900/60 text-rose-300 px-4 py-2 rounded-xl text-xs font-mono max-w-[85%] text-center">
                    ⚠️ SYSTEM SAFETY WATCH: {msg.text}
                  </div>
                </div>
              );
            }

            return (
              <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} group animate-fade-in`}>
                <div className="max-w-[75%]">
                  
                  {/* Bubble Frame */}
                  <div className={`px-4 py-3 rounded-2xl relative ${
                    isUser 
                      ? 'bg-gradient-to-tr from-indigo-700 to-indigo-600 text-slate-50 rounded-br-none shadow-md' 
                      : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700/60'
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap selection:bg-indigo-300 selection:text-slate-900">
                      {msg.text}
                    </p>
                    
                    {/* Confidence metrics indicator */}
                    {!isUser && msg.confidence !== undefined && (
                      <div className="mt-2 pt-1.5 border-t border-slate-700/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span className="flex items-center gap-1">
                          Match Confidence:{' '}
                          <span className={`font-semibold ${
                            msg.isFallback 
                              ? 'text-amber-400' 
                              : msg.confidence >= 0.85 
                                ? 'text-emerald-400' 
                                : 'text-sky-400'
                          }`}>
                            {msg.isFallback ? 'AI Assist' : `${Math.round(msg.confidence * 100)}%`}
                          </span>
                        </span>

                        {/* Matching Method Indicator */}
                        <span className="text-[9px] bg-slate-900/60 border border-slate-700/80 px-1.5 rounded text-indigo-400 font-sans">
                          {msg.isFallback ? 'llm hybrid fallback' : msg.confidence > 0.80 ? 'semantic matching' : 'tf-idf alignment'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Sub-label timestamp & Feedback interactions */}
                  <div className={`mt-1 flex items-center gap-3 px-1 text-[10px] text-slate-500 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    
                    {!isUser && msg.id !== 'welcome' && (
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleFeedback(msg.id, msg.matchedFAQId || 'log_seed_1', 'up')}
                          disabled={!!msg.feedback}
                          className={`hover:text-emerald-400 transition cursor-pointer ${msg.feedback === 'up' ? 'text-emerald-400 scale-110 font-bold' : ''}`}
                          title="Helpful Answer"
                        >
                          <ThumbsUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleFeedback(msg.id, msg.matchedFAQId || 'log_seed_1', 'down')}
                          disabled={!!msg.feedback}
                          className={`hover:text-rose-400 transition cursor-pointer ${msg.feedback === 'down' ? 'text-rose-400 scale-110 font-bold' : ''}`}
                          title="Unhelpful Answer"
                        >
                          <ThumbsDown className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            );
          })}

          {/* Dynamic Typing simulator */}
          {isTyping && (
            <div className="flex justify-start animate-pulse">
              <div className="bg-slate-800 text-slate-400 px-4 py-3 rounded-2xl rounded-bl-none border border-slate-700/60 max-w-[40%] flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                <span className="text-xs font-medium font-sans">Matching embeddings...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggester Autocomplete Overlay */}
        {suggestions.length > 0 && (
          <div id="suggestion_bar" className="absolute bottom-[72px] left-0 right-0 px-6 py-2 bg-slate-950/95 backdrop-blur-sm border-t border-slate-800 flex flex-wrap gap-2 z-10 animate-fade-in">
            <span className="text-[10px] text-indigo-400 font-mono flex items-center mr-1">Dynamic Topics:</span>
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSend(suggestion)}
                className="text-xs bg-slate-900 hover:bg-indigo-950/80 text-slate-300 hover:text-indigo-300 border border-slate-800 hover:border-indigo-800/80 px-2.5 py-1 rounded-full transition cursor-pointer"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Input Form dock */}
        <form
          id="chat_form"
          onSubmit={(e) => { e.preventDefault(); handleSend(inputText); }}
          className="px-6 py-4 bg-slate-950 border-t border-slate-850 flex items-center gap-3 relative"
        >
          {/* Voice dictation button */}
          <button
            type="button"
            onClick={toggleListening}
            className={`p-2 rounded-xl border transition ${
              isListening 
                ? 'bg-rose-950/65 border-rose-700 text-rose-500 animate-pulse' 
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title={isListening ? "Listening... click to stop" : "Use Voice Input Dictation"}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <input
            id="chat_input"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isListening ? "Listening with AI..." : "How do I change my security settings...?"}
            disabled={isTyping}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition"
          />

          <button
            id="chat_submit"
            type="submit"
            disabled={isTyping || !inputText.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 text-white p-2.5 rounded-xl disabled:opacity-50 disabled:hover:bg-indigo-600 transition shadow-lg flex items-center justify-center cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>
    </div>
  );
}
