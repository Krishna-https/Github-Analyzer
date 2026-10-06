import { NextRequest, NextResponse } from 'next/server'
import { readContainerFileTree } from '@/lib/docker/fileTree'

/**
 * Docker's own status code, when it sends one. docker-modem copies it onto
 * the thrown Error as `statusCode`, so a missing container is distinguishable
 * from the daemon being unreachable.
 */
function dockerStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  const status = (error as { statusCode?: unknown }).statusCode
  return typeof status === 'number' ? status : undefined
}

export async function GET(request: NextRequest) {
  const containerId = request.nextUrl.searchParams.get('containerId')

  if (!containerId) {
    return NextResponse.json(
      { error: 'containerId query parameter is required' },
      { status: 400 }
    )
  }

  try {
    const tree = await readContainerFileTree(containerId)
    return NextResponse.json({ tree })
  } catch (error) {
    const status = dockerStatus(error)
    console.error('Error reading container file tree:', error)

    // A stale containerId is a client problem, not a server fault, so it must
    // not come back as 500 — otherwise the client can't tell bad input from a
    // broken daemon and has no way to explain it to the user.
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
        { error: `Container ${containerId} is not running, so its files cannot be listed.` },
        { status: 409 }
      )
    }

    // Docker is the upstream this route proxies to; anything else it throws
    // is a failure of that dependency rather than of this handler.
    return NextResponse.json(
      {
        error:
          error instanceof Error ? `Could not read files from Docker: ${error.message}` : 'Unknown error',
      },
      { status: 502 }
    )
  }
}
