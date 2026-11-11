'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  ArrowRight,
  Boxes,
  Database,
  FileCode2,
  Flame,
  ListChecks,
  Loader2,
  RefreshCw,
  Rocket,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Workflow,
  Package,
} from 'lucide-react'
import { Card, SectionTitle } from '@/components/ui/Card'
import { api, FileTreeError } from '@/lib/api/client'
import { useAnalysis } from '@/context/AnalysisContext'
import type { DeepAnalysis } from '@/lib/types'

function FileChips({ files }: { files: string[] }) {
  if (files.length === 0) return null
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {files.slice(0, 8).map((f, i) => {
        const match = f.match(/^(.*):(\d+)$/)
        const path = match ? match[1] : f
        const line = match ? match[2] : null
        return (
          <span
            key={`${f}-${i}`}
            title={f}
            className="flex items-center gap-1 rounded-md border border-edge bg-card px-1.5 py-0.5 font-mono text-[10px] text-white/55"
          >
            <FileCode2 className="h-3 w-3 opacity-60" />
            <span className="max-w-[28rem] truncate">{path}</span>
            {line && <span className="rounded bg-primary/10 px-1 font-semibold text-primary/90">:{line}</span>}
          </span>
        )
      })}
    </div>
  )
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 text-sm leading-relaxed text-white/75">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function DeepAnalysisSkeleton() {
  return (
    <div className="space-y-6 animate-fade-up">
      <div className="h-40 animate-pulse rounded-xl border border-edge bg-card" />
      <div className="h-64 animate-pulse rounded-xl border border-edge bg-card" />
      <div className="h-64 animate-pulse rounded-xl border border-edge bg-card" />
    </div>
  )
}

function RerunButton({ onClick, busy, label = 'Re-run analysis' }: { onClick: () => void; busy: boolean; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
      {busy ? 'Re-analyzing…' : label}
    </button>
  )
}

/** Shown when the container has no cached analysis at all. */
function Unavailable({ onRerun, busy }: { onRerun: () => void; busy: boolean }) {
  return (
    <Card className="animate-fade-up">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white/90">No analysis is cached for this repository</div>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/55">
            Run the analysis again to read the source and build the report. If the container has expired, start a new
            analysis from the home page.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <RerunButton onClick={onRerun} busy={busy} />
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-lg border border-edge px-3 py-1.5 text-xs font-semibold text-white/70 transition-colors hover:text-white"
            >
              Analyze another repository <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </Card>
  )
}

/** Shown above a deterministic report, explaining how to get the AI one. */
function DeterministicNotice({
  aiAvailable,
  onRerun,
  busy,
}: {
  aiAvailable: boolean
  onRerun: () => void
  busy: boolean
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-edge bg-card px-4 py-3">
      <div className="flex items-start gap-2.5">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="max-w-2xl text-xs leading-relaxed text-white/60">
          <span className="font-semibold text-white/85">Static analysis report.</span>{' '}
          {aiAvailable
            ? 'AI is configured, but this report was built deterministically (the analysis predates the key). Re-run to generate the narrative AI report.'
            : 'Built directly from the code facts — no API key required. Add OPENAI_API_KEY or ANTHROPIC_API_KEY and re-run for a narrative AI report with deeper reasoning.'}
        </p>
      </div>
      <RerunButton onClick={onRerun} busy={busy} label="Re-run" />
    </div>
  )
}

export function DeepAnalysisView() {
  const { containerId: ctxContainer } = useAnalysis()
  const searchParams = useSearchParams()
  const containerId = searchParams.get('containerId') ?? ctxContainer
  return <DeepAnalysisPane key={containerId ?? 'none'} containerId={containerId} />
}

