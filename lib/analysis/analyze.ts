import 'server-only'

import type { AnalysisOverview, ComplexityBucket, Repository } from '@/lib/types'
import { classifyFile } from './classify'
import { detectEvidence, type EvidenceInput } from './evidence'
import { extractCodeInsights } from './extract'
import { computeLanguageShares, languageInfo } from './languages'
import { parseDependencies } from './manifests'
import { parseSource } from './parser'
import { buildSummary } from './summary'
import {
  COMPLEXITY_BUCKETS,
  complexityBucketName,
  type AnalysisBundle,
  type AnalysisDump,
  type DumpFile,
  type FileCategory,
  type ModuleInfo,
  type ParsedFile,
  type ProjectFacts,
} from './types'

/* ------------------------------------------------------------------ */
/* git / repo metadata                                                 */
/* ------------------------------------------------------------------ */

function ownerFromRemote(url: string | null): { owner: string; name: string; url: string } | null {
  if (!url) return null
  const cleaned = url
    .replace(/^git@([^:]+):/, 'https://$1/')
    .replace(/^ssh:\/\//, 'https://')
    .replace(/^git:\/\//, 'https://')
  const m = cleaned.match(/https?:\/\/[^/]+\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/)
  if (!m) return null
  return { owner: m[1], name: m[2], url: `https://github.com/${m[1]}/${m[2]}` }
}

const LICENSE_MAP: Array<{ re: RegExp; name: string }> = [
  { re: /MIT License/i, name: 'MIT' },
  { re: /Apache License/i, name: 'Apache-2.0' },
  { re: /GNU GENERAL PUBLIC LICENSE\s*Version\s*3/i, name: 'GPL-3.0' },
  { re: /GNU GENERAL PUBLIC LICENSE\s*Version\s*2/i, name: 'GPL-2.0' },
  { re: /GNU AFFERO GENERAL PUBLIC LICENSE/i, name: 'AGPL-3.0' },
  { re: /BSD 3-Clause/i, name: 'BSD-3-Clause' },
  { re: /BSD 2-Clause/i, name: 'BSD-2-Clause' },
  { re: /Mozilla Public License/i, name: 'MPL-2.0' },
  { re: /ISC License/i, name: 'ISC' },
  { re: /The Unlicense/i, name: 'Unlicense' },
]

function detectLicense(files: DumpFile[]): string {
  const licenseFiles = files.filter((f) => {
    const name = f.relPath.slice(f.relPath.lastIndexOf('/') + 1)
    return /^(LICENSE|LICENCE|COPYING|UNLICENSE)(\..*)?$/i.test(name) && f.content
  })
  if (licenseFiles.length === 0) return 'Unspecified'
  const content = licenseFiles[0].content ?? ''
  const firstLines = content.split('\n').slice(0, 5).join(' ')
  for (const { re, name } of LICENSE_MAP) {
    if (re.test(firstLines)) return name
  }
  return 'Custom license'
}

/** Common entry-point filenames, anchored at the end so it tests the basename. */
const ENTRY_FILE_RE =
  /(^|\/)(index|main|app|server|cli|manage|program|__main__)\.(ts|tsx|js|jsx|mjs|cjs|mts|cts|py|go|rb|java|kt|rs|php|cs)$/i

/** Shallow, non-test files that look like the program's entry point. */
function findEntryPoints(files: DumpFile[]): string[] {
  return files
    .filter(
      (f) =>
        ENTRY_FILE_RE.test(f.relPath) &&
        f.relPath.split('/').length <= 3 &&
        !/(^|\/)(tests?|__tests__|spec|e2e)(\/|$)/i.test(f.relPath)
    )
    .map((f) => f.relPath)
    .slice(0, 8)
}

function readReadme(files: DumpFile[]): string | null {
  const readme = files.find((f) => {
    const name = f.relPath.slice(f.relPath.lastIndexOf('/') + 1).toLowerCase()
    return /^readme(\.[a-z0-9]+)?$/.test(name) && f.relPath.split('/').length <= 2 && f.content
  })
  if (!readme || !readme.content) return null

  // Take only the first plain-text paragraph: skip leading headings/badges and
  // stop at the first blank line or markdown list/quote/table marker.
  const lines = readme.content.split('\n').map((l) => l.trim())
  const paragraph: string[] = []
  for (const line of lines) {
    if (line === '') {
      if (paragraph.length > 0) break
      continue
    }
    if (/^(#{1,6}\s|[-*+>|!`]|\d+\.\s)/.test(line)) {
      if (paragraph.length > 0) break
      continue
    }
    paragraph.push(line)
  }

  const text = paragraph.join(' ').replace(/\s+/g, ' ').trim()
  if (!text) return null
  return text.length > 300 ? text.slice(0, 300).trimEnd() + '…' : text
}

/* ------------------------------------------------------------------ */
/* module aggregation                                                  */
/* ------------------------------------------------------------------ */

const CONVENTIONAL_TOP_DIRS = new Set([
  'src', 'app', 'lib', 'components', 'api', 'server', 'client', 'frontend',
  'backend', 'pages', 'views', 'controllers', 'services', 'models', 'migrations',
  'utils', 'helpers', 'public', 'assets', 'test', 'tests', 'docs', 'web', 'mobile', 'packages',
])

const NOISE_TOP_DIRS = new Set(['.github', '.git'])

function aggregateModules(
  files: DumpFile[],
  parsed: ParsedFile[],
  classified: Map<string, FileCategory>
): { modules: ModuleInfo[]; topLevelDirs: string[]; weakStructure: boolean } {
  const topLevelDirs = new Set<string>()
  for (const f of files) {
    const slash = f.relPath.indexOf('/')
    if (slash === -1) continue // a root-level file, not a module directory
    const first = f.relPath.slice(0, slash)
    if (!NOISE_TOP_DIRS.has(first)) topLevelDirs.add(first)
  }
  const dirs = [...topLevelDirs].sort()

  // A "conventional" layout has at least one well-known top-level folder.
  const conventionalHits = dirs.filter((d) => CONVENTIONAL_TOP_DIRS.has(d)).length
  const weakStructure = conventionalHits === 0 && dirs.length > 0

  const functionsByPath = new Map(parsed.map((p) => [p.relPath, p.functions]))

  if (!weakStructure) {
    const modules: ModuleInfo[] = dirs.map((dir) => {
      const prefix = dir + '/'
      const inDir = files.filter((f) => f.relPath.startsWith(prefix)).length
      const functions = [...functionsByPath.entries()]
        .filter(([p]) => p.startsWith(prefix))
        .reduce((sum, [, fn]) => sum + fn, 0)
      return { name: dir, files: inDir, functions, category: null }
    })
    return { modules, topLevelDirs: dirs, weakStructure }
  }

  // Weak structure: cluster by content category instead of folder layout.
  const byCat = new Map<FileCategory, ModuleInfo>()
  for (const f of files) {
    const cat = classified.get(f.relPath) ?? 'unclassified'
    const existing = byCat.get(cat)
    if (existing) {
      existing.files += 1
      existing.functions += functionsByPath.get(f.relPath) ?? 0
    } else {
      byCat.set(cat, {
        name: cat,
        files: 1,
        functions: functionsByPath.get(f.relPath) ?? 0,
        category: cat,
      })
    }
  }
  const modules = [...byCat.values()].sort((a, b) => b.files - a.files)
  return { modules, topLevelDirs: dirs, weakStructure }
}

/* ------------------------------------------------------------------ */
/* main pipeline                                                       */
/* ------------------------------------------------------------------ */

export function analyzeDump(containerId: string, dump: AnalysisDump): AnalysisBundle {
  const files = dump.files

  /* Pass 1 — per-file classification + light parsing */
  const classified = new Map<string, FileCategory>()
  const pyModules = new Map<string, string[]>()
  const parsedFiles: ParsedFile[] = []
  const allComplexities: number[] = []

  let totalFiles = 0
  let sourceFiles = 0
  let totalFunctions = 0
  let totalClasses = 0

  for (const file of files) {
    totalFiles++
    const info = languageInfo(file.relPath)
    const classification = classifyFile(file)
    classified.set(file.relPath, classification.category)
    if (info.isSource) sourceFiles++

    if (file.binary || !file.content) continue

    const parsed = parseSource(file.relPath, file.content)
    const isSource = info.isSource

    parsedFiles.push({
      relPath: file.relPath,
      category: classification.category,
      language: info.language,
      lines: parsed.lines,
      functions: isSource ? parsed.functions : 0,
      classes: isSource ? parsed.classes : 0,
      imports: parsed.imports,
      importSources: parsed.importSources,
      symbols: [...parsed.classNames, ...parsed.functionNames].slice(0, 20),
    })
    totalFunctions += isSource ? parsed.functions : 0
    totalClasses += isSource ? parsed.classes : 0
    allComplexities.push(...parsed.complexities)

    if (/\.py$/i.test(file.relPath)) {
      const mods: string[] = []
      const re = /^\s*(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))/gm
      let m: RegExpExecArray | null
      while ((m = re.exec(file.content)) !== null) {
        const mod = (m[1] || m[2] || '').split('.')[0]
        if (mod && mod !== 'os' && mod !== 'sys' && !mods.includes(mod)) mods.push(mod)
      }
      pyModules.set(file.relPath, mods)
    }
  }

  /* Pass 2 — languages */
  const languages = computeLanguageShares(files)

  /* Pass 3 — complexity buckets */
  const buckets: ComplexityBucket[] = COMPLEXITY_BUCKETS.map((b) => ({ ...b }))
  for (const c of allComplexities) {
    const bucket = buckets.find((b) => b.name === complexityBucketName(c))
    if (bucket) bucket.count++
  }
  const lowComplexityPct =
    allComplexities.length === 0
      ? 100
      : Math.round(((buckets.find((b) => b.name === 'Low')?.count ?? 0) / allComplexities.length) * 100)

  /* Pass 4 — dependencies */
  const { deps, monorepo } = parseDependencies(files)
  const dependencyHealth = {
    healthy: deps.filter((d) => d.status === 'healthy').length,
    review: deps.filter((d) => d.status === 'review').length,
    vulnerable: deps.filter((d) => d.status === 'vulnerable').length,
  }

  /* Pass 5 — repository metadata */
  const remote = ownerFromRemote(dump.git.remoteUrl)
  const license = detectLicense(files)
  const description = readReadme(files)
  const tests = files.filter((f) =>
    /\.(test|spec)\./i.test(f.relPath) ||
    /(^|\/)(__tests__|tests?|e2e)(\/|$)/i.test(f.relPath) ||
    /_test\.(py|rb)$/i.test(f.relPath)
  ).length

  /* Pass 6 — modules + structure */
  const { modules, topLevelDirs, weakStructure } = aggregateModules(files, parsedFiles, classified)
  const modulesCount = Math.max(modules.length, 1)

  /* Pass 7 — evidence */
  const evidenceInput: EvidenceInput = {
    categories: classified,
    deps,
    pyModules,
    hasTsConfig: files.some((f) => f.relPath === 'tsconfig.json' || f.relPath === 'tsconfig.base.json'),
    hasDockerfile: files.some((f) => {
      const n = f.relPath.slice(f.relPath.lastIndexOf('/') + 1)
      return n === 'Dockerfile' || n.endsWith('.dockerfile')
    }),
    hasCI: files.some((f) => /^\.github\/workflows\/.+\.ya?ml$/.test(f.relPath)),
    hasRootIndexHtml: files.some((f) => f.relPath === 'index.html'),
    hasSql: files.some((f) => /\.sql$/i.test(f.relPath)),
    hasModelsDir: [...classified.keys()].some((p) => /(^|\/)(models?|migrations?|schema)(\/|$)/i.test(p)),
    testFileCount: tests,
    monorepo,
    files,
  }
  const { evidence, detectedBy, stack } = detectEvidence(evidenceInput)

  /* Assemble the real Repository before the summary so counts are truthful. */
  const repo: Repository = {
    owner: remote?.owner ?? 'unknown',
    name: remote?.name ?? 'repository',
    fullName: remote ? `${remote.owner}/${remote.name}` : 'unknown/repository',
    description: description ?? 'No description provided.',
    url: remote?.url ?? dump.git.remoteUrl ?? '',
    branch: dump.git.branch ?? 'unknown',
    stars: 0,
    forks: 0,
    openIssues: 0,
    files: totalFiles,
    sourceFiles,
    functions: totalFunctions,
    classes: totalClasses,
    modules: modulesCount,
    dependencies: deps.length,
    tests,
    languages,
    lastCommit: dump.git.lastCommit ?? 'No commits found',
    license,
  }

  /* Pass 8 — structured facts, code insights, then the deterministic summary */
  const entryPoints = findEntryPoints(files)
  const insights = extractCodeInsights(files, parsedFiles, entryPoints)

  const facts: ProjectFacts = {
    repo,
    languages,
    evidence,
    stack,
    modules,
    topLevelDirs,
    entryPoints,
    keyDependencies: [...new Set(deps.map((d) => d.name))].slice(0, 15),
    totalDependencies: deps.length,
    dependencyHealth,
    tests,
    weakStructure,
    lowComplexityPct,
    readmeExcerpt: description,
    insights,
  }

  const { summary } = buildSummary(facts)

  const overview: AnalysisOverview = {
    repository: repo,
    languages,
    evidence,
    complexityBuckets: buckets,
    dependencyHealth,
    summary,
    detectedBy,
    weakStructure,
    // Stars/forks/issues never come from a clone; /api/analysis removes the ones
    // GitHub can provide when it enriches the overview at response time.
    statsUnavailable: ['Stars', 'Forks', 'Open Issues'],
    computedAt: new Date().toISOString(),
  }

  return {
    containerId,
    headSha: dump.git.headSha,
    computedAt: overview.computedAt,
    overview,
    files: parsedFiles,
    modules,
    topLevelDirs,
    facts,
  }
}