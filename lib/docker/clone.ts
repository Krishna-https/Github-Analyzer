import 'server-only'

import { PassThrough } from 'node:stream'

import docker from '@/lib/docker'
import type { CloneFileEntry, CloneProgress, CloneStatus } from '@/lib/types'

export const RUNNER_REPO_DIR = '/workspace/repo'
export const CLONE_LOG_PATH = '/workspace/clone.log'
export const CLONE_EXIT_PATH = '/workspace/clone.exit'

/** Keep the status payload small; the UI only needs the newest entries. */
const MAX_FILES = 60
const MAX_LOG_LINES = 8
const LOG_TAIL_BYTES = 6000

/**
 * The script run inside the runner container. `--progress` is required because
 * stderr is redirected to a file, and git only prints progress when it thinks
 * it is on a TTY otherwise. The exit code goes into a marker file so the status
 * endpoint can tell a finished clone from one that is still fetching without
 * inspecting processes (`pgrep` is not guaranteed in every BusyBox image).
 *
 * The URL must already be validated by the caller: it is interpolated into a
 * shell string, so an unvalidated value would be a command-injection hole.
 */
export function buildCloneScript(repoUrl: string): string {
  return [
    `rm -rf ${RUNNER_REPO_DIR}`,
    `git clone --progress "${repoUrl}" ${RUNNER_REPO_DIR} 2>${CLONE_LOG_PATH}`,
    `echo $? > ${CLONE_EXIT_PATH}`,
    'tail -f /dev/null',
  ].join('; ')
}

/**
 * One exec collects everything the Analyze page needs: clone state, disk usage,
 * working-tree file count and the newest files on disk. Dot-git paths are
 * excluded so pack files and refs stay out of the file feed, and the 60-file
 * cap keeps a multi-thousand-file checkout from flooding the response.
 *
 * The script is executed by `sh -c` inside the container only; no host shell is
 * involved, so quoting below is for POSIX sh, not PowerShell.
 */
const STATUS_SCRIPT = `
if [ -f ${CLONE_EXIT_PATH} ]; then
  printf 'EXIT:%s\\n' "$(cat ${CLONE_EXIT_PATH})"
elif [ ! -f ${CLONE_LOG_PATH} ] && [ -d ${RUNNER_REPO_DIR}/.git ] && git -C ${RUNNER_REPO_DIR} rev-parse --verify HEAD >/dev/null 2>&1; then
  printf 'EXIT:0\\n'
else
  printf 'EXIT:running\\n'
fi
printf 'SIZE:'
du -sk ${RUNNER_REPO_DIR} 2>/dev/null | cut -f1
printf '\\nCOUNT:'
find ${RUNNER_REPO_DIR} -type f -not -path '*/.git/*' 2>/dev/null | wc -l
printf '\\nLOG:\\n'
tail -c ${LOG_TAIL_BYTES} ${CLONE_LOG_PATH} 2>/dev/null
printf '\\nFILES:\\n'
find ${RUNNER_REPO_DIR} -type f -not -path '*/.git/*' -exec stat -c '%Y|%s|%n' {} + 2>/dev/null | sort -t '|' -k1,1nr | head -${MAX_FILES}
`.trim()

/**
 * Reads the clone state for a runner container. Throws dockerode errors as-is
 * (they carry `statusCode` for missing/stopped containers) so the API route can
 * map them to honest HTTP statuses.
 */
export async function readCloneStatus(containerId: string): Promise<CloneStatus> {
  const output = await execInContainer(containerId, ['sh', '-c', STATUS_SCRIPT])

  let exitRaw: string | null = null
  let sizeKb = 0
  let fileCount = 0
  const logLines: string[] = []
  const fileLines: string[] = []
  let section: 'log' | 'files' | null = null

  for (const line of output.split('\n')) {
    if (line.startsWith('EXIT:')) {
      exitRaw = line.slice('EXIT:'.length).trim()
      continue
    }
    if (line.startsWith('SIZE:')) {
      sizeKb = Number.parseInt(line.slice('SIZE:'.length).trim(), 10) || 0
      continue
    }
    if (line.startsWith('COUNT:')) {
      fileCount = Number.parseInt(line.slice('COUNT:'.length).trim(), 10) || 0
      continue
    }
    if (line === 'LOG:') {
      section = 'log'
      continue
    }
    if (line === 'FILES:') {
      section = 'files'
      continue
    }
    if (section === 'log') logLines.push(line)
    else if (section === 'files') fileLines.push(line)
  }

  const exitCode = exitRaw !== null && /^\d+$/.test(exitRaw) ? Number(exitRaw) : null
  const state: CloneStatus['state'] =
    exitRaw === 'running' ? 'cloning' : exitCode === 0 ? 'done' : exitCode === null ? 'cloning' : 'failed'

  const log = logLines
    // git overwrites progress lines with carriage returns; split them so the
    // error extractor sees one message per line instead of one giant line.
    .flatMap((line) => line.split('\r'))
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-MAX_LOG_LINES)

  return {
    state,
    exitCode,
    bytes: sizeKb * 1024,
    fileCount,
    files: parseFiles(fileLines),
    progress: parseProgress(logLines.join('\n')),
    error: state === 'failed' ? cloneErrorMessage(log) : null,
    log,
  }
}

