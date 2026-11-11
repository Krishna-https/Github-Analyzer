'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Package, ShieldAlert } from 'lucide-react'
import { api, FileTreeError } from '@/lib/api/client'
import { useAnalysis } from '@/context/AnalysisContext'
import { Card, SectionTitle } from '@/components/ui/Card'
import { depStatusColor, depStatusLabel } from '@/lib/colors'
import type { DependencyRecord } from '@/lib/types'

function countByStatus(deps: DependencyRecord[]): { healthy: number; review: number; vulnerable: number } {
  return {
    healthy: deps.filter((d) => d.status === 'healthy').length,
    review: deps.filter((d) => d.status === 'review').length,
    vulnerable: deps.filter((d) => d.status === 'vulnerable').length,
  }
}

export function DependenciesView() {
  const { containerId: sessionContainerId } = useAnalysis()
  const params = useSearchParams()
  const containerId = params.get('containerId') ?? sessionContainerId

  // Remount on container change so fetch state resets without setState-in-effect.
  return <DependenciesPane key={containerId ?? 'none'} containerId={containerId} />
}

function DependenciesPane({ containerId }: { containerId: string | null }) {
  const [real, setReal] = useState<DependencyRecord[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(containerId))

  useEffect(() => {
    if (!containerId) return

    let cancelled = false

    api
      .getDependenciesFromContainer(containerId)
      .then((deps) => {
        if (cancelled) return
        setReal(deps)
        setError(null)
        setLoading(false)
      })
      .catch((cause: unknown) => {
        if (cancelled) return
        setReal(null)
        setError(cause instanceof FileTreeError ? cause.message : 'Could not load dependencies.')
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [containerId])

  const isReal = Boolean(containerId) && real !== null
  const deps = useMemo(() => (isReal ? real! : api.getDependencies()), [isReal, real])
  const counts = useMemo(() => countByStatus(deps), [deps])
  const showSampleBanner = !loading && (Boolean(error) || !containerId)

  if (loading && containerId) {
    return (
      <div className="space-y-6 animate-fade-up">
        <div className="space-y-2">
          <div className="h-3 w-24 animate-pulse rounded bg-white/5" />
          <div className="h-7 w-56 animate-pulse rounded bg-white/10" />
          <div className="h-4 w-96 max-w-full animate-pulse rounded bg-white/5" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
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
          <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">Dependencies</div>
          <h1 className="mt-1 text-2xl font-bold text-white">Dependency Analysis</h1>
          <p className="mt-1 max-w-2xl text-sm text-white/50">
            {isReal
              ? `${deps.length} ${deps.length === 1 ? 'package' : 'packages'} parsed from the repository manifests.`
              : '76 packages resolved. Showing the 16 most relevant entries across frameworks, ORMs and client libraries.'}
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
            ? `Live dependency analysis unavailable (${error}). Showing sample data.`
            : 'No container session — showing sample data. Run an analysis to see the repository\u2019s real dependencies.'}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-edge bg-card p-4">
          <div className="text-2xl font-bold text-emerald-400">{counts.healthy}</div>
          <div className="text-[10px] uppercase tracking-wider text-white/40">Healthy</div>
        </div>
        <div className="rounded-xl border border-edge bg-card p-4">
          <div className="text-2xl font-bold text-amber-400">{counts.review}</div>
          <div className="text-[10px] uppercase tracking-wider text-white/40">Review</div>
        </div>
        <div className="rounded-xl border border-edge bg-card p-4">
          <div className="text-2xl font-bold text-red-400">{counts.vulnerable}</div>
          <div className="text-[10px] uppercase tracking-wider text-white/40">Vulnerable</div>
        </div>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <SectionTitle>Packages</SectionTitle>
          <span className="text-[10px] text-white/30">
            {isReal
              ? 'Status from manifest version ranges — not a vulnerability database'
              : 'Mock status indicators — not a real vulnerability database'}
          </span>
        </div>
        {deps.length === 0 ? (
          <p className="mt-3 rounded-lg border border-edge bg-shell px-3 py-2 text-xs text-white/45">
            {isReal
              ? 'No dependency manifests (package.json, requirements.txt, go.mod, Cargo.toml, composer.json) were found in this repository.'
              : 'No packages to show.'}
          </p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {deps.map((d) => (
              <div key={d.name} className="rounded-xl border border-edge bg-shell p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <Package className="h-4 w-4 text-white/30" />
                    <div>
                      <div className="font-mono text-sm font-semibold text-white/85">{d.name}</div>
                      <div className="font-mono text-[10px] text-white/40">{d.version}</div>
                    </div>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${depStatusColor[d.status]}`}>
                    {depStatusLabel[d.status]}
                  </span>
                </div>
                <div className="mt-2.5 text-[11px] font-medium text-white/45">{d.category}</div>
                {d.reason && (
                  <div className="mt-2 rounded-lg border border-amber-800/30 bg-amber-950/30 px-3 py-2 text-[11px] text-amber-200/70">
                    {d.reason}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
