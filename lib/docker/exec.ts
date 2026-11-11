import 'server-only'

import { PassThrough } from 'node:stream'

import docker from '@/lib/docker'
import { ContainerError, dockerStatus } from '@/lib/docker/errors'

/**
 * Runs a command inside a runner container and captures its output.
 *
 * Tty is off and dockerode's demuxStream strips the multiplexed frames, so the
 * returned strings are byte-clean. A timeout is available for commands that can
 * hang (network git probes, clone waits) so a route can never block forever.
 */
export async function captureExec(
  containerId: string,
  cmd: string[],
  options: { timeoutMs?: number } = {}
): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
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
    const timer = options.timeoutMs
      ? setTimeout(() => {
          stream.destroy()
          reject(new ContainerError(`Command timed out after ${Math.round(options.timeoutMs! / 1000)}s`, 504))
        }, options.timeoutMs)
      : null

    const settle = (fn: () => void) => {
      if (timer) clearTimeout(timer)
      fn()
    }

    stdout.on('error', (err) => settle(() => reject(err)))
    stream.on('end', () => settle(resolve))
    stream.on('error', (err) => settle(() => reject(err)))
  })

  let exitCode: number | null = null
  try {
    const info = await exec.inspect()
    exitCode = typeof info.ExitCode === 'number' ? info.ExitCode : null
  } catch {
    // The command may have removed the exec before inspect; output is enough.
  }

  return {
    stdout: Buffer.concat(out).toString('utf8'),
    stderr: Buffer.concat(errs).toString('utf8'),
    exitCode,
  }
}

export function mapDockerError(err: unknown, fallback: string): ContainerError {
  const status = dockerStatus(err)
  if (typeof status === 'number') {
    if (status === 404) return new ContainerError('Runner container not found — it may have been stopped or removed.', 404)
    return new ContainerError(`Docker returned status ${status}`, status >= 500 ? 502 : status)
  }
  return new ContainerError(fallback, 502)
}
