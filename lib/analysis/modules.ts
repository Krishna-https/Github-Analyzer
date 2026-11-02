import 'server-only'

import type { ModuleRecord, ModuleWithFunctions } from '@/lib/types'
import type {
  AnalysisBundle,
  CodeModel,
  CodeRoute,
  CodeSymbol,
  ModuleInfo,
  ParsedFile,
} from './types'

/**
 * Turns the cached analysis bundle into the module records the Modules pages
 * render. Everything here is derived from the cloned source (top-level
 * directories, parsed files, the AST symbol pass and the import graph) — no
 * sample data is involved.
 */

const LABELS: Record<string, string> = {
  src: 'Source',
  source: 'Source',
  app: 'App',
  api: 'API',
  ui: 'UI',
  db: 'DB',
  lib: 'Lib',
  components: 'Components',
  pages: 'Pages',
  views: 'Views',
  hooks: 'Hooks',
  services: 'Services',
  models: 'Models',
  routes: 'Routes',
  controllers: 'Controllers',
  middleware: 'Middleware',
  config: 'Config',
  configs: 'Configs',
  scripts: 'Scripts',
  prisma: 'Prisma',
  public: 'Public',
  assets: 'Assets',
  static: 'Static',
  docs: 'Docs',
  tests: 'Tests',
  test: 'Tests',
  e2e: 'E2E',
  utils: 'Utils',
  utilities: 'Utilities',
  helpers: 'Helpers',
  frontend: 'Frontend',
  backend: 'Backend',
  data: 'Data',
  test_: 'Tests',
  docs_: 'Docs',
  unclassified: 'Unclassified',
}

/** `components` → `Components`, `my-module` → `My module`, `(root)` → root. */
function prettyModule(name: string): string {
  if (name === '(root)') return 'Repository root'
  const label = LABELS[name.toLowerCase()]
  if (label) return label
  const spaced = name.replace(/[-_]+/g, ' ').trim()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

function slugify(name: string): string {
  if (name === '(root)') return 'root'
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'module'
  )
}

const ROLE_RULES: Array<[RegExp, string]> = [
  [/^(src|source)$/i, 'Application source: core implementation.'],
  [/^(app|pages?|views?|components?|ui|frontend|client|web)$/i, 'Application layer: pages, routes and client-side code.'],
  [/^(api|routes?|controllers?|handlers?|server|backend|endpoints?)$/i, 'HTTP layer: routing, request handlers and API responses.'],
  [/^(services?|core|domain|usecases?|business|logic)$/i, 'Business logic and application services.'],
  [/^(models?|entities|schema|prisma|db|database|data|repositor(y|ies)|migrations?)$/i, 'Data layer: models, schemas and persistence.'],
  [/^(lib|utils?|utilities|helpers?|shared|common)$/i, 'Shared utilities and cross-cutting helpers.'],
  [/^(hooks?)$/i, 'Reusable client hooks.'],
  [/^(store|state|context|redux|zustand)$/i, 'Application state management.'],
  [/^(config|configs|settings|scripts|tools|build|infra|\.github)$/i, 'Configuration and tooling.'],
  [/^(tests?|__tests__|spec|e2e)$/i, 'Test suites.'],
  [/^(public|assets?|static|img|images?|media)$/i, 'Static assets.'],
  [/^(docs?|documentation)$/i, 'Documentation.'],
  [/^(contracts?|solidity)$/i, 'Smart contracts.'],
]

function roleFor(name: string): string {
  return ROLE_RULES.find(([pattern]) => pattern.test(name))?.[1] ?? ''
}

