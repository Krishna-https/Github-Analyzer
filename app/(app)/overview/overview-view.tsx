'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowRight, Check, ShieldAlert, Sparkles, Star, Target, TrendingDown, TrendingUp } from 'lucide-react'
import { Card, SectionTitle } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { LanguageDonut } from '@/components/charts/LanguageDonut'
import { ComplexityBars } from '@/components/charts/ComplexityBars'
import { api, FileTreeError } from '@/lib/api/client'
import { useAnalysis } from '@/context/AnalysisContext'
import { complexityBuckets, mockDependencies, mockEvidence, mockRepository } from '@/data/mockData'
import type { AnalysisOverview, EvidenceItem } from '@/lib/types'

/** Compact count for at-a-glance popularity: 1284 → "1.3k". */
function formatCount(n: number): string {
  if (n < 1000) return String(n)
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, '')}k`
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`
}

const evidenceIcons: Record<string, typeof Check> = {
  atom: Check,
  server: Check,
  database: Check,
  route: Check,
  bell: Check,
  layers: Check,
  flask: Check,
}

const evidenceTypes: Record<string, string> = {
  atom: 'bg-primary/10 text-primary',
  server: 'bg-primary/10 text-primary',
  database: 'bg-primary/10 text-primary',
  route: 'bg-primary/10 text-primary',
  bell: 'bg-primary/10 text-primary',
  layers: 'bg-primary/10 text-primary',
  flask: 'bg-primary/10 text-primary',
}

/** Sample-mode overview synthesized from the mock data so one render path serves both. */
const mockOverview: AnalysisOverview = {
  repository: mockRepository,
  languages: mockRepository.languages,
  evidence: mockEvidence,
  complexityBuckets,
  dependencyHealth: {
    healthy: mockDependencies.filter((d) => d.status === 'healthy').length,
    review: mockDependencies.filter((d) => d.status === 'review').length,
    vulnerable: mockDependencies.filter((d) => d.status === 'vulnerable').length,
  },
  summary: [
    'This repository appears to implement a collaborative task-management platform where users can create projects, manage tasks, assign team members, receive notifications and track project activity.',
  ],
  detectedBy: [
    'React frontend detected',
    'Express API detected',
    'User and Project models detected',
    'PostgreSQL integration detected',
  ],
  weakStructure: false,
  statsUnavailable: [],
  computedAt: '',
}

