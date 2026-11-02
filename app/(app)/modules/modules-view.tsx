'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowUpRight, FileCode, Activity, ShieldAlert } from 'lucide-react'
import { api, FileTreeError } from '@/lib/api/client'
import { useAnalysis } from '@/context/AnalysisContext'
import { ModuleIcon } from '@/components/ui/Icon'
import { Card } from '@/components/ui/Card'
import type { ModuleRecord, ModuleWithFunctions } from '@/lib/types'

export function ModulesView() {
  const { containerId: sessionContainerId } = useAnalysis()
  const params = useSearchParams()
  const containerId = params.get('containerId') ?? sessionContainerId

  // Remount on container change so fetch state resets without setState-in-effect.
  return <ModulesPane key={containerId ?? 'none'} containerId={containerId} />
}

function ModulesPane({ containerId }: { containerId: string | null }) {
  const [real, setReal] = useState<ModuleWithFunctions[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(containerId))

  useEffect(() => {
    if (!containerId) return

    let cancelled = false

    api
      .getModulesFromContainer(containerId)
      .then((modules) => {
        if (cancelled) return
        setReal(modules)
        setError(null)
        setLoading(false)
      })
      .catch((cause: unknown) => {
        if (cancelled) return
        setReal(null)
        setError(cause instanceof FileTreeError ? cause.message : 'Could not load modules.')
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [containerId])

  const isReal = Boolean(containerId) && real !== null
  const modules: ModuleRecord[] = isReal ? real!.map((entry) => entry.module) : api.getModules()
  const showSampleBanner = !loading && (Boolean(error) || !containerId)

  if (loading && containerId) {
    return (
      <div className="space-y-6 animate-fade-up">
        <div className="space-y-2">
          <div className="h-3 w-24 animate-pulse rounded bg-white/5" />
          <div className="h-7 w-56 animate-pulse rounded bg-white/10" />
          <div className="h-4 w-96 max-w-full animate-pulse rounded bg-white/5" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl border border-edge bg-card" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">Modules</div>
          <h1 className="mt-1 text-2xl font-bold text-white">Detected Modules</h1>
          <p className="mt-1 max-w-2xl text-sm text-white/50">
            The scanner groups source files into functional modules. Click a module to inspect its analysis.
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
            ? `Live modules unavailable (${error}). Showing sample data.`
            : 'No container session — showing sample data. Run an analysis to see the repository\u2019s real modules.'}
        </div>
      )}

      {isReal && modules.length === 0 ? (
        <Card>
          <p className="py-6 text-center text-sm text-white/50">
            No module directories were detected in this repository.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => (
            <Link
              key={m.id}
              href={`/modules/${m.id}${containerId && isReal ? `?containerId=${encodeURIComponent(containerId)}` : ''}`}
              className="group rounded-2xl border border-edge bg-card p-5 transition-all hover:border-primary/30 hover:shadow-lime-glow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ModuleIcon name={m.icon} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white group-hover:text-primary/90">{m.name}</div>
                    <div className="text-[11px] text-white/40">{m.id}</div>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-white/20 transition-colors group-hover:text-primary" />
              </div>

              <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-white/50">{m.description}</p>

              <div className="mt-4 flex items-center gap-4 border-t border-edge pt-3.5 text-xs text-white/55">
                <span className="flex items-center gap-1.5">
                  <FileCode className="h-3.5 w-3.5 text-white/30" />
                  {m.files} files
                </span>
                <span className="flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-white/30" />
                  {m.functions} functions
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
