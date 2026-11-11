import 'server-only'

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * GitHub's recursive tree, used as the ground truth for clone verification.
 *
 * A `git clone` only tells us what *it* managed to fetch. To prove that the
 * container holds the whole repository we compare its tree against the file
 * list GitHub reports for the same commit. The response is cached briefly so a
 * page refresh (and the clone + analysis routes) don't each spend rate limit.
 *
 * Works anonymously (60 requests/hour per IP) or with `GITHUB_TOKEN` /
 * `GITHUB_API_KEY` (5,000/hour and private repositories).
 */

const API_BASE = 'https://api.github.com'
const CACHE_DIR = join(process.cwd(), '.analysis', 'github', 'trees')
const CACHE_TTL_MS = 10 * 60 * 1000
const REQUEST_TIMEOUT_MS = 8000

export interface GithubTreeFile {
  path: string
  size: number
}

export interface GithubTree {
  owner: string
  name: string
  /** Commit sha the tree was read from, when known. */
  headSha: string | null
  defaultBranch: string | null
  repoSizeKb: number | null
  files: GithubTreeFile[]
  truncated: boolean
}

interface CacheEntry {
  fetchedAt: number
  tree: GithubTree
}

/** Parse a GitHub remote/URL into owner/name. Returns null for non-GitHub URLs. */
export function parseRepoUrl(url: string | null): { owner: string; name: string } | null {
  if (!url) return null

  const cleaned = url
    .trim()
    .replace(/^git@github\.com:/i, 'https://github.com/')
    .replace(/^ssh:\/\/git@github\.com\//i, 'https://github.com/')
    .replace(/^git:\/\/github\.com\//i, 'https://github.com/')

  const match = cleaned.match(
    /^https?:\/\/(?:www\.)?github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?(?:\/.*)?$/i
  )
  if (!match) return null

  const owner = match[1]
  const name = match[2]
  if (!owner || !name || owner === '.' || name === '.') return null
  return { owner, name }
}

function cachePath(owner: string, name: string, ref: string | null): string {
  const key = `${owner}__${name}__${ref ?? 'default'}`.replace(/[^a-z0-9_.-]/gi, '_').toLowerCase()
  return join(CACHE_DIR, `${key}.json`)
}

function readCache(owner: string, name: string, ref: string | null): GithubTree | null {
  try {
    const entry = JSON.parse(readFileSync(cachePath(owner, name, ref), 'utf8')) as CacheEntry
    if (Date.now() - entry.fetchedAt < CACHE_TTL_MS) return entry.tree
  } catch {
    // Missing or corrupt cache — treat as a miss.
  }
  return null
}

function writeCache(owner: string, name: string, ref: string | null, tree: GithubTree): void {
  try {
    mkdirSync(CACHE_DIR, { recursive: true })
    const entry: CacheEntry = { fetchedAt: Date.now(), tree }
    writeFileSync(cachePath(owner, name, ref), JSON.stringify(entry), 'utf8')
  } catch (err) {
    // A failed cache write must never fail verification.
    console.error('github tree cache write failed:', err)
  }
}

function authHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN || process.env.GITHUB_API_KEY
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'repository-x-ray',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function githubJson(url: string): Promise<{ ok: boolean; status: number; json: Record<string, unknown> | null }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
      headers: authHeaders(),
    })
    const json = res.ok ? ((await res.json()) as Record<string, unknown>) : null
    return { ok: res.ok, status: res.status, json }
  } catch {
    return { ok: false, status: 0, json: null }
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Read the recursive tree for a repository at `ref` (a commit sha or branch).
 * Falls back to the repository's default branch when the ref is unavailable.
 */
export async function fetchGithubTree(
  owner: string,
  name: string,
  ref: string | null
): Promise<GithubTree | null> {
  if (!owner || !name) return null

  const cached = readCache(owner, name, ref)
  if (cached) return cached

  const repoMeta = await githubJson(`${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`)
  if (!repoMeta.ok || !repoMeta.json) {
    console.warn(`github tree: ${owner}/${name} → repo meta HTTP ${repoMeta.status}`)
    return null
  }

  const defaultBranch =
    typeof repoMeta.json.default_branch === 'string' ? repoMeta.json.default_branch : null
  const repoSizeKb = typeof repoMeta.json.size === 'number' ? repoMeta.json.size : null

  const candidates = [ref, defaultBranch].filter((value): value is string => Boolean(value))
  const tried = new Set<string>()

  for (const candidate of candidates) {
    if (tried.has(candidate)) continue
    tried.add(candidate)

    const treeRes = await githubJson(
      `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/git/trees/${encodeURIComponent(candidate)}?recursive=1`
    )
    if (!treeRes.ok || !treeRes.json) continue

    const rawTree = Array.isArray(treeRes.json.tree) ? treeRes.json.tree : []
    const files: GithubTreeFile[] = []

    for (const item of rawTree) {
      if (!item || typeof item !== 'object') continue
      const node = item as { type?: unknown; path?: unknown; size?: unknown }
      if (node.type !== 'blob' || typeof node.path !== 'string') continue
      files.push({ path: node.path, size: typeof node.size === 'number' ? node.size : 0 })
    }

    // Resolve a commit sha for the tree (the tree endpoint echoes a tree sha,
    // not the commit). When the caller passed a 40-hex ref we already have it.
    let headSha: string | null = /^[0-9a-f]{40}$/i.test(candidate) ? candidate : null
    if (!headSha) {
      const commitRes = await githubJson(
        `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/commits/${encodeURIComponent(candidate)}`
      )
      if (commitRes.ok && commitRes.json && typeof commitRes.json.sha === 'string') {
        headSha = commitRes.json.sha
      }
    }

    const tree: GithubTree = {
      owner,
      name,
      headSha,
      defaultBranch,
      repoSizeKb,
      files,
      truncated: treeRes.json.truncated === true,
    }

    writeCache(owner, name, ref, tree)
    return tree
  }

  console.warn(`github tree: ${owner}/${name} → no tree for ref ${ref ?? '(default)'}`)
  return null
}
