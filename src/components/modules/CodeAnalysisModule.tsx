import React from 'react';
import { CodeMetrics } from '../../types';
import {
  FileCode,
  Folder,
  Layers,
  AlertTriangle,
  FileCheck2,
  Bug,
  Gauge,
  Clock,
  BookOpen,
  CheckCircle2,
  HardDrive
} from 'lucide-react';

interface CodeAnalysisModuleProps {
  metrics: CodeMetrics;
}

export const CodeAnalysisModule: React.FC<CodeAnalysisModuleProps> = ({ metrics }) => {
  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400">Total Files / Folders</div>
          <div className="text-xl font-extrabold text-white font-mono">{metrics.totalFiles.toLocaleString()} / {metrics.totalFolders}</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400">Total Lines of Code</div>
          <div className="text-xl font-extrabold text-indigo-400 font-mono">{metrics.totalLoc.toLocaleString()}</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400">Maintainability Index</div>
          <div className="text-xl font-extrabold text-emerald-400 font-mono">{metrics.maintainabilityIndex} / 100</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400">Estimated Technical Debt</div>
          <div className="text-xl font-extrabold text-amber-400 font-mono">{metrics.technicalDebtHours} hrs</div>
        </div>
      </div>

      {/* Lines of Code Breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-md">
        <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-400" />
          <span>Code vs Comments vs Blank Lines</span>
        </h3>
        
        {/* Multi-segmented progress bar */}
        <div className="w-full bg-slate-800 h-4 rounded-full overflow-hidden flex">
          <div
            className="bg-indigo-500 h-full transition-all"
            style={{ width: `${Math.round((metrics.codeLines / metrics.totalLoc) * 100)}%` }}
            title="Executable Code Lines"
          />
          <div
            className="bg-emerald-500 h-full transition-all"
            style={{ width: `${Math.round((metrics.commentLines / metrics.totalLoc) * 100)}%` }}
            title="Comment Lines"
          />
          <div
            className="bg-slate-600 h-full transition-all"
            style={{ width: `${Math.round((metrics.blankLines / metrics.totalLoc) * 100)}%` }}
            title="Blank Lines"
          />
        </div>

        <div className="grid grid-cols-3 gap-4 text-center text-xs">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-400">Source Code Lines</span>
            <div className="font-bold text-indigo-400 font-mono text-sm">{metrics.codeLines.toLocaleString()}</div>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-400">Comments</span>
            <div className="font-bold text-emerald-400 font-mono text-sm">{metrics.commentLines.toLocaleString()}</div>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-400">Blank Lines</span>
            <div className="font-bold text-slate-300 font-mono text-sm">{metrics.blankLines.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Code Smells & Quality Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Code Smells & Anti-patterns */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
          <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Code Smells & Quality Audits</span>
          </h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">TODO Comments</span>
              <span className="font-mono text-amber-400 font-semibold">{metrics.todoCount} found</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">FIXME Comments</span>
              <span className="font-mono text-rose-400 font-semibold">{metrics.fixmeCount} found</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Code Smells Detected</span>
              <span className="font-mono text-amber-300 font-semibold">{metrics.codeSmellsCount} items</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Duplicate Code</span>
              <span className="font-mono text-slate-200">{metrics.duplicateCodePercentage}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Dead Code Suspects</span>
              <span className="font-mono text-slate-300">{metrics.deadCodeSuspects} files</span>
            </div>
          </div>
        </div>

        {/* Test & Build Stats */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
          <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2">
            <FileCheck2 className="w-4 h-4 text-emerald-400" />
            <span>Testing & Build Health</span>
          </h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Test Coverage</span>
              <span className="font-mono text-emerald-400 font-semibold">{metrics.testCoveragePct}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Documentation Coverage</span>
              <span className="font-mono text-indigo-300 font-semibold">{metrics.documentationCoveragePct}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Build Success Rate</span>
              <span className="font-mono text-emerald-400 font-semibold">{metrics.buildSuccessRatePct}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Avg Cyclomatic Complexity</span>
              <span className="font-mono text-slate-200">{metrics.avgCyclomaticComplexity} (Low Risk)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Readability Score</span>
              <span className="font-mono text-sky-400 font-semibold">{metrics.readabilityScore} / 100</span>
            </div>
          </div>
        </div>

      </div>

      {/* Largest Files Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-md">
        <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-indigo-400" />
          <span>Largest Files in Codebase</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-3">File Path</th>
                <th className="p-3">Size</th>
                <th className="p-3">Lines</th>
                <th className="p-3">Complexity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {metrics.largestFiles.map((file, i) => (
                <tr key={i} className="hover:bg-slate-800/50">
                  <td className="p-3 font-mono text-indigo-300 truncate max-w-md">{file.path}</td>
                  <td className="p-3 font-mono text-slate-300">{(file.size / 1024).toFixed(1)} KB</td>
                  <td className="p-3 font-mono text-slate-300">{file.lines.toLocaleString()}</td>
                  <td className="p-3 font-mono text-amber-400">{file.complexity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
