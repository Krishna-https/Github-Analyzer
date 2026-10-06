import { NextRequest, NextResponse } from 'next/server'
import { readContainerFileContent } from '@/lib/docker/fileTree'
import { ContainerError, dockerStatus } from '@/lib/docker/errors'

export async function GET(request: NextRequest) {
  const containerId = request.nextUrl.searchParams.get('containerId')
  const path = request.nextUrl.searchParams.get('path')

  if (!containerId) {
    return NextResponse.json(
      { error: 'containerId query parameter is required' },
      { status: 400 }
    )
  }

  if (!path) {
    return NextResponse.json(
      { error: 'path query parameter is required (container-absolute, e.g. /workspace/repo/src/app.tsx)' },
      { status: 400 }
    )
  }

  try {
    const file = await readContainerFileContent(containerId, path)
    return NextResponse.json({ file })
  } catch (error) {
    const status = dockerStatus(error)
    console.error('Error reading container file:', error)

    // Path validation failures and cat-reported problems are the caller's
    // fault, surfaced verbatim instead of being swallowed by a 500.
    if (error instanceof ContainerError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

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
        { error: `Container ${containerId} is not running, so its files cannot be read.` },
        { status: 409 }
      )
    }

    // Docker is the upstream this route proxies to; anything else it throws
    // is a failure of that dependency rather than of this handler.
    return NextResponse.json(
      {
        error:
          error instanceof Error ? `Could not read file from Docker: ${error.message}` : 'Unknown error',
      },
      { status: 502 }
    )
  }
}