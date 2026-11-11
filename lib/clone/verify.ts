import 'server-only'

import { captureExec } from '@/lib/docker/exec'
import { fetchGithubTree, parseRepoUrl } from '@/lib/github/cloneTree'
import type { CloneVerification } from '@/lib/types'

/**
 * Clone verification.
 *
 * A clone is only trustworthy when the container holds every file GitHub says
 * the repository has at that commit. We compare:
 *   - GitHub's recursive tree (paths + blob sizes), the expected inventory;
 *   - `git ls-tree -r -l HEAD` inside the container, the actual inventory;
 *   - `git ls-files -d`, which catches a checkout that dropped working files.
 *
 * When GitHub's tree is unavailable (rate limit, offline, or truncated for a
 * huge repository) we fall back to a git-only integrity check: the local HEAD
 * must equal the remote HEAD and the working tree must have no deletions.
 */

const REPO_DIR = '/workspace/repo'
const GIT_TIMEOUT_MS = 120_000
const REMOTE_TIMEOUT_MS = 15_000

async function runGit(
  containerId: string,
  args: string[],
  timeoutMs = GIT_TIMEOUT_MS
): Promise<{ stdout: string; ok: boolean } | null> {
  try {
    const result = await captureExec(containerId, ['git', '-C', REPO_DIR, ...args], { timeoutMs })
    return { stdout: result.stdout, ok: result.exitCode === 0 }
  } catch {
    // A missing container / dead exec is handled by the caller's gate.
    return null
  }
}

/** Parse `git ls-tree -r -l -z HEAD` into path → blob size (bytes). */
function parseLsTree(raw: string): Map<string, number> {
  const files = new Map<string, number>()

  for (const record of raw.split('\0')) {
    if (!record) continue
    const tab = record.indexOf('\t')
    if (tab === -1) continue

    const meta = record.slice(0, tab)
    const path = record.slice(tab + 1)
    // "<mode> <type> <sha> <size>" — submodules use "-" for size and are skipped.
    const match = meta.match(/^\d+ \w+ [0-9a-f]+ +(\d+)$/)
    if (!match) continue

    files.set(path, Number(match[1]))
  }

  return files
}

function sum(values: Iterable<number>): number {
  let total = 0
  for (const value of values) total += value
  return total
}

/**
 * Verify that the container's clone contains every file GitHub reports for the
 * repository's current commit. Never throws for a partial clone — the result
 * carries `complete: false` and a human-readable `reason`.
 */