function DeepAnalysisPane({ containerId }: { containerId: string | null }) {
  const [report, setReport] = useState<DeepAnalysis | null>(null)
  const [aiAvailable, setAiAvailable] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(containerId))
  const [rerunning, setRerunning] = useState(false)

  useEffect(() => {
    if (!containerId) return
    let cancelled = false

    api
      .getDeepAnalysis(containerId)
      .then((data) => {
        if (cancelled) return
        setReport(data.report)
        setAiAvailable(data.aiAvailable)
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof FileTreeError ? err.message : 'Could not load the deep analysis.')
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [containerId])

  const rerun = useCallback(async () => {
    if (!containerId) return
    setRerunning(true)
    setError(null)
    try {
      await api.rerunAnalysis(containerId)
      const data = await api.getDeepAnalysis(containerId)
      setReport(data.report)
      setAiAvailable(data.aiAvailable)
    } catch (err) {
      setError(err instanceof FileTreeError ? err.message : 'Re-analysis failed. Check that Docker is running.')
    } finally {
      setRerunning(false)
    }
  }, [containerId])

  if (loading) return <DeepAnalysisSkeleton />

  if (!containerId) {
    return (
      <Card className="animate-fade-up">
        <p className="text-sm text-white/55">
          No analysis session yet. Run an analysis from the{' '}
          <Link href="/" className="font-semibold text-primary hover:text-primary/80">
            home page
          </Link>{' '}
          to generate a deep analysis.
        </p>
      </Card>
    )
  }

  const errorBanner = error ? (
    <div className="flex items-center gap-2 rounded-xl border border-amber-800/50 bg-amber-950/40 px-4 py-3 text-xs font-medium text-amber-300">
      <ShieldAlert className="h-4 w-4 shrink-0" />
      {error}
    </div>
  ) : null

  if (!report) {
    return (
      <div className="space-y-4">
        {errorBanner}
        <Unavailable onRerun={rerun} busy={rerunning} />
      </div>
    )
  }

  // Older cached AI reports predate the `source` field; only an explicit
  // `deterministic` marker means the report was built without a model.
  const isAi = report.source !== 'deterministic'

  return (
    <div className="space-y-6 animate-fade-up">
      {errorBanner}
      {!isAi && <DeterministicNotice aiAvailable={aiAvailable} onRerun={rerun} busy={rerunning} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
          Generated from source, not the repository page
        </div>
        <div className="flex items-center gap-2">
          <span
            className="flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary"
            title={isAi ? `Generated by ${report.model}` : 'Built deterministically from static analysis'}
          >
            <Sparkles className="h-3 w-3" /> {isAi ? report.model : 'Static analysis'}
          </span>
          {isAi && <RerunButton onClick={rerun} busy={rerunning} label="Re-run" />}
        </div>
      </div>

      {/* Purpose / what it does */}
      <Card>
        <SectionTitle>Purpose</SectionTitle>
        <p className="mt-3 text-sm leading-relaxed text-white/80">{report.purpose}</p>
        {report.whatItDoes && <p className="mt-3 text-sm leading-relaxed text-white/65">{report.whatItDoes}</p>}
      </Card>

      {/* Architecture */}
      {report.architecture.length > 0 && (
        <Card>
          <div className="flex items-center gap-2">
            <Boxes className="h-4 w-4 text-primary" />
            <SectionTitle>Architecture</SectionTitle>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {report.architecture.map((a, i) => (
              <div key={`${a.component}-${i}`} className="rounded-xl border border-edge bg-shell p-4">
                <div className="text-sm font-semibold text-white/90">{a.component}</div>
                <p className="mt-1 text-xs leading-relaxed text-white/60">{a.responsibility}</p>
                {a.connectsTo.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {a.connectsTo.slice(0, 6).map((c, ci) => (
                      <span key={`${c}-${ci}`} className="rounded-md border border-edge bg-card px-1.5 py-0.5 text-[10px] text-white/50">
                        → {c}
                      </span>
                    ))}
                  </div>
                )}
                <FileChips files={a.files ?? []} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Data flow */}
      {report.dataFlow.length > 0 && (
        <Card>
          <div className="flex items-center gap-2">
            <Workflow className="h-4 w-4 text-primary" />
            <SectionTitle>How it works</SectionTitle>
          </div>
          <ol className="mt-4 space-y-4">
            {report.dataFlow.map((step, i) => (
              <li key={i} className="flex gap-3.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white/85">{step.step}</div>
                  {step.detail && <p className="mt-0.5 text-xs leading-relaxed text-white/55">{step.detail}</p>}
                  <FileChips files={step.files} />
                </div>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* Domain model */}
      {report.domainModel.length > 0 && (
        <Card>
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            <SectionTitle>Domain Model</SectionTitle>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {report.domainModel.map((entity, ei) => (
              <div key={`${entity.entity}-${ei}`} className="rounded-xl border border-edge bg-shell p-4">
                <div className="text-sm font-semibold text-white/90">{entity.entity}</div>
                {entity.file && (
                  <div className="mt-0.5 truncate font-mono text-[10px] text-white/40" title={`${entity.file}${entity.line ? `:${entity.line}` : ''}`}>
                    {entity.file}
                    {entity.line ? `:${entity.line}` : ''}
                  </div>
                )}
                {entity.fields.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {entity.fields.slice(0, 12).map((f, fi) => (
                      <span
                        key={`${f}-${fi}`}
                        title={f}
                        className="max-w-full whitespace-normal break-words rounded border border-edge bg-card px-1.5 py-0.5 font-mono text-[10px] text-white/50"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                )}
                {entity.relations.length > 0 && (
                  <div className="mt-2 text-[11px] text-white/45">{entity.relations.join(' · ')}</div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Key modules */}
      {report.keyModules.length > 0 && (
        <Card>
          <SectionTitle>Key Modules</SectionTitle>
          <div className="mt-4 space-y-3">
            {report.keyModules.map((m, mi) => (
              <div key={`${m.name}-${mi}`} className="rounded-xl border border-edge bg-shell p-4">
                <div className="text-sm font-semibold text-white/90">{m.name}</div>
                <p className="mt-1 text-xs leading-relaxed text-white/60">{m.role}</p>
                <FileChips files={m.keyFiles} />
                {m.symbols && m.symbols.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {m.symbols.slice(0, 10).map((s, si) => (
                      <span
                        key={`${s}-${si}`}
                        title="Declared symbol"
                        className="rounded border border-edge bg-card px-1.5 py-0.5 font-mono text-[10px] text-white/50"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Churn hotspots */}
      {report.hotspots && report.hotspots.length > 0 && (
        <Card>
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-primary" />
            <SectionTitle>Churn Hotspots</SectionTitle>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-white/45">
            Files changed most often in the recent history, weighted by change volume and code size. These are the
            likeliest places for hidden risk.
          </p>
          <div className="mt-4 space-y-2">
            {report.hotspots.map((h, i) => (
              <div
                key={`${h.file}-${i}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-edge bg-shell px-3 py-2"
              >
                <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-white/70" title={h.file}>
                  {h.file}
                </span>
                <span className="flex shrink-0 items-center gap-3 text-[10px] text-white/45">
                  <span>
                    {h.commits} commit{h.commits === 1 ? '' : 's'}
                  </span>
                  <span className="text-emerald-400/80">+{h.insertions}</span>
                  <span className="text-rose-400/80">−{h.deletions}</span>
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 font-semibold text-primary">score {h.score}</span>
                </span>
              </div>
            ))}
          </div>
          {(report.commitCount != null || (report.contributors?.length ?? 0) > 0) && (
            <div className="mt-3 text-[11px] text-white/40">
              {report.commitCount != null && <>{report.commitCount} commits in history</>}
              {report.contributors && report.contributors.length > 0 && (
                <>
                  {report.commitCount != null ? ' · ' : ''}
                  Top contributors:{' '}
                  {report.contributors
                    .slice(0, 3)
                    .map((c) => `${c.name} (${c.commits})`)
                    .join(', ')}
                </>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Tech stack */}
      {report.techStack.length > 0 && (
        <Card>
          <SectionTitle>Technology</SectionTitle>
          <div className="mt-4 space-y-2.5">
            {report.techStack.map((t, ti) => (
              <div key={`${t.name}-${ti}`} className="flex items-start gap-2.5 text-xs">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>
                  <span className="font-semibold text-white/85">{t.name}</span>
                  {t.role && <span className="text-white/55"> — {t.role}</span>}
                  {t.why && <span className="block text-white/40">{t.why}</span>}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Dependencies */}
      {report.totalDependencies !== undefined && report.totalDependencies > 0 && report.dependencyHealth && (
        <Card>
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            <SectionTitle>Dependencies</SectionTitle>
          </div>
          <div className="mt-4">
            <div className="flex flex-wrap gap-2 text-xs text-white/55">
              <span className="rounded bg-primary/10 px-2 py-1">
                {report.totalDependencies} total
              </span>
              {report.dependencyHealth.vulnerable > 0 && (
                <span className="rounded bg-orange-500/30 px-2 py-1 text-orange-300">
                  {report.dependencyHealth.vulnerable} vulnerable
                </span>
              )}
              {report.dependencyHealth.review > 0 && (
                <span className="rounded bg-amber-500/30 px-2 py-1 text-amber-300">
                  {report.dependencyHealth.review} review
                </span>
              )}
              {report.dependencyHealth.healthy > 0 && (
                <span className="rounded bg-emerald-500/30 px-2 py-1 text-emerald-300">
                  {report.dependencyHealth.healthy} healthy
                </span>
              )}
            </div>
            {report.totalDependencies > 0 && (
              <p className="mt-2 text-[10px] text-white/40">
                {report.totalDependencies} dependency{report.totalDependencies === 1 ? '' : 'es'}{' '}
                {report.dependencyHealth.vulnerable === 0 && report.dependencyHealth.review === 0
                  ? 'all resolved'
                  : `${report.dependencyHealth.vulnerable} vulnerable, ${report.dependencyHealth.review} need review`}
              </p>
            )}
          </div>
        </Card>
      )}

      {/* How to run */}
      {report.howToRun.length > 0 && (
        <Card>
          <div className="flex items-center gap-2">
            <Rocket className="h-4 w-4 text-primary" />
            <SectionTitle>How to Run</SectionTitle>
          </div>
          <div className="mt-4">
            <Bullets items={report.howToRun} />
          </div>
        </Card>
      )}

      {/* Onboarding */}
      {report.onboarding.length > 0 && (
        <Card>
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-primary" />
            <SectionTitle>Where to Start</SectionTitle>
          </div>
          <div className="mt-4">
            <Bullets items={report.onboarding} />
          </div>
        </Card>
      )}

      {/* Strengths + risks */}
      {(report.strengths.length > 0 || report.risks.length > 0) && (
        <div className="grid gap-6 sm:grid-cols-2">
          {report.strengths.length > 0 && (
            <Card className="border-emerald-900/40">
              <div className="flex items-center gap-2 text-emerald-400">
                <TrendingUp className="h-4 w-4" />
                <SectionTitle>Strengths</SectionTitle>
              </div>
              <div className="mt-4">
                <Bullets items={report.strengths} />
              </div>
            </Card>
          )}
          {report.risks.length > 0 && (
            <Card className="border-amber-900/40">
              <div className="flex items-center gap-2 text-amber-400">
                <TrendingDown className="h-4 w-4" />
                <SectionTitle>Risks</SectionTitle>
              </div>
              <div className="mt-4">
                <Bullets items={report.risks} />
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}