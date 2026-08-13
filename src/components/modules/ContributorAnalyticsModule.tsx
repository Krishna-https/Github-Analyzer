import React from 'react';
import { Contributor } from '../../types';
import { Users, Award, GitCommit, GitPullRequest, AlertCircle, Eye, CheckCircle2 } from 'lucide-react';

interface ContributorAnalyticsModuleProps {
  contributors: Contributor[];
}

export const ContributorAnalyticsModule: React.FC<ContributorAnalyticsModuleProps> = ({ contributors }) => {
  const totalContribs = contributors.reduce((acc, c) => acc + c.contributions, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Overview stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400">Total Contributors</div>
          <div className="text-xl font-extrabold text-indigo-400 font-mono">{contributors.length}</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400">Active Contributors</div>
          <div className="text-xl font-extrabold text-emerald-400 font-mono">{contributors.filter(c => c.isActive).length}</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400">Total Commits Made</div>
          <div className="text-xl font-extrabold text-sky-400 font-mono">{totalContribs.toLocaleString()}</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400">Top Maintainer Share</div>
          <div className="text-xl font-extrabold text-amber-400 font-mono">{contributors[0]?.contributionPct || 0}%</div>
        </div>
      </div>

      {/* Contributor Leaderboard Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-md">
        <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" />
          <span>Contributor Leaderboard</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-3">Rank & Contributor</th>
                <th className="p-3">Commits</th>
                <th className="p-3">Share</th>
                <th className="p-3">Additions</th>
                <th className="p-3">Deletions</th>
                <th className="p-3">PRs</th>
                <th className="p-3">Reviews</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {contributors.map((c, i) => (
                <tr key={c.login} className="hover:bg-slate-800/50">
                  <td className="p-3 flex items-center gap-3">
                    <span className="font-bold font-mono text-slate-500 w-4">#{i + 1}</span>
                    <img src={c.avatarUrl} alt={c.login} className="w-8 h-8 rounded-full border border-slate-700" />
                    <a href={c.htmlUrl} target="_blank" rel="noreferrer" className="font-bold text-slate-100 hover:text-indigo-400">
                      {c.login}
                    </a>
                  </td>
                  <td className="p-3 font-mono font-bold text-indigo-300">{c.contributions.toLocaleString()}</td>
                  <td className="p-3 font-mono text-slate-200">{c.contributionPct}%</td>
                  <td className="p-3 font-mono text-emerald-400">+{c.additions.toLocaleString()}</td>
                  <td className="p-3 font-mono text-rose-400">-{c.deletions.toLocaleString()}</td>
                  <td className="p-3 font-mono text-slate-300">{c.prsCount}</td>
                  <td className="p-3 font-mono text-slate-300">{c.reviewCount}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                      c.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
