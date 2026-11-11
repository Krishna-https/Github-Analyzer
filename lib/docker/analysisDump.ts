import 'server-only'

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { captureExec } from '@/lib/docker/exec'
import { ContainerError } from '@/lib/docker/errors'
import type { AnalysisDump } from '@/lib/analysis/types'

/**
 * The dump script is a constant shipped with the app, read from the project
 * root (where `next dev`/`next start` run). Reading it lazily and caching it
 * keeps the hot analysis path to a single filesystem read.
 */
let cachedScript: string | null = null
function dumpScript(): string {
  if (cachedScript === null) {
    cachedScript = readFileSync(join(process.cwd(), 'analysis', 'dump.cjs'), 'utf8')
  }
  return cachedScript
}

/**
 * Full inventory dump from the container: git metadata + file list + contents
 * of small source files, emitted as one JSON document by analysis/dump.cjs.
 * The dump script is a constant shipped with the app — the content a user
 * controls (their repo) only flows through file reads inside the container.
 */
export async function readAnalysisDump(containerId: string): Promise<AnalysisDump> {
  const script = dumpScript()

  const { stdout, stderr } = await captureExec(containerId, ['node', '-e', script])
  if (!stdout) {
    throw new ContainerError(stderr?.trim() || 'Analysis dump produced no output', 502)
  }

  try {
    const parsed = JSON.parse(stdout) as AnalysisDump
    if (!parsed || !Array.isArray(parsed.files)) {
      throw new Error('malformed dump shape')
    }
    return parsed
  } catch {
    throw new ContainerError('Runner produced an invalid analysis dump.', 502)
  }
}

/**
 * Lightweight HEAD probe for cache validation. A missing container is a real
 * error (404); any other failure just means "don't trust the cache".
 */
export async function readContainerHeadSha(containerId: string): Promise<string | null> {
  const { stdout } = await captureExec(containerId, [
    'git',
    '-C',
    '/workspace/repo',
    'rev-parse',
    'HEAD',
  ])
  // A missing repo/failed git still returns cleanly; an empty answer just
  // means "don't trust the cache".
  return stdout.trim() || null
}