import 'server-only'

import type { DeepAnalysis } from '@/lib/types'
import type { CodeRoute, ProjectFacts } from './types'

/**
 * Deterministic deep-analysis report.
 *
 * The AI report (llm.ts) is the richer layer, but it requires a provider key.
 * Without one, this builder produces a genuine, source-grounded report from the
 * same {@link ProjectFacts}: architecture from the module/import graph, routes
 * and models from code extraction, run commands from the manifest, and honest
 * strengths/risks from the quality metrics.
 *
 * It is intentionally conservative: it only states what the facts support, and
 * degrades cleanly for documentation-only repositories or older cached bundles
 * that predate `facts.insights`.
 */

interface ModuleView {
  name: string
  files: number
  functions: number
  keyFiles: string[]
  importsFrom: string[]
  symbols: string[]
}

const HTML_TAG = /<[^>]+>/g
const MD_IMAGE = /!\[[^\]]*\]\([^)]*\)/g
const MD_LINK = /\[([^\]]*)\]\([^)]*\)/g
const MD_MARKUP = /[#*_>`|]+/g

/** Flatten a README/description fragment (often HTML + markdown) into prose. */
function cleanText(input: string | null | undefined, max = 360): string {
  if (!input) return ''
  let text = input
    .replace(MD_IMAGE, ' ')
    .replace(MD_LINK, '$1')
    .replace(HTML_TAG, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(MD_MARKUP, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (text.length > max) text = `${text.slice(0, max).replace(/\s+\S*$/, '')}…`
  return text
}

function plural(count: number, singular = '', pluralForm = 's'): string {
  return count === 1 ? singular : pluralForm
}

function joinWithAnd(items: string[]): string {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

function withArticle(phrase: string): string {
  return `${/^[aeiou]/i.test(phrase) ? 'an' : 'a'} ${phrase}`
}

/** `my-module_name` → `My module name` (with a few conventional labels). */
const MODULE_LABELS: Record<string, string> = {
  src: 'Source',
  source: 'Source',
  api: 'API',
  ui: 'UI',
  db: 'DB',
  app: 'App',
  lib: 'Lib',
  tests: 'Tests',
  docs: 'Docs',
  config: 'Config',
  configs: 'Configs',
  public: 'Public',
  hooks: 'Hooks',
  components: 'Components',
  pages: 'Pages',
  views: 'Views',
  services: 'Services',
  models: 'Models',
  routes: 'Routes',
  prisma: 'Prisma',
}

function prettyModule(name: string): string {
  if (name === '(root)') return 'Repository root'
  const label = MODULE_LABELS[name.toLowerCase()]
  if (label) return label
  const spaced = name.replace(/[-_]+/g, ' ').trim()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

const ROLE_RULES: Array<[RegExp, string]> = [
  [/^(src|source)$/i, 'Application source: core implementation'],
  [/^(app|pages?|views?|components?|ui|frontend|client|web)$/i, 'Application layer: pages, routes and client-side code'],
  [/^(api|routes?|controllers?|handlers?|server|backend|endpoints?)$/i, 'HTTP layer: routing, request handlers and API responses'],
  [/^(services?|core|domain|usecases?|business|logic)$/i, 'Business logic and application services'],
  [/^(models?|entities|schema|prisma|db|database|data|repositor(y|ies)|migrations?)$/i, 'Data layer: models, schemas and persistence'],
  [/^(lib|utils?|helpers?|shared|common)$/i, 'Shared utilities and cross-cutting helpers'],
  [/^(hooks?)$/i, 'Reusable client hooks'],
  [/^(store|state|context|redux|zustand)$/i, 'Application state management'],
  [/^(config|configs|settings|scripts|tools|build|infra)$/i, 'Configuration and tooling'],
  [/^(tests?|__tests__|spec|e2e)$/i, 'Test suites'],
  [/^(public|assets?|static|img|images?|media)$/i, 'Static assets'],
  [/^(docs?|documentation)$/i, 'Documentation'],
  [/^(contracts?|solidity)$/i, 'Smart contracts'],
  [/^(\.github)$/i, 'CI workflows and repository automation'],
]

/** Best-effort responsibility label for a module, from its name and size. */
function roleFor(module: ModuleView): string {
  const match = ROLE_RULES.find(([pattern]) => pattern.test(module.name))
  if (match) {
    const detail = `${module.files} file${plural(module.files)}${module.functions ? `, ${module.functions} function${plural(module.functions)}` : ''}`
    return `${match[1]} (${detail})`
  }
  if (module.functions > 0) return `Source code (${module.files} files, ${module.functions} functions)`
  return `Project files (${module.files} file${plural(module.files)})`
}

function modulesOf(facts: ProjectFacts): ModuleView[] {
  const summaries = facts.insights?.moduleSummaries
  const views: ModuleView[] =
    summaries && summaries.length > 0
      ? summaries.map((s) => ({
          name: s.name,
          files: s.files,
          functions: s.functions,
          keyFiles: s.topFiles ?? [],
          importsFrom: s.importsFrom ?? [],
          symbols: s.symbols ?? [],
        }))
      : (facts.modules ?? []).map((m) => ({
          name: m.name,
          files: m.files,
          functions: m.functions,
          keyFiles: [],
          importsFrom: [],
          symbols: [],
        }))

  return views.sort((a, b) => b.functions - a.functions || b.files - a.files)
}

function keyFilesFor(module: ModuleView, facts: ProjectFacts): string[] {
  if (module.keyFiles.length > 0) return module.keyFiles.slice(0, 5)
  const excerpts = facts.insights?.excerpts ?? []
  return excerpts
    .filter((e) => (e.path.includes('/') ? e.path.slice(0, e.path.indexOf('/')) : '(root)') === module.name)
    .map((e) => e.path)
    .slice(0, 5)
}

function buildPurpose(facts: ProjectFacts): string {
  const repo = facts.repo
  const description = cleanText(repo.description)
  const stack = [facts.stack.frontend, facts.stack.backend, facts.stack.data].filter(Boolean) as string[]
  const primary = facts.languages[0]?.name
  const sentences: string[] = []

  const looksLikeBadgeJunk = description.length < 20 || /shields\.io|badge|build status/i.test(description)
  if (description && !looksLikeBadgeJunk) {
    sentences.push(/[.!?]$/.test(description) ? description : `${description}.`)
  } else {
    const name = repo.name || repo.fullName
    if (stack.length > 0) sentences.push(`${name} is ${withArticle(stack.join(' + '))} project.`)
    else if (primary) sentences.push(`${name} is a ${primary} project.`)
    else sentences.push(`${name} is a software repository.`)
  }

  if (stack.length > 0) sentences.push(`It is built with ${joinWithAnd(stack)}.`)

  if (repo.sourceFiles > 0) {
    sentences.push(
      `It contains ${repo.files} files, including ${repo.sourceFiles} source files with ${repo.functions} function${plural(repo.functions)} and ${repo.classes} ${plural(repo.classes, 'class', 'classes')}.`
    )
  } else {
    sentences.push(
      `The analysis found ${repo.files} files but no conventional application source, so the repository is likely documentation-, asset- or configuration-focused.`
    )
  }

  return sentences.slice(0, 3).join(' ')
}

function buildWhatItDoes(facts: ProjectFacts, modules: ModuleView[]): string {
  const insights = facts.insights
  const routes = insights?.routes ?? []
  const models = insights?.models ?? []
  const repo = facts.repo

  if (repo.sourceFiles === 0) {
    return 'No executable application logic was detected, so there is no request or data flow to trace from source. The repository\'s value is in its documentation and supporting files.'
  }

  const parts: string[] = []

  if (routes.length > 0) {
    const sample = routes
      .slice(0, 4)
      .map((r) => `${r.method} ${r.path}${r.line ? ` (${r.file}:${r.line})` : ''}`)
      .join(', ')
    parts.push(`exposes ${routes.length} HTTP route${plural(routes.length)} (${sample}${routes.length > 4 ? ', …' : ''})`)
  }

  if (models.length > 0) {
    const sample = models
      .slice(0, 4)
      .map((m) => `${m.name}${m.line ? ` (${m.file}:${m.line})` : ''}`)
      .join(', ')
    parts.push(`defines ${models.length} data model${plural(models.length)} (${sample}${models.length > 4 ? ', …' : ''})`)
  }

  const active = modules.filter((m) => m.name !== '(root)' && m.functions > 0).slice(0, 4)
  if (active.length === 1) {
    parts.push(`organizes its logic primarily in the ${prettyModule(active[0].name)} module`)
  } else if (active.length > 1) {
    parts.push(
      `organizes its logic into ${active.length} active modules — ${joinWithAnd(active.map((m) => prettyModule(m.name)))}`
    )
  }

  if (parts.length === 0) {
    parts.push(`contains ${repo.sourceFiles} source files with ${repo.functions} function${plural(repo.functions)}`)
  }

  return `The codebase ${joinWithAnd(parts)}.`
}

function buildArchitecture(facts: ProjectFacts, modules: ModuleView[]): DeepAnalysis['architecture'] {
  return modules.slice(0, 8).map((m) => ({
    component: prettyModule(m.name),
    responsibility: roleFor(m),
    connectsTo: m.importsFrom.map(prettyModule).slice(0, 8),
    files: keyFilesFor(m, facts).slice(0, 3),
  }))
}

/** Follow resolved AST call edges from a route handler into the code it runs. */
function calleeSteps(facts: ProjectFacts, route: CodeRoute): DeepAnalysis['dataFlow'] {
  if (!route.handler || !route.line) return []
  const calls = facts.insights?.calls ?? []
  const id = `${route.file}:${route.line}:${route.handler}`
  const outgoing = calls.filter((c) => c.from === id)
  if (outgoing.length === 0) return []

  const names = outgoing.map((c) => {
    const parts = c.to.split(':')
    return `${parts.slice(2).join(':')} (${parts[0]}:${parts[1]})`
  })

  return [
    {
      step: `${route.handler} calls ${outgoing.length} symbol${plural(outgoing.length)}`,
      detail: names.slice(0, 6).join(', ') + (names.length > 6 ? ', …' : ''),
      files: outgoing.slice(0, 6).map((c) => {
        const parts = c.to.split(':')
        return `${parts[0]}:${parts[1]}`
      }),
    },
  ]
}

function buildDataFlow(facts: ProjectFacts): DeepAnalysis['dataFlow'] {
  const insights = facts.insights
  const routes = insights?.routes ?? []
  const steps: DeepAnalysis['dataFlow'] = []

  if (routes.length > 0) {
    if (facts.stack.frontend) {
      steps.push({
        step: 'Client request',
        detail: `The ${facts.stack.frontend} frontend calls the API over HTTP.`,
        files: facts.entryPoints.slice(0, 3),
      })
    }

    // Group routes by their handler file, preserving order, so the flow shows
    // the request → handler hop and then the real cross-file calls we resolved.
    const byFile = new Map<string, CodeRoute[]>()
    for (const route of routes) {
      const existing = byFile.get(route.file)
      if (existing) existing.push(route)
      else byFile.set(route.file, [route])
    }

    for (const [file, entries] of [...byFile.entries()].slice(0, 6)) {
      const refs = entries.slice(0, 4).map(
        (r) =>
          `${r.method} ${r.path}${r.line ? ` (${file}:${r.line})` : ''}${r.handler ? ` → ${r.handler}()` : ''}`
      )
      steps.push({
        step: `${entries.length} route${plural(entries.length)} in ${file}`,
        detail: refs.join('; ') + (entries.length > 4 ? '; …' : ''),
        files: entries.slice(0, 6).map((r) => (r.line ? `${file}:${r.line}` : file)),
      })

      for (const entry of entries.slice(0, 2)) {
        steps.push(...calleeSteps(facts, entry))
      }
      if (steps.length >= 12) break
    }
    return steps.slice(0, 12)
  }

  if (facts.entryPoints.length > 0) {
    steps.push({
      step: 'Application entry',
      detail: 'Execution begins at the detected entry point(s).',
      files: facts.entryPoints.slice(0, 6),
    })
  }

  const { frontend, backend, data } = facts.stack
  if (frontend) steps.push({ step: 'Frontend', detail: `User interface built with ${frontend}.`, files: [] })
  if (backend) steps.push({ step: 'Backend', detail: `Server-side logic built with ${backend}.`, files: [] })
  if (data) steps.push({ step: 'Data', detail: `Persistence handled with ${data}.`, files: [] })

  return steps
}

function buildDomainModel(facts: ProjectFacts): DeepAnalysis['domainModel'] {
  const models = facts.insights?.models ?? []
  const names = new Set(models.map((m) => m.name))

  return models.slice(0, 12).map((model) => {
    const fields = model.fields ?? []
    const relations: string[] = []
    for (const field of fields) {
      const [fieldName, rawType] = field.split(':')
      const baseType = (rawType ?? '').trim().replace(/[[\]?]/g, '').split(/[<\s|]/)[0]
      if (baseType && baseType !== model.name && names.has(baseType)) {
        relations.push(`${fieldName.trim()} → ${baseType}`)
      }
    }
    return { entity: model.name, fields, relations, file: model.file, line: model.line }
  })
}

function buildKeyModules(facts: ProjectFacts, modules: ModuleView[]): DeepAnalysis['keyModules'] {
  return modules
    .filter((m) => m.files > 0)
    .slice(0, 6)
    .map((m) => ({
      name: prettyModule(m.name),
      role: roleFor(m),
      keyFiles: keyFilesFor(m, facts),
      symbols: m.symbols.slice(0, 8),
    }))
}

function buildTechStack(facts: ProjectFacts): DeepAnalysis['techStack'] {
  const out: DeepAnalysis['techStack'] = []
  const seen = new Set<string>()
  const add = (name: string | null | undefined, role: string, why: string) => {
    if (!name) return
    const key = name.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    out.push({ name, role, why })
  }

  add(facts.stack.frontend, 'Frontend', 'Detected from dependencies and frontend file evidence.')
  add(facts.stack.backend, 'Backend', 'Detected from dependencies and server-side file evidence.')
  add(facts.stack.data, 'Data', 'Detected from dependencies and data-access evidence.')

  for (const dep of facts.keyDependencies.slice(0, 10)) {
    add(dep, 'Dependency', 'Declared in the project manifest.')
  }

  const primary = facts.languages[0]
  if (primary) add(primary.name, 'Primary language', `${primary.percent}% of analyzed code.`)

  return out.slice(0, 15)
}

function buildHowToRun(facts: ProjectFacts): string[] {
  const config = facts.insights?.config
  const steps: string[] = []

  const scripts = new Map<string, string>()
  for (const entry of config?.scripts ?? []) {
    const separator = entry.indexOf(': ')
    if (separator > 0) scripts.set(entry.slice(0, separator), entry.slice(separator + 2))
  }

  if (scripts.size > 0) {
    steps.push('Install dependencies with your package manager (for example `npm install`).')
    const priority = ['dev', 'start', 'build', 'test', 'lint']
    const matched = priority.filter((key) => scripts.has(key))
    for (const key of matched) steps.push(`\`npm run ${key}\` — ${scripts.get(key)}`)
    if (matched.length === 0) {
      const [key, value] = [...scripts.entries()][0]
      steps.push(`\`npm run ${key}\` — ${value}`)
    }
  }

  if (config?.composeServices?.length) {
    steps.push(`Start the backing services with \`docker compose up\` (${config.composeServices.join(', ')}).`)
  }

  if (config?.hasMakefile) {
    steps.push('Run the repository tasks through `make` (a Makefile is present).')
  }

  if (config?.hasDockerfile) {
    steps.push('Build the container image from the included Dockerfile.')
  }

  if (steps.length === 0) {
    steps.push('No runnable scripts or container configuration were detected; consult the project README.')
  }

  return steps
}

function buildOnboarding(facts: ProjectFacts, modules: ModuleView[]): string[] {
  const steps: string[] = []

  for (const entry of facts.entryPoints.slice(0, 3)) {
    const symbol = facts.insights?.symbols?.find(
      (s) => s.file === entry && (s.exported || s.kind === 'component' || s.name === 'default')
    )
    steps.push(`Start at ${entry}${symbol ? `:${symbol.line}` : ''} — a detected application entry point.`)
  }

  for (const mod of modules.filter((m) => m.name !== '(root)').slice(0, 3)) {
    const detail = `${mod.files} file${plural(mod.files)}${mod.functions ? `, ${mod.functions} function${plural(mod.functions)}` : ''}`
    const symbols = mod.symbols.slice(0, 3).join(', ')
    steps.push(
      `Explore the ${prettyModule(mod.name)} module (${detail})${symbols ? `; key symbols: ${symbols}` : ''}.`
    )
  }

  if (steps.length === 0) {
    steps.push('Start with the project README, then read the largest source files.')
  }

  return steps
}

function buildStrengths(facts: ProjectFacts, modules: ModuleView[]): string[] {
  const out: string[] = []
  const routes = facts.insights?.routes?.length ?? 0
  const models = facts.insights?.models?.length ?? 0

  if (facts.tests > 0) out.push(`Ships ${facts.tests} test file${plural(facts.tests)}, giving the project some safety net.`)
  if (facts.lowComplexityPct >= 70) out.push(`${facts.lowComplexityPct}% of functions are low-complexity, suggesting readable control flow.`)
  if (facts.totalDependencies > 0 && facts.dependencyHealth.vulnerable === 0 && facts.dependencyHealth.review === 0) {
    out.push(`All ${facts.totalDependencies} dependencies are healthy by the analyzer's checks.`)
  }
  if (modules.length >= 3) out.push(`Code is split across ${modules.length} top-level modules rather than a single flat directory.`)
  if (routes > 0) out.push(`Exposes ${routes} HTTP route${plural(routes)}, so the public surface is explicit.`)
  if (models > 0) out.push(`Defines ${models} data model${plural(models)}, which documents the domain structure.`)
  if (facts.readmeExcerpt) out.push('Includes a README that explains the project.')

  const git = facts.insights?.git
  if (git?.commitCount && git.commitCount > 0) {
    const contributors = git.contributors?.length ?? 0
    out.push(
      `${git.commitCount} commit${plural(git.commitCount)} of history are available${
        contributors ? ` from ${contributors} contributor${plural(contributors)}` : ''
      }.`
    )
  }

  return out.slice(0, 7)
}

function buildRisks(facts: ProjectFacts): string[] {
  const out: string[] = []
  const routes = facts.insights?.routes?.length ?? 0

  if (facts.repo.sourceFiles === 0) {
    out.push('No conventional source files were detected; the analyzer cannot trace application behaviour.')
  }
  if (facts.tests === 0 && facts.repo.sourceFiles > 0) out.push('No tests were detected, so regressions may go unnoticed.')
  if (facts.weakStructure) out.push('The project has no conventional folder layout, making navigation harder.')
  if (facts.lowComplexityPct < 50 && facts.repo.sourceFiles > 0) {
    out.push(`A notable share of functions are high-complexity (only ${facts.lowComplexityPct}% are low-complexity).`)
  }
  if (facts.dependencyHealth.vulnerable > 0) out.push(`${facts.dependencyHealth.vulnerable} dependencies are flagged as vulnerable.`)
  if (facts.dependencyHealth.review > 0) out.push(`${facts.dependencyHealth.review} dependencies need version review.`)
  if (!facts.readmeExcerpt) out.push('No README was detected, so setup and intent are undocumented.')
  if (routes === 0 && facts.stack.backend && facts.repo.sourceFiles > 0) {
    out.push('No HTTP routes were detected despite a backend stack; the service surface may be undocumented.')
  }

  const topHotspot = facts.insights?.git?.hotspots?.[0]
  if (topHotspot) {
    out.push(
      `The most frequently changed file is ${topHotspot.file} (${topHotspot.commits} commit${
        plural(topHotspot.commits)
      }), so it may be the most fragile area.`
    )
  }

  return out.slice(0, 7)
}

/**
 * Build a source-grounded report from the deterministic facts. Pure and cheap;
 * safe to call on every request.
 */
export function buildDeterministicReport(facts: ProjectFacts, generatedAt = new Date().toISOString()): DeepAnalysis {
  const modules = modulesOf(facts)

  return {
    purpose: buildPurpose(facts),
    whatItDoes: buildWhatItDoes(facts, modules),
    architecture: buildArchitecture(facts, modules),
    dataFlow: buildDataFlow(facts),
    domainModel: buildDomainModel(facts),
    keyModules: buildKeyModules(facts, modules),
    techStack: buildTechStack(facts),
    howToRun: buildHowToRun(facts),
    onboarding: buildOnboarding(facts, modules),
    strengths: buildStrengths(facts, modules),
    risks: buildRisks(facts),
    hotspots: facts.insights?.git?.hotspots?.slice(0, 8),
    contributors: facts.insights?.git?.contributors?.slice(0, 6),
    commitCount: facts.insights?.git?.commitCount ?? null,
    totalDependencies: facts.totalDependencies,
    dependencyHealth: facts.dependencyHealth,
    model: 'static analysis',
    generatedAt,
    source: 'deterministic',
  }
}
