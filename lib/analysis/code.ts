import 'server-only'

import type {
  CodeAnalysisReport,
  ComplexityBucket,
  ComplexityFinding,
  FunctionRecord,
  FunctionStatus,
} from '@/lib/types'
import {
  COMPLEXITY_BUCKETS,
  complexityBucketName,
  type AnalysisBundle,
  type ParsedFunction,
} from './types'

/**
 * Turns the cached analysis bundle into the real Code Analysis report.
 *
 * The per-function metrics were captured while parsing the repository (see
 * parser.ts) and stored on each ParsedFile, so this module only aggregates and
 * ranks them. Nothing here reads sample data: every row, bucket and finding is
 * derived from the cloned source.
 */

/** Keep the table and the API payload bounded on very large repositories. */
const MAX_FUNCTION_ROWS = 500
/** Only functions above the "Moderate" bucket become findings. */
const FINDING_MIN_COMPLEXITY = 11
const MAX_FINDINGS = 12

function moduleOf(relPath: string): string {
  const slash = relPath.indexOf('/')
  return slash === -1 ? '(root)' : relPath.slice(0, slash)
}

function statusFor(complexity: number): FunctionStatus {
  if (complexity <= 5) return 'Good'
  if (complexity <= 10) return 'Moderate'
  if (complexity <= 15) return 'Needs Review'
  if (complexity <= 20) return 'High'
  return 'Critical'
}

/** Stable, URL-safe id for a function finding (no slashes/colons). */
function findingId(file: string, line: number, name: string): string {
  const input = `${file}:${line}:${name}`
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return `cx-${(hash >>> 0).toString(36)}`
}

function reasonFor(fn: ParsedFunction): string {
  const nested = fn.nesting > 0 ? ` across ${fn.nesting} level${fn.nesting === 1 ? '' : 's'} of nesting` : ''
  return `${fn.name} has cyclomatic complexity ${fn.complexity}${nested} and ${fn.calls} call${
    fn.calls === 1 ? '' : 's'
  } in ${fn.lines} line${fn.lines === 1 ? '' : 's'}.`
}

function suggestionFor(fn: ParsedFunction): string {
  if (fn.nesting >= 4) {
    return 'Flatten the nested conditionals (early returns/guard clauses) and extract cohesive blocks into smaller functions.'
  }
  if (fn.lines >= 80) {
    return 'Split this long function into smaller, single-purpose helpers and add tests around each branch.'
  }
  return 'Extract independent branches into named helpers and cover each path with tests.'
}

/** Build a bounded snippet from the cached excerpts when the file is included. */
function snippetFor(
  bundle: AnalysisBundle,
  file: string,
  fromLine: number,
  toLine: number
): ComplexityFinding['snippet'] {
  const excerpt = bundle.facts?.insights.excerpts.find((entry) => entry.path === file)
  if (!excerpt) return { startLine: fromLine, highlight: [], lines: [] }

  const all = excerpt.content.split('\n')
  const start = Math.max(0, fromLine - 1)
  const end = Math.min(all.length, Math.max(fromLine, toLine), start + 14)
  const lines = all.slice(start, end)
  return { startLine: start + 1, highlight: lines.length > 0 ? [0] : [], lines }
}

export function buildCodeReport(bundle: AnalysisBundle): CodeAnalysisReport {
  const details: Array<{ file: string; language: string; fn: ParsedFunction }> = []
  let lines = 0
  let imports = 0

  for (const file of bundle.files) {
    lines += file.lines
    imports += file.imports
    for (const fn of file.functionDetails ?? []) {
      details.push({ file: file.relPath, language: file.language, fn })
    }
  }

  const buckets: ComplexityBucket[] = COMPLEXITY_BUCKETS.map((bucket) => ({ ...bucket }))
  for (const { fn } of details) {
    const bucket = buckets.find((entry) => entry.name === complexityBucketName(fn.complexity))
    if (bucket) bucket.count++
  }

  const functions: FunctionRecord[] = [...details]
    .sort(
      (a, b) =>
        b.fn.complexity - a.fn.complexity ||
        b.fn.lines - a.fn.lines ||
        a.fn.name.localeCompare(b.fn.name)
    )
    .slice(0, MAX_FUNCTION_ROWS)
    .map(({ file, language, fn }) => ({
      name: `${fn.name}()`,
      file,
      lines: fn.lines,
      complexity: fn.complexity,
      calls: fn.calls,
      status: statusFor(fn.complexity),
      module: moduleOf(file),
      line: fn.line,
      language,
      kind: 'function',
    }))

  const findings: ComplexityFinding[] = [...details]
    .filter(({ fn }) => fn.complexity >= FINDING_MIN_COMPLEXITY)
    .sort((a, b) => b.fn.complexity - a.fn.complexity || b.fn.lines - a.fn.lines)
    .slice(0, MAX_FINDINGS)
    .map(({ file, language, fn }) => ({
      id: findingId(file, fn.line, fn.name),
      functionName: `${fn.name}()`,
      file,
      line: fn.line,
      lineCount: fn.lines,
      cyclomatic: fn.complexity,
      nestingDepth: fn.nesting,
      status: fn.complexity > 20 ? 'Critical' : 'High',
      reason: reasonFor(fn),
      suggestion: suggestionFor(fn),
      ruleId: 'QLT-001',
      snippet: snippetFor(bundle, file, fn.line, fn.endLine),
      language,
    }))

  const insights = bundle.facts?.insights
  const repo = bundle.overview.repository

  return {
    containerId: bundle.containerId,
    computedAt: bundle.computedAt,
    stats: {
      files: repo.files,
      sourceFiles: repo.sourceFiles,
      lines,
      functions: repo.functions,
      classes: repo.classes,
      imports,
      apiCalls: insights?.routes.length ?? 0,
      dependencies: repo.dependencies,
      internalImports: insights?.imports.length ?? 0,
    },
    buckets,
    functionsAnalyzed: details.length,
    functions,
    findings,
    languages: bundle.overview.languages,
  }
}

/** Find a real complexity finding by its stable id (used by the detail page). */
export function findCodeFinding(bundle: AnalysisBundle, id: string): ComplexityFinding | null {
  return buildCodeReport(bundle).findings.find((finding) => finding.id === id) ?? null
}
