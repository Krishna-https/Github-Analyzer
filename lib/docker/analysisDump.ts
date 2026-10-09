import 'server-only'

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PassThrough } from 'node:stream'

import docker from '@/lib/docker'
import { ContainerError, dockerStatus } from '@/lib/docker/errors'
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
 * Runs a command inside a runner container and captures its stdout. The same
 * hijacked-stream/demux pattern as the file tree reader: Tty off, multiplexed
 * frames stripped by demuxStream so output stays byte-clean.
 */
async function captureExec(
  containerId: string,
  cmd: string[]
): Promise<{ stdout: string; stderr: string }> {
  const container = docker.getContainer(containerId)

  let exec
  try {
    exec = await container.exec({
      Cmd: cmd,
      AttachStderr: true,
      AttachStdout: true,
      Tty: false,
    })
  } catch (err) {
    throw mapDockerError(err, `Could not exec in container ${containerId.slice(0, 12)}`)
  }

  let stream
  try {
    stream = await exec.start({ hijack: true, stdin: false })
  } catch (err) {
    throw mapDockerError(err, `Could not start command in container ${containerId.slice(0, 12)}`)
  }

  const out: Buffer[] = []
  const errs: Buffer[] = []
  const stdout = new PassThrough()
  const stderr = new PassThrough()

  stdout.on('data', (chunk: Buffer) => out.push(chunk))
  stderr.on('data', (chunk: Buffer) => errs.push(chunk))

  docker.modem.demuxStream(stream, stdout, stderr)

  await new Promise<void>((resolve, reject) => {
    stdout.on('error', reject)
    stream.on('end', resolve)
    stream.on('error', reject)
  })

  return {
    stdout: Buffer.concat(out).toString('utf8'),
    stderr: Buffer.concat(errs).toString('utf8'),
  }
}

function mapDockerError(err: unknown, fallback: string): ContainerError {
  const status = dockerStatus(err)
  if (typeof status === 'number') {
    if (status === 404) return new ContainerError('Runner container not found — it may have been stopped or removed.', 404)
    return new ContainerError(`Docker returned status ${status}`, status >= 500 ? 502 : status)
  }
  return new ContainerError(fallback, 502)
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