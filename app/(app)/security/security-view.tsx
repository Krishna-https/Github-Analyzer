'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowRight, ShieldAlert } from 'lucide-react'
import { api, FileTreeError } from '@/lib/api/client'
import { useAnalysis } from '@/context/AnalysisContext'
import { Card, SectionTitle } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { SeverityBadge } from '@/components/ui/Badge'
import type { SecurityFinding, Severity } from '@/lib/types'

const EMPTY_COUNTS: Record<Severity, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 }

function countBySeverity(findings: SecurityFinding[]): Record<Severity, number> {
  const counts: Record<Severity, number> = { ...EMPTY_COUNTS }
  for (const finding of findings) counts[finding.severity] += 1
  return counts
}

export function SecurityView() {
  const { containerId: sessionContainerId } = useAnalysis()
  const params = useSearchParams()
  const containerId = params.get('containerId') ?? sessionContainerId

  // Remount on container change so fetch state resets without setState-in-effect.
  return <SecurityPane key={containerId ?? 'none'} containerId={containerId} />
}

function SecurityPane({ containerId }: { containerId: string | null }) {
  const [real, setReal] = useState<SecurityFinding[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(containerId))

  useEffect(() => {
    if (!containerId) return

    let cancelled = false

    api
      .getSecurityFindingsFromContainer(containerId)
      .then((findings) => {
        if (cancelled) return
        setReal(findings)
        setError(null)
        setLoading(false)
      })
      .catch((cause: unknown) => {
        if (cancelled) return
        setReal(null)
        setError(cause instanceof FileTreeError ? cause.message : 'Could not load security findings.')
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [containerId])

  const isReal = Boolean(containerId) && real !== null
  const findings = useMemo(
    () => (isReal ? real! : api.getSecurityFindings()),
    [isReal, real]
  )
  const counts = useMemo(() => countBySeverity(findings), [findings])
  const showSampleBanner = !loading && (Boolean(error) || !containerId)

  if (loading && containerId) {
    return (
      <div className="space-y-6 animate-fade-up">
        <div className="space-y-2">
          <div className="h-3 w-24 animate-pulse rounded bg-white/5" />
          <div className="h-7 w-56 animate-pulse rounded bg-white/10" />
          <div className="h-4 w-96 max-w-full animate-pulse rounded bg-white/5" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-edge bg-card" />
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
          <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">Security</div>
          <h1 className="mt-1 text-2xl font-bold text-white">Security Analysis</h1>
          <p className="mt-1 max-w-2xl text-sm text-white/50">
            Deterministic rule-engine results across the codebase. Every finding includes exact file, line
            and evidence.
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
            ? `Live security analysis unavailable (${error}). Showing sample data.`
            : 'No container session — showing sample data. Run an analysis to see the repository\u2019s real security findings.'}
        </div>
      )}

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
                      href={`/findings/${f.id}${isReal && containerId ? `?containerId=${encodeURIComponent(containerId)}` : ''}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-edge px-3 py-1 text-[11px] font-semibold text-white/50 transition-colors hover:border-primary/30 hover:text-primary"
                    >
                      View <ArrowRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
              {findings.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-white/40">
                    {isReal
                      ? 'No security findings were detected in this repository.'
                      : 'No findings to show.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
