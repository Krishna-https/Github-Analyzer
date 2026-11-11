import 'server-only'

import type { LanguageShare } from '@/lib/types'
import type { DumpFile } from './types'

/**
 * Language detection, modelled on GitHub's linguist defaults:
 *
 *   - only *programming* and *markup* languages count toward the language
 *     share; data formats (JSON/YAML/SQL/...) and prose (Markdown/... ) are
 *     ignored, so a docs-heavy repo no longer reports "Markdown 53%".
 *   - generated/vendored output is skipped, not just lockfiles.
 *   - filenames without a useful extension (Dockerfile, Makefile, ...) are
 *     mapped explicitly.
 *
 * Colors are the GitHub linguist palette so the donut/bar match what users
 * already associate with each language.
 */

export type LanguageKind = 'programming' | 'markup' | 'data' | 'prose'

interface LangDef {
  name: string
  color: string
  kind: LanguageKind
}

const LANGUAGES_BY_EXT: Record<string, LangDef> = {
  /* Programming */
  '.ts': { name: 'TypeScript', color: '#3178c6', kind: 'programming' },
  '.mts': { name: 'TypeScript', color: '#3178c6', kind: 'programming' },
  '.cts': { name: 'TypeScript', color: '#3178c6', kind: 'programming' },
  '.tsx': { name: 'TypeScript', color: '#3178c6', kind: 'programming' },
  '.js': { name: 'JavaScript', color: '#f1e05a', kind: 'programming' },
  '.mjs': { name: 'JavaScript', color: '#f1e05a', kind: 'programming' },
  '.cjs': { name: 'JavaScript', color: '#f1e05a', kind: 'programming' },
  '.jsx': { name: 'JavaScript', color: '#f1e05a', kind: 'programming' },
  '.py': { name: 'Python', color: '#3572a5', kind: 'programming' },
  '.go': { name: 'Go', color: '#00add8', kind: 'programming' },
  '.rs': { name: 'Rust', color: '#dea584', kind: 'programming' },
  '.java': { name: 'Java', color: '#b07219', kind: 'programming' },
  '.kt': { name: 'Kotlin', color: '#a97bff', kind: 'programming' },
  '.kts': { name: 'Kotlin', color: '#a97bff', kind: 'programming' },
  '.scala': { name: 'Scala', color: '#c22d40', kind: 'programming' },
  '.php': { name: 'PHP', color: '#4f5d95', kind: 'programming' },
  '.rb': { name: 'Ruby', color: '#701516', kind: 'programming' },
  '.cs': { name: 'C#', color: '#178600', kind: 'programming' },
  '.swift': { name: 'Swift', color: '#f05138', kind: 'programming' },
  '.c': { name: 'C', color: '#555555', kind: 'programming' },
  '.h': { name: 'C', color: '#555555', kind: 'programming' },
  '.cc': { name: 'C++', color: '#f34b7d', kind: 'programming' },
  '.cpp': { name: 'C++', color: '#f34b7d', kind: 'programming' },
  '.cxx': { name: 'C++', color: '#f34b7d', kind: 'programming' },
  '.hpp': { name: 'C++', color: '#f34b7d', kind: 'programming' },
  '.hh': { name: 'C++', color: '#f34b7d', kind: 'programming' },
  '.hxx': { name: 'C++', color: '#f34b7d', kind: 'programming' },
  '.sh': { name: 'Shell', color: '#89e051', kind: 'programming' },
  '.bash': { name: 'Shell', color: '#89e051', kind: 'programming' },
  '.zsh': { name: 'Shell', color: '#89e051', kind: 'programming' },
  '.fish': { name: 'Shell', color: '#89e051', kind: 'programming' },
  '.ps1': { name: 'PowerShell', color: '#012456', kind: 'programming' },
  '.lua': { name: 'Lua', color: '#000080', kind: 'programming' },
  '.dart': { name: 'Dart', color: '#00b4ab', kind: 'programming' },
  '.ex': { name: 'Elixir', color: '#6e4a7e', kind: 'programming' },
  '.exs': { name: 'Elixir', color: '#6e4a7e', kind: 'programming' },
  '.erl': { name: 'Erlang', color: '#b83998', kind: 'programming' },
  '.hrl': { name: 'Erlang', color: '#b83998', kind: 'programming' },
  '.fs': { name: 'F#', color: '#b845fc', kind: 'programming' },
  '.fsx': { name: 'F#', color: '#b845fc', kind: 'programming' },
  '.vb': { name: 'Visual Basic .NET', color: '#945db7', kind: 'programming' },
  '.pl': { name: 'Perl', color: '#0298c3', kind: 'programming' },
  '.pm': { name: 'Perl', color: '#0298c3', kind: 'programming' },
  '.r': { name: 'R', color: '#198ce7', kind: 'programming' },
  '.groovy': { name: 'Groovy', color: '#4298b8', kind: 'programming' },
  '.gradle': { name: 'Groovy', color: '#4298b8', kind: 'programming' },
  '.sol': { name: 'Solidity', color: '#aa6746', kind: 'programming' },
  '.tf': { name: 'HCL', color: '#844fba', kind: 'programming' },
  '.hcl': { name: 'HCL', color: '#844fba', kind: 'programming' },
  '.proto': { name: 'Protocol Buffer', color: '#7c3aed', kind: 'programming' },
  '.graphql': { name: 'GraphQL', color: '#e10098', kind: 'programming' },
  '.gql': { name: 'GraphQL', color: '#e10098', kind: 'programming' },
  '.jl': { name: 'Julia', color: '#a270ba', kind: 'programming' },
  '.clj': { name: 'Clojure', color: '#db5855', kind: 'programming' },
  '.cljs': { name: 'Clojure', color: '#db5855', kind: 'programming' },
  '.cljc': { name: 'Clojure', color: '#db5855', kind: 'programming' },
  '.hs': { name: 'Haskell', color: '#5e5086', kind: 'programming' },
  '.lhs': { name: 'Haskell', color: '#5e5086', kind: 'programming' },
  '.elm': { name: 'Elm', color: '#60b5cc', kind: 'programming' },
  '.nim': { name: 'Nim', color: '#ffc200', kind: 'programming' },
  '.cr': { name: 'Crystal', color: '#000100', kind: 'programming' },
  '.zig': { name: 'Zig', color: '#ec915c', kind: 'programming' },
  '.d': { name: 'D', color: '#ba595e', kind: 'programming' },
  '.m': { name: 'Objective-C', color: '#438eff', kind: 'programming' },
  '.mm': { name: 'Objective-C++', color: '#6866fb', kind: 'programming' },
  '.f': { name: 'Fortran', color: '#4d41b1', kind: 'programming' },
  '.f90': { name: 'Fortran', color: '#4d41b1', kind: 'programming' },
  '.f95': { name: 'Fortran', color: '#4d41b1', kind: 'programming' },
  '.pas': { name: 'Pascal', color: '#e3f171', kind: 'programming' },
  '.tcl': { name: 'Tcl', color: '#e4cc98', kind: 'programming' },
  '.coffee': { name: 'CoffeeScript', color: '#244776', kind: 'programming' },
  '.vhd': { name: 'VHDL', color: '#adb2cb', kind: 'programming' },
  '.vhdl': { name: 'VHDL', color: '#adb2cb', kind: 'programming' },

  /* Markup */
  '.html': { name: 'HTML', color: '#e34c26', kind: 'markup' },
  '.htm': { name: 'HTML', color: '#e34c26', kind: 'markup' },
  '.css': { name: 'CSS', color: '#8250df', kind: 'markup' },
  '.scss': { name: 'SCSS', color: '#c6538c', kind: 'markup' },
  '.sass': { name: 'Sass', color: '#c6538c', kind: 'markup' },
  '.less': { name: 'Less', color: '#1d365d', kind: 'markup' },
  '.vue': { name: 'Vue', color: '#41b883', kind: 'markup' },
  '.svelte': { name: 'Svelte', color: '#ff3e00', kind: 'markup' },
  '.astro': { name: 'Astro', color: '#ff5d01', kind: 'markup' },
  '.ipynb': { name: 'Jupyter Notebook', color: '#da5b0b', kind: 'markup' },

  /* Data — excluded from the share */
  '.json': { name: 'JSON', color: '#0ea5e9', kind: 'data' },
  '.jsonc': { name: 'JSON', color: '#0ea5e9', kind: 'data' },
  '.json5': { name: 'JSON', color: '#0ea5e9', kind: 'data' },
  '.yml': { name: 'YAML', color: '#cb171e', kind: 'data' },
  '.yaml': { name: 'YAML', color: '#cb171e', kind: 'data' },
  '.toml': { name: 'TOML', color: '#9c4221', kind: 'data' },
  '.xml': { name: 'XML', color: '#0060ac', kind: 'data' },
  '.ini': { name: 'INI', color: '#d1dbe0', kind: 'data' },
  '.cfg': { name: 'INI', color: '#d1dbe0', kind: 'data' },
  '.conf': { name: 'INI', color: '#d1dbe0', kind: 'data' },
  '.properties': { name: 'INI', color: '#d1dbe0', kind: 'data' },
  '.sql': { name: 'SQL', color: '#e38c00', kind: 'data' },
  '.csv': { name: 'CSV', color: '#237346', kind: 'data' },
  '.tsv': { name: 'CSV', color: '#237346', kind: 'data' },
  '.prisma': { name: 'Prisma', color: '#0c344b', kind: 'data' },

  /* Prose — excluded from the share */
  '.md': { name: 'Markdown', color: '#083fa1', kind: 'prose' },
  '.markdown': { name: 'Markdown', color: '#083fa1', kind: 'prose' },
  '.mdx': { name: 'MDX', color: '#fcb32c', kind: 'prose' },
  '.rst': { name: 'reStructuredText', color: '#141414', kind: 'prose' },
  '.txt': { name: 'Text', color: '#8a8d93', kind: 'prose' },
  '.adoc': { name: 'AsciiDoc', color: '#73a0c5', kind: 'prose' },
}

