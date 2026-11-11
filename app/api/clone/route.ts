import { NextRequest, NextResponse } from 'next/server'

import docker from '@/lib/docker'
import { captureExec } from '@/lib/docker/exec'
import { ContainerError } from '@/lib/docker/errors'
import { parseRepoUrl } from '@/lib/github/cloneTree'
import { verifyClone } from '@/lib/clone/verify'
import { writeCloneVerification } from '@/lib/clone/status'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
/** Long-running clones are the whole point of this route. */
export const maxDuration = 900

const CLONE_TIMEOUT_MS = 15 * 60 * 1000
const POLL_INTERVAL_MS = 1200

/**
 * Poll the marker file written by the container's clone command.
 * Returns the git clone exit code, or null when the timeout expires.
 */
async function waitForClone(containerId: string): Promise<number | null> {
  const startedAt = Date.now()

  while (Date.now() - startedAt < CLONE_TIMEOUT_MS) {
    try {
      const { stdout } = await captureExec(containerId, ['cat', '/tmp/clone.exit'], { timeoutMs: 10_000 })
      const value = stdout.trim()
      if (value !== '') {
        const code = Number(value)
        return Number.isFinite(code) ? code : 1
      }
    } catch (err) {
      if (err instanceof ContainerError) throw err
      // A transient exec failure while the container is still starting is fine.
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
  }

  return null
}

/**
 * Clone a GitHub repository into a runner container, wait for the clone to
 * finish, then prove the container holds every file GitHub reports.
 *
 * The request intentionally waits: the client only navigates to the analysis
 * screen once the clone is verified, so no section can render results from a
 * partial clone. On any failure the container is removed so retries start clean.
 */
export async function POST(request: NextRequest) {
  let container: Awaited<ReturnType<typeof docker.createContainer>> | null = null

  try {
    const body = (await request.json()) as { repoUrl?: unknown }
    const rawUrl = typeof body.repoUrl === 'string' ? body.repoUrl.trim() : ''
    const parsed = parseRepoUrl(rawUrl)

    if (!parsed) {
      return NextResponse.json(
        { success: false, error: 'Enter a GitHub repository URL, e.g. https://github.com/owner/repo.' },
        { status: 400 }
      )
    }

    // Rebuild a canonical HTTPS URL from the validated owner/name. The user's
    // string never reaches the shell, and `/tree/branch` style links still clone.
    const cloneUrl = `https://github.com/${parsed.owner}/${parsed.name}.git`

    container = await docker.createContainer({
      Image: 'github-analyzer-runner:latest',
      // $1 is the validated clone URL; the shell string itself is a constant.
      Cmd: [
        'sh',
        '-c',
        'rm -rf /workspace/repo; git clone --progress "$1" /workspace/repo >/tmp/clone.log 2>&1; echo $? >/tmp/clone.exit; tail -f /dev/null',
        'clone',
        cloneUrl,
      ],
      Tty: false,
    })

    const id = container.id
    await container.start()

    const exitCode = await waitForClone(id)

    if (exitCode === null) {
      await container.remove({ force: true }).catch(() => {})
      return NextResponse.json(
        {
          success: false,
          error: `Cloning timed out after ${Math.round(CLONE_TIMEOUT_MS / 60000)} minutes. The repository may be too large.`,
        },
        { status: 504 }
      )
    }

    if (exitCode !== 0) {
      const log = await captureExec(id, ['tail', '-n', '30', '/tmp/clone.log'], { timeoutMs: 10_000 }).catch(
        () => null
      )
      const detail = log?.stdout.trim().slice(-1500) || log?.stderr.trim().slice(-1500) || ''
      await container.remove({ force: true }).catch(() => {})

      return NextResponse.json(
        {
          success: false,
          error: detail
            ? `git clone failed (exit ${exitCode}). ${detail}`
            : `git clone failed with exit code ${exitCode}.`,
        },
        { status: 502 }
      )
    }

    const verification = await verifyClone(id, cloneUrl)
    writeCloneVerification(id, verification)

    if (!verification.complete) {
      await container.remove({ force: true }).catch(() => {})
      return NextResponse.json(
        {
          success: false,
          error: verification.reason ?? 'The clone is incomplete.',
          verification,
        },
        { status: 422 }
      )
    }

    return NextResponse.json({ success: true, containerId: id, verification })
  } catch (err) {
    if (container) await container.remove({ force: true }).catch(() => {})

    if (err instanceof ContainerError) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: err.status >= 500 ? 502 : err.status }
      )
    }

    console.error('clone failed:', err)
    return NextResponse.json(
      { success: false, error: 'Could not clone the repository. Check that Docker is running.' },
      { status: 502 }
    )
  }
}
