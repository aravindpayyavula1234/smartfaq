import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { Database, HelpCircle, CheckCircle, AlertTriangle, RefreshCw, Layers } from 'lucide-react';
import { AnalyticsStats } from '../types';

interface AnalyticsDashboardProps {}

const COLORS = ['#6366f1', '#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];

export default function AnalyticsDashboard({}: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/analytics');
      if (!res.ok) {
        throw new Error('Could not pull latest metrics from the server.');
      }
      const aggregated = await res.json();
      setData(aggregated);
    } catch (err: any) {
      setError(err.message || 'Network error pulling statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-slate-900 border border-slate-800 rounded-2xl">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
        <span className="text-sm text-slate-400 font-mono">Aggregating database logs...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-slate-900 border border-rose-950 rounded-2xl p-6 text-center text-rose-300">
        <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-rose-500" />
        <h4 className="font-semibold text-sm">Failed to Bind Analytics Pipeline</h4>
        <p className="text-xs mt-1 text-slate-400">{error || 'An unexpected failure arose. Try logging in again.'}</p>
        <button
          onClick={fetchAnalytics}
          className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs text-indigo-400 font-semibold cursor-pointer transition"
        >
          Retry Link Connection
        </button>
      </div>
    );
  }

  return (
    <div id="analytics_dashboard_workspace" className="space-y-6">
      
      {/* Metrics Row Counters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Total FAQs */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 hover:border-indigo-800 transition">
          <div className="p-3.5 bg-indigo-950/60 rounded-xl border border-indigo-700/20 text-indigo-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-mono text-slate-400 block tracking-wider uppercase">Seeded FAQs</span>
            <h4 className="text-2xl font-bold font-display text-slate-100">{data.totalFAQs}</h4>
          </div>
        </div>

        {/* Total Queries */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 hover:border-emerald-800 transition">
          <div className="p-3.5 bg-emerald-950/60 rounded-xl border border-emerald-700/20 text-emerald-400">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-mono text-slate-400 block tracking-wider uppercase">Transactions logged</span>
            <h4 className="text-2xl font-bold font-display text-slate-100">{data.totalQueries}</h4>
          </div>
        </div>

        {/* Average Match Confidence */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 hover:border-sky-800 transition">
          <div className="p-3.5 bg-sky-950/60 rounded-xl border border-sky-700/20 text-sky-400">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-mono text-slate-400 block tracking-wider uppercase">Avg AI Confidence</span>
            <h4 className="text-2xl font-bold font-display text-slate-100">{(data.averageConfidence * 100).toFixed(1)}%</h4>
          </div>
        </div>

        {/* Failed Queries / Fallbacks info */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 hover:border-amber-800 transition">
          <div className="p-3.5 bg-amber-950/60 rounded-xl border border-amber-700/20 text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-mono text-slate-400 block tracking-wider uppercase">LLM Fallbacks</span>
            <h4 className="text-2xl font-bold font-display text-slate-100">{data.failedQueriesCount}</h4>
          </div>
        </div>

      </div>

      {/* Charts Grid Block */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Line Chart: Queries over time */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-semibold text-slate-250 font-display">User Queries Timeline</h4>
            <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/40 border border-indigo-850 px-2 py-0.5 rounded">Real-time counts</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.queriesOverTime} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }} />
                <Line type="monotone" dataKey="count" name="Queries" stroke="#6366f1" strokeWidth={2.5} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart: Confidence Brackets */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <h4 className="text-sm font-semibold text-slate-250 font-display mb-4">NLP Match Quality Distribution</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.confidenceBracket} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="bracket" stroke="#94a3b8" fontSize={9} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }} />
                <Bar dataKey="count" name="Frequency" fill="#3b82f6" radius={[6, 6, 0, 0]}>
                  {data.confidenceBracket.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#f59e0b' : index === 3 ? '#10b981' : '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart: FAQ Categories Proportion */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row items-center gap-5">
          <div className="flex-1 w-full">
            <h4 className="text-sm font-semibold text-slate-250 font-display mb-2">Internal FAQ Knowledge Shares</h4>
            <span className="text-[10px] text-slate-400 block mb-4">Percent share of questions by module topics.</span>
            
            {/* Custom Pie Legend */}
            <div className="space-y-1.5">
              {data.categoryStats.map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                    {cat.name}
                  </span>
                  <span className="font-semibold text-slate-400">{cat.value} ({Math.round((cat.value / data.totalFAQs) * 100)}%)</span>
                </div>
              ))}
            </div>
          </div>

          <div className="w-48 h-48 flex justify-center">
            {data.categoryStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.categoryStats}
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {data.categoryStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center text-xs text-slate-500 font-mono">No category data.</div>
            )}
          </div>
        </div>

        {/* Most Asked FAQs table */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <h4 className="text-sm font-semibold text-slate-255 font-display mb-4">Top Ranked Queries & Matches</h4>
          <div className="space-y-3.5">
            {data.mostAskedFAQ.length > 0 ? (
              data.mostAskedFAQ.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                  <div className="truncate max-w-[85%] pr-3">
                    <span className="text-[10px] font-mono text-indigo-400 block mb-0.5">Top #{idx + 1} Question Match</span>
                    <p className="text-xs text-slate-200 font-semibold truncate select-none">{item.question}</p>
                  </div>
                  <span className="text-xs font-mono font-bold bg-slate-900 border border-slate-800 text-emerald-400 px-3 py-1 rounded-lg">
                    {item.count} hits
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-xs text-slate-500 font-mono">
                No matched queries recorded on file yet.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
