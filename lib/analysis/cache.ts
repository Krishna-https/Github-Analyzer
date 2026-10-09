import 'server-only'

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { AnalysisBundle } from './types'

const CACHE_DIR = join(process.cwd(), '.analysis')
const CACHE_EXT = '.json'

function pathFor(containerId: string): string {
  return join(CACHE_DIR, encodeURIComponent(containerId) + CACHE_EXT)
}

export function readCachedBundle(containerId: string): AnalysisBundle | null {
  try {
    const raw = readFileSync(pathFor(containerId), 'utf8')
    return JSON.parse(raw) as AnalysisBundle
  } catch {
    return null
  }
}

export function writeCachedBundle(bundle: AnalysisBundle): void {
  try {
    mkdirSync(CACHE_DIR, { recursive: true })
    writeFileSync(pathFor(bundle.containerId), JSON.stringify(bundle), 'utf8')
  } catch (err) {
    // A failed cache write must never fail the request — the bundle is still
    // returned; it just won't be reused next time.
    console.error('analysis cache write failed:', err)
  }
}