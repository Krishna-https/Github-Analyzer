import { NextRequest, NextResponse } from 'next/server'
import { analyzeDump } from '@/lib/analysis/analyze'
import { readCachedBundle, writeCachedBundle } from '@/lib/analysis/cache'
import { buildDeterministicReport } from '@/lib/analysis/deepFallback'
import { isLlmEnabled, generateDeepAnalysis, projectNarrative } from '@/lib/analysis/llm'
import { getOrComputeCloneVerification } from '@/lib/clone/status'
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
 *
 * A deterministic report is upgraded automatically once a provider key exists,
 * so "ran before the key was added" does not leave the Deep Analysis page stuck
 * on the static report forever.
 */
async function attachDeepAnalysis(bundle: AnalysisBundle): Promise<AnalysisBundle> {
  // Already an AI report — keep it.
  if (bundle.deepAnalysis?.source === 'ai') return bundle

  if (!bundle.facts) return bundle

  const hasStaleReport =
    bundle.deepAnalysis &&
    (bundle.deepAnalysis.source === 'deterministic' || !bundle.deepAnalysis.source)

  // Generate when there is no report yet, or when the cached report is the
  // deterministic one and a key is now available.
  if ((!bundle.deepAnalysis || hasStaleReport) && isLlmEnabled()) {
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

/**
 * Refuse to analyze a container whose clone is incomplete. The verification is
 * cached by `/api/clone`, so this is typically a file read rather than another
 * GitHub round trip.
 */
async function cloneGate(containerId: string): Promise<NextResponse | null> {
  const verification = await getOrComputeCloneVerification(containerId)
  if (verification.complete) return null

  return NextResponse.json(
    {
      error:
        verification.reason ??
        'The repository clone is incomplete, so analysis was not started. Re-clone the repository and try again.',
      verification,
    },
    { status: 409 }
  )
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

    // Never serve/analyse a partial clone, even if a bundle is cached.
    const blocked = await cloneGate(containerId)
    if (blocked) return blocked

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
    const blocked = await cloneGate(containerId)
    if (blocked) return blocked

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
