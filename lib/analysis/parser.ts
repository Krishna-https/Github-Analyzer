import 'server-only'

import type { ParsedFunction } from './types'

/**
 * Heuristic code parser for the Overview pipeline. It is intentionally a
 * best-effort scanner (not a real AST — that is a later tree-sitter upgrade):
 * it masks strings/comments so keywords inside literals don't pollute it, then
 * extracts function/class declarations, import counts and per-function
 * decision-point complexity.
 *
 * Supported: JS/TS family (incl. JSX) and Python.
 */

export interface ParseResult {
  functions: number
  classes: number
  imports: number
  lines: number
  /** Cyclomatic-style complexity (1 + decision points) per detected function. */
  complexities: number[]
  /** Declared function names (capped; masked code, so identifiers only). */
  functionNames: string[]
  /** Declared class names. */
  classNames: string[]
  /** Import specifiers as written (e.g. './util', 'react', 'os.path'). */
  importSources: string[]
  /** Per-function metrics with exact source locations (capped per file). */
  functionDetails: ParsedFunction[]
}

/* ------------------------------------------------------------------ */
/* Masking                                                            */
/* ------------------------------------------------------------------ */

/** Replaces string/comment contents with spaces, preserving length and braces. */
function maskCode(code: string): string {
  let out = ''
  let i = 0
  const n = code.length

  while (i < n) {
    const ch = code[i]

    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch
      out += ' '
      i++
      while (i < n) {
        const c = code[i]
        if (c === '\\') {
          out += '  '
          i += 2
          continue
        }
        out += ' '
        i++
        if (c === quote) break
      }
      continue
    }

    if (ch === '/' && code[i + 1] === '/') {
      while (i < n && code[i] !== '\n') {
        out += ' '
        i++
      }
      continue
    }

    if (ch === '/' && code[i + 1] === '*') {
      i += 2
      out += '  '
      while (i < n) {
        if (code[i] === '*' && code[i + 1] === '/') {
          out += '  '
          i += 2
          break
        }
        out += ' '
        i++
      }
      continue
    }

    out += ch
    i++
  }
  return out
}

/** Finds the index just past the `}` that matches the `{` at `open`. */
function matchingBrace(masked: string, open: number): number {
  let depth = 0
  for (let i = open; i < masked.length; i++) {
    const c = masked[i]
    if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) return i + 1
    }
  }
  return masked.length
}

/* ------------------------------------------------------------------ */
/* Complexity                                                         */
/* ------------------------------------------------------------------ */

const DECISION_RE = /\b(if|for|while|catch|switch|case)\b|\b(&&|\|\|)\b|\?(?!\.|\?)/g

function bodyComplexity(masked: string, start: number, end: number): number {
  let count = 0
  const slice = masked.slice(start, end)
  while (true) {
    const m = DECISION_RE.exec(slice)
    if (m === null) break
    count++
  }
  return 1 + count
}

/* ------------------------------------------------------------------ */
/* Function metrics                                                    */
/* ------------------------------------------------------------------ */

const MAX_DETAILS = 200

/** Words that look like `name(` but are language keywords, not calls. */
const NON_CALL_WORDS = new Set([
  'if', 'for', 'while', 'switch', 'catch', 'function', 'typeof', 'await', 'yield',
  'new', 'return', 'do', 'else', 'in', 'of', 'instanceof', 'delete', 'void', 'throw',
  'def', 'class', 'elif', 'with', 'except', 'case', 'match',
])

/** Build a fast 1-based line locator over a source string. */
function lineLocator(code: string): (index: number) => number {
  const starts = [0]
  for (let i = 0; i < code.length; i++) {
    if (code[i] === '\n') starts.push(i + 1)
  }
  return (index: number): number => {
    let lo = 0
    let hi = starts.length - 1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      if (starts[mid] <= index) lo = mid + 1
      else hi = mid - 1
    }
    return hi + 1
  }
}

/** Count call expressions in masked code (strings/comments are already blank). */
function countCalls(masked: string, start: number, end: number): number {
  const slice = masked.slice(start, Math.max(start, end))
  let count = 0
  let m: RegExpExecArray | null
  CALL_SITE_RE.lastIndex = 0
  while ((m = CALL_SITE_RE.exec(slice)) !== null) {
    if (NON_CALL_WORDS.has(m[1])) continue
    // Skip the name in `function foo(` / `def foo(` bodies (nested declarations).
    const before = slice.slice(Math.max(0, m.index - 9), m.index)
    if (/\b(function|def)\s+$/.test(before)) continue
    count++
  }
  return count
}