export async function verifyClone(
  containerId: string,
  remoteUrlHint?: string | null
): Promise<CloneVerification> {
  const remoteUrlResult = await runGit(containerId, ['config', '--get', 'remote.origin.url'])
  const remoteUrl = remoteUrlHint?.trim() || remoteUrlResult?.stdout.trim() || null
  const parsed = parseRepoUrl(remoteUrl)

  const headResult = await runGit(containerId, ['rev-parse', 'HEAD'])
  const headSha = headResult?.ok ? headResult.stdout.trim() || null : null

  const branchResult = await runGit(containerId, ['rev-parse', '--abbrev-ref', 'HEAD'])
  const branch = branchResult?.ok ? branchResult.stdout.trim() || null : null

  const treeResult = await runGit(containerId, ['ls-tree', '-r', '-l', '-z', 'HEAD'])
  const localFiles = parseLsTree(treeResult?.stdout ?? '')

  const deletedResult = await runGit(containerId, ['ls-files', '-d', '-z'])
  const deletedFiles = (deletedResult?.stdout ?? '').split('\0').filter(Boolean)
  const deletedSet = new Set(deletedFiles)

  const remoteResult = await runGit(containerId, ['ls-remote', 'origin', 'HEAD'], REMOTE_TIMEOUT_MS)
  const remoteHeadSha = remoteResult?.ok ? remoteResult.stdout.split(/\s+/)[0] || null : null
  const headMatch = remoteHeadSha && headSha ? remoteHeadSha === headSha : null

  const githubTree = parsed
    ? await fetchGithubTree(parsed.owner, parsed.name, headSha ?? branch)
    : null

  const checkedAt = new Date().toISOString()

  /* ------------------------------------------------------------------ */
  /* Preferred path: compare against GitHub's complete file list.        */
  /* ------------------------------------------------------------------ */
  if (githubTree && githubTree.files.length > 0 && !githubTree.truncated) {
    const expected = new Map(githubTree.files.map((file) => [file.path, file.size]))
    let presentCount = 0
    let presentBytes = 0
    let expectedBytes = 0
    const missing: string[] = []

    for (const [path, size] of expected) {
      expectedBytes += size
      const localSize = localFiles.get(path)
      if (localSize !== undefined && !deletedSet.has(path)) {
        presentCount++
        presentBytes += localSize
      } else {
        missing.push(path)
      }
    }

    const filesExpected = expected.size
    const filesMissing = missing.length
    const completenessPercent =
      filesExpected === 0 ? 0 : Math.floor((presentCount / filesExpected) * 100)
    const bytesPercent =
      expectedBytes === 0
        ? filesExpected === 0
          ? 0
          : 100
        : Math.min(100, Math.floor((presentBytes / expectedBytes) * 100))

    const complete =
      filesExpected > 0 &&
      presentCount === filesExpected &&
      bytesPercent >= 99 &&
      deletedFiles.length === 0

    let reason: string | null = null
    if (!headSha) {
      reason = 'The container has no git commit — the clone did not finish.'
    } else if (filesMissing > 0) {
      reason = `${filesMissing.toLocaleString()} of ${filesExpected.toLocaleString()} files from GitHub are missing in the container.`
    } else if (bytesPercent < 99) {
      reason = `Only ${bytesPercent}% of the repository bytes were cloned.`
    } else if (deletedFiles.length > 0) {
      reason = `${deletedFiles.length.toLocaleString()} checked-out files are missing from the working tree.`
    }

    return {
      complete,
      filesExpected,
      filesPresent: presentCount,
      filesMissing,
      missingSample: missing.slice(0, 12),
      filesDeleted: deletedFiles.length,
      bytesExpected: expectedBytes,
      bytesPresent: presentBytes,
      completenessPercent,
      bytesPercent,
      headSha,
      remoteHeadSha,
      headMatch,
      source: 'github-api',
      githubTruncated: false,
      repoSizeKb: githubTree.repoSizeKb,
      checkedAt,
      reason,
    }
  }

  /* ------------------------------------------------------------------ */
  /* Fallback: git-only integrity (HEAD equality + no deleted files).    */
  /* ------------------------------------------------------------------ */
  const filesExpected = localFiles.size
  const presentBytes = sum(
    [...localFiles.entries()].filter(([path]) => !deletedSet.has(path)).map(([, size]) => size)
  )
  const bytesExpected = sum(localFiles.values())
  const filesPresent = Math.max(0, filesExpected - deletedFiles.length)
  const completenessPercent =
    filesExpected === 0 ? 0 : Math.floor((filesPresent / filesExpected) * 100)
  const bytesPercent =
    bytesExpected === 0 ? (filesExpected === 0 ? 0 : 100) : Math.min(100, Math.floor((presentBytes / bytesExpected) * 100))

  const complete =
    Boolean(headSha) &&
    filesExpected > 0 &&
    headMatch === true &&
    deletedFiles.length === 0

  let reason: string | null = null
  if (!headSha) {
    reason = 'The container has no git commit — the clone did not finish.'
  } else if (filesExpected === 0) {
    reason = 'The container has no tracked files.'
  } else if (headMatch === null) {
    reason = 'Could not read the remote HEAD to verify that the clone is complete.'
  } else if (headMatch === false && remoteHeadSha) {
    reason = `The container is on ${headSha.slice(0, 7)} but the remote reports ${remoteHeadSha.slice(0, 7)} — the clone is stale or incomplete.`
  } else if (deletedFiles.length > 0) {
    reason = `${deletedFiles.length.toLocaleString()} checked-out files are missing from the working tree.`
  }

  return {
    complete,
    filesExpected,
    filesPresent,
    filesMissing: deletedFiles.length,
    missingSample: deletedFiles.slice(0, 12),
    filesDeleted: deletedFiles.length,
    bytesExpected,
    bytesPresent: presentBytes,
    completenessPercent,
    bytesPercent,
    headSha,
    remoteHeadSha,
    headMatch,
    source: 'git-fallback',
    githubTruncated: githubTree?.truncated ?? false,
    repoSizeKb: githubTree?.repoSizeKb ?? null,
    checkedAt,
    reason,
  }
}
