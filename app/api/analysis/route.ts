import { NextRequest, NextResponse } from 'next/server'
import { analyzeDump } from '@/lib/analysis/analyze'
import { readCachedBundle, writeCachedBundle } from '@/lib/analysis/cache'
import { buildDeterministicReport } from '@/lib/analysis/deepFallback'
import { isLlmEnabled, generateDeepAnalysis, projectNarrative } from '@/lib/analysis/llm'
import { enrichOverview } from '@/lib/github/repoStats'
import { readAnalysisDump, readContainerHeadSha } from '@/lib/docker/analysisDump'
import { ContainerError } from '@/lib/docker/errors'
import { ANALYSIS_SCHEMA_VERSION, type AnalysisBundle } from '@/lib/analysis/types'

export const runtime = 'nodejs'

/**
 * Real analysis for a cloned runner container.
 *
 * The container is the source of truth for files and git metadata; the
 * computed bundle is cached on the host keyed by containerId and re-used while
 * the repo's HEAD is unchanged. A stale container (404) and a broken daemon
 * (502) are distinguished so the client can fall back to sample data honestly.
 *
 * Two enrichments layer on top of the cached bundle:
 *  - the AI deep analysis is generated once (per HEAD) and persisted with the
 *    bundle, with a short narrative projected onto the overview;
 *  - GitHub stats (stars/forks/issues) are merged fresh on every response, since
 *    they change without a new commit.
 */

/**
 * Return the bundle with the AI deep analysis attached, generating it only when
 * it's missing and a provider is configured. The caller persists the result, so
 * the (slow, paid) call runs once per HEAD rather than once per page load.
 */
async function attachDeepAnalysis(bundle: AnalysisBundle): Promise<AnalysisBundle> {
  if (bundle.deepAnalysis || !bundle.facts) return bundle

  if (isLlmEnabled()) {
    const report = await generateDeepAnalysis(bundle.facts)
    if (report) {
      return {
        ...bundle,
        deepAnalysis: report,
        overview: { ...bundle.overview, narrative: projectNarrative(report) },
      }
    }
  }

  // No provider, or the call failed. The Overview still gets a grounded
  // narrative from deterministic facts; it is not stored as deepAnalysis so a
  // later run with a key can upgrade the same bundle.
  if (bundle.overview.narrative?.model === 'static analysis') return bundle
  const fallback = buildDeterministicReport(bundle.facts)
  return {
    ...bundle,
    overview: { ...bundle.overview, narrative: projectNarrative(fallback) },
  }
}

export async function GET(request: NextRequest) {
  const containerId = request.nextUrl.searchParams.get('containerId')
  if (!containerId) {
    return NextResponse.json({ error: 'containerId is required' }, { status: 400 })
  }

  try {
    // Fast path: HEAD unchanged → serve the cached bundle without re-reading
    // every file. Throws 404 when the container is gone.
    const headSha = await readContainerHeadSha(containerId)
    const cached = readCachedBundle(containerId)
    if (cached && cached.headSha === headSha && cached.schemaVersion === ANALYSIS_SCHEMA_VERSION) {
      const bundle = await attachDeepAnalysis(cached)
      if (bundle !== cached) writeCachedBundle(bundle) // persist the new report
      return NextResponse.json({ containerId, overview: await enrichOverview(bundle.overview), cached: true })
    }

    const dump = await readAnalysisDump(containerId)
    const bundle = await attachDeepAnalysis(analyzeDump(containerId, dump))
    writeCachedBundle(bundle)

    return NextResponse.json({ containerId, overview: await enrichOverview(bundle.overview), cached: false })
  } catch (err) {
    if (err instanceof ContainerError) {
      const status = err.status >= 500 ? 502 : err.status
      return NextResponse.json({ error: err.message }, { status })
    }
    console.error('analysis failed:', err)
    return NextResponse.json({ error: 'Analysis failed: check that Docker is running.' }, { status: 502 })
  }
}

/** Force a full re-analysis, ignoring the cache. */
export async function POST(request: NextRequest) {
  const containerId = request.nextUrl.searchParams.get('containerId')
  if (!containerId) {
    return NextResponse.json({ error: 'containerId is required' }, { status: 400 })
  }

  try {
    const dump = await readAnalysisDump(containerId)
    const bundle = await attachDeepAnalysis(analyzeDump(containerId, dump))
    writeCachedBundle(bundle)
    return NextResponse.json({ containerId, overview: await enrichOverview(bundle.overview), cached: false })
  } catch (err) {
    if (err instanceof ContainerError) {
      const status = err.status >= 500 ? 502 : err.status
      return NextResponse.json({ error: err.message }, { status })
    }
    console.error('analysis failed:', err)
    return NextResponse.json({ error: 'Analysis failed: check that Docker is running.' }, { status: 502 })
  }
}
