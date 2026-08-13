import React from 'react';
import { IssueStats } from '../../types';
import { AlertCircle, Clock, Bug, Sparkles, CheckCircle2, User } from 'lucide-react';

interface IssueModuleProps {
  issues: IssueStats;
}

export const IssueModule: React.FC<IssueModuleProps> = ({ issues }) => {
  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400">Total Issues Tracked</div>
          <div className="text-xl font-extrabold text-indigo-400 font-mono">{issues.total.toLocaleString()}</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400">Currently Open</div>
          <div className="text-xl font-extrabold text-amber-400 font-mono">{issues.open.toLocaleString()}</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400">Avg Resolution Time</div>
          <div className="text-xl font-extrabold text-emerald-400 font-mono">{issues.avgResolutionTimeHours} hrs</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400">High Priority Issues</div>
          <div className="text-xl font-extrabold text-rose-400 font-mono">{issues.highPriorityCount}</div>
        </div>
      </div>

      {/* Bug vs Feature Ratio */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-md">
        <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
          <Bug className="w-5 h-5 text-rose-400" />
          <span>Bug vs Feature Request Ratio</span>
        </h3>

        <div className="w-full bg-slate-800 h-4 rounded-full overflow-hidden flex">
          <div className="bg-rose-500 h-full" style={{ width: `${issues.bugVsFeatureRatio.bugs}%` }} title="Bugs" />
          <div className="bg-sky-500 h-full" style={{ width: `${issues.bugVsFeatureRatio.features}%` }} title="Feature Requests" />
          <div className="bg-slate-600 h-full" style={{ width: `${issues.bugVsFeatureRatio.others}%` }} title="Others / Questions" />
        </div>

        <div className="grid grid-cols-3 gap-4 text-center text-xs">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-400">Bug Reports</span>
            <div className="font-bold text-rose-400 font-mono text-sm">{issues.bugVsFeatureRatio.bugs}%</div>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-400">Feature Requests</span>
            <div className="font-bold text-sky-400 font-mono text-sm">{issues.bugVsFeatureRatio.features}%</div>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-400">Questions & Docs</span>
            <div className="font-bold text-slate-300 font-mono text-sm">{issues.bugVsFeatureRatio.others}%</div>
          </div>
        </div>
      </div>

      {/* Assignee Stats */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-md">
        <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
          <User className="w-5 h-5 text-indigo-400" />
          <span>Assignee Workload Statistics</span>
        </h3>

        <div className="space-y-3">
          {issues.assigneeStats.map((a, i) => (
            <div key={i} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
              <span className="font-mono font-bold text-indigo-300">{a.assignee}</span>
              <div className="flex items-center gap-4 font-mono">
                <span className="text-amber-400">{a.openCount} open</span>
                <span className="text-emerald-400">{a.closedCount} resolved</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
