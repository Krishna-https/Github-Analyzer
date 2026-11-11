import 'server-only'

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { AnalysisOverview, Repository } from '@/lib/types'

/**
 * GitHub platform stats for a repository.
 *
 * A `git clone` carries the code and git history, but stars/forks/issues/
 * watchers only exist on GitHub. This module fetches them from the REST API and
 * merges them into an AnalysisOverview at response time, so the cached analysis
 * bundle stays pure and the numbers can refresh without a new commit.
 *
 * Works anonymously (60 req/hour per IP) or with a `GITHUB_TOKEN` (5,000/hour,
 * and private repositories). Every failure path degrades to the un-enriched
 * overview rather than erroring — the UI shows "—" for what it can't get.
 */

const API_BASE = 'https://api.github.com'
const CACHE_DIR = join(process.cwd(), '.analysis', 'github')
const CACHE_TTL_MS = 10 * 60 * 1000
const REQUEST_TIMEOUT_MS = 6000

export interface GithubRepoStats {
  stars: number
  forks: number
  openIssues: number
  watchers: number
  description: string | null
  topics: string[]
  defaultBranch: string | null
  license: string | null
}

/** Labels /api/analysis can satisfy from the GitHub API. */
const GITHUB_PROVIDED_STATS = new Set(['Stars', 'Forks', 'Open Issues'])

interface CacheEntry {
  fetchedAt: number
  stats: GithubRepoStats
}

function cachePath(owner: string, name: string): string {
  const key = `${owner}__${name}`.replace(/[^a-z0-9_.-]/gi, '_').toLowerCase()
  return join(CACHE_DIR, `${key}.json`)
}

function readCache(owner: string, name: string): GithubRepoStats | null {
  try {
    const entry = JSON.parse(readFileSync(cachePath(owner, name), 'utf8')) as CacheEntry
    if (Date.now() - entry.fetchedAt < CACHE_TTL_MS) return entry.stats
  } catch {
    // Missing or corrupt cache — treat as a miss.
  }
  return null
}

function writeCache(owner: string, name: string, stats: GithubRepoStats): void {
  try {
    mkdirSync(CACHE_DIR, { recursive: true })
    const entry: CacheEntry = { fetchedAt: Date.now(), stats }
    writeFileSync(cachePath(owner, name), JSON.stringify(entry), 'utf8')
  } catch (err) {
    // A failed cache write must never fail the request.
    console.error('github stats cache write failed:', err)
  }
}

function toStats(json: Record<string, unknown>): GithubRepoStats {
  return {
    stars: Number(json.stargazers_count ?? 0),
    forks: Number(json.forks_count ?? 0),
    openIssues: Number(json.open_issues_count ?? 0),
    watchers: Number(json.subscribers_count ?? json.watchers_count ?? 0),
    description: typeof json.description === 'string' ? json.description : null,
    topics: Array.isArray(json.topics) ? json.topics.filter((t): t is string => typeof t === 'string') : [],
    defaultBranch: typeof json.default_branch === 'string' ? json.default_branch : null,
    license: toLicense(json.license),
  }
}

/** GitHub uses the sentinel spdx_id "NOASSERTION" for unrecognized licenses. */
function toLicense(license: unknown): string | null {
  if (!license || typeof license !== 'object') return null
  const spdx = (license as { spdx_id?: unknown }).spdx_id
  return typeof spdx === 'string' && spdx !== 'NOASSERTION' ? spdx : null
}

/** Fetch (with a short TTL cache) the GitHub stats, or null when unavailable. */
export async function fetchRepoStats(owner: string, name: string): Promise<GithubRepoStats | null> {
  if (!owner || !name || owner === 'unknown') return null

  const cached = readCache(owner, name)
  if (cached) return cached

  const token = process.env.GITHUB_TOKEN || process.env.GITHUB_API_KEY
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const res = await fetch(`${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`, {
      // Our own TTL cache governs freshness; opt out of Next's fetch cache.
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'repository-x-ray',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })

    if (!res.ok) {
      // 404 (missing/private), 403/429 (rate limit) — degrade silently.
      console.warn(`github stats: ${owner}/${name} → HTTP ${res.status}`)
      return null
    }

    const stats = toStats((await res.json()) as Record<string, unknown>)
    writeCache(owner, name, stats)
    return stats
  } catch (err) {
    console.warn(`github stats: ${owner}/${name} fetch failed:`, err instanceof Error ? err.message : err)
    return null
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Merge GitHub stats into an overview. Returns the overview unchanged when the
 * repository has no GitHub origin or the API is unreachable, so callers can
 * always render a result.
 */
export async function enrichOverview(overview: AnalysisOverview): Promise<AnalysisOverview> {
  const stats = await fetchRepoStats(overview.repository.owner, overview.repository.name)
  if (!stats) return overview

  const repository: Repository = {
    ...overview.repository,
    stars: stats.stars,
    forks: stats.forks,
    openIssues: stats.openIssues,
    watchers: stats.watchers,
    topics: stats.topics,
    defaultBranch: stats.defaultBranch ?? overview.repository.branch,
    // Prefer the human-written GitHub description over the README's first line.
    description: stats.description ?? overview.repository.description,
    license: stats.license ?? overview.repository.license,
  }

  return {
    ...overview,
    repository,
    statsUnavailable: overview.statsUnavailable.filter((s) => !GITHUB_PROVIDED_STATS.has(s)),
  }
}
