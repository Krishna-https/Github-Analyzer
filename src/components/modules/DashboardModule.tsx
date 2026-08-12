import React from 'react';
import { FullRepoAnalysis, ActivityFeedItem } from '../../types';
import {
  Star,
  GitFork,
  Eye,
  Users,
  GitCommitHorizontal,
  GitPullRequest,
  AlertCircle,
  Tag,
  GitBranch,
  ShieldCheck,
  Zap,
  Activity,
  Sparkles,
  TrendingUp,
  ArrowUpRight,
  Code2
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface DashboardModuleProps {
  data: FullRepoAnalysis;
  onNavigateTab: (tab: any) => void;
}

export const DashboardModule: React.FC<DashboardModuleProps> = ({ data, onNavigateTab }) => {
  const { info, health, code, commits, prs, issues, releases, aiInsights } = data;

  const kpis = [
    { label: 'Stars', val: info.stars.toLocaleString(), icon: Star, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    { label: 'Forks', val: info.forks.toLocaleString(), icon: GitFork, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
    { label: 'Watchers', val: info.watchers.toLocaleString(), icon: Eye, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20' },
    { label: 'Contributors', val: data.contributors.length, icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    { label: 'Commits', val: commits.totalCommits.toLocaleString(), icon: GitCommitHorizontal, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
    { label: 'Pull Requests', val: prs.total.toLocaleString(), icon: GitPullRequest, color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/20' },
    { label: 'Open Issues', val: info.openIssuesCount.toLocaleString(), icon: AlertCircle, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
    { label: 'Releases', val: releases.totalReleases, icon: Tag, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  ];

  const recentActivityFeed: ActivityFeedItem[] = [
    { id: '1', type: 'commit', title: commits.recentCommits[0]?.message || 'Recent commit pushed', author: commits.recentCommits[0]?.authorName || info.owner, avatar: commits.recentCommits[0]?.authorAvatar || info.avatarUrl, timestamp: '12 mins ago' },
    { id: '2', type: 'pr', title: `Merged PR #${prs.total}: Performance optimizations`, author: data.contributors[0]?.login || 'Maintainer', avatar: data.contributors[0]?.avatarUrl || info.avatarUrl, timestamp: '2 hours ago' },
    { id: '3', type: 'release', title: `Release ${releases.latestRelease?.tagName || 'v1.0.0'} published`, author: info.owner, avatar: info.avatarUrl, timestamp: '1 day ago' },
    { id: '4', type: 'security', title: `Security Score validated at ${data.security.securityScore}/100`, author: 'OctoPulse Bot', avatar: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png', timestamp: '2 days ago' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* AI Summary Banner */}
      <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Executive Summary</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {info.fullName}
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              {aiInsights.repositorySummary}
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('ai-insights')}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all flex-shrink-0"
          >
            <span>Full AI Audit</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {kpis.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border ${item.bg} backdrop-blur-sm flex flex-col justify-between space-y-2`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{item.label}</span>
                <Icon className={`w-4 h-4 ${item.color}`} />
              </div>
              <div className="text-lg font-extrabold text-white tracking-tight">{item.val}</div>
            </div>
          );
        })}
      </div>

      {/* Health Score & Activity Timeline Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Health Score Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-base text-slate-100">
              <Activity className="w-5 h-5 text-indigo-400" />
              <span>Repository Health Score</span>
            </div>
            <span className="text-2xl font-black text-indigo-400 font-mono">
              {health.overall}/100
            </span>
          </div>

          {/* Sub-Health Score Meters */}
          <div className="space-y-3">
            {[
              { label: 'Code Quality', score: health.codeQuality, color: 'bg-emerald-500' },
              { label: 'Security Score', score: health.security, color: 'bg-sky-500' },
              { label: 'Maintainability', score: health.maintainability, color: 'bg-indigo-500' },
              { label: 'Documentation', score: health.documentation, color: 'bg-purple-500' },
              { label: 'Community Activity', score: health.communityActivity, color: 'bg-amber-500' },
            ].map((sub, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-medium">{sub.label}</span>
                  <span className="font-mono text-slate-200 font-semibold">{sub.score}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full ${sub.color} rounded-full transition-all duration-700`}
                    style={{ width: `${sub.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Timeline Chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-base text-slate-100">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <span>Commit Activity Trend (Past Months)</span>
            </div>
            <span className="text-xs text-slate-400">Monthly Commits & Lines</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={commits.timeline}>
                <defs>
                  <linearGradient id="colorCommits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#f8fafc' }}
                />
                <Area type="monotone" dataKey="commits" stroke="#6366f1" fillOpacity={1} fill="url(#colorCommits)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Languages & Recent Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Language Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-base text-slate-100">
              <Code2 className="w-5 h-5 text-sky-400" />
              <span>Language Breakdown</span>
            </div>
            <button onClick={() => onNavigateTab('code')} className="text-xs text-indigo-400 hover:underline">
              View Code Analysis &rarr;
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-40 h-40 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={code.languages}
                    dataKey="percentage"
                    nameKey="name"
                    innerRadius={35}
                    outerRadius={65}
                    paddingAngle={3}
                  >
                    {code.languages.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex-1 space-y-2.5 w-full">
              {code.languages.map((lang, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: lang.color }} />
                    <span className="font-semibold text-slate-200">{lang.name}</span>
                  </div>
                  <span className="font-mono text-slate-400">{lang.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Latest Activity Feed */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-base text-slate-100">
              <Activity className="w-5 h-5 text-purple-400" />
              <span>Latest Repository Activity</span>
            </div>
            <span className="text-xs text-slate-400">Live stream</span>
          </div>

          <div className="space-y-3">
            {recentActivityFeed.map((item) => (
              <div key={item.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                <img src={item.avatar} alt={item.author} className="w-8 h-8 rounded-full border border-slate-700 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-200 truncate">{item.title}</div>
                  <div className="text-[11px] text-slate-400">by <span className="text-slate-300 font-mono">{item.author}</span> • {item.timestamp}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
