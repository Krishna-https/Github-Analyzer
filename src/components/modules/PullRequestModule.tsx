import React from 'react';
import { PullRequestStats } from '../../types';
import { GitPullRequest, Clock, CheckCircle2, XCircle, FileText, UserCheck, Shield } from 'lucide-react';

interface PullRequestModuleProps {
  prs: PullRequestStats;
}

export const PullRequestModule: React.FC<PullRequestModuleProps> = ({ prs }) => {
  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400">Total PRs Analyzed</div>
          <div className="text-xl font-extrabold text-indigo-400 font-mono">{prs.total.toLocaleString()}</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400">Merge Rate</div>
          <div className="text-xl font-extrabold text-emerald-400 font-mono">{prs.mergeRatePct}%</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400">Avg Merge Time</div>
          <div className="text-xl font-extrabold text-sky-400 font-mono">{prs.avgMergeTimeHours} hrs</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400">Avg First Review Time</div>
          <div className="text-xl font-extrabold text-purple-400 font-mono">{prs.avgReviewTimeHours} hrs</div>
        </div>
      </div>

      {/* PR Status Breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-md">
        <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
          <GitPullRequest className="w-5 h-5 text-indigo-400" />
          <span>Pull Request Status Distribution</span>
        </h3>

        <div className="w-full bg-slate-800 h-4 rounded-full overflow-hidden flex">
          <div className="bg-purple-500 h-full" style={{ width: `${Math.round((prs.merged / prs.total) * 100)}%` }} title="Merged PRs" />
          <div className="bg-emerald-500 h-full" style={{ width: `${Math.round((prs.open / prs.total) * 100)}%` }} title="Open PRs" />
          <div className="bg-rose-500 h-full" style={{ width: `${Math.round(((prs.closed - prs.merged) / prs.total) * 100)}%` }} title="Unmerged / Closed PRs" />
        </div>

        <div className="grid grid-cols-3 gap-4 text-center text-xs">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-400">Merged PRs</span>
            <div className="font-bold text-purple-400 font-mono text-sm">{prs.merged.toLocaleString()}</div>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-400">Open PRs</span>
            <div className="font-bold text-emerald-400 font-mono text-sm">{prs.open.toLocaleString()}</div>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-400">Closed / Declined</span>
            <div className="font-bold text-rose-400 font-mono text-sm">{(prs.closed - prs.merged).toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Reviewers & Labels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Reviewer Stats */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
          <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>Top Code Reviewers</span>
          </h3>
          <div className="space-y-3 text-xs">
            {prs.reviewerStats.map((rev, i) => (
              <div key={i} className="flex justify-between items-center p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                <span className="font-mono text-indigo-300 font-bold">{rev.reviewer}</span>
                <div className="text-right">
                  <div className="font-semibold text-slate-200">{rev.reviewsCount} reviews</div>
                  <div className="text-[11px] text-slate-400">{rev.avgTimeHours}h avg turnaround</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Labels Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
          <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2">
            <FileText className="w-4 h-4 text-sky-400" />
            <span>Pull Request Labels</span>
          </h3>
          <div className="space-y-2 text-xs">
            {prs.labelsDistribution.map((lbl, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-slate-950 rounded-xl border border-slate-800">
                <span className="px-2.5 py-0.5 rounded-md font-mono text-[11px] font-semibold" style={{ backgroundColor: `${lbl.color}20`, color: lbl.color, border: `1px solid ${lbl.color}40` }}>
                  {lbl.name}
                </span>
                <span className="font-mono font-bold text-slate-300">{lbl.count} PRs</span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
