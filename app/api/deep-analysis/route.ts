import { NextRequest, NextResponse } from 'next/server'
import { readCachedBundle } from '@/lib/analysis/cache'
import { buildDeterministicReport } from '@/lib/analysis/deepFallback'
import { isLlmEnabled } from '@/lib/analysis/llm'
import type { DeepAnalysis } from '@/lib/types'

export const runtime = 'nodejs'

/**
 * Older cached reports (and hand-edited caches) can be missing sections that the
 * UI renders unconditionally. Normalise the arrays at the API boundary so the
 * page never crashes on a partial report.
 */
function normalizeReport(report: DeepAnalysis | null): DeepAnalysis | null {
  if (!report) return null
  return {
    ...report,
    purpose: report.purpose ?? '',
    whatItDoes: report.whatItDoes ?? '',
    architecture: (report.architecture ?? []).map((a) => ({
      ...a,
      responsibility: a.responsibility ?? '',
      connectsTo: a.connectsTo ?? [],
      files: a.files ?? [],
    })),
    dataFlow: (report.dataFlow ?? []).map((step) => ({
      ...step,
      detail: step.detail ?? '',
      files: step.files ?? [],
    })),
    domainModel: (report.domainModel ?? []).map((entity) => ({
      ...entity,
      fields: entity.fields ?? [],
      relations: entity.relations ?? [],
    })),
    keyModules: (report.keyModules ?? []).map((m) => ({
      ...m,
      role: m.role ?? '',
      keyFiles: m.keyFiles ?? [],
      symbols: m.symbols ?? [],
    })),
    techStack: (report.techStack ?? []).map((t) => ({
      ...t,
      role: t.role ?? '',
      why: t.why ?? '',
    })),
    howToRun: report.howToRun ?? [],
    onboarding: report.onboarding ?? [],
    strengths: report.strengths ?? [],
    risks: report.risks ?? [],
    hotspots: report.hotspots ?? [],
    contributors: report.contributors ?? [],
    commitCount: report.commitCount ?? null,
    model: report.model ?? 'AI',
    generatedAt: report.generatedAt ?? new Date().toISOString(),
    totalDependencies: report.totalDependencies ?? 0,
    dependencyHealth: report.dependencyHealth ?? { healthy: 0, review: 0, vulnerable: 0 },
  }
}

/**
 * The full deep-analysis report for a container's cached bundle.
 *
 * Resolution order:
 *  1. the cached AI report, when one was generated;
 *  2. otherwise a deterministic report built from the cached facts — so the
 *     section is useful without an LLM key;
 *  3. otherwise null (the container was never analyzed).
 *
 * This only reads the on-disk bundle: no Docker, no LLM call. The paid report is
 * generated once by /api/analysis. `aiAvailable` lets the UI explain how to
 * upgrade a deterministic report to the AI one.
 */
export async function GET(request: NextRequest) {
  const containerId = request.nextUrl.searchParams.get('containerId')
  if (!containerId) {
    return NextResponse.json({ error: 'containerId is required' }, { status: 400 })
  }

  const bundle = readCachedBundle(containerId)
  const report =
    bundle?.deepAnalysis ?? (bundle?.facts ? buildDeterministicReport(bundle.facts, bundle.computedAt) : null)

  return NextResponse.json({
    containerId,
    deepAnalysis: normalizeReport(report),
    aiAvailable: isLlmEnabled(),
  })
}
