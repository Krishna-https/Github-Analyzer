import 'server-only'

import type {
  CodeInsights,
  CodeModel,
  CodeRoute,
  DumpFile,
  FileExcerpt,
  ImportEdge,
  ModuleSummary,
  ParsedFile,
  RepoConfig,
} from './types'

/**
 * Structured code extraction — the raw material the deep-analysis LLM uses to
 * describe things a GitHub page never shows: the internal import graph, HTTP
 * routes, data models, configuration, and a set of representative file excerpts.
 *
 * Everything here is deterministic and derived from the cloned source. It is the
 * "map" input for a future map-reduce pass (see moduleSummaries), but even a
 * single reasoning call is far richer with it than with aggregate counts alone.
 */

const MAX_ROUTES = 60
const MAX_MODELS = 40
const MAX_MODEL_FIELDS = 12
const MAX_EXCERPTS = 12
const EXCERPT_PER_FILE_BYTES = 8000
const EXCERPT_TOTAL_BYTES = 48_000

/** Top-level directory that owns a file, or '(root)' for root-level files. */
function moduleOf(relPath: string): string {
  const slash = relPath.indexOf('/')
  return slash === -1 ? '(root)' : relPath.slice(0, slash)
}

function dirOf(relPath: string): string {
  const slash = relPath.lastIndexOf('/')
  return slash === -1 ? '' : relPath.slice(0, slash)
}

/** Join a directory and a relative specifier, resolving '.' and '..'. */
function normalizeJoin(dir: string, spec: string): string {
  const parts = (dir ? dir.split('/') : []).concat(spec.split('/'))
  const out: string[] = []
  for (const part of parts) {
    if (part === '' || part === '.') continue
    if (part === '..') out.pop()
    else out.push(part)
  }
  return out.join('/')
}

const MODULE_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.vue', '.svelte', '.astro']

/** Resolve an import specifier to a repo-relative path, or null when external. */
function resolveImport(fromPath: string, spec: string, allPaths: Set<string>): string | null {
  let base: string
  if (spec.startsWith('@/')) base = spec.slice(2) // common "src root" alias
  else if (spec.startsWith('.')) base = normalizeJoin(dirOf(fromPath), spec)
  else return null // bare specifier = external package

  const candidates = [
    base,
    ...MODULE_EXTS.map((ext) => base + ext),
    ...MODULE_EXTS.map((ext) => `${base}/index${ext}`),
    `${base}/__init__.py`,
  ]
  return candidates.find((candidate) => allPaths.has(candidate)) ?? null
}

/* ------------------------------------------------------------------ */
/* Routes                                                              */
/* ------------------------------------------------------------------ */

const EXPRESS_ROUTE_RE =
  /\b[A-Za-z_$][\w$]*\s*\.\s*(get|post|put|patch|delete|all|use)\s*\(\s*['"`](\/[^'"`]*)['"`]/g
const PY_ROUTE_RE = /@\s*[\w.]*\.\s*(get|post|put|patch|delete|route)\s*\(\s*['"]([^'"]+)['"]/g
const DJANGO_PATH_RE = /\bpath\s*\(\s*['"]([^'"]*)['"]/g

/** Next.js App Router: derive the URL from the file path under app/. */
function nextAppRoute(relPath: string): CodeRoute | null {
  const m = relPath.match(/(?:^|\/)app\/(?:(.*)\/)?(route|page)\.(tsx?|jsx?)$/i)
  if (!m) return null
  const segments = (m[1] ?? '')
    .split('/')
    .filter(Boolean)
    .filter((seg) => !(seg.startsWith('(') && seg.endsWith(')'))) // drop route groups
    .map((seg) => {
      if (seg === 'index') return ''
      if (/^\[\[?\.\.\..+\]\]?$/.test(seg)) return '*'
      if (/^\[.+\]$/.test(seg)) return `:${seg.slice(1, -1)}`
      return seg
    })
    .filter(Boolean)
  const path = '/' + segments.join('/')
  return { method: m[2].toLowerCase() === 'route' ? 'ALL' : 'GET', path: path === '/' ? '/' : path, file: relPath }
}

/** Next.js Pages Router: pages/** plus pages/api/**. */
function nextPagesRoute(relPath: string): CodeRoute | null {
  const m = relPath.match(/(?:^|\/)pages\/(.+)\.(tsx?|jsx?)$/i)
  if (!m) return null
  const raw = m[1]
  if (/(^|\/)_/.test(raw)) return null // _app, _document, ...
  const isApi = raw === 'api' || raw.startsWith('api/')
  let path = '/' + raw.replace(/(^|\/)index$/, '').replace(/\/$/, '')
  path = path.replace(/\[\[?\.\.\..+\]\]?/g, '*').replace(/\[([^\]]+)\]/g, ':$1')
  return { method: isApi ? 'ALL' : 'GET', path: path || '/', file: relPath }
}

function detectRoutes(files: DumpFile[]): CodeRoute[] {
  const routes: CodeRoute[] = []

  for (const file of files) {
    const app = nextAppRoute(file.relPath)
    if (app) {
      routes.push(app)
      continue
    }
    const pages = nextPagesRoute(file.relPath)
    if (pages) {
      routes.push(pages)
      continue
    }
    if (!file.content) continue

    if (/\.(ts|tsx|js|jsx|mjs|cjs)$/i.test(file.relPath)) {
      let m: RegExpExecArray | null
      EXPRESS_ROUTE_RE.lastIndex = 0
      while ((m = EXPRESS_ROUTE_RE.exec(file.content)) !== null) {
        routes.push({ method: m[1].toUpperCase(), path: m[2], file: file.relPath })
      }
    } else if (/\.py$/i.test(file.relPath)) {
      let m: RegExpExecArray | null
      if (/(^|\/)urls\.py$/i.test(file.relPath)) {
        DJANGO_PATH_RE.lastIndex = 0
        while ((m = DJANGO_PATH_RE.exec(file.content)) !== null) {
          routes.push({ method: 'ANY', path: '/' + m[1], file: file.relPath })
        }
      }
      PY_ROUTE_RE.lastIndex = 0
      while ((m = PY_ROUTE_RE.exec(file.content)) !== null) {
        routes.push({ method: m[1].toLowerCase() === 'route' ? 'ANY' : m[1].toUpperCase(), path: m[2], file: file.relPath })
      }
    }
  }

  // Deduplicate identical method+path+file, then cap.
  const seen = new Set<string>()
  return routes
    .filter((r) => {
      const key = `${r.method} ${r.path} ${r.file}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, MAX_ROUTES)
}

