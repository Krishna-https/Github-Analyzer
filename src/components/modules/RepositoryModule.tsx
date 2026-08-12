import React from 'react';
import { RepoInfo } from '../../types';
import {
  Info,
  Calendar,
  Clock,
  Globe,
  Tag,
  ShieldCheck,
  GitBranch,
  FolderArchive,
  Copy,
  Award,
  Layers,
  Flame,
  CheckCircle2,
  XCircle
} from 'lucide-react';

interface RepositoryModuleProps {
  info: RepoInfo;
}

export const RepositoryModule: React.FC<RepositoryModuleProps> = ({ info }) => {
  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header Overview Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img
            src={info.avatarUrl}
            alt={info.owner}
            className="w-16 h-16 rounded-2xl border-2 border-indigo-500/40 shadow-md"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white">{info.fullName}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                info.visibility === 'public' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}>
                {info.visibility}
              </span>
            </div>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">{info.description}</p>
          </div>
        </div>

        {/* Popularity Score Badge */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center flex-shrink-0 min-w-[140px]">
          <div className="flex items-center justify-center gap-1 text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
            <Flame className="w-4 h-4" />
            <span>Popularity</span>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">{info.popularityScore} / 100</div>
        </div>
      </div>

      {/* Grid of Repository Attributes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Core Attributes */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
          <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2">
            <Info className="w-4 h-4 text-indigo-400" />
            <span>Core Attributes</span>
          </h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Owner</span>
              <span className="font-semibold text-slate-200">{info.owner}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Repository Size</span>
              <span className="font-mono text-slate-200">{(info.sizeKb / 1024).toFixed(1)} MB ({info.sizeKb.toLocaleString()} KB)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Default Branch</span>
              <span className="font-mono text-indigo-300 font-semibold">{info.defaultBranch}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">License</span>
              <span className="font-semibold text-emerald-400">{info.license}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Homepage</span>
              <a href={info.homepage} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline truncate max-w-[180px]">
                {info.homepage || 'None'}
              </a>
            </div>
          </div>
        </div>

        {/* Timeline & Lifecycle Dates */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
          <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2">
            <Calendar className="w-4 h-4 text-sky-400" />
            <span>Repository Timeline & Age</span>
          </h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Created Date</span>
              <span className="font-mono text-slate-200">{new Date(info.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Last Updated</span>
              <span className="font-mono text-slate-200">{new Date(info.updatedAt).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Last Code Push</span>
              <span className="font-mono text-indigo-300 font-semibold">{new Date(info.pushedAt).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Repository Age</span>
              <span className="font-semibold text-slate-200">{info.ageDays} days ({(info.ageDays / 365).toFixed(1)} yrs)</span>
            </div>
          </div>
        </div>

        {/* Repository Status Flags */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
          <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Repository Flags & Status</span>
          </h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Archived Status</span>
              {info.isArchived ? (
                <span className="flex items-center gap-1 text-amber-400 font-semibold"><XCircle className="w-3.5 h-3.5"/> Archived</span>
              ) : (
                <span className="flex items-center gap-1 text-emerald-400 font-semibold"><CheckCircle2 className="w-3.5 h-3.5"/> Active</span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Fork Status</span>
              <span className="text-slate-200 font-semibold">{info.isFork ? 'Forked Repository' : 'Original Repository'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Template Repository</span>
              <span className="text-slate-200 font-semibold">{info.isTemplate ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Tags / Releases</span>
              <span className="font-mono text-slate-200">{info.tagsCount} tagged releases</span>
            </div>
          </div>
        </div>

      </div>

      {/* Topics & Tags Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-sm">
        <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
          <Tag className="w-4 h-4 text-indigo-400" />
          <span>Repository Topics & Keywords</span>
        </h3>
        <div className="flex flex-wrap gap-2">
          {info.topics.map((t, i) => (
            <span key={i} className="px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold font-mono">
              #{t}
            </span>
          ))}
        </div>
      </div>

    </div>
  );
};
