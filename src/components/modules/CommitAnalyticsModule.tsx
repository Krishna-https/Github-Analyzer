import React from 'react';
import { CommitAnalytics } from '../../types';
import {
  GitCommitHorizontal,
  Calendar,
  Clock,
  TrendingUp,
  MessageSquare,
  Smile,
  Meh,
  Frown,
  FileCode,
  User
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

interface CommitAnalyticsModuleProps {
  commits: CommitAnalytics;
}

export const CommitAnalyticsModule: React.FC<CommitAnalyticsModuleProps> = ({ commits }) => {
  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400">Total Commits</div>
          <div className="text-xl font-extrabold text-indigo-400 font-mono">{commits.totalCommits.toLocaleString()}</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400">Avg Commits / Day</div>
          <div className="text-xl font-extrabold text-emerald-400 font-mono">{commits.commitsPerDayAvg}</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400">Avg Commit Size</div>
          <div className="text-xl font-extrabold text-sky-400 font-mono">{commits.avgCommitSizeLines} lines</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400">Longest Inactive Period</div>
          <div className="text-xl font-extrabold text-amber-400 font-mono">{commits.longestInactivePeriodDays} days</div>
        </div>
      </div>

      {/* GitHub-style Commit Heatmap Calendar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-md">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            <span>Commit Contribution Heatmap Calendar</span>
          </h3>
          <span className="text-xs text-slate-400">Past 6 Months</span>
        </div>

        <div className="flex flex-wrap gap-1.5 p-2 bg-slate-950 rounded-xl border border-slate-800 overflow-x-auto justify-center">
          {commits.heatmap.map((item, idx) => {
            const count = item.count;
            const bg =
              count === 0
                ? 'bg-slate-800'
                : count < 3
                ? 'bg-indigo-900'
                : count < 6
                ? 'bg-indigo-700'
                : count < 10
                ? 'bg-indigo-500'
                : 'bg-emerald-400';
            return (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-sm ${bg} transition-transform hover:scale-125 cursor-pointer`}
                title={`${item.date}: ${count} commits`}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-end gap-2 text-xs text-slate-400">
          <span>Less</span>
          <span className="w-3 h-3 bg-slate-800 rounded-sm" />
          <span className="w-3 h-3 bg-indigo-900 rounded-sm" />
          <span className="w-3 h-3 bg-indigo-700 rounded-sm" />
          <span className="w-3 h-3 bg-indigo-500 rounded-sm" />
          <span className="w-3 h-3 bg-emerald-400 rounded-sm" />
          <span>More</span>
        </div>
      </div>

      {/* Active Days & Hours Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Active Days */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-md">
          <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-400" />
            <span>Most Active Days of the Week</span>
          </h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={commits.activeDays}>
                <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#f8fafc' }} />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Message Sentiments */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-md flex flex-col justify-between">
          <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-purple-400" />
            <span>Commit Message Sentiment Analysis</span>
          </h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <Smile className="w-6 h-6 text-emerald-400 mx-auto" />
              <div className="text-xs text-slate-400">Positive</div>
              <div className="text-lg font-bold text-emerald-400 font-mono">{commits.messageSentiments.positive}%</div>
            </div>
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <Meh className="w-6 h-6 text-sky-400 mx-auto" />
              <div className="text-xs text-slate-400">Neutral</div>
              <div className="text-lg font-bold text-sky-400 font-mono">{commits.messageSentiments.neutral}%</div>
            </div>
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <Frown className="w-6 h-6 text-rose-400 mx-auto" />
              <div className="text-xs text-slate-400">Negative</div>
              <div className="text-lg font-bold text-rose-400 font-mono">{commits.messageSentiments.negative}%</div>
            </div>
          </div>
        </div>

      </div>

      {/* Recent Commit History Feed */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-md">
        <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
          <GitCommitHorizontal className="w-5 h-5 text-indigo-400" />
          <span>Recent Commit History</span>
        </h3>
        <div className="space-y-3">
          {commits.recentCommits.map((c, i) => (
            <div key={i} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img src={c.authorAvatar} alt={c.authorName} className="w-9 h-9 rounded-full border border-slate-700" />
                <div>
                  <div className="font-semibold text-sm text-slate-100 font-mono">{c.sha} - {c.message}</div>
                  <div className="text-xs text-slate-400">by <span className="text-slate-200">{c.authorName}</span> on {new Date(c.date).toLocaleDateString()}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="text-emerald-400">+{c.additions}</span>
                <span className="text-rose-400">-{c.deletions}</span>
                <span className="text-slate-400">{c.filesChanged} files</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
