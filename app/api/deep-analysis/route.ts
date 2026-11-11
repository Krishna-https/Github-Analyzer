import { NextRequest, NextResponse } from 'next/server'

import { readCachedBundle } from '@/lib/analysis/cache'
import { buildDeterministicReport } from '@/lib/analysis/deepFallback'
import { isLlmEnabled } from '@/lib/analysis/llm'
import { getOrComputeCloneVerification } from '@/lib/clone/status'
import { ContainerError } from '@/lib/docker/errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * The full deep-analysis report for a container's cached bundle.
 *
 * Resolution order:
 *  1. the cached AI report, when one was generated;
 *  2. otherwise a deterministic report built from the cached facts — so the
 *     section is useful without an LLM key;
 *  3. otherwise null (the container was never analyzed).
 *
 * A cached bundle is only served while the clone still verifies. The
 * verification is normally a warm file read from `/api/clone`; if it has
 * expired, the container is re-checked, so a clone that lost files after
 * analysis cannot keep returning a deep-analysis report.
 */
export async function GET(request: NextRequest) {
  const containerId = request.nextUrl.searchParams.get('containerId')
  if (!containerId) {
    return NextResponse.json({ error: 'containerId is required' }, { status: 400 })
  }

  try {
    const verification = await getOrComputeCloneVerification(containerId)
    if (!verification.complete) {
      return NextResponse.json(
        {
          error:
            verification.reason ??
            'The repository clone is incomplete, so no deep analysis can be generated.',
          verification,
        },
        { status: 409 }
      )
    }
  } catch (err) {
    if (err instanceof ContainerError) {
      const status = err.status >= 500 ? 502 : err.status
      return NextResponse.json({ error: err.message }, { status })
    }
    console.error('deep-analysis verification failed:', err)
    return NextResponse.json(
      { error: 'Could not verify the clone. Check that Docker is running.' },
      { status: 502 }
    )
  }

  const bundle = readCachedBundle(containerId)

  const deepAnalysis =
    bundle?.deepAnalysis ?? (bundle?.facts ? buildDeterministicReport(bundle.facts, bundle.computedAt) : null)

  return NextResponse.json({
    containerId,
    deepAnalysis,
    aiAvailable: isLlmEnabled(),
  })
}
