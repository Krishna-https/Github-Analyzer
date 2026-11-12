import { NextRequest, NextResponse } from 'next/server'
import { readCloneStatus } from '@/lib/docker/clone'
import { dockerStatus } from '@/lib/docker/errors'

export async function GET(request: NextRequest) {
  const containerId = request.nextUrl.searchParams.get('containerId')

  if (!containerId) {
    return NextResponse.json(
      { error: 'containerId query parameter is required' },
      { status: 400 }
    )
  }

  try {
    const status = await readCloneStatus(containerId)
    return NextResponse.json(
      { status },
      // This is live telemetry; a cached response would freeze the UI.
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    const status = dockerStatus(error)
    console.error('Error reading clone status:', error)

    if (status === 404) {
      return NextResponse.json(
        {
          error: `No container with id ${containerId}. It may have been stopped or removed.`,
        },
        { status: 404 }
      )
    }

    if (status === 409) {
      return NextResponse.json(
        { error: `Container ${containerId} is not running, so its clone status cannot be read.` },
        { status: 409 }
      )
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Could not read clone status from Docker: ${error.message}`
            : 'Unknown error',
      },
      { status: 502 }
    )
  }
}