const ICON_RULES: Array<[RegExp, string]> = [
  [/^(auth|authentication|security|session|login)/i, 'KeyRound'],
  [/^(users?|accounts?|members?|teams?)/i, 'Users'],
  [/^(tasks?|todos?|issues?)/i, 'ListChecks'],
  [/^(projects?|workspaces?|boards?)/i, 'FolderKanban'],
  [/^(notifications?|alerts?|events?)/i, 'Bell'],
  [/^(payments?|billing|invoices?|subscriptions?)/i, 'CreditCard'],
  [/^(analytics?|metrics?|reports?|stats?|charts?)/i, 'BarChart3'],
  [/^(models?|schema|prisma|db|database|data|migrations?)/i, 'Database'],
  [/^(app|components?|ui|views?|pages?|frontend|client|web)/i, 'Laptop'],
  [/^(services?|core|domain|business|logic)/i, 'Boxes'],
  [/^(utils?|utilities|helpers?|lib|shared|common)/i, 'Wrench'],
  [/^(tests?|test|spec|e2e)$/i, 'FlaskConical'],
  [/^(config|configs|settings|scripts|tools|build|infra)/i, 'Settings'],
  [/^(docs?|documentation)$/i, 'FileCode'],
  [/^(api|routes?|controllers?|server|backend|middleware|handlers?)/i, 'Globe'],
]

function iconFor(name: string): string {
  return ICON_RULES.find(([pattern]) => pattern.test(name))?.[1] ?? 'Folder'
}

function moduleOf(relPath: string): string {
  const slash = relPath.indexOf('/')
  return slash === -1 ? '(root)' : relPath.slice(0, slash)
}

