import { NextRequest, NextResponse } from 'next/server'
import { analyzeDump } from '@/lib/analysis/analyze'
import { readCachedBundle, writeCachedBundle } from '@/lib/analysis/cache'
import { buildCodeReport } from '@/lib/analysis/code'
import { ANALYSIS_SCHEMA_VERSION, type AnalysisBundle } from '@/lib/analysis/types'
import { readAnalysisDump, readContainerHeadSha } from '@/lib/docker/analysisDump'
import { ContainerError } from '@/lib/docker/errors'

export const runtime = 'nodejs'

/**
 * The real Code Analysis report for a cloned runner container.
 *
 * It reuses the cached analysis bundle (computing it once if this is the first
 * request), then aggregates the per-function metrics captured during parsing.
 * No sample data is involved — a missing container is reported as an error so
 * the client can say why it is showing the sample view.
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

    return NextResponse.json({ report: buildCodeReport(bundle), cached: bundle === cached })
  } catch (err) {
    if (err instanceof ContainerError) {
      const status = err.status >= 500 ? 502 : err.status
      return NextResponse.json({ error: err.message }, { status })
    }
    console.error('code analysis failed:', err)
    return NextResponse.json(
      { error: 'Could not load code analysis: check that Docker is running.' },
      { status: 502 }
    )
  }
}
