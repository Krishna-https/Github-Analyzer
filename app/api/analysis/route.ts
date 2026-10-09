import { NextRequest, NextResponse } from 'next/server'
import { analyzeDump } from '@/lib/analysis/analyze'
import { readCachedBundle, writeCachedBundle } from '@/lib/analysis/cache'
import { readAnalysisDump, readContainerHeadSha } from '@/lib/docker/analysisDump'
import { ContainerError } from '@/lib/docker/errors'

export const runtime = 'nodejs'

/**
 * Real analysis for a cloned runner container.
 *
 * The container is the source of truth for files and git metadata; the
 * computed bundle is cached on the host keyed by containerId and re-used while
 * the repo's HEAD is unchanged. A stale container (404) and a broken daemon
 * (502) are distinguished so the client can fall back to sample data honestly.
 */
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
    if (cached && cached.headSha === headSha) {
      return NextResponse.json({ containerId, overview: cached.overview, cached: true })
    }

    const dump = await readAnalysisDump(containerId)
    const bundle = analyzeDump(containerId, dump)
    writeCachedBundle(bundle)

    return NextResponse.json({ containerId, overview: bundle.overview, cached: false })
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
    const bundle = analyzeDump(containerId, dump)
    writeCachedBundle(bundle)
    return NextResponse.json({ containerId, overview: bundle.overview, cached: false })
  } catch (err) {
    if (err instanceof ContainerError) {
      const status = err.status >= 500 ? 502 : err.status
      return NextResponse.json({ error: err.message }, { status })
    }
    console.error('analysis failed:', err)
    return NextResponse.json({ error: 'Analysis failed: check that Docker is running.' }, { status: 502 })
  }
}