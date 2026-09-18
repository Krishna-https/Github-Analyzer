import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { api } from '../api/client'
import { Card, SectionTitle } from '../components/ui/Card'
import { SeverityBadge, StatusBadge } from '../components/ui/Badge'

const CATEGORIES = ['All', 'Security', 'Complexity', 'Maintainability', 'Dependencies', 'Code Quality']

const categoryStyles: Record<string, string> = {
  All: 'border-primary bg-primary/10 text-primary',
  Security: 'border-orange-700/50 bg-orange-950/40 text-orange-300',
  Complexity: 'border-amber-700/50 bg-amber-950/40 text-amber-300',
  Maintainability: 'border-sky-700/50 bg-sky-950/40 text-sky-300',
  Dependencies: 'border-purple-700/50 bg-purple-950/40 text-purple-300',
  'Code Quality': 'border-emerald-700/50 bg-emerald-950/40 text-emerald-300',
}

const activeStyles: Record<string, string> = {
  All: 'border-primary bg-primary text-black',
  Security: 'border-orange-500 bg-orange-500 text-black',
  Complexity: 'border-amber-500 bg-amber-500 text-black',
  Maintainability: 'border-sky-500 bg-sky-500 text-black',
  Dependencies: 'border-purple-500 bg-purple-500 text-black',
  'Code Quality': 'border-emerald-500 bg-emerald-500 text-black',
}

export default function Issues() {
  const [active, setActive] = useState('All')
  const allIssues = api.getIssues()
  const filtered = active === 'All' ? allIssues : allIssues.filter((i) => i.category === active)

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">Issues</div>
        <h1 className="mt-1 text-2xl font-bold text-white">Potential Issues</h1>
        <p className="mt-1 max-w-2xl text-sm text-white/50">
          All detected issues across security, complexity, dependencies and code quality. Each row links to
          exact code evidence.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setActive(c)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
              active === c ? activeStyles[c] : categoryStyles[c]
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <SectionTitle>
            {active === 'All' ? 'All Issues' : active}
          </SectionTitle>
          <span className="text-[10px] text-white/30">{filtered.length} issues</span>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-edge text-[10px] font-bold uppercase tracking-wider text-white/35">
              <tr>
                <th className="pb-2 pr-4 font-semibold">Severity</th>
                <th className="pb-2 pr-6 font-semibold">Issue</th>
                <th className="pb-2 pr-6 font-semibold">File</th>
                <th className="pb-2 pr-6 text-right font-semibold">Line</th>
                <th className="pb-2 pr-6 font-semibold">Category</th>
                <th className="pb-2 pr-6 font-semibold">Status</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge/50 text-white/65">
              {filtered.map((issue) => (
                <tr key={issue.id} className="group hover:bg-edge/30">
                  <td className="py-2.5 pr-4"><SeverityBadge severity={issue.severity} /></td>
                  <td className="py-2.5 pr-6 font-medium text-white/85">{issue.title}</td>
                  <td className="py-2.5 pr-6 font-mono text-white/45">{issue.file}</td>
                  <td className="py-2.5 pr-6 text-right tabular-nums font-mono text-white/45">{issue.line}</td>
                  <td className="py-2.5 pr-6">
                    <span className="rounded-full border border-edge px-2 py-0.5 text-[10px] font-semibold text-white/50">
                      {issue.category}
                    </span>
                  </td>
                  <td className="py-2.5 pr-6">
                    <StatusBadge label={issue.status} />
                  </td>
                  <td className="py-2.5 text-right">
                    <Link
                      to={`/findings/${issue.refId}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-edge px-3 py-1 text-[11px] font-semibold text-white/50 transition-colors hover:border-primary/30 hover:text-primary"
                    >
                      View <ArrowRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-white/40">No issues in this category.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}