import React, { useState } from 'react';
import { FullRepoAnalysis, ComparisonResult } from '../../types';
import { GitCompare, ArrowRight, Loader2, Trophy, Star, GitFork, Activity, AlertCircle, ShieldCheck } from 'lucide-react';

interface CompareModuleProps {
  currentData: FullRepoAnalysis;
}

export const CompareModule: React.FC<CompareModuleProps> = ({ currentData }) => {
  const [targetRepoInput, setTargetRepoInput] = useState('vercel/next.js');
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCompareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRepoInput.trim() || isLoading) return;

    let clean = targetRepoInput.trim().replace('https://github.com/', '');
    const parts = clean.split('/').filter(Boolean);
    if (parts.length < 2) {
      alert('Please enter a valid owner/repo format (e.g. vercel/next.js)');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/github/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo1: currentData.info.fullName,
          repo2: `${parts[0]}/${parts[1]}`,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setComparison(data.comparison);
      } else {
        alert(data.error || 'Failed to compare repositories.');
      }
    } catch (err) {
      alert('Network error comparing repositories.');
    } finally {
      setIsLoading(false);
    }
  };

  const r1 = comparison?.repo1 || currentData;
  const r2 = comparison?.repo2;

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Search Input Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
        <div className="flex items-center gap-2">
          <GitCompare className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-bold text-slate-100">Compare {currentData.info.fullName} with Another Repository</h2>
        </div>

        <form onSubmit={handleCompareSubmit} className="flex gap-2">
          <input
            type="text"
            value={targetRepoInput}
            onChange={(e) => setTargetRepoInput(e.target.value)}
            placeholder="Target repo owner/name (e.g. vercel/next.js)..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md transition-all flex-shrink-0"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitCompare className="w-4 h-4" />}
            <span>{isLoading ? 'Comparing...' : 'Compare Repositories'}</span>
          </button>
        </form>
      </div>

      {/* Comparison AI Verdict Banner */}
      {comparison && (
        <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/40 border border-amber-500/30 rounded-2xl p-6 shadow-xl space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
            <Trophy className="w-5 h-5" />
            <span>AI Comparative Verdict: Winner {comparison.aiVerdict.winner}</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed font-mono">
            {comparison.aiVerdict.reasoning}
          </p>
        </div>
      )}

      {/* Comparison Matrix Table */}
      {r2 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-md">
          <h3 className="font-bold text-base text-slate-100">Head-to-Head Comparison Matrix</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3">Metric</th>
                  <th className="p-3 text-indigo-400 font-bold font-mono">{r1.info.fullName}</th>
                  <th className="p-3 text-sky-400 font-bold font-mono">{r2.info.fullName}</th>
                  <th className="p-3 text-right">Advantage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                <tr className="hover:bg-slate-800/50">
                  <td className="p-3 font-sans font-bold text-slate-300">Stars</td>
                  <td className="p-3 font-bold text-slate-100">{r1.info.stars.toLocaleString()}</td>
                  <td className="p-3 font-bold text-slate-100">{r2.info.stars.toLocaleString()}</td>
                  <td className="p-3 text-right font-bold text-emerald-400">
                    {r1.info.stars > r2.info.stars ? r1.info.name : r2.info.name}
                  </td>
                </tr>
                <tr className="hover:bg-slate-800/50">
                  <td className="p-3 font-sans font-bold text-slate-300">Forks</td>
                  <td className="p-3 text-slate-200">{r1.info.forks.toLocaleString()}</td>
                  <td className="p-3 text-slate-200">{r2.info.forks.toLocaleString()}</td>
                  <td className="p-3 text-right font-bold text-emerald-400">
                    {r1.info.forks > r2.info.forks ? r1.info.name : r2.info.name}
                  </td>
                </tr>
                <tr className="hover:bg-slate-800/50">
                  <td className="p-3 font-sans font-bold text-slate-300">Overall Health Score</td>
                  <td className="p-3 text-indigo-400 font-bold">{r1.health.overall}/100</td>
                  <td className="p-3 text-sky-400 font-bold">{r2.health.overall}/100</td>
                  <td className="p-3 text-right font-bold text-emerald-400">
                    {r1.health.overall > r2.health.overall ? r1.info.name : r2.info.name}
                  </td>
                </tr>
                <tr className="hover:bg-slate-800/50">
                  <td className="p-3 font-sans font-bold text-slate-300">Code Lines (LOC)</td>
                  <td className="p-3 text-slate-200">{r1.code.totalLoc.toLocaleString()}</td>
                  <td className="p-3 text-slate-200">{r2.code.totalLoc.toLocaleString()}</td>
                  <td className="p-3 text-right text-slate-400">-</td>
                </tr>
                <tr className="hover:bg-slate-800/50">
                  <td className="p-3 font-sans font-bold text-slate-300">Security Score</td>
                  <td className="p-3 text-emerald-400">{r1.security.securityScore}/100</td>
                  <td className="p-3 text-emerald-400">{r2.security.securityScore}/100</td>
                  <td className="p-3 text-right font-bold text-emerald-400">
                    {r1.security.securityScore > r2.security.securityScore ? r1.info.name : r2.info.name}
                  </td>
                </tr>
                <tr className="hover:bg-slate-800/50">
                  <td className="p-3 font-sans font-bold text-slate-300">AI Tier Rating</td>
                  <td className="p-3 text-amber-400 font-bold">Tier {r1.aiInsights.aiRating}</td>
                  <td className="p-3 text-amber-400 font-bold">Tier {r2.aiInsights.aiRating}</td>
                  <td className="p-3 text-right font-bold text-amber-400">-</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-2">
          <GitCompare className="w-10 h-10 text-indigo-400 mx-auto opacity-80" />
          <div className="font-bold text-base text-slate-200">Enter a target repository above to compare</div>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Compare stars, forks, health scores, security ratings, and commit activity side-by-side with automated AI verdict.
          </p>
        </div>
      )}

    </div>
  );
};