/* ------------------------------------------------------------------ */
/* Data models                                                         */
/* ------------------------------------------------------------------ */

function parsePrisma(content: string, relPath: string, out: CodeModel[]): void {
  const re = /model\s+(\w+)\s*\{([^}]*)\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(content)) !== null) {
    const fields: string[] = []
    for (const line of m[2].split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('//') || t.startsWith('@@')) continue
      const fm = t.match(/^(\w+)\s+([\w[\]?]+)/)
      if (fm && fields.length < MAX_MODEL_FIELDS) fields.push(`${fm[1]}: ${fm[2]}`)
    }
    out.push({ name: m[1], kind: 'Prisma', file: relPath, fields })
  }
}

const SQL_CONSTRAINT = /^(primary|foreign|unique|constraint|check|key|index)\b/i

function parseSql(content: string, relPath: string, out: CodeModel[]): void {
  const re = /create\s+table\s+(?:if\s+not\s+exists\s+)?["`[]?(\w+)["`\]]?\s*\(([\s\S]*?)\)\s*;/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(content)) !== null) {
    const fields: string[] = []
    for (const raw of m[2].split(',')) {
      const t = raw.trim()
      if (!t || SQL_CONSTRAINT.test(t)) continue
      const name = t.match(/^["`[]?(\w+)["`\]]?/)?.[1]
      if (name && fields.length < MAX_MODEL_FIELDS) fields.push(name)
    }
    out.push({ name: m[1], kind: 'SQL', file: relPath, fields })
  }
}

/** pydantic / Django models: class X(BaseModel) or class X(models.Model). */
function parsePyModels(content: string, relPath: string, out: CodeModel[]): void {
  const lines = content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const header = lines[i].match(/^class\s+(\w+)\s*\(\s*(BaseModel|models\.Model)\s*\)/)
    if (!header) continue
    const kind = header[2] === 'BaseModel' ? 'pydantic' : 'Django'
    const fields: string[] = []
    for (let j = i + 1; j < lines.length; j++) {
      const line = lines[j]
      if (line.trim() === '') continue
      if (!/^\s/.test(line)) break // dedented → class ended
      const fm = line.match(/^\s+(\w+)\s*(?::\s*([^=\n]+?))?\s*(?:=\s*(.+?))?$/)
      if (!fm) continue
      if (['class', 'def', 'pass', 'return'].includes(fm[1])) continue
      const detail = (fm[2] ?? fm[3] ?? '').trim().replace(/\s+/g, ' ')
      if (fields.length < MAX_MODEL_FIELDS) fields.push(detail ? `${fm[1]}: ${detail}` : fm[1])
    }
    if (fields.length > 0) out.push({ name: header[1], kind, file: relPath, fields })
  }
}

