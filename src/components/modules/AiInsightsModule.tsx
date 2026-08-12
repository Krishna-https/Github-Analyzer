import React from 'react';
import { AiInsights } from '../../types';
import { Sparkles, Award, ShieldAlert, Cpu, Wrench, Bug, Zap, BookOpen, CheckCircle2 } from 'lucide-react';

interface AiInsightsModuleProps {
  insights: AiInsights;
}

export const AiInsightsModule: React.FC<AiInsightsModuleProps> = ({ insights }) => {
  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header Grade Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-400/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Architectural Evaluation</span>
          </div>
          <h2 className="text-xl font-bold text-white">Gemini AI Repository Audit Grade</h2>
          <p className="text-xs text-slate-300 max-w-xl">{insights.aiRatingReasoning}</p>
        </div>

        <div className="text-center p-4 rounded-2xl bg-slate-950/80 border border-indigo-500/40 min-w-[140px] shadow-lg">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">AI Tier Rating</div>
          <div className="text-4xl font-black bg-gradient-to-r from-amber-400 via-sky-300 to-emerald-400 bg-clip-text text-transparent font-mono">
            Tier {insights.aiRating}
          </div>
        </div>
      </div>

      {/* Codebase Architecture & Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 shadow-md">
          <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-2">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <span>Architecture & Design Pattern</span>
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed font-mono">
            {insights.architectureExplanation}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 shadow-md">
          <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Codebase Health & Overview</span>
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed font-mono">
            {insights.codebaseOverview}
          </p>
        </div>

      </div>

      {/* Detailed Recommendations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Bug Predictions */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-sm">
          <h3 className="font-bold text-sm text-rose-400 flex items-center gap-2 border-b border-slate-800 pb-2">
            <Bug className="w-4 h-4" />
            <span>AI Bug Predictions</span>
          </h3>
          <ul className="space-y-2 text-xs text-slate-300">
            {insights.bugPredictions.map((b, i) => (
              <li key={i} className="flex items-start gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-rose-400 font-bold">•</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Refactoring Suggestions */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-sm">
          <h3 className="font-bold text-sm text-indigo-400 flex items-center gap-2 border-b border-slate-800 pb-2">
            <Wrench className="w-4 h-4" />
            <span>Refactoring Suggestions</span>
          </h3>
          <ul className="space-y-2 text-xs text-slate-300">
            {insights.refactoringSuggestions.map((r, i) => (
              <li key={i} className="flex items-start gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-indigo-400 font-bold">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Performance Suggestions */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-sm">
          <h3 className="font-bold text-sm text-sky-400 flex items-center gap-2 border-b border-slate-800 pb-2">
            <Zap className="w-4 h-4" />
            <span>Performance Optimizations</span>
          </h3>
          <ul className="space-y-2 text-xs text-slate-300">
            {insights.performanceSuggestions.map((p, i) => (
              <li key={i} className="flex items-start gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-sky-400 font-bold">•</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Documentation Suggestions */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-sm">
          <h3 className="font-bold text-sm text-purple-400 flex items-center gap-2 border-b border-slate-800 pb-2">
            <BookOpen className="w-4 h-4" />
            <span>Documentation Enhancements</span>
          </h3>
          <ul className="space-y-2 text-xs text-slate-300">
            {insights.documentationSuggestions.map((d, i) => (
              <li key={i} className="flex items-start gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-purple-400 font-bold">•</span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </div>

      </div>

    </div>
  );
};
