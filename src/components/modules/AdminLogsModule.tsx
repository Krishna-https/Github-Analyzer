import React from 'react';
import { SlidersHorizontal, Cpu, Database, Activity, Terminal, ShieldCheck, RefreshCw } from 'lucide-react';

export const AdminLogsModule: React.FC = () => {
  const mockSystemLogs = [
    { time: '12:04:15', level: 'INFO', msg: 'Fetched GitHub repository payload for facebook/react' },
    { time: '12:04:16', level: 'INFO', msg: 'Gemini AI analysis pipeline completed in 842ms' },
    { time: '12:04:18', level: 'CACHE', msg: 'Cache store updated for facebook/react (TTL: 3600s)' },
    { time: '12:05:02', level: 'API', msg: 'Rate limit remaining: 58/60 (Reset in 42m)' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400">Server Health Status</div>
          <div className="text-xl font-extrabold text-emerald-400 font-mono">100% ONLINE</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400">API Response Latency</div>
          <div className="text-xl font-extrabold text-indigo-400 font-mono">124 ms</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400">Cache Memory Hit Ratio</div>
          <div className="text-xl font-extrabold text-sky-400 font-mono">94.2%</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400">Gemini AI Model</div>
          <div className="text-xl font-extrabold text-purple-400 font-mono">gemini-2.5-flash</div>
        </div>
      </div>

      {/* Real-time System Console Logs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-md">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-400" />
            <span>Server Diagnostics & Request Stream Logs</span>
          </h3>
          <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Live Tail
          </span>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs space-y-2 text-slate-300 min-h-[220px]">
          {mockSystemLogs.map((log, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <span className="text-slate-500">{log.time}</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                log.level === 'INFO' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-emerald-500/20 text-emerald-300'
              }`}>
                {log.level}
              </span>
              <span className="text-slate-200">{log.msg}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
