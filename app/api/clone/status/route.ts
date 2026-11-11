import { NextRequest, NextResponse } from 'next/server'

import { getOrComputeCloneVerification } from '@/lib/clone/status'
import { ContainerError } from '@/lib/docker/errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Return the clone verification for a container, recomputing it when the cache
 * is cold (for example after a page refresh). This is an on-demand check, not a
 * progress poll — `/api/clone` waits for the clone before replying.
 */
export async function GET(request: NextRequest) {
  const containerId = request.nextUrl.searchParams.get('containerId')
  if (!containerId) {
    return NextResponse.json({ error: 'containerId is required' }, { status: 400 })
  }

  try {
    const verification = await getOrComputeCloneVerification(containerId)
    return NextResponse.json({ containerId, verification })
  } catch (err) {
    if (err instanceof ContainerError) {
      const status = err.status >= 500 ? 502 : err.status
      return NextResponse.json({ error: err.message }, { status })
    }
    console.error('clone status failed:', err)
    return NextResponse.json(
      { error: 'Could not verify the clone. Check that Docker is running.' },
      { status: 502 }
    )
  }
}
