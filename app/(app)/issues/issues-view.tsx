'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowRight, ShieldAlert } from 'lucide-react'
import { api, FileTreeError } from '@/lib/api/client'
import { useAnalysis } from '@/context/AnalysisContext'
import { Card, SectionTitle } from '@/components/ui/Card'
import { SeverityBadge, StatusBadge } from '@/components/ui/Badge'
import type { Issue } from '@/lib/types'

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

export function IssuesView() {
  const { containerId: sessionContainerId } = useAnalysis()
  const params = useSearchParams()
  const containerId = params.get('containerId') ?? sessionContainerId

  // Remount on container change so fetch state resets without setState-in-effect.
  return <IssuesPane key={containerId ?? 'none'} containerId={containerId} />
}

function IssuesPane({ containerId }: { containerId: string | null }) {
  const [active, setActive] = useState('All')
  const [real, setReal] = useState<Issue[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(containerId))

  useEffect(() => {
    if (!containerId) return

    let cancelled = false

    api
      .getIssuesFromContainer(containerId)
      .then((issues) => {
        if (cancelled) return
        setReal(issues)
        setError(null)
        setLoading(false)
      })
      .catch((cause: unknown) => {
        if (cancelled) return
        setReal(null)
        setError(cause instanceof FileTreeError ? cause.message : 'Could not load issues.')
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [containerId])

  const isReal = Boolean(containerId) && real !== null
  const allIssues = useMemo(() => (isReal ? real! : api.getIssues()), [isReal, real])
  const filtered = active === 'All' ? allIssues : allIssues.filter((i) => i.category === active)
  const showSampleBanner = !loading && (Boolean(error) || !containerId)

  if (loading && containerId) {
    return (
      <div className="space-y-6 animate-fade-up">
        <div className="space-y-2">
          <div className="h-3 w-24 animate-pulse rounded bg-white/5" />
          <div className="h-7 w-56 animate-pulse rounded bg-white/10" />
          <div className="h-4 w-96 max-w-full animate-pulse rounded bg-white/5" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-7 w-20 animate-pulse rounded-full bg-white/5" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-2xl border border-edge bg-card" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">Issues</div>
          <h1 className="mt-1 text-2xl font-bold text-white">Potential Issues</h1>
          <p className="mt-1 max-w-2xl text-sm text-white/50">
            All detected issues across security, complexity, dependencies and code quality. Each row links to
            exact code evidence.
          </p>
        </div>
        {isReal ? (
          <div className="flex items-center gap-2 rounded-full border border-emerald-800/60 bg-emerald-950/60 px-3.5 py-1.5 text-xs font-semibold text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse-dot" />
            Analysis Complete
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-full border border-amber-800/50 bg-amber-950/50 px-3.5 py-1.5 text-xs font-semibold text-amber-400">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Sample Data
          </div>
        )}
      </div>

      {showSampleBanner && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-800/50 bg-amber-950/40 px-4 py-3 text-xs font-medium text-amber-300">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          {error
            ? `Live issue analysis unavailable (${error}). Showing sample data.`
            : 'No container session — showing sample data. Run an analysis to see the repository\u2019s real issues.'}
        </div>
      )}

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
                      href={`/findings/${issue.refId}${isReal && containerId ? `?containerId=${encodeURIComponent(containerId)}` : ''}`}
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
