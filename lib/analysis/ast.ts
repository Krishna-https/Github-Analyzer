import 'server-only'

import ts from 'typescript'

/**
 * Real syntax-tree extraction for JS/TS/JSX/TSX.
 *
 * The regex parser in parser.ts stays as the fast fallback for aggregate counts
 * and for languages we don't parse structurally. This module is the precise
 * layer the deep analysis needs: every declaration, import and call carries an
 * exact 1-based source line, so the report can cite `path:line` instead of
 * guessing.
 *
 * It parses only — it never executes repository code.
 */

export type AstSymbolKind = 'function' | 'class' | 'method' | 'component'

export interface AstImport {
  source: string
  line: number
  /** Local binding names, prefixed `default:` / `*:` where relevant. */
  names: string[]
}

/** An interface/type-literal/enum with its top-level fields. */
export interface AstInterface {
  name: string
  kind: 'interface' | 'type' | 'enum'
  line: number
  fields: string[]
}

/** An Express/Fastify-style route registration found in the syntax tree. */
export interface AstRoute {
  method: string
  path: string
  line: number
  handler?: string
}

export interface AstSymbol {
  name: string
  kind: AstSymbolKind
  line: number
  endLine: number
  exported: boolean
  /** Callee names found directly inside this symbol (unresolved). */
  calls: string[]
}

export interface AstFile {
  symbols: AstSymbol[]
  imports: AstImport[]
  exports: string[]
  routes: AstRoute[]
  interfaces: AstInterface[]
}

const JS_FILE = /\.(ts|tsx|js|jsx|mts|cts|mjs|cjs)$/i
const MAX_SYMBOLS = 120
const MAX_IMPORTS = 120
const MAX_CALLS = 40
const MAX_INTERFACES = 80
const MAX_INTERFACE_FIELDS = 20

function scriptKindFor(relPath: string): ts.ScriptKind {
  if (/\.tsx$/i.test(relPath)) return ts.ScriptKind.TSX
  if (/\.jsx$/i.test(relPath)) return ts.ScriptKind.JSX
  if (/\.(ts|mts|cts)$/i.test(relPath)) return ts.ScriptKind.TS
  return ts.ScriptKind.JS
}