function parseFiles(lines: string[]): CloneFileEntry[] {
  const files: CloneFileEntry[] = []
  const prefix = `${RUNNER_REPO_DIR}/`

  for (const line of lines) {
    const first = line.indexOf('|')
    const second = line.indexOf('|', first + 1)
    if (first === -1 || second === -1) continue

    const mtime = Number.parseInt(line.slice(0, first), 10)
    const bytes = Number.parseInt(line.slice(first + 1, second), 10)
    const absPath = line.slice(second + 1).trim()

    if (!Number.isFinite(mtime) || !Number.isFinite(bytes)) continue
    if (!absPath.startsWith(prefix)) continue

    const relative = absPath.slice(prefix.length)
    // Safety net in case the container's find does not honour the -path test:
    // git metadata is internal bookkeeping, not something the user pulled.
    if (relative === '.git' || relative.startsWith('.git/')) continue

    files.push({ path: relative, bytes, mtime })
  }

  return files
}

const PROGRESS_LINE =
  /^(Counting objects|Compressing objects|Receiving objects|Resolving deltas|Updating files|Checking out files|Updating working tree):\s*(\d+)%/

/**
 * Git emits progress with carriage returns, not newlines, so the log is split
 * on both. Only the newest progress line matters; everything after the percent
 * (size/speed/timestamps) is passed through as `detail`.
 */
function parseProgress(log: string): CloneProgress | null {
  const lines = log.split(/[\r\n]+/)

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i].trim()
    const match = PROGRESS_LINE.exec(line)
    if (!match) continue

    const detail = line
      .slice(match[0].length)
      .replace(/^[,\s]+/, '')
      .trim()

    return {
      phase: match[1],
      percent: Number(match[2]),
      detail: detail || null,
    }
  }

  return null
}

function cloneErrorMessage(log: string[]): string | null {
  for (let i = log.length - 1; i >= 0; i -= 1) {
    const line = log[i]
    if (/^(fatal|error):/i.test(line)) return line
    if (/^remote: .*(error|denied|not found|does not exist)/i.test(line)) return line
  }
  return null
}

/**
 * Runs a short read-only command inside the container and returns its stdout.
 * Tty stays off so stdout arrives multiplexed with 8-byte frame headers, which
 * `demuxStream` strips; Tty on would merge stderr into stdout and wrap lines.
 */
async function execInContainer(containerId: string, cmd: string[]): Promise<string> {
  const container = docker.getContainer(containerId)

  const exec = await container.exec({
    Cmd: cmd,
    AttachStderr: true,
    AttachStdout: true,
    Tty: false,
  })

  const stream = await exec.start({ hijack: true, stdin: false })
  const chunks: Buffer[] = []
  const errors: Buffer[] = []

  const stdout = new PassThrough()
  const stderr = new PassThrough()

  stderr.on('data', (chunk: Buffer) => errors.push(chunk))

  // demuxStream dereferences `stderr` unconditionally.
  docker.modem.demuxStream(stream, stdout, stderr)

  await new Promise<void>((resolve, reject) => {
    stdout.on('data', (chunk: Buffer) => chunks.push(chunk))
    stdout.on('error', reject)
    stream.on('end', resolve)
    stream.on('error', reject)
  })

  const stderrText = Buffer.concat(errors).toString('utf8').trim()
  if (stderrText) console.error('clone status stderr:', stderrText)

  return Buffer.concat(chunks).toString('utf8')
}
