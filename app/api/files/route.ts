import { NextRequest, NextResponse } from 'next/server'
import { readContainerFileTree } from '@/lib/docker/fileTree'

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
    console.error('Error reading container file tree:', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}