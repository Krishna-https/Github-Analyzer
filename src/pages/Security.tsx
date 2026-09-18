import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { api } from '../api/client'
import { Card, SectionTitle } from '../components/ui/Card'
import { StatCard } from '../components/ui/StatCard'
import { SeverityBadge } from '../components/ui/Badge'
import { getSecurityCounts } from '../data/mockData'

export default function Security() {
  const findings = api.getSecurityFindings()
  const counts = getSecurityCounts()

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">Security</div>
        <h1 className="mt-1 text-2xl font-bold text-white">Security Analysis</h1>
        <p className="mt-1 max-w-2xl text-sm text-white/50">
          Deterministic rule-engine results across the codebase. Every finding includes exact file, line
          and evidence.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Critical" value={<span className="text-red-400">{counts.Critical}</span>} />
        <StatCard label="High" value={<span className="text-orange-400">{counts.High}</span>} />
        <StatCard label="Medium" value={<span className="text-amber-400">{counts.Medium}</span>} />
        <StatCard label="Low" value={<span className="text-sky-400">{counts.Low}</span>} />
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <SectionTitle>Findings</SectionTitle>
          <span className="text-[10px] text-white/30">{findings.length} total findings</span>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-edge text-[10px] font-bold uppercase tracking-wider text-white/35">
              <tr>
                <th className="pb-2 pr-4 font-semibold">Severity</th>
                <th className="pb-2 pr-4 font-semibold">Rule</th>
                <th className="pb-2 pr-6 font-semibold">Issue</th>
                <th className="pb-2 pr-6 font-semibold">File</th>
                <th className="pb-2 pr-6 text-right font-semibold">Line</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge/50 text-white/65">
              {findings.map((f) => (
                <tr key={f.id} className="group hover:bg-edge/30">
                  <td className="py-2.5 pr-4"><SeverityBadge severity={f.severity} /></td>
                  <td className="py-2.5 pr-4 font-mono text-white/50">{f.ruleId}</td>
                  <td className="py-2.5 pr-6 font-medium text-white/85">{f.title}</td>
                  <td className="py-2.5 pr-6 font-mono text-white/45">{f.file}</td>
                  <td className="py-2.5 pr-6 text-right tabular-nums font-mono text-white/45">{f.line}</td>
                  <td className="py-2.5 text-right">
                    <Link
                      to={`/findings/${f.id}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-edge px-3 py-1 text-[11px] font-semibold text-white/50 transition-colors hover:border-primary/30 hover:text-primary"
                    >
                      View <ArrowRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}