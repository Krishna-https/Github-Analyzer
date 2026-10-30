import { NextRequest, NextResponse } from 'next/server'
import { readCachedBundle } from '@/lib/analysis/cache'
import { buildDeterministicReport } from '@/lib/analysis/deepFallback'
import { isLlmEnabled } from '@/lib/analysis/llm'

export const runtime = 'nodejs'

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
  const deepAnalysis = bundle?.deepAnalysis ?? (bundle?.facts ? buildDeterministicReport(bundle.facts, bundle.computedAt) : null)

  return NextResponse.json({
    containerId,
    deepAnalysis,
    aiAvailable: isLlmEnabled(),
  })
}
