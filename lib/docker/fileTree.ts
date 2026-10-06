import 'server-only'

import { PassThrough } from 'node:stream'

import docker from '@/lib/docker'
import type { FileTreeNode } from '@/data/mockSourceFiles'

const REPO_DIR = '/workspace/repo'

/**
 * Lists every file under the cloned repo in a runner container and folds the
 * flat `find` output back into a nested tree.
 *
 * Server-only: dockerode reaches for the Docker socket over Node's http/net
 * stack, so this must never be pulled into a client bundle.
 */
export async function readContainerFileTree(containerId: string): Promise<FileTreeNode[]> {
  const container = docker.getContainer(containerId)

  // Tty stays off so stdout arrives multiplexed with 8-byte frame headers, which
  // `demux` strips. Leaving Tty on merges stderr into stdout and wraps long
  // lines with \r, both of which corrupt the file list.
  const exec = await container.exec({
    Cmd: ['sh', '-c', `find ${REPO_DIR} -type f`],
    AttachStderr: false,
    AttachStdout: true,
    Tty: false,
  })

  const stream = await exec.start({ hijack: true, stdin: false })
  const chunks: Buffer[] = []

  // The hijacked socket carries multiplexed frames. `demuxStream` understands
  // that framing; reading raw bytes leaves 8-byte headers glued to the output
  // and truncates the last lines.
  const stdout = new PassThrough()
  const stderr = new PassThrough()
  const errors: Buffer[] = []

  stderr.on('data', (chunk: Buffer) => errors.push(chunk))

  // demuxStream writes to both, and it dereferences `stderr` unconditionally.
  docker.modem.demuxStream(stream, stdout, stderr)

  // demuxStream never ends the writable it writes into, so completion is taken
  // from the source stream. By the time it emits 'end' every frame has already
  // been written to stdout.
  await new Promise<void>((resolve, reject) => {
    stdout.on('data', (chunk: Buffer) => chunks.push(chunk))
    stdout.on('error', reject)
    stream.on('end', resolve)
    stream.on('error', reject)
  })

  const raw = Buffer.concat(chunks).toString('utf8')

  const stderrText = Buffer.concat(errors).toString('utf8').trim()
  if (stderrText) {
    console.error('find stderr:', stderrText)
  }

  return buildTreeFromPaths(raw)
}

/** Turns newline-separated absolute paths into a nested tree. */
export function buildTreeFromPaths(output: string): FileTreeNode[] {
  const root: FileTreeNode[] = []

  for (const line of output.split('\n')) {
    const abs = line.trim()
    if (!abs.startsWith(REPO_DIR + '/')) continue

    const relative = abs.slice(REPO_DIR.length + 1)
    const parts = relative.split('/').filter(Boolean)
    if (parts.length === 0) continue

    let cursor = root

    parts.forEach((part, i) => {
      const isFile = i === parts.length - 1
      let node = cursor.find((n) => n.name === part)

      if (node && isFile && node.type !== 'file') {
        // `find` can list a path that already exists as a directory node.
        node.type = 'file'
        node.children = undefined
      }

      if (!node) {
        node = isFile
          ? { name: part, type: 'file', path: parts.join('/') }
          : { name: part, type: 'dir', children: [] }
        cursor.push(node)
      }

      if (!isFile) {
        node.children ??= []
        cursor = node.children
      }
    })
  }

  return sortTree(root)
}

function sortTree(nodes: FileTreeNode[]): FileTreeNode[] {
  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  for (const node of nodes) {
    if (node.children) sortTree(node.children)
  }

  return nodes
}