import React from 'react';
import { DependencyAnalysis } from '../../types';
import { Package, AlertCircle, HardDrive, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface DependencyModuleProps {
  dependencies: DependencyAnalysis;
}

export const DependencyModule: React.FC<DependencyModuleProps> = ({ dependencies }) => {
  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400">Total Packages</div>
          <div className="text-xl font-extrabold text-indigo-400 font-mono">{dependencies.totalPackages}</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400">Direct Dependencies</div>
          <div className="text-xl font-extrabold text-sky-400 font-mono">{dependencies.directDependenciesCount}</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400">Outdated Libraries</div>
          <div className="text-xl font-extrabold text-amber-400 font-mono">{dependencies.outdatedLibraries.length}</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400">Total Dependency Size</div>
          <div className="text-xl font-extrabold text-emerald-400 font-mono">{dependencies.totalDependencySizeMb} MB</div>
        </div>
      </div>

      {/* Package Dependency Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-md">
        <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
          <Package className="w-5 h-5 text-indigo-400" />
          <span>Package Dependencies & Versions</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-3">Package Name</th>
                <th className="p-3">Type</th>
                <th className="p-3">Installed</th>
                <th className="p-3">Latest</th>
                <th className="p-3">Size</th>
                <th className="p-3">Risk Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {dependencies.dependencies.map((dep, idx) => (
                <tr key={idx} className="hover:bg-slate-800/50">
                  <td className="p-3 font-mono font-bold text-indigo-300">{dep.name}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                      dep.isDev ? 'bg-purple-500/20 text-purple-300' : 'bg-sky-500/20 text-sky-300'
                    }`}>
                      {dep.isDev ? 'dev' : 'prod'}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-slate-300">{dep.version}</td>
                  <td className="p-3 font-mono text-emerald-400">{dep.latestVersion}</td>
                  <td className="p-3 font-mono text-slate-400">{dep.sizeKb} KB</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold uppercase text-[10px]">
                      {dep.riskScore}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