const MODEL_FILE_RE = /(?:^|\/)(models?|entities|schemas?|dto|types?)(\/|\.|$)/i
const TS_MODEL_RE = /export\s+(?:interface|type)\s+(\w+)\s*=?\s*\{([^}]*)\}/g

function parseTsModels(content: string, relPath: string, out: CodeModel[]): void {
  if (!MODEL_FILE_RE.test(relPath)) return
  let m: RegExpExecArray | null
  while ((m = TS_MODEL_RE.exec(content)) !== null) {
    const fields: string[] = []
    for (const raw of m[2].split('\n')) {
      const fm = raw.trim().match(/^(\w+)\??\s*:\s*([^;]+)/)
      if (fm && fields.length < MAX_MODEL_FIELDS) fields.push(`${fm[1]}: ${fm[2].trim()}`)
    }
    if (fields.length > 0) out.push({ name: m[1], kind: 'TypeScript', file: relPath, fields })
  }
}

function detectModels(files: DumpFile[]): CodeModel[] {
  const models: CodeModel[] = []
  for (const file of files) {
    if (!file.content) continue
    if (/\.prisma$/i.test(file.relPath)) parsePrisma(file.content, file.relPath, models)
    else if (/\.sql$/i.test(file.relPath)) parseSql(file.content, file.relPath, models)
    else if (/\.py$/i.test(file.relPath)) parsePyModels(file.content, file.relPath, models)
    else if (/\.(ts|tsx)$/i.test(file.relPath)) parseTsModels(file.content, file.relPath, models)
  }
  return models.slice(0, MAX_MODELS)
}

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

