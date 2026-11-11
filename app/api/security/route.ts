import { NextRequest, NextResponse } from 'next/server'
import { analyzeDump } from '@/lib/analysis/analyze'
import { readCachedBundle, writeCachedBundle } from '@/lib/analysis/cache'
import { ANALYSIS_SCHEMA_VERSION, type AnalysisBundle } from '@/lib/analysis/types'
import { readAnalysisDump, readContainerHeadSha } from '@/lib/docker/analysisDump'
import { ContainerError } from '@/lib/docker/errors'

export const runtime = 'nodejs'

/**
 * The real security findings for a cloned runner container.
 *
 * The findings are scanned from the same cached analysis bundle the rest of the
 * app uses (computed once if this is the first request), so every row carries an
 * exact file/line and a source snippet. No sample data flows through here — a
 * missing container is reported as an error so the client can say so.
 */
export async function GET(request: NextRequest) {
  const containerId = request.nextUrl.searchParams.get('containerId')
  if (!containerId) {
    return NextResponse.json({ error: 'containerId is required' }, { status: 400 })
  }

  try {
    const headSha = await readContainerHeadSha(containerId)
    const cached = readCachedBundle(containerId)

    let bundle: AnalysisBundle
    if (cached && cached.headSha === headSha && cached.schemaVersion === ANALYSIS_SCHEMA_VERSION) {
      bundle = cached
    } else {
      const dump = await readAnalysisDump(containerId)
      bundle = analyzeDump(containerId, dump)
      writeCachedBundle(bundle)
    }

    return NextResponse.json({ findings: bundle.security ?? [], cached: bundle === cached })
  } catch (err) {
    if (err instanceof ContainerError) {
      const status = err.status >= 500 ? 502 : err.status
      return NextResponse.json({ error: err.message }, { status })
    }
    console.error('security analysis failed:', err)
    return NextResponse.json(
      { error: 'Could not load security findings: check that Docker is running.' },
      { status: 502 }
    )
  }
}
