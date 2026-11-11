import 'server-only'

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import type { CloneVerification } from '@/lib/types'
import { verifyClone } from './verify'

/**
 * Clone-verification cache keyed by containerId.
 *
 * `/api/clone` writes the result immediately after the clone finishes, so the
 * analysis and deep-analysis routes can gate on it without another round trip
 * to GitHub. The TTL is short enough that a retried clone is re-checked, and a
 * cached "complete" result is the only thing that unlocks analysis.
 */

const CACHE_DIR = join(process.cwd(), '.analysis', 'clone')
const CACHE_TTL_MS = 10 * 60 * 1000

function pathFor(containerId: string): string {
  return join(CACHE_DIR, encodeURIComponent(containerId) + '.json')
}

export function readCloneVerification(containerId: string): CloneVerification | null {
  try {
    const raw = readFileSync(pathFor(containerId), 'utf8')
    const parsed = JSON.parse(raw) as CloneVerification
    if (!parsed || typeof parsed.checkedAt !== 'string') return null
    if (Date.now() - Date.parse(parsed.checkedAt) > CACHE_TTL_MS) return null
    return parsed
  } catch {
    return null
  }
}

export function writeCloneVerification(containerId: string, verification: CloneVerification): void {
  try {
    mkdirSync(CACHE_DIR, { recursive: true })
    writeFileSync(pathFor(containerId), JSON.stringify(verification), 'utf8')
  } catch (err) {
    console.error('clone verification cache write failed:', err)
  }
}

/**
 * Read the cached verification for a container, recomputing when it is missing
 * or stale. Only a `complete` result should ever unlock the analysis sections.
 */
export async function getOrComputeCloneVerification(
  containerId: string,
  remoteUrlHint?: string | null
): Promise<CloneVerification> {
  const cached = readCloneVerification(containerId)
  if (cached) return cached

  const verification = await verifyClone(containerId, remoteUrlHint)
  writeCloneVerification(containerId, verification)
  return verification
}
