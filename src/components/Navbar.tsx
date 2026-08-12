import React, { useState } from 'react';
import { Search, Github, ShieldAlert, Moon, Sun, Star, Sparkles, Key, ExternalLink, RefreshCw, Layers } from 'lucide-react';
import { RateLimitStatus } from '../types';

interface NavbarProps {
  currentRepoFullName: string;
  onSelectRepo: (owner: string, repo: string) => void;
  onOpenRepoModal: () => void;
  onOpenRateLimitModal: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  rateLimit: RateLimitStatus | null;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  isLoading: boolean;
  onRefreshData: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRepoFullName,
  onSelectRepo,
  onOpenRepoModal,
  onOpenRateLimitModal,
  darkMode,
  onToggleDarkMode,
  rateLimit,
  isFavorite,
  onToggleFavorite,
  isLoading,
  onRefreshData,
}) => {
  const [searchInput, setSearchInput] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;

    let cleanInput = searchInput.trim().replace('https://github.com/', '').replace('http://github.com/', '');
    if (cleanInput.endsWith('.git')) cleanInput = cleanInput.slice(0, -4);

    const parts = cleanInput.split('/').filter(Boolean);
    if (parts.length >= 2) {
      onSelectRepo(parts[0], parts[1]);
      setSearchInput('');
    } else {
      alert('Please enter a valid GitHub repository in "owner/repo" or URL format (e.g. facebook/react)');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        
        {/* Brand & Repo Title */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 font-bold text-lg tracking-tight cursor-pointer hover:opacity-90 transition-opacity" onClick={onOpenRepoModal}>
            <div className="p-2 rounded-lg bg-indigo-600/90 text-white shadow-sm ring-1 ring-indigo-400/30">
              <Github className="w-5 h-5" />
            </div>
            <span className="bg-gradient-to-r from-indigo-400 via-sky-300 to-emerald-400 bg-clip-text text-transparent hidden sm:inline">
              OctoPulse AI
            </span>
          </div>

          <div className="h-5 w-px bg-slate-700/80 hidden sm:block" />

          {/* Current Active Repo Button */}
          <button
            onClick={onOpenRepoModal}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700/80 border border-slate-700/80 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all min-w-0"
            title="Click to change repository"
          >
            <span className="truncate max-w-[140px] sm:max-w-[220px] font-mono text-indigo-300">
              {currentRepoFullName}
            </span>
            <Layers className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          </button>
        </div>

        {/* Quick Repository Search Input */}
        <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center flex-1 max-w-md mx-2">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Analyze owner/repo (e.g. vercel/next.js)..."
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/80 transition-all"
            />
          </div>
        </form>

        {/* Actions & Settings */}
        <div className="flex items-center gap-2 flex-shrink-0">
          
          {/* Refresh Data */}
          <button
            onClick={onRefreshData}
            disabled={isLoading}
            className={`p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors ${isLoading ? 'animate-spin opacity-50' : ''}`}
            title="Refresh repository analysis"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Favorite */}
          <button
            onClick={onToggleFavorite}
            className={`p-2 rounded-lg border transition-colors ${
              isFavorite
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title={isFavorite ? 'Saved to Favorites' : 'Add to Favorites'}
          >
            <Star className={`w-4 h-4 ${isFavorite ? 'fill-amber-400' : ''}`} />
          </button>

          {/* Rate Limit Pill */}
          <button
            onClick={onOpenRateLimitModal}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono border transition-all ${
              rateLimit && rateLimit.remaining < 15
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
            }`}
            title="GitHub API Rate Limit Status"
          >
            <Key className="w-3.5 h-3.5 text-indigo-400" />
            <span>API: {rateLimit ? rateLimit.remaining : '60'}/60</span>
          </button>

          {/* Dark / Light Toggle */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Toggle theme mode"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-300" />}
          </button>

          {/* Direct Link to Repo */}
          <a
            href={`https://github.com/${currentRepoFullName}`}
            target="_blank"
            rel="noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <span>GitHub</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </header>
  );
};
