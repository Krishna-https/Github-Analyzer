'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Activity, ArrowUpRight, Search, ShieldAlert } from 'lucide-react'
import { api, FileTreeError } from '@/lib/api/client'
import { useAnalysis } from '@/context/AnalysisContext'
import { Card, SectionTitle } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { StatusBadge } from '@/components/ui/Badge'
import { ComplexityDonut } from '@/components/charts/ComplexityDonut'
import type { CodeAnalysisReport } from '@/lib/types'

const SAMPLE_STATS = [
  { label: 'Functions', value: '438', accent: true },
  { label: 'Classes', value: '34' },
  { label: 'Imports', value: '1,284' },
  { label: 'API Calls', value: '213' },
]

export function CodeAnalysisView() {
  const { containerId: sessionContainerId } = useAnalysis()
  const params = useSearchParams()
  const containerId = params.get('containerId') ?? sessionContainerId

  // Remount on container change so fetch state resets without setState-in-effect.
  return <CodePane key={containerId ?? 'none'} containerId={containerId} />
}

function CodePane({ containerId }: { containerId: string | null }) {
  const [report, setReport] = useState<CodeAnalysisReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(containerId))
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!containerId) return

    let cancelled = false

    api
      .getCodeAnalysis(containerId)
      .then((next) => {
        if (cancelled) return
        setReport(next)
        setError(null)
        setLoading(false)
      })
      .catch((cause: unknown) => {
        if (cancelled) return
        setReport(null)
        setError(cause instanceof FileTreeError ? cause.message : 'Could not load code analysis.')
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [containerId])

  const isReal = Boolean(containerId) && report !== null
  const functions = isReal ? report!.functions : api.getFunctions()
  const buckets = isReal ? report!.buckets : api.getComplexityBuckets()
  const complexityFindings = isReal ? report!.findings : api.getComplexityFindings()
  const showSampleBanner = !loading && (Boolean(error) || !containerId)

  const stats = isReal
    ? [
        { label: 'Functions', value: report!.stats.functions.toLocaleString(), accent: true },
        { label: 'Classes', value: report!.stats.classes.toLocaleString() },
        { label: 'Imports', value: report!.stats.imports.toLocaleString() },
        { label: 'API Routes', value: report!.stats.apiCalls.toLocaleString() },
      ]
    : SAMPLE_STATS

  const analyzed = isReal
    ? report!.functionsAnalyzed
    : buckets.reduce((total, bucket) => total + bucket.count, 0)

  const filtered = useMemo(() => {
    const query = search.toLowerCase()
    return functions.filter(
      (fn) =>
        !query ||
        fn.name.toLowerCase().includes(query) ||
        fn.file.toLowerCase().includes(query) ||
        fn.module.toLowerCase().includes(query)
    )
  }, [functions, search])

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
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="h-64 animate-pulse rounded-2xl border border-edge bg-card lg:col-span-3" />
          <div className="h-64 animate-pulse rounded-2xl border border-edge bg-card lg:col-span-2" />
        </div>
        <div className="h-64 animate-pulse rounded-2xl border border-edge bg-card" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">Code Analysis</div>
          <h1 className="mt-1 text-2xl font-bold text-white">Code Structure Analysis</h1>
          <p className="mt-1 max-w-2xl text-sm text-white/50">
            {isReal
              ? `Scan results across ${report!.stats.sourceFiles.toLocaleString()} source files. Function table, complexity distribution and high-complexity findings parsed from the repository.`
              : 'Scan results across 176 source files. Function table, complexity distribution and notable high-complexity findings.'}
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
            ? `Live code analysis unavailable (${error}). Showing sample data.`
            : 'No container session — showing sample data. Run an analysis to see the repository\u2019s real functions and complexity.'}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} accent={s.accent} />
        ))}
      </div>

      {/* Complexity overview */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between">
            <SectionTitle>Complexity Distribution</SectionTitle>
            <div className="flex items-center gap-3 text-[11px] text-white/45">
              <Activity className="h-3.5 w-3.5" />
              {analyzed.toLocaleString()} functions analyzed
            </div>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-white/45">
            Complexity indicates the number of independent execution paths detected in a function. High
            complexity can make code harder to test and maintain.
          </p>
          <ComplexityDonut buckets={buckets} />
          <div className="flex flex-wrap gap-4 mt-2">
            {buckets.map((b) => (
              <div key={b.name} className="flex items-center gap-2 text-xs text-white/55">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: b.color }} />
                {b.name}: <span className="font-mono text-white/75">{b.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
          {analyzed === 0 && (
            <p className="mt-3 rounded-lg border border-edge bg-shell px-3 py-2 text-[11px] text-white/45">
              No functions were parsed for this repository. Complexity metrics currently cover JavaScript,
              TypeScript and Python source.
            </p>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <SectionTitle>High Complexity Findings</SectionTitle>
          {complexityFindings.length === 0 ? (
            <p className="mt-3 rounded-xl border border-edge bg-shell px-3.5 py-4 text-xs text-white/45">
              No functions exceeded the high-complexity threshold
              {isReal ? ' in this repository.' : '.'}
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {complexityFindings.map((cf) => (
                <Link
                  key={cf.id}
                  href={`/findings/${cf.id}${isReal && containerId ? `?containerId=${encodeURIComponent(containerId)}` : ''}`}
                  className="group block rounded-xl border border-edge bg-shell p-3.5 transition-all hover:border-primary/30"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <div className="font-mono text-sm font-semibold text-white/85 group-hover:text-primary/90">
                        {cf.functionName}
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] text-white/40">
                        {cf.file}:{cf.line}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        cf.status === 'Critical'
                          ? 'bg-red-950/80 text-red-300 border border-red-800/60'
                          : 'bg-orange-950/80 text-orange-300 border border-orange-800/60'
                      }`}
                    >
                      {cf.status}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-white/50">
                    <span className="font-mono">CC {cf.cyclomatic}</span>
                    <span className="font-mono">Nesting {cf.nestingDepth}</span>
                    <span className="font-mono">{cf.lineCount} lines</span>
                  </div>
                  <ArrowUpRight className="mt-2 h-3.5 w-3.5 text-white/20 transition-colors group-hover:text-primary" />
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Function table */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTitle>Function Table</SectionTitle>
          <div className="flex items-center gap-2 rounded-lg border border-edge bg-shell px-3 py-2">
            <Search className="h-3.5 w-3.5 text-white/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search functions, files…"
              className="w-40 bg-transparent text-xs text-white placeholder-white/30 outline-none"
            />
          </div>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-edge text-[10px] font-bold uppercase tracking-wider text-white/35">
              <tr>
                <th className="pb-2 pr-6 font-semibold">Function</th>
                <th className="pb-2 pr-6 font-semibold">File</th>
                <th className="pb-2 pr-6 text-right font-semibold">Lines</th>
                <th className="pb-2 pr-6 text-right font-semibold">Complexity</th>
                <th className="pb-2 pr-6 text-right font-semibold">Calls</th>
                <th className="pb-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge/50 text-white/65">
              {filtered.map((fn) => (
                <tr key={`${fn.file}:${fn.line ?? fn.name}`} className="hover:bg-edge/30">
                  <td className="py-2.5 pr-6 font-mono text-white/80">{fn.name}</td>
                  <td className="py-2.5 pr-6 font-mono text-white/40">
                    {fn.file}
                    {fn.line ? <span className="text-white/25">:{fn.line}</span> : null}
                  </td>
                  <td className="py-2.5 pr-6 text-right tabular-nums">{fn.lines}</td>
                  <td className="py-2.5 pr-6 text-right tabular-nums">{fn.complexity}</td>
                  <td className="py-2.5 pr-6 text-right tabular-nums">{fn.calls}</td>
                  <td className="py-2.5">
                    <StatusBadge label={fn.status} />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-white/40">
                    No functions match the search.
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
