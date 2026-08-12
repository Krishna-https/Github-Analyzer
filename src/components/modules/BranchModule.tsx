import React from 'react';
import { BranchInfo } from '../../types';
import { GitBranch, ShieldCheck, Clock, User, ArrowUp, ArrowDown, CheckCircle2 } from 'lucide-react';

interface BranchModuleProps {
  branches: BranchInfo[];
}

export const BranchModule: React.FC<BranchModuleProps> = ({ branches }) => {
  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Branch Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400">Total Branches</div>
          <div className="text-xl font-extrabold text-indigo-400 font-mono">{branches.length}</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400">Protected Branches</div>
          <div className="text-xl font-extrabold text-emerald-400 font-mono">{branches.filter(b => b.isProtected).length}</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400">Active Branches</div>
          <div className="text-xl font-extrabold text-sky-400 font-mono">{branches.filter(b => !b.isStale).length}</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400">Stale Branches</div>
          <div className="text-xl font-extrabold text-amber-400 font-mono">{branches.filter(b => b.isStale).length}</div>
        </div>
      </div>

      {/* Branches List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-md">
        <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-indigo-400" />
          <span>Branches Overview</span>
        </h3>

        <div className="space-y-3">
          {branches.map((b) => (
            <div key={b.name} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-indigo-300">{b.name}</span>
                  {b.isDefault && (
                    <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold uppercase">
                      Default
                    </span>
                  )}
                  {b.isProtected && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Protected
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 truncate max-w-lg">
                  Last commit: <span className="text-slate-200">{b.lastCommitMessage}</span>
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-emerald-400 flex items-center gap-0.5" title="Commits ahead of default branch">
                    <ArrowUp className="w-3.5 h-3.5" /> {b.aheadCount}
                  </span>
                  <span className="text-rose-400 flex items-center gap-0.5" title="Commits behind default branch">
                    <ArrowDown className="w-3.5 h-3.5" /> {b.behindCount}
                  </span>
                </div>

                <div className="text-slate-400 text-right">
                  <div>{new Date(b.lastCommitDate).toLocaleDateString()}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
