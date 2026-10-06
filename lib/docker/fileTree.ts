import 'server-only'

import { PassThrough } from 'node:stream'

import docker from '@/lib/docker'
import type { FileTreeNode } from '@/data/mockSourceFiles'

const REPO_DIR = '/workspace/repo'

/**
 * Lists every file under the cloned repo in a runner container and folds the
 * `ls` output back into a nested tree.
 *
 * Server-only: dockerode reaches for the Docker socket over Node's http/net
 * stack, so this must never be pulled into a client bundle.
 */
export async function readContainerFileTree(containerId: string): Promise<FileTreeNode[]> {
  const container = docker.getContainer(containerId)

  // Tty stays off so stdout arrives multiplexed with 8-byte frame headers, which
  // `demux` strips. Leaving Tty on merges stderr into stdout and wraps long
  // lines with \r, both of which corrupt the file list.
  //
  // -1 keeps entries on one line, -A includes dotfiles, -R recurses. Without
  // -1 BusyBox columnises and silently shreds the list.
  const exec = await container.exec({
    Cmd: ['sh', '-c', `ls -1AR ${REPO_DIR}`],
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
    console.error('ls stderr:', stderrText)
  }

  return buildTreeFromPaths(parseLsOutput(raw))
}

export interface PathEntry {
  path: string
  type: 'file' | 'dir'
}

/**
 * Parses `ls -1AR` into flat entries. BusyBox prints one block per directory:
 * a `<path>:` header line, then its entries, then a blank line. Directories
 * appear both as an entry in their parent's block and as a later header, so
 * headers are collected in a first pass — otherwise every directory in the
 * first pass is misread as a file.
 *
 * Entries are returned without the `REPO_DIR` prefix.
 */
export function parseLsOutput(output: string): PathEntry[] {
  const lines = output.split('\n').map((l) => l.replace(/\r$/, ''))
  const headers = new Set(
    lines
      .filter((l) => l.endsWith(':'))
      .map((l) => l.slice(0, -1).trim())
  )

  const entries: PathEntry[] = []
  const seen = new Set<string>()
  let currentDir: string | null = null

  for (const line of lines) {
    if (line === '') {
      currentDir = null
      continue
    }

    if (line.endsWith(':')) {
      currentDir = line.slice(0, -1).trim()
      continue
    }

    if (!currentDir || (currentDir !== REPO_DIR && !currentDir.startsWith(REPO_DIR + '/'))) {
      continue
    }

    const relativeDir = currentDir.slice(REPO_DIR.length + 1) // '' at the root
    const relative = relativeDir ? `${relativeDir}/${line}` : line
    if (seen.has(relative)) continue

    seen.add(relative)
    entries.push({
      path: relative,
      // A header line proves the entry is a directory, including empty ones.
      type: headers.has(`${currentDir}/${line}`) ? 'dir' : 'file',
    })
  }

  return entries
}

/**
 * Folds flat, pre-relative paths back into a nested tree. Directories are
 * emitted even when empty, and sorted with directories first.
 */
export function buildTreeFromPaths(entries: PathEntry[]): FileTreeNode[] {
  const root: FileTreeNode[] = []

  for (const entry of entries) {
    const parts = entry.path.split('/').filter(Boolean)
    if (parts.length === 0) continue

    let cursor = root

    parts.forEach((part, i) => {
      const isLast = i === parts.length - 1
      const isFile = isLast && entry.type === 'file'

      let node = cursor.find((n) => n.name === part)

      if (node && isLast && ((isFile && node.type !== 'file') || (!isFile && node.type !== 'dir'))) {
        // The same name turned up as both a file and a directory across
        // blocks; the block header is authoritative, so let it win.
        node.type = entry.type
        node.children = entry.type === 'dir' ? [] : undefined
      }

      if (!node) {
        node = isFile
          ? { name: part, type: 'file', path: entry.path }
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