function isExported(node: ts.Node): boolean {
  if (!ts.canHaveModifiers(node)) return false
  return (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
}

function lineOf(sf: ts.SourceFile, node: ts.Node): number {
  return sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1
}

function endLineOf(sf: ts.SourceFile, node: ts.Node): number {
  return sf.getLineAndCharacterOfPosition(node.getEnd()).line + 1
}

/** `foo()` → `foo`, `a.b.c()` → `a.b.c`, `new Foo()` → `new Foo`. */
function calleeName(expr: ts.Expression): string | null {
  if (ts.isIdentifier(expr)) return expr.text
  if (ts.isPropertyAccessExpression(expr)) {
    const left = calleeName(expr.expression)
    return left ? `${left}.${expr.name.text}` : expr.name.text
  }
  if (ts.isNewExpression(expr)) {
    return ts.isIdentifier(expr.expression) ? `new ${expr.expression.text}` : null
  }
  return null
}

/** Calls made directly in a body (nested functions are their own symbols). */
function collectCalls(root: ts.Node | undefined): string[] {
  if (!root) return []
  const out: string[] = []
  const seen = new Set<string>()

  const visit = (node: ts.Node) => {
    if (
      node !== root &&
      (ts.isFunctionDeclaration(node) ||
        ts.isFunctionExpression(node) ||
        ts.isArrowFunction(node) ||
        ts.isClassDeclaration(node) ||
        ts.isMethodDeclaration(node))
    ) {
      return
    }
    if (ts.isCallExpression(node)) {
      const name = calleeName(node.expression)
      if (name && !seen.has(name)) {
        seen.add(name)
        out.push(name)
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(root)
  return out.slice(0, MAX_CALLS)
}

function containsJsx(root: ts.Node): boolean {
  let found = false
  const visit = (node: ts.Node) => {
    if (found) return
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) {
      found = true
      return
    }
    ts.forEachChild(node, visit)
  }
  visit(root)
  return found
}

function makeSymbol(
  sf: ts.SourceFile,
  node: ts.Node,
  name: string,
  kind: AstSymbolKind,
  exported: boolean,
  body?: ts.Node
): AstSymbol {
  return {
    name,
    kind,
    line: lineOf(sf, node),
    endLine: endLineOf(sf, node),
    exported,
    calls: collectCalls(body),
  }
}

const ROUTE_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'all', 'options', 'head', 'use'])
const ROUTE_ROOTS = new Set(['app', 'router', 'server', 'api', 'fastify', 'route', 'routes', 'express'])

/**
 * `app.get('/users', handler)` / `router.post(...)` as a real call expression.
 * Comments and string literals can't spoof this, unlike a regex over raw text.
 */
function expressRoute(sf: ts.SourceFile, node: ts.CallExpression): AstRoute | null {
  const callee = node.expression
  if (!ts.isPropertyAccessExpression(callee)) return null

  const method = callee.name.text.toLowerCase()
  if (!ROUTE_METHODS.has(method)) return null

  const base = calleeName(callee.expression)
  if (!base) return null
  const root = base.split('.')[0].toLowerCase()
  if (!ROUTE_ROOTS.has(root) && !/(^|\.)(router|app|server|api)$/i.test(base)) return null

  const first = node.arguments[0]
  if (!first || !ts.isStringLiteral(first) || !first.text.startsWith('/')) return null

  const second = node.arguments[1]
  let handler: string | undefined
  if (second) {
    if (ts.isIdentifier(second)) handler = second.text
    else if (ts.isPropertyAccessExpression(second)) handler = second.name.text
  }

  return {
    method: method === 'use' ? 'USE' : method.toUpperCase(),
    path: first.text,
    line: lineOf(sf, node),
    handler,
  }
}

function cleanType(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Render a type node compactly so nested object literals stay readable. */
function printType(sf: ts.SourceFile, node: ts.TypeNode): string {
  if (ts.isTypeLiteralNode(node)) {
    const members = node.members.map((m) => printMember(sf, m)).filter(Boolean).join('; ')
    return `{ ${members} }`
  }
  if (ts.isArrayTypeNode(node)) return `${printType(sf, node.elementType)}[]`
  if (ts.isUnionTypeNode(node)) return node.types.map((t) => printType(sf, t)).join(' | ')
  if (ts.isIntersectionTypeNode(node)) return node.types.map((t) => printType(sf, t)).join(' & ')
  if (ts.isTypeOperatorNode(node)) return `${node.operator} ${printType(sf, node.type)}`
  if (ts.isParenthesizedTypeNode(node)) return `(${printType(sf, node.type)})`
  if (ts.isTypeReferenceNode(node)) {
    const args = node.typeArguments?.map((t) => printType(sf, t)).join(', ')
    return `${node.typeName.getText(sf)}${args ? `<${args}>` : ''}`
  }
  return cleanType(node.getText(sf))
}

function printMember(sf: ts.SourceFile, member: ts.TypeElement): string {
  if (ts.isPropertySignature(member) && member.name) {
    const optional = member.questionToken ? '?' : ''
    const type = member.type ? `: ${printType(sf, member.type)}` : ''
    return `${member.name.getText(sf)}${optional}${type}`
  }
  if (ts.isMethodSignature(member) && member.name) {
    const params = member.parameters.map((p) => cleanType(p.getText(sf))).join(', ')
    const ret = member.type ? `: ${printType(sf, member.type)}` : ''
    return `${member.name.getText(sf)}(${params})${ret}`
  }
  if (ts.isIndexSignatureDeclaration(member)) return cleanType(member.getText(sf))
  return ''
}

function memberFields(sf: ts.SourceFile, members: ts.NodeArray<ts.TypeElement>): string[] {
  const out: string[] = []
  for (const member of members) {
    if (out.length >= MAX_INTERFACE_FIELDS) break
    const value = printMember(sf, member)
    if (value) out.push(value.length > 180 ? `${value.slice(0, 177)}…` : value)
  }
  return out
}

/**
 * Parse one JS/TS file. Returns null for non-JS/TS files or if the compiler
 * throws (e.g. a pathological input), so callers can fall back to regex.
 */
export function parseAstFile(relPath: string, content: string): AstFile | null {
  if (!JS_FILE.test(relPath)) return null

  let sf: ts.SourceFile
  try {
    sf = ts.createSourceFile(relPath, content, ts.ScriptTarget.Latest, true, scriptKindFor(relPath))
  } catch {
    return null
  }

  const symbols: AstSymbol[] = []
  const imports: AstImport[] = []
  const routes: AstRoute[] = []
  const interfaces: AstInterface[] = []
  const exports = new Set<string>()

  const add = (symbol: AstSymbol) => {
    if (symbols.length >= MAX_SYMBOLS) return
    symbols.push(symbol)
    if (symbol.exported) exports.add(symbol.name)
  }

  const visit = (node: ts.Node) => {
    if (ts.isFunctionDeclaration(node) && node.name) {
      add(makeSymbol(sf, node, node.name.text, 'function', isExported(node), node.body))
    } else if (ts.isClassDeclaration(node) && node.name) {
      add(makeSymbol(sf, node, node.name.text, 'class', isExported(node)))
      const classExported = isExported(node)
      for (const member of node.members) {
        if (ts.isMethodDeclaration(member) && ts.isIdentifier(member.name)) {
          add(makeSymbol(sf, member, member.name.text, 'method', classExported, member.body))
        }
      }
    } else if (ts.isInterfaceDeclaration(node)) {
      if (interfaces.length < MAX_INTERFACES) {
        interfaces.push({
          name: node.name.text,
          kind: 'interface',
          line: lineOf(sf, node),
          fields: memberFields(sf, node.members),
        })
      }
    } else if (ts.isTypeAliasDeclaration(node) && ts.isTypeLiteralNode(node.type)) {
      if (interfaces.length < MAX_INTERFACES) {
        interfaces.push({
          name: node.name.text,
          kind: 'type',
          line: lineOf(sf, node),
          fields: memberFields(sf, node.type.members),
        })
      }
    } else if (ts.isEnumDeclaration(node)) {
      if (interfaces.length < MAX_INTERFACES) {
        interfaces.push({
          name: node.name.text,
          kind: 'enum',
          line: lineOf(sf, node),
          fields: node.members.map((m) => m.name.getText(sf)).slice(0, MAX_INTERFACE_FIELDS),
        })
      }
    } else if (ts.isVariableStatement(node)) {
      const exported = isExported(node)
      for (const decl of node.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name)) continue
        const init = decl.initializer
        if (!init || (!ts.isArrowFunction(init) && !ts.isFunctionExpression(init))) continue
        const kind: AstSymbolKind = /^[A-Z]/.test(decl.name.text) || containsJsx(init) ? 'component' : 'function'
        add(makeSymbol(sf, decl, decl.name.text, kind, exported, init.body))
      }
    } else if (ts.isExportAssignment(node)) {
      const expr = node.expression
      if (ts.isArrowFunction(expr) || ts.isFunctionExpression(expr) || ts.isClassExpression(expr)) {
        const kind: AstSymbolKind = containsJsx(expr) ? 'component' : 'function'
        add(makeSymbol(sf, node, 'default', kind, true, ts.isClassExpression(expr) ? undefined : expr.body))
      }
    } else if (ts.isImportDeclaration(node)) {
      const spec = node.moduleSpecifier
      if (ts.isStringLiteral(spec) && imports.length < MAX_IMPORTS) {
        const names: string[] = []
        const clause = node.importClause
        if (clause) {
          if (clause.name) names.push(`default:${clause.name.text}`)
          if (clause.namedBindings) {
            if (ts.isNamedImports(clause.namedBindings)) {
              for (const el of clause.namedBindings.elements) names.push(el.name.text)
            } else if (ts.isNamespaceImport(clause.namedBindings)) {
              names.push(`*:${clause.namedBindings.name.text}`)
            }
          }
        }
        imports.push({ source: spec.text, line: lineOf(sf, node), names })
      }
    } else if (ts.isCallExpression(node) && routes.length < 100) {
      const route = expressRoute(sf, node)
      if (route) routes.push(route)
    }

    ts.forEachChild(node, visit)
  }

  try {
    visit(sf)
  } catch {
    return null
  }

  return { symbols, imports, exports: [...exports], routes, interfaces }
}
