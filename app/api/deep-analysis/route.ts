import { NextRequest, NextResponse } from 'next/server'
import { readCachedBundle } from '@/lib/analysis/cache'

export const runtime = 'nodejs'

/**
 * The full AI deep-analysis report for a container's cached bundle.
 *
 * This only reads the on-disk bundle (no Docker, no LLM call): the report is
 * generated once by /api/analysis and cached with it. Returns `deepAnalysis:
 * null` when the bundle is missing or was produced without an LLM provider, so
 * the page can show an "unavailable" state instead of erroring.
 */
export async function GET(request: NextRequest) {
  const containerId = request.nextUrl.searchParams.get('containerId')
  if (!containerId) {
    return NextResponse.json({ error: 'containerId is required' }, { status: 400 })
  }

  const bundle = readCachedBundle(containerId)
  return NextResponse.json({ containerId, deepAnalysis: bundle?.deepAnalysis ?? null })
}
