import React from 'react';
import { ReleaseStats } from '../../types';
import { Tag, Sparkles, Calendar, Download, FileText, CheckCircle2 } from 'lucide-react';

interface ReleaseModuleProps {
  releases: ReleaseStats;
}

export const ReleaseModule: React.FC<ReleaseModuleProps> = ({ releases }) => {
  const latest = releases.latestRelease;

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Latest Release Spotlight */}
      {latest && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/80 border border-indigo-500/30 rounded-2xl p-6 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
              <Tag className="w-3.5 h-3.5" />
              <span>Latest Official Release</span>
            </div>
            <span className="text-xs text-slate-400 font-mono">Published: {new Date(latest.publishedAt).toLocaleDateString()}</span>
          </div>

          <div className="flex items-baseline gap-3">
            <h2 className="text-xl font-black text-white font-mono">{latest.tagName}</h2>
            <span className="text-sm font-semibold text-indigo-300">{latest.name}</span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-800 font-mono">
            {latest.body}
          </p>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-400 pt-1">
            <span>Assets: {latest.assetsCount} files</span>
            <span>Downloads: {latest.downloadCount.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Release Frequency & Changelog */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Release Frequency Stats */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
          <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <span>Release Cadence & Stats</span>
          </h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Total Tagged Releases</span>
              <span className="font-mono text-slate-100 font-bold">{releases.totalReleases}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Release Cadence</span>
              <span className="font-mono text-emerald-400 font-bold">{releases.releaseFrequencyPerMonth} releases / month</span>
            </div>
          </div>
        </div>

        {/* AI Changelog Summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
          <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>AI Changelog Highlights</span>
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            {releases.changelogSummary}
          </p>
        </div>

      </div>

    </div>
  );
};
