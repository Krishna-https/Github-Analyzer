import React, { useState } from 'react';
import { X, Search, Sparkles, Github, Key, Check, Flame, ArrowRight } from 'lucide-react';
import { SAMPLE_REPOS } from '../data/mockSampleRepos';

interface RepoSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRepo: (owner: string, repo: string) => void;
  customToken: string;
  onSaveToken: (token: string) => void;
  favorites: string[];
}

export const RepoSelectorModal: React.FC<RepoSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectRepo,
  customToken,
  onSaveToken,
  favorites,
}) => {
  const [repoInput, setRepoInput] = useState('');
  const [tokenInput, setTokenInput] = useState(customToken);
  const [tokenSavedMsg, setTokenSavedMsg] = useState(false);

  if (!isOpen) return null;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoInput.trim()) return;

    let clean = repoInput.trim().replace('https://github.com/', '').replace('http://github.com/', '');
    if (clean.endsWith('.git')) clean = clean.slice(0, -4);

    const parts = clean.split('/').filter(Boolean);
    if (parts.length >= 2) {
      onSelectRepo(parts[0], parts[1]);
      onClose();
    } else {
      alert('Please enter a valid "owner/repo" (e.g. facebook/react)');
    }
  };

  const handleSaveTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveToken(tokenInput.trim());
    setTokenSavedMsg(true);
    setTimeout(() => setTokenSavedMsg(false), 2500);
  };

  const presetList = Object.values(SAMPLE_REPOS);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl text-slate-100">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Select GitHub Repository</h2>
              <p className="text-xs text-slate-400">Analyze any public or private GitHub repository</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          
          {/* Direct Input Form */}
          <form onSubmit={handleFormSubmit} className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Enter Repository URL or Owner/Name
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={repoInput}
                  onChange={(e) => setRepoInput(e.target.value)}
                  placeholder="e.g. facebook/react or https://github.com/torvalds/linux"
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 shadow-md transition-all flex-shrink-0"
              >
                <span>Analyze</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Favorites List if any */}
          {favorites.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Saved Favorite Repositories
              </h3>
              <div className="flex flex-wrap gap-2">
                {favorites.map((fav) => (
                  <button
                    key={fav}
                    onClick={() => {
                      const [o, r] = fav.split('/');
                      onSelectRepo(o, r);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono text-indigo-300 flex items-center gap-1.5 transition-colors"
                  >
                    <span>{fav}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Popular Featured Presets */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 uppercase tracking-wider">
              <Flame className="w-4 h-4" />
              <span>Popular Top Repositories (Instant Offline Pre-Loaded)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {presetList.map((preset) => (
                <div
                  key={preset.info.fullName}
                  onClick={() => {
                    onSelectRepo(preset.info.owner, preset.info.name);
                    onClose();
                  }}
                  className="p-3.5 rounded-xl bg-slate-950/60 hover:bg-indigo-950/30 border border-slate-800 hover:border-indigo-500/50 cursor-pointer transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-sm text-indigo-300 group-hover:text-indigo-200">
                      {preset.info.fullName}
                    </span>
                    <span className="text-xs bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20 font-semibold">
                      ★ {(preset.info.stars / 1000).toFixed(1)}k
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2">
                    {preset.info.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* GitHub Access Token Config */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Key className="w-4 h-4 text-indigo-400" />
              <span>GitHub Personal Access Token (PAT)</span>
            </div>
            <p className="text-xs text-slate-400">
              Unauthenticated GitHub API calls are limited to 60 requests/hour. Add your personal GitHub token to bump rate limits to 5,000 requests/hour.
            </p>
            <form onSubmit={handleSaveTokenSubmit} className="flex gap-2">
              <input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              />
              <button
                type="submit"
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-1.5 rounded-xl text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1"
              >
                {tokenSavedMsg ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : null}
                <span>{tokenSavedMsg ? 'Saved!' : 'Save Token'}</span>
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};