const CALL_SITE_RE = /([A-Za-z_$][\w$]*)\s*\(/g

/** Max brace-nesting depth inside a body, relative to its outer braces. */
function braceNesting(masked: string, start: number, end: number): number {
  let depth = 0
  let max = 0
  const stop = Math.min(end, masked.length)
  for (let i = start; i < stop; i++) {
    const c = masked[i]
    if (c === '{') {
      depth++
      if (depth > max) max = depth
    } else if (c === '}') {
      depth--
    }
  }
  return Math.max(0, max - 1)
}

function makeDetail(
  name: string,
  line: number,
  endLine: number,
  complexity: number,
  calls: number,
  nesting: number
): ParsedFunction {
  const last = Math.max(line, endLine)
  return { name, line, endLine: last, lines: last - line + 1, complexity, calls, nesting }
}

/* ------------------------------------------------------------------ */
/* JS / TS                                                            */
/* ------------------------------------------------------------------ */

const MAX_NAMES = 60

const FN_DECL_RE = /\bfunction\s*\*?\s*([A-Za-z_$][\w$]*)?\s*\(/g
const ARROW_CONST_RE =
  /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]{0,300}\)|[A-Za-z_$][\w$]*)\s*=>/g
const CLASS_RE = /\bclass\s+([A-Za-z_$][\w$]*)(?:\s+extends\s+[^{]+)?\s*\{/g
const METHOD_RE = /^\s*(?:async\s+|static\s+|get\s+|set\s+)*([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*(?:\{|=|$)/gm

/** Keywords that the method regex would otherwise mistake for a method name. */
const NON_METHOD_NAMES = new Set(['if', 'for', 'while', 'switch', 'catch', 'return', 'with', 'else'])

function parseJs(content: string): {
  functions: number
  classes: number
  complexities: number[]
  functionNames: string[]
  classNames: string[]
  functionDetails: ParsedFunction[]
} {
  const masked = maskCode(content)
  const lineOf = lineLocator(content)
  let functions = 0
  let classes = 0
  const complexities: number[] = []
  const functionNames: string[] = []
  const classNames: string[] = []
  const functionDetails: ParsedFunction[] = []

  const pushName = (list: string[], name: string | undefined) => {
    if (name && list.length < MAX_NAMES) list.push(name)
  }

  const pushDetail = (detail: ParsedFunction) => {
    if (functionDetails.length < MAX_DETAILS) functionDetails.push(detail)
  }

  /** Record a brace-delimited body starting at `brace`. */
  const pushBraceBody = (name: string, declIndex: number, brace: number) => {
    if (brace === -1) {
      pushDetail(makeDetail(name, lineOf(declIndex), lineOf(declIndex), 1, 0, 0))
      return
    }
    const end = matchingBrace(masked, brace)
    const complexity = bodyComplexity(masked, brace, end)
    complexities.push(complexity)
    pushDetail(
      makeDetail(
        name,
        lineOf(declIndex),
        lineOf(Math.max(declIndex, end - 1)),
        complexity,
        countCalls(masked, brace, end),
        braceNesting(masked, brace, end)
      )
    )
  }

  let m: RegExpExecArray | null

  while ((m = FN_DECL_RE.exec(masked)) !== null) {
    functions++
    pushName(functionNames, m[1])
    pushBraceBody(m[1] ?? '(anonymous)', m.index, masked.indexOf('{', m.index))
  }

  while ((m = ARROW_CONST_RE.exec(masked)) !== null) {
    functions++
    pushName(functionNames, m[1])
    const arrow = masked.indexOf('=>', m.index)
    let j = arrow === -1 ? masked.length : arrow + 2
    while (j < masked.length && (masked[j] === ' ' || masked[j] === '\t')) j++
    if (masked[j] === '{') {
      pushBraceBody(m[1], m.index, j)
    } else if (j < masked.length && masked[j] !== ';') {
      const lineEnd = masked.indexOf('\n', j)
      const stop = lineEnd === -1 ? masked.length : lineEnd
      const complexity = bodyComplexity(masked, j, stop)
      complexities.push(complexity)
      pushDetail(
        makeDetail(
          m[1],
          lineOf(m.index),
          lineOf(Math.max(j, stop - 1)),
          complexity,
          countCalls(masked, j, stop),
          0
        )
      )
    }
  }

  while ((m = CLASS_RE.exec(masked)) !== null) {
    classes++
    pushName(classNames, m[1])
    const brace = masked.indexOf('{', m.index)
    if (brace === -1) continue
    const end = matchingBrace(masked, brace)
    const block = masked.slice(brace, end)
    let lm: RegExpExecArray | null
    while ((lm = METHOD_RE.exec(block)) !== null) {
      const methodName = lm[1]
      if (!methodName || NON_METHOD_NAMES.has(methodName)) continue
      const methodBrace = block.indexOf('{', lm.index)
      if (methodBrace === -1) continue
      functions++
      const methodEnd = matchingBrace(block, methodBrace)
      const complexity = bodyComplexity(block, methodBrace, methodEnd)
      complexities.push(complexity)
      pushDetail(
        makeDetail(
          `${m[1]}.${methodName}`,
          lineOf(brace + lm.index),
          lineOf(brace + Math.max(methodBrace, methodEnd - 1)),
          complexity,
          countCalls(block, methodBrace, methodEnd),
          braceNesting(block, methodBrace, methodEnd)
        )
      )
    }
  }

  return { functions, classes, complexities, functionNames, classNames, functionDetails }
}

/**
 * Import specifiers, read from the RAW source (they live inside string
 * literals, which maskCode blanks out). The trade-off is that an import-looking
 * token inside a comment or string is also picked up; acceptable for a summary.
 */
function jsImportSources(content: string): string[] {
  const re =
    /^\s*import\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]|^\s*import\s+['"]([^'"]+)['"]|^\s*export\s+(?:\*|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]|\brequire\(\s*['"]([^'"]+)['"]\s*\)|\bimport\(\s*['"]([^'"]+)['"]\s*\)/gm
  const sources: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(content)) !== null) {
    const src = m[1] ?? m[2] ?? m[3] ?? m[4] ?? m[5]
    if (src) sources.push(src)
  }
  return sources
}

/* ------------------------------------------------------------------ */
/* Python                                                             */
/* ------------------------------------------------------------------ */

function parsePy(content: string): {
  functions: number
  classes: number
  complexities: number[]
  functionNames: string[]
  classNames: string[]
  functionDetails: ParsedFunction[]
} {
  const lines = content.split('\n')
  let functions = 0
  let classes = 0
  const complexities: number[] = []
  const functionNames: string[] = []
  const classNames: string[] = []
  const functionDetails: ParsedFunction[] = []

  const pushDetail = (detail: ParsedFunction) => {
    if (functionDetails.length < MAX_DETAILS) functionDetails.push(detail)
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const indent = (line.match(/^\s*/) ?? [''])[0].length
    const trimmed = line.trim()

    const def = trimmed.match(/^(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\(/)
    const cls = trimmed.match(/^class\s+([A-Za-z_]\w*)(?:\s*\([^)]*\))?\s*:/)

    if (cls) {
      classes++
      if (classNames.length < MAX_NAMES) classNames.push(cls[1])
      continue
    }
    if (!def) continue

    functions++
    if (functionNames.length < MAX_NAMES) functionNames.push(def[1])
    let complexity = 1
    let lastBody = i
    let baseIndent = -1
    let maxIndent = -1
    const bodyLines: string[] = []
    for (let j = i + 1; j < lines.length; j++) {
      const nl = lines[j]
      if (nl.trim() === '') continue
      const ni = (nl.match(/^\s*/) ?? [''])[0].length
      if (ni <= indent) break
      lastBody = j
      if (baseIndent === -1) baseIndent = ni
      if (ni > maxIndent) maxIndent = ni
      bodyLines.push(nl)
      complexity += (nl.match(/\b(if|for|while|elif|except|with)\b|\band\b|\bor\b/g) ?? []).length
    }
    complexities.push(complexity)

    const nesting =
      maxIndent === -1 || baseIndent === -1 ? 0 : Math.max(0, Math.round((maxIndent - baseIndent) / 4))
    pushDetail(
      makeDetail(
        def[1],
        i + 1,
        lastBody + 1,
        complexity,
        countCalls(bodyLines.join('\n'), 0, Number.MAX_SAFE_INTEGER),
        nesting
      )
    )
  }

  return { functions, classes, complexities, functionNames, classNames, functionDetails }
}

function pyImportSources(content: string): string[] {
  const re = /^\s*from\s+([\w.]+)\s+import|^\s*import\s+([\w.]+)/gm
  const sources: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(content)) !== null) {
    const src = m[1] ?? m[2]
    if (src) sources.push(src)
  }
  return sources
}

/* ------------------------------------------------------------------ */
/* Entry                                                              */
/* ------------------------------------------------------------------ */

const JS_EXT = /\.(js|mjs|cjs|jsx|ts|mts|cts|tsx)$/i

export function parseSource(relPath: string, content: string): ParseResult {
  const lineCount = content === '' ? 0 : content.split('\n').length

  if (JS_EXT.test(relPath)) {
    const { functions, classes, complexities, functionNames, classNames, functionDetails } = parseJs(content)
    const importSources = jsImportSources(content)
    return {
      functions,
      classes,
      imports: importSources.length,
      lines: lineCount,
      complexities,
      functionNames,
      classNames,
      importSources,
      functionDetails,
    }
  }

  if (/\.py$/i.test(relPath)) {
    const { functions, classes, complexities, functionNames, classNames, functionDetails } = parsePy(content)
    const importSources = pyImportSources(content)
    return {
      functions,
      classes,
      imports: importSources.length,
      lines: lineCount,
      complexities,
      functionNames,
      classNames,
      importSources,
      functionDetails,
    }
  }

  return {
    functions: 0,
    classes: 0,
    imports: 0,
    lines: lineCount,
    complexities: [],
    functionNames: [],
    classNames: [],
    importSources: [],
    functionDetails: [],
  }
}