/** Basenames that carry a language but have no (or an ambiguous) extension. */
const LANGUAGES_BY_FILENAME: Record<string, LangDef> = {
  dockerfile: { name: 'Dockerfile', color: '#384d54', kind: 'programming' },
  makefile: { name: 'Makefile', color: '#427819', kind: 'programming' },
  'cmakelists.txt': { name: 'CMake', color: '#da3434', kind: 'programming' },
  gemfile: { name: 'Ruby', color: '#701516', kind: 'programming' },
  rakefile: { name: 'Ruby', color: '#701516', kind: 'programming' },
  justfile: { name: 'Just', color: '#384d54', kind: 'programming' },
}

const TEXT_FALLBACK: LangDef = { name: 'Text', color: '#8a8d93', kind: 'prose' }

const BINARY_EXTS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.svg', '.pdf', '.woff', '.woff2',
  '.ttf', '.eot', '.mp4', '.webm', '.mp3', '.zip', '.gz', '.tar', '.wasm', '.exe', '.dll',
])

/** Vendored / generated directories and build output never describe the repo. */
const GENERATED_PATH_RE =
  /(^|\/)(node_modules|bower_components|vendor|third_party|third-party|dist|build|out|coverage|\.next|\.nuxt|\.svelte-kit|\.output|\.turbo|target|__generated__|generated|\.venv|venv|__pycache__|\.mypy_cache|\.pytest_cache)\//i