function ConfidenceBadge({ level }: { level: EvidenceItem['confidence'] }) {
  const map: Record<string, string> = {
    High: 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/60',
    Medium: 'bg-amber-950/70 text-amber-400 border border-amber-800/60',
    Low: 'bg-edge text-white/50 border border-edge',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${map[level]}`}>
      {level} confidence
    </span>
  )
}

function EvidenceDistribution({ overview }: { overview: AnalysisOverview }) {
  const high = overview.evidence.filter((e) => e.confidence === 'High').length
  const medium = overview.evidence.filter((e) => e.confidence === 'Medium').length
  const low = overview.evidence.filter((e) => e.confidence === 'Low').length
  const total = Math.max(high + medium + low, 1)

  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] text-white/30">Confidence</span>
      <div className="flex h-1.5 w-28 overflow-hidden rounded-full bg-edge">
        <div className="bg-emerald-400" style={{ width: `${(high / total) * 100}%` }} />
        <div className="bg-amber-400" style={{ width: `${(medium / total) * 100}%` }} />
        <div className="bg-white/25" style={{ width: `${(low / total) * 100}%` }} />
      </div>
      <span className="flex items-center gap-2 font-mono text-[10px] text-white/40">
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />{high}</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" />{medium}</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-white/25" />{low}</span>
      </span>
    </div>
  )
}

function StatValue({ overview, field }: { overview: AnalysisOverview; field: keyof typeof mockRepository }) {
  const isUnavailable =
    field in overviewStatsTitles &&
    overview.statsUnavailable.includes(overviewStatsTitles[field as keyof typeof overviewStatsTitles])
  const value = overview.repository[field] as number
  return <>{isUnavailable ? <>—</> : formatCount(value)}</>
}

const overviewStatsTitles: Record<string, string> = {
  stars: 'Stars',
  forks: 'Forks',
  openIssues: 'Open Issues',
}

/** Shown while the real analysis bundle is being fetched for a container. */
function OverviewSkeleton() {
  return (
    <div className="space-y-6 animate-fade-up">
      <div className="space-y-2">
        <div className="h-3 w-28 animate-pulse rounded bg-white/5" />
        <div className="h-7 w-64 animate-pulse rounded bg-white/10" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-white/5" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl border border-edge bg-card" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="h-96 animate-pulse rounded-xl border border-edge bg-card lg:col-span-3" />
        <div className="h-96 animate-pulse rounded-xl border border-edge bg-card lg:col-span-2" />
      </div>
      <div className="h-48 animate-pulse rounded-xl border border-edge bg-card" />
    </div>
  )
}

export function OverviewView() {
  const { containerId: ctxContainer } = useAnalysis()
  const searchParams = useSearchParams()
  const paramContainer = searchParams.get('containerId')
  const containerId = paramContainer ?? ctxContainer

  // Keying the pane by containerId remounts it when the session or the
  // ?containerId= param changes, which is how fetch state resets without any
  // setState-in-effect.
  return <OverviewPane key={containerId ?? 'none'} containerId={containerId} />
}

function OverviewPane({ containerId }: { containerId: string | null }) {
  const [real, setReal] = useState<AnalysisOverview | null>(null)
  const [realError, setRealError] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(containerId))

  useEffect(() => {
    if (!containerId) return

    let cancelled = false

    api
      .getAnalysisOverview(containerId)
      .then((overview) => {
        if (cancelled) return
        setReal(overview)
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setRealError(err instanceof FileTreeError ? err.message : 'Could not analyze this repository.')
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [containerId])

  // Live data only counts while a container is present AND the fetch finished.
  const isReal = Boolean(containerId) && Boolean(real)
  const overview = isReal ? real! : mockOverview
  const repo = overview.repository
  const narrative = overview.narrative

  if (loading && containerId) {
    return <OverviewSkeleton />
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {(realError || (!containerId && !loading)) && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-800/50 bg-amber-950/40 px-4 py-3 text-xs font-medium text-amber-300">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          {realError
            ? `Live analysis unavailable (${realError}). Showing sample data.`
            : 'No container session — showing sample data. Run an analysis to see real repository stats.'}
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">Repository X-Ray</div>
          <h1 className="mt-1 text-2xl font-bold text-white">{repo.fullName}</h1>
          <p className="mt-1 text-sm text-white/50">{repo.description}</p>
          {repo.topics && repo.topics.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {repo.topics.slice(0, 8).map((topic) => (
                <span
                  key={topic}
                  className="rounded-full border border-edge bg-card px-2 py-0.5 text-[10px] font-medium text-white/55"
                >
                  {topic}
                </span>
              ))}
            </div>
          )}
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Files" value={repo.files} />
        <StatCard label="Source Files" value={repo.sourceFiles} />
        <StatCard label="Functions" value={repo.functions} accent />
        <StatCard label="Modules" value={repo.modules} />
        <StatCard label="Dependencies" value={repo.dependencies} />
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-5">
        <StatCard label="Tests" value={repo.tests} />
        <StatCard label="Classes" value={repo.classes} />
        <StatCard
          label="Stars"
          value={
            <span className="flex items-center gap-1.5">
              <Star className="h-4 w-4 text-amber-400" />
              <StatValue overview={overview} field="stars" />
            </span>
          }
        />
        <StatCard label="Forks" value={<StatValue overview={overview} field="forks" />} />
        <StatCard
          label="Open Issues"
          value={
            <span className="flex items-center gap-1">
              <StatValue overview={overview} field="openIssues" />
              {isReal && overview.statsUnavailable.length > 0 && (
                <span className="text-[10px] font-normal text-white/25">clone only</span>
              )}
            </span>
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Purpose / summary */}
        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between">
            <SectionTitle>Project Purpose</SectionTitle>
            {narrative ? (
              <span
                className="flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary"
                title={`Generated by ${narrative.model}`}
              >
                <Sparkles className="h-3 w-3" />
                AI narrative
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                <Target className="h-3 w-3" />
                {isReal ? 'Computed from live container' : 'Inferred from mock repository evidence'}
              </span>
            )}
          </div>

          {narrative ? (
            <>
              <p className="mt-4 text-sm leading-relaxed text-white/80">{narrative.purpose}</p>

              {narrative.howItWorks.length > 0 && (
                <div className="mt-5">
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/35">How it works</div>
                  <ul className="space-y-2.5 text-sm leading-relaxed text-white/75">
                    {narrative.howItWorks.map((point, i) => (
                      <li key={i} className="flex gap-2.5">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {narrative.architecture.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {narrative.architecture.map((layer) => (
                    <span
                      key={layer}
                      className="rounded-lg border border-edge bg-shell px-2 py-1 text-[11px] font-medium text-white/70"
                    >
                      {layer}
                    </span>
                  ))}
                </div>
              )}

              {(narrative.strengths.length > 0 || narrative.risks.length > 0) && (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {narrative.strengths.length > 0 && (
                    <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-3.5">
                      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400/80">
                        <TrendingUp className="h-3 w-3" /> Strengths
                      </div>
                      <ul className="space-y-1.5 text-xs leading-relaxed text-white/70">
                        {narrative.strengths.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {narrative.risks.length > 0 && (
                    <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-3.5">
                      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-400/80">
                        <TrendingDown className="h-3 w-3" /> Risks
                      </div>
                      <ul className="space-y-1.5 text-xs leading-relaxed text-white/70">
                        {narrative.risks.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-white/75">
              {overview.summary.map((point, i) => (
                <li key={i} className="flex gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-6 rounded-xl border border-edge bg-shell p-4">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-white/35">
              <ShieldAlert className="h-3 w-3" />
              What detected this
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {overview.detectedBy.slice(0, 4).map((x) => (
                <div key={x} className="flex items-center gap-2 text-xs text-white/60">
                  <Check className="h-3.5 w-3.5 text-primary" /> {x}
                </div>
              ))}
            </div>
            {overview.weakStructure && (
              <div className="mt-3 text-[11px] text-amber-300/80">
                Repository has no conventional folder layout — modules were classified by file content.
              </div>
            )}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-edge pt-5">
            <Link
              href="/deep-analysis"
              className="flex items-center gap-1.5 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
            >
              <Sparkles className="h-3.5 w-3.5" /> Deep analysis <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link href="/modules" className="flex items-center gap-1.5 text-xs font-semibold text-white/70 transition-colors hover:text-primary">
              View modules <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link href="/code" className="flex items-center gap-1.5 text-xs font-semibold text-white/70 transition-colors hover:text-primary">
              View code analysis <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link href="/issues" className="flex items-center gap-1.5 text-xs font-semibold text-white/70 transition-colors hover:text-primary">
              View potential issues <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Card>

        {/* Languages */}
        <Card className="lg:col-span-2">
          <SectionTitle>Languages</SectionTitle>
          {overview.languages.length === 0 ? (
            <p className="mt-4 text-xs text-white/40">No recognized source languages were found in this repository.</p>
          ) : (
            <>
              <LanguageDonut languages={overview.languages} />
              <div className="mt-2 space-y-1.5">
                {overview.languages.map((l) => (
                  <div key={l.name} className="flex items-center gap-2.5 text-xs">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: l.color }} />
                    <span className="w-28 text-white/70">{l.name}</span>
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-edge">
                      <div className="h-full rounded-full" style={{ width: `${l.percent}%`, background: l.color }} />
                    </div>
                    <span className="w-10 text-right font-mono text-white/45">{l.percent}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Evidence */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTitle>Evidence</SectionTitle>
          {isReal && <EvidenceDistribution overview={overview} />}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {overview.evidence.map((e) => {
            const Icon = evidenceIcons[e.icon] ?? Check
            return (
              <div key={e.description} className="rounded-xl border border-edge bg-shell p-3.5">
                <div className="flex items-center justify-between">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${evidenceTypes[e.icon]}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <ConfidenceBadge level={e.confidence} />
                </div>
                <div className="mt-3 text-sm font-medium text-white/85">{e.description}</div>
                <div className="mt-1 text-[10px] uppercase tracking-wide text-white/35">{e.type}</div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Complexity + dependencies */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle>Complexity Distribution</SectionTitle>
          <ComplexityBars buckets={overview.complexityBuckets} />
          <div className="mt-3 flex flex-wrap gap-3">
            {overview.complexityBuckets.map((b) => (
              <div key={b.name} className="flex items-center gap-1.5 text-[11px] text-white/55">
                <span className="h-2 w-2 rounded-full" style={{ background: b.color }} />
                {b.name}: <span className="font-mono text-white/75">{b.count}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle>Dependency Health</SectionTitle>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-edge bg-shell p-4">
              <div className="text-2xl font-bold text-emerald-400">{overview.dependencyHealth.healthy}</div>
              <div className="mt-0.5 text-[10px] uppercase tracking-wider text-white/40">Healthy</div>
            </div>
            <div className="rounded-xl border border-edge bg-shell p-4">
              <div className="text-2xl font-bold text-amber-400">{overview.dependencyHealth.review}</div>
              <div className="mt-0.5 text-[10px] uppercase tracking-wider text-white/40">Review</div>
            </div>
            <div className="rounded-xl border border-edge bg-shell p-4">
              <div className="text-2xl font-bold text-red-400">{overview.dependencyHealth.vulnerable}</div>
              <div className="mt-0.5 text-[10px] uppercase tracking-wider text-white/40">Vulnerable</div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-xl border border-edge bg-shell px-4 py-3">
            <div>
              <div className="text-sm font-medium text-white/85">{repo.dependencies} total packages</div>
              <div className="text-xs text-white/40">
                {isReal ? 'Vulnerability data is not wired to a CVE feed yet.' : '16 highlighted in the Dependencies view'}
              </div>
            </div>
            <Link href="/dependencies" className="flex items-center gap-1.5 text-xs font-semibold text-primary transition-colors hover:text-primary/80">
              Open <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}