function joinWithAnd(items: string[]): string {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

function plural(count: number, singular = '', pluralForm = 's'): string {
  return count === 1 ? singular : pluralForm
}

interface ModuleContext {
  bundle: AnalysisBundle
  fileModule: Map<string, string>
  moduleNames: Set<string>
  symbols: CodeSymbol[]
  imports: NonNullable<AnalysisBundle['facts']>['insights']['imports']
  routes: CodeRoute[]
  models: CodeModel[]
  deepModules: NonNullable<AnalysisBundle['deepAnalysis']>['keyModules']
}

/** Map every parsed file to the module it is reported under. */
function buildFileModuleMap(bundle: AnalysisBundle): Map<string, string> {
  const weakStructure = bundle.facts?.weakStructure ?? bundle.overview.weakStructure
  const map = new Map<string, string>()
  for (const file of bundle.files) {
    map.set(file.relPath, weakStructure ? file.category : moduleOf(file.relPath))
  }
  return map
}

function pickKeyFiles(
  files: ParsedFile[],
  routes: CodeRoute[],
  models: CodeModel[]
): string[] {
  const routeFiles = new Set(routes.map((r) => r.file))
  const modelFiles = new Set(models.map((m) => m.file))

  const score = (file: ParsedFile): number =>
    (routeFiles.has(file.relPath) ? 1000 : 0) +
    (modelFiles.has(file.relPath) ? 500 : 0) +
    file.functions * 10 +
    file.lines / 100

  return [...files]
    .sort((a, b) => score(b) - score(a) || a.relPath.localeCompare(b.relPath))
    .slice(0, 6)
    .map((file) => file.relPath)
}

function buildFunctions(symbols: CodeSymbol[], moduleName: string): ModuleWithFunctions['functions'] {
  return [...symbols]
    .filter((symbol) => symbol.kind === 'function' || symbol.kind === 'method' || symbol.kind === 'component')
    .sort((a, b) => {
      const aLines = a.endLine && a.endLine >= a.line ? a.endLine - a.line + 1 : 0
      const bLines = b.endLine && b.endLine >= b.line ? b.endLine - b.line + 1 : 0
      return bLines - aLines || a.name.localeCompare(b.name)
    })
    .slice(0, 40)
    .map((symbol) => ({
      name: `${symbol.name}()`,
      file: symbol.file,
      lines: symbol.endLine && symbol.endLine >= symbol.line ? symbol.endLine - symbol.line + 1 : 0,
      complexity: 0,
      calls: symbol.calls?.length ?? 0,
      status: 'Detected' as const,
      module: moduleName,
    }))
}

function buildModule(module: ModuleInfo, ctx: ModuleContext, usedIds: Map<string, number>): ModuleWithFunctions {
  const files = ctx.bundle.files.filter((file) => ctx.fileModule.get(file.relPath) === module.name)
  const fileSet = new Set(files.map((file) => file.relPath))

  const symbols = ctx.symbols.filter((symbol) => fileSet.has(symbol.file))
  const routes = ctx.routes.filter((route) => fileSet.has(route.file))
  const models = ctx.models.filter((model) => fileSet.has(model.file))

  const keyFiles = pickKeyFiles(files, routes, models)

  const dependsOn = new Set<string>()
  for (const edge of ctx.imports) {
    if (!fileSet.has(edge.from) || fileSet.has(edge.to)) continue
    const target = ctx.fileModule.get(edge.to) ?? moduleOf(edge.to)
    if (target === module.name || !ctx.moduleNames.has(target)) continue
    dependsOn.add(prettyModule(target))
  }

  const seenSymbols = new Set<string>()
  const symbolNames: string[] = []
  for (const symbol of symbols) {
    if (seenSymbols.has(symbol.name)) continue
    seenSymbols.add(symbol.name)
    symbolNames.push(symbol.name)
  }
  for (const file of files) {
    for (const symbol of file.symbols ?? []) {
      if (seenSymbols.has(symbol)) continue
      seenSymbols.add(symbol)
      symbolNames.push(symbol)
    }
  }

  const displayName = prettyModule(module.name)
  const deepModule = ctx.deepModules.find(
    (entry) => entry.name.toLowerCase() === displayName.toLowerCase() || entry.name.toLowerCase() === module.name.toLowerCase()
  )
  const role = deepModule?.role || roleFor(module.name)
  const description =
    role ||
    (module.category
      ? `${displayName} files detected by content classification.`
      : `Files grouped under the ${module.name} directory.`)

  const responsibilities: string[] = []
  if (role) responsibilities.push(role)
  if (symbolNames.length > 0) {
    responsibilities.push(`Declares ${joinWithAnd(symbolNames.slice(0, 4))}${symbolNames.length > 4 ? ', …' : ''}.`)
  }
  if (routes.length > 0) {
    responsibilities.push(
      `Registers ${routes.length} HTTP route${plural(routes.length)} (${routes
        .slice(0, 3)
        .map((route) => `${route.method} ${route.path}`)
        .join(', ')}${routes.length > 3 ? ', …' : ''}).`
    )
  }
  if (models.length > 0) {
    responsibilities.push(
      `Defines ${models.length} data model${plural(models.length)} (${models
        .slice(0, 4)
        .map((model) => model.name)
        .join(', ')}${models.length > 4 ? ', …' : ''}).`
    )
  }
  if (dependsOn.size > 0) {
    responsibilities.push(`Imports from ${joinWithAnd([...dependsOn].slice(0, 4))}.`)
  }
  if (responsibilities.length === 0) {
    responsibilities.push(`Contains ${module.files} file${plural(module.files)}.`)
  }

  const baseId = slugify(module.name)
  const seen = usedIds.get(baseId) ?? 0
  usedIds.set(baseId, seen + 1)
  const id = seen === 0 ? baseId : `${baseId}-${seen + 1}`

  const record: ModuleRecord = {
    id,
    name: displayName,
    description,
    files: module.files,
    functions: module.functions,
    icon: iconFor(module.name),
    keyFiles,
    responsibilities,
    dependsOn: [...dependsOn],
  }

  return { module: record, functions: buildFunctions(symbols, displayName) }
}

/** Derive the Modules list (and per-module key functions) from a cached bundle. */
export function buildModuleDetails(bundle: AnalysisBundle): ModuleWithFunctions[] {
  const insights = bundle.facts?.insights
  const moduleNames = new Set(bundle.modules.map((module) => module.name))

  const ctx: ModuleContext = {
    bundle,
    fileModule: buildFileModuleMap(bundle),
    moduleNames,
    symbols: insights?.symbols ?? [],
    imports: insights?.imports ?? [],
    routes: insights?.routes ?? [],
    models: insights?.models ?? [],
    deepModules: bundle.deepAnalysis?.keyModules ?? [],
  }

  const usedIds = new Map<string, number>()

  return bundle.modules
    .filter((module) => module.name !== '(root)' && module.files > 0)
    .map((module) => buildModule(module, ctx, usedIds))
    .sort((a, b) => b.module.functions - a.module.functions || b.module.files - a.module.files)
}
