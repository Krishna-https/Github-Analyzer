'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  ArrowRight,
  Boxes,
  Database,
  FileCode2,
  ListChecks,
  Rocket,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Workflow,
} from 'lucide-react'
import { Card, SectionTitle } from '@/components/ui/Card'
import { api, FileTreeError } from '@/lib/api/client'
import { useAnalysis } from '@/context/AnalysisContext'
import type { DeepAnalysis } from '@/lib/types'

function FileChips({ files }: { files: string[] }) {
  if (files.length === 0) return null
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {files.slice(0, 8).map((f) => (
        <span
          key={f}
          className="flex items-center gap-1 rounded-md border border-edge bg-card px-1.5 py-0.5 font-mono text-[10px] text-white/55"
        >
          <FileCode2 className="h-3 w-3 opacity-60" />
          {f}
        </span>
      ))}
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

/** Shown when the repo has an analysis but no AI report (no provider configured). */
function Unavailable({ containerId }: { containerId: string }) {
  return (
    <Card className="animate-fade-up">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white/90">Deep analysis isn’t available yet</div>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/55">
            This report is generated from the cloned source by an LLM. Configure a provider
            (<code className="font-mono text-white/70">OPENAI_API_KEY</code> or{' '}
            <code className="font-mono text-white/70">ANTHROPIC_API_KEY</code> in{' '}
            <code className="font-mono text-white/70">.env.local</code>) and re-run the analysis for this repository.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={`/analyze?containerId=${encodeURIComponent(containerId)}`}
              className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
            >
              <Rocket className="h-3.5 w-3.5" /> Re-run analysis
            </Link>
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

export function DeepAnalysisView() {
  const { containerId: ctxContainer } = useAnalysis()
  const searchParams = useSearchParams()
  const containerId = searchParams.get('containerId') ?? ctxContainer
  return <DeepAnalysisPane key={containerId ?? 'none'} containerId={containerId} />
}

function DeepAnalysisPane({ containerId }: { containerId: string | null }) {
  const [report, setReport] = useState<DeepAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(containerId))

  useEffect(() => {
    if (!containerId) return
    let cancelled = false

    api
      .getDeepAnalysis(containerId)
      .then((data) => {
        if (cancelled) return
        setReport(data)
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

  if (loading && containerId) return <DeepAnalysisSkeleton />

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

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-amber-800/50 bg-amber-950/40 px-4 py-3 text-xs font-medium text-amber-300">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        {error}
      </div>
    )
  }

  if (!report) return <Unavailable containerId={containerId} />

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
          Generated from source, not the repository page
        </div>
        <span
          className="flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary"
          title={`Generated by ${report.model}`}
        >
          <Sparkles className="h-3 w-3" /> {report.model}
        </span>
      </div>

      {/* Purpose / what it does */}
      <Card>
        <SectionTitle>Purpose</SectionTitle>
        <p className="mt-3 text-sm leading-relaxed text-white/80">{report.purpose}</p>
        {report.whatItDoes && (
          <p className="mt-3 text-sm leading-relaxed text-white/65">{report.whatItDoes}</p>
        )}
      </Card>

      {/* Architecture */}
      {report.architecture.length > 0 && (
        <Card>
          <div className="flex items-center gap-2">
            <Boxes className="h-4 w-4 text-primary" />
            <SectionTitle>Architecture</SectionTitle>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {report.architecture.map((a) => (
              <div key={a.component} className="rounded-xl border border-edge bg-shell p-4">
                <div className="text-sm font-semibold text-white/90">{a.component}</div>
                <p className="mt-1 text-xs leading-relaxed text-white/60">{a.responsibility}</p>
                {a.connectsTo.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {a.connectsTo.slice(0, 6).map((c) => (
                      <span key={c} className="rounded-md border border-edge bg-card px-1.5 py-0.5 text-[10px] text-white/50">
                        → {c}
                      </span>
                    ))}
                  </div>
                )}
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
            {report.domainModel.map((entity) => (
              <div key={entity.entity} className="rounded-xl border border-edge bg-shell p-4">
                <div className="text-sm font-semibold text-white/90">{entity.entity}</div>
                {entity.fields.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {entity.fields.slice(0, 12).map((f) => (
                      <span key={f} className="rounded border border-edge bg-card px-1.5 py-0.5 font-mono text-[10px] text-white/50">
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
            {report.keyModules.map((m) => (
              <div key={m.name} className="rounded-xl border border-edge bg-shell p-4">
                <div className="text-sm font-semibold text-white/90">{m.name}</div>
                <p className="mt-1 text-xs leading-relaxed text-white/60">{m.role}</p>
                <FileChips files={m.keyFiles} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tech stack + how to run */}
      <div className="grid gap-6 lg:grid-cols-2">
        {report.techStack.length > 0 && (
          <Card>
            <SectionTitle>Technology</SectionTitle>
            <div className="mt-4 space-y-2.5">
              {report.techStack.map((t) => (
                <div key={t.name} className="flex items-start gap-2.5 text-xs">
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
      </div>

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
