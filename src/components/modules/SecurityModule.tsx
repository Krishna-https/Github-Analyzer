import React from 'react';
import { SecurityAnalysis } from '../../types';
import { ShieldCheck, ShieldAlert, Key, Lock, AlertOctagon, FileWarning, CheckCircle2 } from 'lucide-react';

interface SecurityModuleProps {
  security: SecurityAnalysis;
}

export const SecurityModule: React.FC<SecurityModuleProps> = ({ security }) => {
  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Security Score Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className={`p-3.5 rounded-2xl border ${
            security.securityScore >= 90 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
          }`}>
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Repository Security Audit Score</h2>
            <p className="text-xs text-slate-400">Automated SAST & CVE vulnerability scanner results</p>
          </div>
        </div>

        <div className="text-center bg-slate-950 p-4 rounded-xl border border-slate-800 min-w-[160px]">
          <div className="text-3xl font-black text-emerald-400 font-mono">{security.securityScore} / 100</div>
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-1">Audit Grade: A+</div>
        </div>
      </div>

      {/* Secret Detection Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400">Secrets / Hardcoded Keys</div>
          <div className="text-xl font-extrabold text-emerald-400 font-mono">{security.secretsDetectedCount} found</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400">Vulnerabilities (CVEs)</div>
          <div className="text-xl font-extrabold text-sky-400 font-mono">{security.vulnerabilities.length} items</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400">License Risk Flags</div>
          <div className="text-xl font-extrabold text-emerald-400 font-mono">{security.licenseRisksCount}</div>
        </div>
      </div>

      {/* CVE & Vulnerability List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-md">
        <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
          <AlertOctagon className="w-5 h-5 text-amber-400" />
          <span>Dependency Vulnerability Advisory List</span>
        </h3>

        {security.vulnerabilities.length === 0 ? (
          <div className="p-6 text-center bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <div className="font-semibold text-sm text-slate-200">No High or Critical Vulnerabilities Detected</div>
            <p className="text-xs text-slate-400">All scanned package dependencies comply with standard security policies.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {security.vulnerabilities.map((vuln) => (
              <div key={vuln.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-100 font-mono">{vuln.package}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      vuln.severity === 'critical' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {vuln.severity}
                    </span>
                  </div>
                  {vuln.cve && <span className="text-xs font-mono text-slate-400">{vuln.cve}</span>}
                </div>
                <p className="text-xs text-slate-300">{vuln.title}</p>
                <div className="text-xs text-emerald-400 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                  <span className="font-semibold">Fix Recommendation:</span> {vuln.recommendation}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
