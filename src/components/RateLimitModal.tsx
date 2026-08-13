import React from 'react';
import { X, Key, ShieldCheck, Clock, RefreshCw, Cpu } from 'lucide-react';
import { RateLimitStatus } from '../types';

interface RateLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  rateLimit: RateLimitStatus | null;
  onRefresh: () => void;
}

export const RateLimitModal: React.FC<RateLimitModalProps> = ({
  isOpen,
  onClose,
  rateLimit,
  onRefresh,
}) => {
  if (!isOpen) return null;

  const limit = rateLimit?.limit || 60;
  const remaining = rateLimit?.remaining || 60;
  const used = rateLimit?.used || (limit - remaining);
  const pct = Math.round((used / limit) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl text-slate-100 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg">GitHub API Rate Quota</h3>
            <p className="text-xs text-slate-400">Live request tracking & limits</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2 my-4">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-300">Remaining Requests</span>
            <span className="text-indigo-400">{remaining} / {limit}</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                remaining < 10 ? 'bg-rose-500' : remaining < 30 ? 'bg-amber-500' : 'bg-indigo-500'
              }`}
              style={{ width: `${Math.max(5, (remaining / limit) * 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 text-right">Used: {used} ({pct}%)</p>
        </div>

        {/* Status Box */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Token Status:
            </span>
            <span className={`font-semibold ${rateLimit?.hasCustomToken ? 'text-emerald-400' : 'text-amber-400'}`}>
              {rateLimit?.hasCustomToken ? 'Custom Token Active (5,000 req/hr)' : 'Unauthenticated (60 req/hr)'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-400" />
              Reset Time:
            </span>
            <span className="font-mono text-slate-300">
              {rateLimit?.resetTime ? new Date(rateLimit.resetTime).toLocaleTimeString() : 'N/A'}
            </span>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onRefresh}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Check Status</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
