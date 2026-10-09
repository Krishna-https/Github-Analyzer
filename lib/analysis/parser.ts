import 'server-only'

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

/** Complexity of an expression-bodied arrow (no braces) — count the line only. */
function lineComplexity(masked: string, start: number): number {
  const lineEnd = masked.indexOf('\n', start)
  return bodyComplexity(masked, start, lineEnd === -1 ? masked.length : lineEnd)
}

/* ------------------------------------------------------------------ */
/* JS / TS                                                            */
/* ------------------------------------------------------------------ */

const FN_DECL_RE = /\bfunction\s*\*?\s*(?:[A-Za-z_$][\w$]*)?\s*\(/g
const ARROW_CONST_RE =
  /\b(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*(?:async\s*)?(?:\([^)]{0,300}\)|[A-Za-z_$][\w$]*)\s*=>/g
const CLASS_RE = /\bclass\s+[A-Za-z_$][\w$]*(?:\s+extends\s+[^{]+)?\s*\{/g
const METHOD_RE = /^\s*(?:async\s+|static\s+|get\s+|set\s+)*[A-Za-z_$][\w$]*\s*\([^)]*\)\s*(?:\{|=|$)/gm

function parseJs(content: string): { functions: number; classes: number; complexities: number[] } {
  const masked = maskCode(content)
  let functions = 0
  let classes = 0
  const complexities: number[] = []

  const pushBraceBody = (brace: number) => {
    if (brace === -1) return
    const end = matchingBrace(masked, brace)
    complexities.push(bodyComplexity(masked, brace, end))
  }

  let m: RegExpExecArray | null

  while ((m = FN_DECL_RE.exec(masked)) !== null) {
    functions++
    pushBraceBody(masked.indexOf('{', m.index))
  }

  while ((m = ARROW_CONST_RE.exec(masked)) !== null) {
    functions++
    const arrow = masked.indexOf('=>', m.index)
    let j = arrow === -1 ? masked.length : arrow + 2
    while (j < masked.length && (masked[j] === ' ' || masked[j] === '\t')) j++
    if (masked[j] === '{') pushBraceBody(j)
    else if (j < masked.length && masked[j] !== ';') {
      complexities.push(lineComplexity(masked, j))
    }
  }

  while ((m = CLASS_RE.exec(masked)) !== null) {
    classes++
    const brace = masked.indexOf('{', m.index)
    if (brace === -1) continue
    const end = matchingBrace(masked, brace)
    const block = masked.slice(brace, end)
    let lm: RegExpExecArray | null
    while ((lm = METHOD_RE.exec(block)) !== null) {
      const methodBrace = block.indexOf('{', lm.index)
      if (methodBrace === -1) continue
      functions++
      const methodEnd = matchingBrace(block, methodBrace)
      complexities.push(bodyComplexity(block, methodBrace, methodEnd))
    }
  }

  return { functions, classes, complexities }
}

function jsImportsCount(content: string): number {
  const masked = maskCode(content)
  const re =
    /^\s*import\s+(?:[^'"]*?\s+from\s+)?['"][^'"]+['"]|^\s*import\s+['"][^'"]+['"]|\brequire\(['"][^'"]+['"]\)|\bimport\(['"][^'"]+['"]\)/gm
  let count = 0
  while (true) {
    const m = re.exec(masked)
    if (m === null) break
    count++
  }
  return count
}

/* ------------------------------------------------------------------ */
/* Python                                                             */
/* ------------------------------------------------------------------ */

function parsePy(content: string): { functions: number; classes: number; complexities: number[] } {
  const lines = content.split('\n')
  let functions = 0
  let classes = 0
  const complexities: number[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const indent = (line.match(/^\s*/) ?? [''])[0].length
    const trimmed = line.trim()

    const def = /^(?:async\s+)?def\s+[A-Za-z_]\w*\s*\(/.test(trimmed)
    const cls = /^class\s+[A-Za-z_]\w*(?:\s*\([^)]*\))?\s*:/.test(trimmed)

    if (cls) {
      classes++
      continue
    }
    if (!def) continue

    functions++
    let complexity = 1
    for (let j = i + 1; j < lines.length; j++) {
      const nl = lines[j]
      if (nl.trim() === '') continue
      const ni = (nl.match(/^\s*/) ?? [''])[0].length
      if (ni <= indent) break
      complexity += (nl.match(/\b(if|for|while|elif|except|with)\b|\band\b|\bor\b/g) ?? []).length
    }
    complexities.push(complexity)
  }

  return { functions, classes, complexities }
}

function pyImportsCount(content: string): number {
  const re = /^\s*(?:from\s+\S+\s+)?import\s+\S+/gm
  let count = 0
  while (true) {
    const m = re.exec(content)
    if (m === null) break
    count++
  }
  return count
}

/* ------------------------------------------------------------------ */
/* Entry                                                              */
/* ------------------------------------------------------------------ */

const JS_EXT = /\.(js|mjs|cjs|jsx|ts|mts|cts|tsx)$/i

export function parseSource(relPath: string, content: string): ParseResult {
  const lineCount = content === '' ? 0 : content.split('\n').length

  if (JS_EXT.test(relPath)) {
    const { functions, classes, complexities } = parseJs(content)
    return { functions, classes, imports: jsImportsCount(content), lines: lineCount, complexities }
  }

  if (/\.py$/i.test(relPath)) {
    const { functions, classes, complexities } = parsePy(content)
    return { functions, classes, imports: pyImportsCount(content), lines: lineCount, complexities }
  }

  return { functions: 0, classes: 0, imports: 0, lines: lineCount, complexities: [] }
}