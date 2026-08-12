import React from 'react';
import { CicdAnalysis } from '../../types';
import { Workflow, CheckCircle2, XCircle, Clock, Zap, Rocket } from 'lucide-react';

interface CicdModuleProps {
  cicd: CicdAnalysis;
}

export const CicdModule: React.FC<CicdModuleProps> = ({ cicd }) => {
  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400">Total CI/CD Workflows</div>
          <div className="text-xl font-extrabold text-indigo-400 font-mono">{cicd.totalWorkflows}</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400">Workflow Success Rate</div>
          <div className="text-xl font-extrabold text-emerald-400 font-mono">{cicd.workflowSuccessRatePct}%</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400">Avg Build Duration</div>
          <div className="text-xl font-extrabold text-sky-400 font-mono">{cicd.avgBuildDurationSeconds}s</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400">Deploy Frequency / Wk</div>
          <div className="text-xl font-extrabold text-purple-400 font-mono">{cicd.deploymentFrequencyPerWeek}</div>
        </div>
      </div>

      {/* Recent Workflow Runs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-md">
        <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
          <Workflow className="w-5 h-5 text-indigo-400" />
          <span>Recent GitHub Actions Workflow Runs</span>
        </h3>

        <div className="space-y-3">
          {cicd.recentRuns.map((run) => (
            <div key={run.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                {run.status === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                )}
                <div>
                  <div className="font-bold text-slate-100 font-mono">{run.name}</div>
                  <div className="text-slate-400">Trigger: <span className="text-indigo-300">{run.event}</span></div>
                </div>
              </div>

              <div className="flex items-center gap-4 font-mono text-slate-300">
                <span>{run.durationSeconds}s</span>
                <span className="text-slate-500">{new Date(run.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
