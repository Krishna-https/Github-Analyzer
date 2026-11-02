import { NextRequest, NextResponse } from 'next/server'
import { analyzeDump } from '@/lib/analysis/analyze'
import { readCachedBundle, writeCachedBundle } from '@/lib/analysis/cache'
import { buildModuleDetails } from '@/lib/analysis/modules'
import { ANALYSIS_SCHEMA_VERSION, type AnalysisBundle } from '@/lib/analysis/types'
import { readAnalysisDump, readContainerHeadSha } from '@/lib/docker/analysisDump'
import { ContainerError } from '@/lib/docker/errors'

export const runtime = 'nodejs'

/**
 * The real module breakdown for a cloned runner container.
 *
 * Modules are derived from the same cached analysis bundle the Overview page
 * uses, so this route either serves the cached bundle or computes it once when
 * the container has not been analyzed yet. The selected sample data never flows
 * through here — a missing container is reported so the client can say so.
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

    return NextResponse.json({ modules: buildModuleDetails(bundle), cached: bundle === cached })
  } catch (err) {
    if (err instanceof ContainerError) {
      const status = err.status >= 500 ? 502 : err.status
      return NextResponse.json({ error: err.message }, { status })
    }
    console.error('modules analysis failed:', err)
    return NextResponse.json({ error: 'Could not load modules: check that Docker is running.' }, { status: 502 })
  }
}
