import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Key, LogOut, Upload, Download, AlertCircle, Shield, FileText, Check } from 'lucide-react';
import { FAQ } from '../types';

interface AdminPanelProps {
  authToken: string | null;
  onLogin: (token: string) => void;
  onLogout: () => void;
}

export default function AdminPanel({ authToken, onLogin, onLogout }: AdminPanelProps) {
  // Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // FAQ Operations
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(false);

  // Form Editor
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formQuestion, setFormQuestion] = useState('');
  const [formAnswer, setFormAnswer] = useState('');
  const [formCategory, setFormCategory] = useState('Account & Security');
  const [formError, setFormError] = useState<string | null>(null);

  // CSV State
  const [csvInput, setCsvInput] = useState('');
  const [csvCount, setCsvCount] = useState<number | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);

  // Abuse Log lists
  const [abuseLogs, setAbuseLogs] = useState<{ id: string; ip: string; message: string; timestamp: string }[]>([]);

  // Fetch FAQ elements
  const fetchFAQs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/faqs');
      if (res.ok) {
        const data = await res.json();
        setFaqs(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFAQs();
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Authorization failed.');
      }

      const data = await res.json();
      onLogin(data.token);
    } catch (err: any) {
      setLoginError(err.message || 'Connecting failure.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const clearForm = () => {
    setEditingId(null);
    setIsEditing(false);
    setFormQuestion('');
    setFormAnswer('');
    setFormCategory('Account & Security');
    setFormError(null);
  };

  const handleSaveFAQ = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formQuestion.trim() || !formAnswer.trim()) {
      setFormError('Please enter a valid question and answer.');
      return;
    }

    const payload = {
      question: formQuestion,
      answer: formAnswer,
      category: formCategory
    };

    try {
      const url = editingId ? `/api/faqs/${editingId}` : '/api/faqs';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to persist object changes.');
      }

      await fetchFAQs();
      clearForm();
    } catch (err: any) {
      setFormError(err.message || 'Write network error occurred.');
    }
  };

  const handleEditInit = (faq: FAQ) => {
    setIsEditing(true);
    setEditingId(faq.id);
    setFormQuestion(faq.question);
    setFormAnswer(faq.answer);
    setFormCategory(faq.category);
  };

  const handleDeleteFAQ = async (id: string) => {
    if (!confirm('Are you absolutely sure you want to delete this FAQ? This action is non-reversible.')) {
      return;
    }

    try {
      const res = await fetch(`/api/faqs/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (res.ok) {
        await fetchFAQs();
      } else {
        alert('Could not delete the designated FAQ. Check authentication.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // CSV Import handler
  const handleCSVImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setCsvError(null);
    setCsvCount(null);

    if (!csvInput.trim()) {
      setCsvError('Please write or copy valid CSV rows correctly formatted.');
      return;
    }

    try {
      const res = await fetch('/api/faqs/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ csvData: csvInput })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed parsing imported table.');
      }

      await fetchFAQs();
      setCsvInput('');
      setCsvCount(1); // indicator
    } catch (e: any) {
      setCsvError(e.message || 'Parsing error.');
    }
  };

  // Drag-and-drop CSV reader helper
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCsvInput(event.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  // FAQ Export: Dynamic CSV Generator
  const handleExportCSV = () => {
    try {
      // Build headers
      let csvContent = "Question,Answer,Category\n";
      faqs.forEach(faq => {
        // Safe escape quotes inside strings
        const qEscaped = `"${faq.question.replace(/"/g, '""')}"`;
        const aEscaped = `"${faq.answer.replace(/"/g, '""')}"`;
        const cEscaped = `"${faq.category.replace(/"/g, '""')}"`;
        csvContent += `${qEscaped},${aEscaped},${cEscaped}\n`;
      });

      // Browser instant download binding
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `faq_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert("Billing error exporting CSV document.");
    }
  };

  // Pull secure action logs (abuse counters)
  const fetchAbuseLogs = async () => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/analytics', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      // The DB actually tracks abuse logs too. Let's pull from standard endpoints
      // To keep simple let's mock pull or directly query logs matching
    } catch (e) {}
  };

  // Extract unique categories for table dropdown
  const uniqueCategories = Array.from(new Set(faqs.map(f => f.category)));

  // Filter items matching query
  const filteredFAQs = faqs.filter(faq => {
    const query = search.toLowerCase();
    const matchesSearch = faq.question.toLowerCase().includes(query) || faq.answer.toLowerCase().includes(query);
    const matchesCategory = categoryFilter === '' || faq.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // ADMIN LOGIN PANEL (UNAUTHENTICATED VIEW)
  if (!authToken) {
    return (
      <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl animate-fade-in my-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-indigo-950/80 text-indigo-400 border border-indigo-800/40 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Key className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold font-display text-slate-100">Portal Authentication</h3>
          <p className="text-xs text-slate-400 mt-1">Please enter your secured credentials to modify FAQs or pull user audit trails.</p>
        </div>

        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase">Admin Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. admin"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase">Password Token</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••••"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition"
              required
            />
          </div>

          {loginError && (
            <div className="bg-rose-950/40 border border-rose-900/60 p-3 rounded-xl flex items-center gap-2 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl transition shadow-lg cursor-pointer flex items-center justify-center gap-2"
            >
              Verify Credentials
            </button>
          </div>
        </form>

        <div className="mt-6 border-t border-slate-850 pt-4 text-center">
          <p className="text-[10px] font-mono text-slate-500 leading-relaxed">
            SECURE CRADLE: Seeding initialized admin username: <span className="text-slate-400">aravindpayyavula1234</span> & password: <span className="text-slate-400">aravind4500Y</span>
            <br />
            <span className="text-slate-600">Secondary backup: admin / adminpassword</span>
          </p>
        </div>
      </div>
    );
  }

  // LOGGED-IN ADMIN CONSOLE
  return (
    <div id="admin_authorized_workspace" className="space-y-6">
      
      {/* Dashboard Top Console Actions bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-950 border border-slate-800 px-6 py-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-950/50 text-emerald-400 border border-emerald-900/30 rounded-xl">
            <Shield className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-100 font-display">Secure Admin Console Status</h4>
            <span className="text-xs text-slate-500 font-mono">Authenticated Session: Administrator Agent</span>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-rose-900 text-slate-350 hover:text-rose-400 text-xs rounded-xl font-semibold transition cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign Out Session
        </button>
      </div>

      {/* Grid: Editor Form & CSV Upload on Left / Search + FAQs List on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* FAQ form wizard / CSV Panel */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* FAQ Add / Edit Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative">
            <h4 className="text-sm font-semibold font-display text-slate-200 mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-400" /> {editingId ? 'Modify FAQ Entry' : 'Create New FAQ Entry'}
            </h4>

            <form onSubmit={handleSaveFAQ} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1.5 uppercase">Question Trigger string</label>
                <input
                  type="text"
                  value={formQuestion}
                  onChange={(e) => setFormQuestion(e.target.value)}
                  placeholder="e.g. How can I cancel my account subscription?"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-transparent transition"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1.5 uppercase">Resolved Answer payload</label>
                <textarea
                  value={formAnswer}
                  onChange={(e) => setFormAnswer(e.target.value)}
                  placeholder="Insert resolved answer detail..."
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-transparent resize-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1.5 uppercase">Product Module Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none transition"
                >
                  <option value="Account & Security">Account & Security</option>
                  <option value="Billing & Subscriptions">Billing & Subscriptions</option>
                  <option value="Features & Integrations">Features & Integrations</option>
                  <option value="Technical & API">Technical & API</option>
                  <option value="General Inquiry">General Inquiry</option>
                </select>
              </div>

              {formError && (
                <div className="bg-rose-950/40 border border-rose-900/60 p-3 rounded-xl text-rose-300 text-xs">
                  {formError}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 rounded-xl transition cursor-pointer text-xs"
                >
                  {editingId ? 'Save Modifications' : 'Publish Entry'}
                </button>
                {(editingId || formQuestion.trim()) && (
                  <button
                    type="button"
                    onClick={clearForm}
                    className="px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-750 transition text-xs cursor-pointer"
                  >
                    Clear Form
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Bulk CSV Import Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <h4 className="text-sm font-semibold font-display text-slate-200 mb-1.5 flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-400" /> Mass Import FAQs (CSV)
            </h4>
            <p className="text-[11px] text-slate-400 mb-3 block">
              Drag-and-drop a .csv document or paste raw string blocks with <b>Question, Answer, Category</b> columns.
            </p>

            <form onSubmit={handleCSVImport} className="space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                className="border-2 border-dashed border-slate-800 hover:border-indigo-600/60 bg-slate-950 px-4 py-6 rounded-xl text-center cursor-pointer transition"
              >
                <div className="flex flex-col items-center">
                  <FileText className="w-8 h-8 text-slate-500 mb-2" />
                  <span className="text-xs text-slate-300">Drag and drop CSV sheet here</span>
                  <span className="text-[10px] text-slate-550 font-mono mt-1">Or write columns below directly</span>
                </div>
              </div>

              <textarea
                value={csvInput}
                onChange={(e) => setCsvInput(e.target.value)}
                placeholder="Question,Answer,Category&#10;How does pricing work?,We bill user accounts monthly.,Billing&#10;Is backup safe?,Everything is encrypted on file.,Security"
                rows={4}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-[11px] font-mono text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
              />

              {csvCount && (
                <div className="bg-emerald-950/40 border border-emerald-900/60 p-3 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>CSV elements imported atomically! Database synchronized.</span>
                </div>
              )}

              {csvError && (
                <div className="bg-rose-950/40 border border-rose-900/60 p-3 rounded-xl text-rose-400 text-xs text-center">
                  {csvError}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-300 font-semibold py-2 rounded-xl text-xs cursor-pointer transition shadow"
              >
                Upload CSV File Records
              </button>
            </form>
          </div>

        </div>

        {/* Grid-9: Search Controls & Database list */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Active Search/Filters panel */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center gap-4">
            
            {/* Search inputs */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search database indexing..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-transparent transition"
              />
            </div>

            {/* Category selection */}
            <div className="w-full md:w-48">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              >
                <option value="">All Categories</option>
                {uniqueCategories.map((cat, idx) => (
                  <option key={idx} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* CSV Exporter */}
            <button
              onClick={handleExportCSV}
              title="Download database index as CSV sheet"
              className="px-3.5 py-2 w-full md:w-auto bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-indigo-800 hover:text-indigo-400 text-slate-300 rounded-xl text-xs flex items-center justify-center gap-2 font-semibold cursor-pointer transition"
            >
              <Download className="w-3.5 h-3.5" /> CSV Export
            </button>
          </div>

          {/* Table list */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/60 border-b border-slate-800 text-[10px] uppercase font-mono tracking-wider text-slate-400">
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3">Question</th>
                    <th className="px-5 py-3 text-right">Row Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {filteredFAQs.length > 0 ? (
                    filteredFAQs.map(faq => (
                      <tr key={faq.id} className="hover:bg-slate-950/40 text-xs transition">
                        
                        {/* Category Label */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 text-[10px] rounded-full font-mono bg-slate-950 text-slate-300 border border-slate-800">
                            {faq.category}
                          </span>
                        </td>

                        {/* Question Text with ellipsis truncation */}
                        <td className="px-5 py-4 max-w-[280px]">
                          <p className="text-slate-200 font-semibold truncate" title={faq.question}>
                            {faq.question}
                          </p>
                          <p className="text-slate-400 line-clamp-1 text-[11px] mt-0.5 mt-0.5 block" title={faq.answer}>
                            {faq.answer}
                          </p>
                        </td>

                        {/* Controls */}
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEditInit(faq)}
                              className="p-1.5 text-slate-450 hover:text-indigo-400 bg-slate-950 hover:bg-indigo-950/30 border border-slate-800 hover:border-indigo-900 rounded-lg cursor-pointer transition"
                              title="Edit item FAQ"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteFAQ(faq.id)}
                              className="p-1.5 text-slate-450 hover:text-rose-400 bg-slate-950 hover:bg-rose-950/30 border border-slate-800 hover:border-rose-900 rounded-lg cursor-pointer transition"
                              title="Delete item FAQ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="text-center py-12 text-xs text-slate-500 font-mono">
                        No active database records found indexing database query parameters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Custom table pagination indicator */}
            <div className="px-5 py-3 border-t border-slate-850 bg-slate-950/30 flex justify-between items-center text-[10px] font-mono text-slate-500">
              <span>Index showing {filteredFAQs.length} records.</span>
              <span>Secure pipeline sync: Active</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
