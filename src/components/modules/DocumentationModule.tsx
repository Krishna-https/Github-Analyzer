import React from 'react';
import { DocumentationAnalysis } from '../../types';
import { BookOpen, CheckCircle2, XCircle, Sparkles, FileText } from 'lucide-react';

interface DocumentationModuleProps {
  doc: DocumentationAnalysis;
}

export const DocumentationModule: React.FC<DocumentationModuleProps> = ({ doc }) => {
  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400">README Quality Score</div>
          <div className="text-xl font-extrabold text-indigo-400 font-mono">{doc.readmeQualityScore} / 100</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400">API Documentation</div>
          <div className="text-xl font-extrabold text-emerald-400 font-mono">{doc.apiDocumentationScore} / 100</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400">Code Comment Density</div>
          <div className="text-xl font-extrabold text-sky-400 font-mono">{doc.codeCommentDensityPct}%</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400">Wiki Available</div>
          <div className="text-xl font-extrabold text-purple-400 font-mono">{doc.wikiAvailable ? 'Yes' : 'No'}</div>
        </div>
      </div>

      {/* Checklist */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-md">
        <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-400" />
          <span>README Structure Checklist</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-semibold">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
            <span>Badges Included</span>
            {doc.readmeHasBadge ? <CheckCircle2 className="w-4 h-4 text-emerald-400"/> : <XCircle className="w-4 h-4 text-rose-400"/>}
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
            <span>Installation Guide</span>
            {doc.readmeHasInstallation ? <CheckCircle2 className="w-4 h-4 text-emerald-400"/> : <XCircle className="w-4 h-4 text-rose-400"/>}
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
            <span>Usage Examples</span>
            {doc.readmeHasUsage ? <CheckCircle2 className="w-4 h-4 text-emerald-400"/> : <XCircle className="w-4 h-4 text-rose-400"/>}
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
            <span>License Section</span>
            {doc.readmeHasLicense ? <CheckCircle2 className="w-4 h-4 text-emerald-400"/> : <XCircle className="w-4 h-4 text-rose-400"/>}
          </div>
        </div>
      </div>

    </div>
  );
};
