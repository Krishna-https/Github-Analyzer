import React from 'react';
import { PerformanceAnalysis } from '../../types';
import { Zap, HardDrive, AlertTriangle, Download, TrendingUp } from 'lucide-react';

interface PerformanceModuleProps {
  performance: PerformanceAnalysis;
}

export const PerformanceModule: React.FC<PerformanceModuleProps> = ({ performance }) => {
  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400">Clone Size</div>
          <div className="text-xl font-extrabold text-indigo-400 font-mono">{performance.cloneSizeMb} MB</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400">Download ZIP Size</div>
          <div className="text-xl font-extrabold text-sky-400 font-mono">{performance.downloadSizeMb} MB</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400">Large Files Alert</div>
          <div className="text-xl font-extrabold text-emerald-400 font-mono">{performance.largeFilesList.length} items</div>
        </div>
      </div>

      {/* Bottlenecks Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-md">
        <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <span>Performance Bottlenecks & Optimization Tips</span>
        </h3>

        {performance.bottlenecks.length === 0 ? (
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300">
            No major git bloat or clone performance bottlenecks detected! Repository clone speed is optimal.
          </div>
        ) : (
          <div className="space-y-2">
            {performance.bottlenecks.map((b, i) => (
              <div key={i} className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs rounded-xl">
                ⚠️ {b}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
