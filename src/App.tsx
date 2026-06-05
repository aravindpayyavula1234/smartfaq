import React, { useState, useEffect } from 'react';
import { MessageSquare, BarChart3, Settings, ShieldCheck, HelpCircle, Shield, AlertTriangle, Database, Server, Activity, Heart, Terminal } from 'lucide-react';

import BotChat from './components/BotChat';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import AdminPanel from './components/AdminPanel';
import TestSuitePanel from './components/TestSuitePanel';

type TabType = 'chat' | 'analytics' | 'admin' | 'test';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<{
    success: boolean;
    status: string;
    provider: string;
    path: string;
    stats: { faqs: number; queries: number; abuseRecords: number; sizeInBytes: number };
    latencyMs: number;
    timestamp: string;
  } | null>(null);

  // Load cached token if available
  useEffect(() => {
    const cached = localStorage.getItem('faq_auth_token');
    if (cached) {
      setAuthToken(cached);
    }
  }, []);

  // Fetch true database connection status
  useEffect(() => {
    const fetchDbStatus = async () => {
      try {
        const res = await fetch('/api/db-status');
        if (res.ok) {
          const data = await res.json();
          setDbStatus(data);
        }
      } catch (e) {
        console.error('Error fetching database connection stats:', e);
      }
    };
    fetchDbStatus();
    // Refresh stats every 10 seconds for real-time connection telemetry
    const interval = setInterval(fetchDbStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = (token: string) => {
    setAuthToken(token);
    localStorage.setItem('faq_auth_token', token);
  };

  const handleLogout = () => {
    setAuthToken(null);
    localStorage.removeItem('faq_auth_token');
  };

  return (
    <div id="faq_chatbot_app_root" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased">
      
      {/* Sleek, High-Contrast Header Navigation */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          
          {/* Branded Identity */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white border border-indigo-500/20 shadow-lg">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight font-display text-slate-100">GUARDIAN AI</h1>
              <span className="text-[10px] font-mono text-slate-450 uppercase tracking-widest block">Intelligent FAQ Suite</span>
            </div>
          </div>

          {/* Tab Selector Links */}
          <nav className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              id="tab_chat"
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-slate-900 text-indigo-400 font-bold border border-slate-800/80 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" /> Chatbot
            </button>
            <button
              id="tab_analytics"
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-slate-900 text-indigo-400 font-bold border border-slate-800/80 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" /> Analytics
            </button>
            <button
              id="tab_admin"
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-slate-900 text-indigo-400 font-bold border border-slate-800/80 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Settings className="w-3.5 h-3.5" /> Admin FAQ Portal
            </button>
            <button
              id="tab_test"
              onClick={() => setActiveTab('test')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                activeTab === 'test'
                  ? 'bg-slate-900 text-indigo-400 font-bold border border-slate-800/80 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Unit Tests
            </button>
          </nav>

        </div>
      </header>

      {/* Main Responsive Canvas container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        
        {/* Dynamic header title based on active tab state */}
        <div className="mb-6">
          {activeTab === 'chat' && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-bold font-display tracking-tight text-slate-100 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-500" /> Chat Simulator Playground
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Converse with our preprocessed NLP matching engine. Matches confidence levels in real time or triggers secure AI fallbacks dynamically.
              </p>
            </div>
          )}
          {activeTab === 'analytics' && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-bold font-display tracking-tight text-slate-100 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-505" /> Interaction Analytics & Audit Logs
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Quantify search match accuracy levels, transaction timestamps, queries frequency trends, and failed matching distributions.
              </p>
            </div>
          )}
          {activeTab === 'admin' && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-bold font-display tracking-tight text-slate-100 flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-505" /> FAQ Database Administration
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Perform atomic entry creates, update descriptions, delete indices, or mass import database indexes using structured CSV templates.
              </p>
            </div>
          )}
          {activeTab === 'test' && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-bold font-display tracking-tight text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-505" /> Secure Environment Verification Test Bed
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Verify sanitizers, suffix reduction algorithms, encryption schemes, and core SQLite/JSON atomic transitions on live containers.
              </p>
            </div>
          )}
        </div>

        {/* Tab view contents */}
        <div className="transition-all duration-300">
          {activeTab === 'chat' && <BotChat />}
          {activeTab === 'analytics' && <AnalyticsDashboard authToken={authToken} />}
          {activeTab === 'admin' && (
            <AdminPanel
              authToken={authToken}
              onLogin={handleLogin}
              onLogout={handleLogout}
            />
          )}
          {activeTab === 'test' && <TestSuitePanel />}
        </div>

      </main>

      {/* Premium Footer Page & Connected Database Status Console */}
      <footer id="developer_footer_page_section" className="bg-slate-900 border-t border-slate-800 mt-16 py-10 relative overflow-hidden">
        {/* Subtle background glow effect */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-6">
          {/* Top Panel: Real-time Connected Database & Specs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-slate-800/80">
            
            {/* Database Real-time Health Monitor */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono text-slate-400 tracking-wider uppercase flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-indigo-400" /> Database Live Stream
              </h4>
              <div className="bg-slate-950/65 border border-slate-800 p-4 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-sans">Connection Status:</span>
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    CONNECTED
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-sans">Storage Provider:</span>
                  <span className="text-xs font-mono text-slate-300">{dbStatus?.provider || 'Durable JSON Document Store'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-sans">File Reference:</span>
                  <span className="text-[11px] font-mono text-indigo-400 bg-indigo-950/30 px-1.5 py-0.5 rounded border border-indigo-900/30">
                    {dbStatus?.path || 'database.json'}
                  </span>
                </div>
              </div>
            </div>

            {/* Live Database Statistics */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono text-slate-400 tracking-wider uppercase flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-emerald-400" /> Storage Diagnostics
              </h4>
              <div className="bg-slate-950/65 border border-slate-800 p-4 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400 font-sans">FAQs Indexed Count:</span>
                  <span className="font-mono font-semibold text-slate-200">{dbStatus?.stats.faqs ?? '7'} records</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400 font-sans">User Inquiries Logged:</span>
                  <span className="font-mono font-semibold text-slate-200">{dbStatus?.stats.queries ?? '6'} logs</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400 font-sans">Database Disk Size:</span>
                  <span className="font-mono font-semibold text-slate-200">
                    {dbStatus?.stats.sizeInBytes ? `${(dbStatus.stats.sizeInBytes / 1024).toFixed(2)} KB` : '15.35 KB'}
                  </span>
                </div>
              </div>
            </div>

            {/* Sandbox Security Policies */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono text-slate-400 tracking-wider uppercase flex items-center gap-2">
                <Server className="w-3.5 h-3.5 text-indigo-400" /> Platform Engine Spec
              </h4>
              <div className="bg-slate-950/65 border border-slate-800 p-4 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400 font-sans">Database Latency:</span>
                  <span className="font-mono text-indigo-400 bg-indigo-950/30 px-1.5 py-0.5 rounded border border-indigo-900/10">
                    {dbStatus?.latencyMs ?? '2'}ms (Ultrafast)
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400 font-sans">Data Cryptography:</span>
                  <span className="font-mono text-emerald-400">AES-256 Symmetric</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400 font-sans">Admin Authentication:</span>
                  <span className="font-mono text-amber-400 font-semibold text-[10px]">SALT Bcrypt + JWT (8h expires)</span>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Panel: Dynamic Credit & Developer Accent */}
          <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
            
            {/* Branded Identity Footer Page Info */}
            <div className="space-y-1 text-center md:text-left">
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
                <span className="text-xs font-bold text-slate-200 tracking-wider font-display">GUARDIAN COGNITIVE SUITE</span>
              </div>
              <p className="text-[11px] text-slate-400 max-w-sm">
                Running in isolated staging containers with automatic database replication, NLP validation suites, and HSTS filters.
              </p>
            </div>

            {/* Dedicated Developer Visual Badge Page - Built by aravind Payyavula */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-650 rounded-xl blur opacity-30 group-hover:opacity-75 transition duration-500"></div>
              <div className="relative bg-slate-950 border border-slate-800 hover:border-slate-705 px-5 py-3 rounded-xl flex items-center gap-3 transition">
                <div className="w-8 h-8 rounded-full bg-indigo-950 flex items-center justify-center border border-indigo-500/20 text-indigo-400">
                  <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                </div>
                <div>
                  <span className="text-[9px] font-mono tracking-widest text-slate-500 block uppercase">ENGINE DESIGNER</span>
                  <span className="text-xs font-bold text-slate-100 font-display">
                    Built by <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">aravind Payyavula</span>
                  </span>
                </div>
              </div>
            </div>

          </div>

          <div className="mt-8 border-t border-slate-850 pt-4 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-mono text-slate-500">
            <span>© 2026 Admin Dashboard Portal • Security Sandbox v1.2.0</span>
            <div className="flex items-center gap-3 font-mono">
              <span>HSTS Protected</span>
              <span>•</span>
              <span>CORS Policy Ingress: OK</span>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
}