/** Generated/minified files that would otherwise skew byte totals. */
const GENERATED_FILE_RE =
  /(\.min\.(js|css|mjs|cjs)$|\.bundle\.js$|\.generated\.[a-z]+$|\.g\.dart$|\.designer\.cs$|\.pb\.go$|_pb2\.py$|\.map$)/i

const LOCKFILE_RE =
  /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb|composer\.lock|poetry\.lock|pipfile\.lock|cargo\.lock|go\.sum|gemfile\.lock)$/i

function baseName(relPath: string): string {
  const slash = relPath.lastIndexOf('/')
  return slash === -1 ? relPath : relPath.slice(slash + 1)
}

function extOf(relPath: string): string {
  const name = baseName(relPath)
  const dot = name.lastIndexOf('.')
  return dot <= 0 ? '' : name.slice(dot).toLowerCase()
}

/** `.h` is ambiguous: use obvious C++ markers when the content is available. */
function looksLikeCpp(content: string): boolean {
  return /(^|\n)\s*(namespace\s+\w+|template\s*<|class\s+\w+|#include\s*<(iostream|vector|string|memory|map|algorithm)>)|\bstd::|public:|private:/.test(
    content
  )
}

export interface LanguageInfo {
  language: string
  color: string
  kind: LanguageKind
  isSource: boolean
  isConfig: boolean
  isDoc: boolean
  ext: string
}

function buildInfo(def: LangDef, ext: string): LanguageInfo {
  return {
    language: def.name,
    color: def.color,
    kind: def.kind,
    isSource: def.kind === 'programming' || def.kind === 'markup',
    isConfig: def.kind === 'data',
    isDoc: def.kind === 'prose',
    ext,
  }
}

/** Resolves a file's language/role. `binary = false` unless the ext is known-binary. */
export function languageInfo(relPath: string, content?: string): LanguageInfo {
  const name = baseName(relPath).toLowerCase()
  const special = LANGUAGES_BY_FILENAME[name]
  if (special) return buildInfo(special, '')

  const ext = extOf(relPath)
  if (!ext) return buildInfo(TEXT_FALLBACK, ext)

  if (ext === '.h' && content && looksLikeCpp(content)) {
    const cpp = LANGUAGES_BY_EXT['.hpp']
    return buildInfo(cpp, ext)
  }

  const def = LANGUAGES_BY_EXT[ext]
  if (!def) return buildInfo(TEXT_FALLBACK, ext)
  return buildInfo(def, ext)
}

export function isBinaryPath(relPath: string): boolean {
  return BINARY_EXTS.has(extOf(relPath))
}

/**
 * Language share over non-binary files, weighted by bytes (like GitHub).
 * Only programming/markup languages are counted; data formats, prose, lockfiles
 * and generated/vendored output are excluded so the graph reflects real code.
 */
export function computeLanguageShares(files: DumpFile[]): LanguageShare[] {
  const byLang = new Map<string, { bytes: number; color: string }>()

  for (const file of files) {
    if (file.binary || file.size <= 0) continue
    if (GENERATED_PATH_RE.test(file.relPath) || GENERATED_FILE_RE.test(file.relPath)) continue
    if (LOCKFILE_RE.test(file.relPath)) continue

    const info = languageInfo(file.relPath, file.content)
    if (info.kind !== 'programming' && info.kind !== 'markup') continue

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
