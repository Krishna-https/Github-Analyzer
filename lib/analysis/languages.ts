import 'server-only'

import type { LanguageShare } from '@/lib/types'
import type { DumpFile } from './types'

/**
 * Extension → language name and color, GitHub-style. The color drives the
 * donut/bars in the Overview languages card; the name is what the UI shows.
 */
const LANGUAGE_BY_EXT: Record<string, { name: string; color: string }> = {
  '.ts': { name: 'TypeScript', color: '#3178c6' },
  '.mts': { name: 'TypeScript', color: '#3178c6' },
  '.cts': { name: 'TypeScript', color: '#3178c6' },
  '.tsx': { name: 'TypeScript', color: '#3178c6' },
  '.js': { name: 'JavaScript', color: '#f1e05a' },
  '.mjs': { name: 'JavaScript', color: '#f1e05a' },
  '.cjs': { name: 'JavaScript', color: '#f1e05a' },
  '.jsx': { name: 'JavaScript', color: '#f1e05a' },
  '.py': { name: 'Python', color: '#3572a5' },
  '.go': { name: 'Go', color: '#00add8' },
  '.rs': { name: 'Rust', color: '#dea584' },
  '.java': { name: 'Java', color: '#b07219' },
  '.kt': { name: 'Kotlin', color: '#a97bff' },
  '.scala': { name: 'Scala', color: '#c22d40' },
  '.php': { name: 'PHP', color: '#4f5d95' },
  '.rb': { name: 'Ruby', color: '#701516' },
  '.cs': { name: 'C#', color: '#178600' },
  '.swift': { name: 'Swift', color: '#f05138' },
  '.c': { name: 'C', color: '#555555' },
  '.h': { name: 'C', color: '#555555' },
  '.cc': { name: 'C++', color: '#f34b7d' },
  '.cpp': { name: 'C++', color: '#f34b7d' },
  '.hpp': { name: 'C++', color: '#f34b7d' },
  '.sh': { name: 'Shell', color: '#89e051' },
  '.bash': { name: 'Shell', color: '#89e051' },
  '.html': { name: 'HTML', color: '#e34c26' },
  '.htm': { name: 'HTML', color: '#e34c26' },
  '.css': { name: 'CSS', color: '#8250df' },
  '.scss': { name: 'SCSS', color: '#c6538c' },
  '.sass': { name: 'Sass', color: '#c6538c' },
  '.less': { name: 'Less', color: '#1d365d' },
  '.vue': { name: 'Vue', color: '#41b883' },
  '.svelte': { name: 'Svelte', color: '#ff3e00' },
  '.astro': { name: 'Astro', color: '#ff5d01' },
  '.sql': { name: 'SQL', color: '#e38c00' },
  '.json': { name: 'JSON', color: '#0ea5e9' },
  '.yml': { name: 'YAML', color: '#cb171e' },
  '.yaml': { name: 'YAML', color: '#cb171e' },
  '.toml': { name: 'TOML', color: '#9c4221' },
  '.xml': { name: 'XML', color: '#0060ac' },
  '.md': { name: 'Markdown', color: '#083fa1' },
  '.markdown': { name: 'Markdown', color: '#083fa1' },
  '.rst': { name: 'reStructuredText', color: '#141414' },
  '.txt': { name: 'Text', color: '#8a8d93' },
  '.ini': { name: 'INI', color: '#d1dbe0' },
  '.cfg': { name: 'INI', color: '#d1dbe0' },
  '.conf': { name: 'INI', color: '#d1dbe0' },
}

/** Extensions that indicate developer catalog files, not source code. */
const CONFIG_EXTS = new Set(['.json', '.yml', '.yaml', '.toml', '.xml', '.ini', '.cfg', '.conf', '.lock'])

const DOC_EXTS = new Set(['.md', '.markdown', '.rst', '.txt'])
const BINARY_EXTS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.svg', '.pdf', '.woff', '.woff2',
  '.ttf', '.eot', '.mp4', '.webm', '.mp3', '.zip', '.gz', '.tar', '.wasm', '.exe', '.dll',
])

function extOf(relPath: string): string {
  const name = relPath.slice(relPath.lastIndexOf('/') + 1)
  if (name === 'Dockerfile' || name.endsWith('.dockerfile')) return '.dockerfile'
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '' : name.slice(dot).toLowerCase()
}

export interface LanguageInfo {
  language: string
  color: string
  isSource: boolean
  isConfig: boolean
  isDoc: boolean
  ext: string
}

/** Resolves a file's language/role. `binary = false` unless the ext is known-binary. */
export function languageInfo(relPath: string): LanguageInfo {
  const ext = extOf(relPath)
  if (ext === '') return { language: 'Text', color: '#8a8d93', isSource: false, isConfig: false, isDoc: true, ext }
  const info = LANGUAGE_BY_EXT[ext]
  if (!info) return { language: 'Text', color: '#8a8d93', isSource: false, isConfig: false, isDoc: false, ext }
  return {
    language: info.name,
    color: info.color,
    isSource: !CONFIG_EXTS.has(ext) && !DOC_EXTS.has(ext),
    isConfig: CONFIG_EXTS.has(ext),
    isDoc: DOC_EXTS.has(ext),
    ext,
  }
}

export function isBinaryPath(relPath: string): boolean {
  return BINARY_EXTS.has(extOf(relPath))
}

/**
 * Language share over non-binary files, weighted by bytes (like GitHub).
 * Lockfiles and minified build artifacts are excluded so a single huge
 * production bundle can't dominate the graph.
 */
export function computeLanguageShares(files: DumpFile[]): LanguageShare[] {
  const byLang = new Map<string, { bytes: number; color: string }>()

  for (const file of files) {
    if (file.binary || file.size <= 0) continue
    if (/\.(min\.|bundle\.)/.test(file.relPath)) continue
    const name = file.relPath.slice(file.relPath.lastIndexOf('/') + 1).toLowerCase()
    if (
      name === 'package-lock.json' ||
      name === 'pnpm-lock.yaml' ||
      name === 'yarn.lock' ||
      name.endsWith('.lock')
    ) {
      continue
    }
    const info = languageInfo(file.relPath)
    if (!info.language || info.language === 'Text') continue

    const bucket = byLang.get(info.language)
    if (bucket) bucket.bytes += file.size
    else byLang.set(info.language, { bytes: file.size, color: info.color })
  }

  const total = [...byLang.values()].reduce((sum, b) => sum + b.bytes, 0)
  if (total <= 0) return []

  const ranked = [...byLang.entries()]
    .map(([name, { bytes, color }]) => ({ name, bytes, color }))
    .sort((a, b) => b.bytes - a.bytes)

  const top = ranked.slice(0, 8)
  const rest = ranked.slice(8)

  const shares: LanguageShare[] = top.map((l) => ({
    name: l.name,
    percent: Math.round((l.bytes / total) * 100),
    color: l.color,
  }))

  if (rest.length > 0) {
    const restBytes = rest.reduce((sum, l) => sum + l.bytes, 0)
    shares.push({ name: 'Other', percent: Math.round((restBytes / total) * 100), color: '#64748b' })
  }

  // Percentages round independently and can sum to 99/101; normalize the largest bucket.
  const sum = shares.reduce((acc, s) => acc + s.percent, 0)
  if (shares.length > 0 && sum !== 100) {
    const ordered = [...shares].sort((a, b) => b.percent - a.percent)
    ordered[0].percent += 100 - sum
  }

  return shares.filter((s) => s.percent > 0)
}