const ENV_JS_RE = /(?:process\.env|import\.meta\.env)\.([A-Z][A-Z0-9_]{1,})/g
const ENV_PY_RE = /os\.(?:environ\.get|getenv|environ\[)\s*\(?\s*['"]([A-Z][A-Z0-9_]{1,})['"]/g

function detectConfig(files: DumpFile[]): RepoConfig {
  const config: RepoConfig = {
    packageName: null,
    scripts: [],
    envKeys: [],
    composeServices: [],
    ciWorkflows: [],
  }
  const envKeys = new Set<string>()

  for (const file of files) {
    const name = file.relPath.slice(file.relPath.lastIndexOf('/') + 1)

    if (name === 'package.json' && file.content && file.relPath.split('/').length <= 2) {
      try {
        const pkg = JSON.parse(file.content) as { name?: string; scripts?: Record<string, string> }
        config.packageName ??= pkg.name ?? null
        if (config.scripts.length === 0 && pkg.scripts) {
          config.scripts = Object.entries(pkg.scripts).map(([k, v]) => `${k}: ${v}`)
        }
      } catch {
        // Malformed package.json — ignore.
      }
    }

    if (name.startsWith('docker-compose') && /\.ya?ml$/i.test(name) && file.content) {
      const lines = file.content.split('\n')
      let inServices = false
      let serviceIndent = -1
      for (const line of lines) {
        if (/^\s*services:\s*$/.test(line)) {
          inServices = true
          continue
        }
        if (!inServices) continue
        const indent = (line.match(/^\s*/) ?? [''])[0].length
        if (line.trim() === '' || line.trim().startsWith('#')) continue
        if (indent === 0) break
        if (serviceIndent === -1) serviceIndent = indent
        const sm = line.match(/^(\s+)([\w.-]+):\s*$/)
        if (sm && sm[1].length === serviceIndent) config.composeServices.push(sm[2])
      }
    }

    if (/^\.github\/workflows\/.+\.ya?ml$/i.test(file.relPath)) {
      config.ciWorkflows.push(name)
    }

    if (!file.content) continue
    if (/\.(ts|tsx|js|jsx|mjs|cjs|vue|svelte|astro)$/i.test(file.relPath)) {
      let m: RegExpExecArray | null
      ENV_JS_RE.lastIndex = 0
      while ((m = ENV_JS_RE.exec(file.content)) !== null) envKeys.add(m[1])
    } else if (/\.py$/i.test(file.relPath)) {
      let m: RegExpExecArray | null
      ENV_PY_RE.lastIndex = 0
      while ((m = ENV_PY_RE.exec(file.content)) !== null) envKeys.add(m[1])
    }
  }

  config.envKeys = [...envKeys].sort().slice(0, 40)
  config.composeServices = [...new Set(config.composeServices)]
  config.ciWorkflows = [...new Set(config.ciWorkflows)]
  return config
}

/* ------------------------------------------------------------------ */
/* Module summaries + excerpts                                         */
/* ------------------------------------------------------------------ */

function summarizeModules(parsed: ParsedFile[], edges: ImportEdge[]): ModuleSummary[] {
  const byModule = new Map<string, ModuleSummary>()
  const ensure = (name: string): ModuleSummary => {
    let m = byModule.get(name)
    if (!m) {
      m = { name, files: 0, functions: 0, topFiles: [], symbols: [], importsFrom: [] }
      byModule.set(name, m)
    }
    return m
  }

  const fileModule = new Map<string, string>()
  for (const f of parsed) {
    const mod = moduleOf(f.relPath)
    fileModule.set(f.relPath, mod)
    const entry = ensure(mod)
    entry.files++
    entry.functions += f.functions
    if (entry.topFiles.length < 6 && f.functions > 0) entry.topFiles.push(f.relPath)
    for (const sym of f.symbols ?? []) {
      if (entry.symbols.length < 12 && !entry.symbols.includes(sym)) entry.symbols.push(sym)
    }
  }

  const importsFrom = new Map<string, Set<string>>()
  for (const edge of edges) {
    const fromMod = fileModule.get(edge.from) ?? moduleOf(edge.from)
    const toMod = fileModule.get(edge.to) ?? moduleOf(edge.to)
    if (fromMod === toMod) continue
    if (!importsFrom.has(fromMod)) importsFrom.set(fromMod, new Set())
    importsFrom.get(fromMod)!.add(toMod)
  }
  for (const [mod, deps] of importsFrom) ensure(mod).importsFrom = [...deps].slice(0, 12)

  return [...byModule.values()].sort((a, b) => b.functions - a.functions)
}

function buildExcerpts(
  files: DumpFile[],
  routeFiles: Set<string>,
  modelFiles: Set<string>,
  entryPoints: string[],
  indegree: Map<string, number>
): FileExcerpt[] {
  const entrySet = new Set(entryPoints)
  const candidates: Array<{ file: DumpFile; score: number; reason: string }> = []

  for (const file of files) {
    if (!file.content) continue
    const name = file.relPath.slice(file.relPath.lastIndexOf('/') + 1)
    let score = 0
    let reason = ''

    if (entrySet.has(file.relPath)) {
      score = 100
      reason = 'entry point'
    } else if (routeFiles.has(file.relPath)) {
      score = 90
      reason = 'route handler'
    } else if (modelFiles.has(file.relPath)) {
      score = 85
      reason = 'data model'
    } else if (name === 'package.json' || /^docker-compose.*\.ya?ml$/i.test(name) || /\.prisma$/i.test(name)) {
      score = 75
      reason = 'configuration'
    } else {
      const inDeg = indegree.get(file.relPath) ?? 0
      if (inDeg > 0) {
        score = 60 + Math.min(inDeg, 30)
        reason = `imported by ${inDeg} file(s)`
      } else if (/\.(ts|tsx|js|jsx|py|go|rs|java|rb|vue|svelte|astro)$/i.test(file.relPath)) {
        const lines = file.content.split('\n').length
        score = 20 + Math.min(Math.floor(lines / 100), 20)
        reason = 'representative source'
      }
    }

    if (score > 0) candidates.push({ file, score, reason })
  }

  candidates.sort((a, b) => b.score - a.score)

  const excerpts: FileExcerpt[] = []
  let total = 0
  for (const { file, reason } of candidates) {
    if (excerpts.length >= MAX_EXCERPTS || total >= EXCERPT_TOTAL_BYTES) break
    const content = file.content ?? ''
    const truncated = content.length > EXCERPT_PER_FILE_BYTES
    const slice = truncated ? content.slice(0, EXCERPT_PER_FILE_BYTES) : content
    excerpts.push({ path: file.relPath, reason, content: slice, truncated })
    total += slice.length
  }
  return excerpts
}

/* ------------------------------------------------------------------ */
/* Entry                                                               */
/* ------------------------------------------------------------------ */

export function extractCodeInsights(
  files: DumpFile[],
  parsed: ParsedFile[],
  entryPoints: string[]
): CodeInsights {
  const allPaths = new Set(files.map((f) => f.relPath))

  // Internal import graph + per-file in-degree.
  const imports: ImportEdge[] = []
  const indegree = new Map<string, number>()
  for (const f of parsed) {
    for (const spec of f.importSources ?? []) {
      const target = resolveImport(f.relPath, spec, allPaths)
      if (!target || target === f.relPath) continue
      imports.push({ from: f.relPath, to: target })
      indegree.set(target, (indegree.get(target) ?? 0) + 1)
    }
  }

  const routes = detectRoutes(files)
  const models = detectModels(files)
  const config = detectConfig(files)
  const moduleSummaries = summarizeModules(parsed, imports)

  const routeFiles = new Set(routes.map((r) => r.file))
  const modelFiles = new Set(models.map((m) => m.file))
  const excerpts = buildExcerpts(files, routeFiles, modelFiles, entryPoints, indegree)

  return { imports, routes, models, config, moduleSummaries, excerpts }
}
