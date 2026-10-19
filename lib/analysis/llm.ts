import 'server-only'

import type { DeepAnalysis, RepoNarrative } from '@/lib/types'
import type { ProjectFacts } from './types'

/**
 * LLM-backed deep analysis.
 *
 * Unlike the original narrative, this is fed the full {@link CodeInsights}
 * payload — import graph, HTTP routes, data models, config and selected file
 * excerpts — so it can describe how the project actually works rather than just
 * restating aggregate counts. It consumes exactly the same {@link ProjectFacts}
 * the deterministic summary uses, so no heuristic is duplicated.
 *
 * The pipeline never depends on it: when no provider is configured, the call
 * fails, or the response is malformed, callers fall back to the template summary
 * and the Deep Analysis page shows an "unavailable" state.
 *
 * Configure one of:
 *   ANTHROPIC_API_KEY (+ optional LLM_MODEL, ANTHROPIC_BASE_URL)
 *   OPENAI_API_KEY / LLM_API_KEY (+ optional LLM_MODEL, LLM_BASE_URL / OPENAI_BASE_URL)
 */

interface Provider {
  kind: 'anthropic' | 'openai'
  apiKey: string
  baseUrl: string
  model: string
}

const REQUEST_TIMEOUT_MS = 60_000

function resolveProvider(): Provider | null {
  const base = (process.env.LLM_BASE_URL ?? '').replace(/\/$/, '')

  if (process.env.ANTHROPIC_API_KEY) {
    return {
      kind: 'anthropic',
      apiKey: process.env.ANTHROPIC_API_KEY,
      baseUrl: (process.env.ANTHROPIC_BASE_URL || base || 'https://api.anthropic.com').replace(/\/$/, ''),
      model: process.env.LLM_MODEL || 'claude-3-5-haiku-latest',
    }
  }

  const openAiKey = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY
  if (openAiKey) {
    return {
      kind: 'openai',
      apiKey: openAiKey,
      baseUrl: (process.env.OPENAI_BASE_URL || base || 'https://api.openai.com/v1').replace(/\/$/, ''),
      model: process.env.LLM_MODEL || 'gpt-4o-mini',
    }
  }

  return null
}

/** True when a provider is configured; lets callers skip the work entirely. */
export function isLlmEnabled(): boolean {
  return resolveProvider() !== null
}

/** Aggregate fine-grained file imports up to module-to-module edges. */
function moduleEdges(facts: ProjectFacts): string[] {
  const moduleOf = (p: string) => (p.includes('/') ? p.slice(0, p.indexOf('/')) : '(root)')
  const seen = new Set<string>()
  for (const edge of facts.insights.imports) {
    const from = moduleOf(edge.from)
    const to = moduleOf(edge.to)
    if (from !== to) seen.add(`${from} → ${to}`)
  }
  return [...seen].slice(0, 40)
}

/** The JSON-safe projection of the facts sent to the model. */
function factsPayload(facts: ProjectFacts) {
  const { insights } = facts
  return {
    repository: {
      fullName: facts.repo.fullName,
      description: facts.repo.description,
      license: facts.repo.license,
      branch: facts.repo.branch,
      lastCommit: facts.repo.lastCommit,
    },
    languages: facts.languages.map((l) => `${l.name} ${l.percent}%`),
    detectedStack: facts.stack,
    evidence: facts.evidence.map((e) => `${e.description} (${e.confidence} confidence)`),
    counts: {
      files: facts.repo.files,
      sourceFiles: facts.repo.sourceFiles,
      functions: facts.repo.functions,
      classes: facts.repo.classes,
      tests: facts.tests,
      dependencies: facts.totalDependencies,
    },
    quality: {
      lowComplexityPct: facts.lowComplexityPct,
      dependencyHealth: facts.dependencyHealth,
      weakStructure: facts.weakStructure,
    },
    topLevelDirs: facts.topLevelDirs,
    entryPoints: facts.entryPoints,
    keyDependencies: facts.keyDependencies,
    moduleSummaries: insights.moduleSummaries.slice(0, 20),
    moduleImportGraph: moduleEdges(facts),
    fileImports: insights.imports.slice(0, 60).map((e) => `${e.from} → ${e.to}`),
    routes: insights.routes.map((r) => `${r.method} ${r.path} (${r.file})`),
    models: insights.models.map((m) => ({ name: m.name, kind: m.kind, file: m.file, fields: m.fields })),
    config: insights.config,
    readmeExcerpt: facts.readmeExcerpt,
    fileExcerpts: insights.excerpts.map((e) => ({
      path: e.path,
      reason: e.reason,
      truncated: e.truncated,
      content: e.content,
    })),
  }
}

const SYSTEM_PROMPT = [
  'You are a principal engineer producing a deep, factual analysis of a repository for another engineer.',
  'You are given facts from a static analysis: an import graph, HTTP routes, data models, config and excerpts of the most important files.',
  'Goal: explain things NOT visible on the repository page — how the system actually works, how requests flow, the domain model, how modules relate, and where risk concentrates.',
  'Rules:',
  '- Ground every statement in the provided facts or excerpts. Never invent features, endpoints, entities, or files.',
  '- When you reference a file, use its exact path from the facts.',
  '- Prefer specifics (module names, route paths, entity fields) over generic description.',
  '- If evidence is thin, say less rather than guessing.',
  'Respond with a single JSON object and nothing else, matching exactly this shape:',
  '{"purpose":string,"whatItDoes":string,"architecture":[{"component":string,"responsibility":string,"connectsTo":string[]}],"dataFlow":[{"step":string,"detail":string,"files":string[]}],"domainModel":[{"entity":string,"fields":string[],"relations":string[]}],"keyModules":[{"name":string,"role":string,"keyFiles":string[]}],"techStack":[{"name":string,"role":string,"why":string}],"howToRun":string[],"onboarding":string[],"strengths":string[],"risks":string[]}',
  'Field guidance:',
  '- purpose: 2-4 sentences on what the project is for.',
  '- whatItDoes: 1 paragraph on the concrete capability, grounded in routes/models/modules.',
  '- architecture: the main components/layers, each with its responsibility and what it talks to (3-8 items).',
  '- dataFlow: the request/data lifecycle as ordered steps, each naming the files involved (3-8 steps).',
  '- domainModel: the real entities and their key fields and relations, from the models/schemas (0-10 items).',
  '- keyModules: the most important modules, each with its role and key files.',
  '- techStack: notable technologies and why they are inferred to be used.',
  '- howToRun: how to install/run/test, derived from scripts and config (project-specific).',
  '- onboarding: where a new contributor should start reading.',
  '- strengths / risks: grounded observations, especially anything the GitHub page hides.',
].join('\n')

const MAX_TOKENS = 3000

/** Pull a JSON object out of a model reply that may be wrapped in prose/fences. */
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = (fenced ? fenced[1] : text).trim()
  try {
    return JSON.parse(candidate)
  } catch {
    const start = candidate.indexOf('{')
    const end = candidate.lastIndexOf('}')
    if (start === -1 || end <= start) return null
    try {
      return JSON.parse(candidate.slice(start, end + 1))
    } catch {
      return null
    }
  }
}

/* ------------------------------------------------------------------ */
/* Validation — coerce the model output into a well-formed report.     */
/* ------------------------------------------------------------------ */

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function stringList(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return []
  return value.map(asString).filter(Boolean).slice(0, limit)
}

function asRecordList<T>(value: unknown, limit: number, map: (o: Record<string, unknown>) => T | null): T[] {
  if (!Array.isArray(value)) return []
  const out: T[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const mapped = map(item as Record<string, unknown>)
    if (mapped) out.push(mapped)
    if (out.length >= limit) break
  }
  return out
}

function toDeepAnalysis(raw: unknown, model: string): DeepAnalysis | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>

  const purpose = asString(obj.purpose)
  if (!purpose) return null

  return {
    purpose,
    whatItDoes: asString(obj.whatItDoes),
    architecture: asRecordList(obj.architecture, 10, (o) => {
      const component = asString(o.component)
      return component ? { component, responsibility: asString(o.responsibility), connectsTo: stringList(o.connectsTo, 10) } : null
    }),
    dataFlow: asRecordList(obj.dataFlow, 10, (o) => {
      const step = asString(o.step)
      return step ? { step, detail: asString(o.detail), files: stringList(o.files, 10) } : null
    }),
    domainModel: asRecordList(obj.domainModel, 12, (o) => {
      const entity = asString(o.entity)
      return entity ? { entity, fields: stringList(o.fields, 20), relations: stringList(o.relations, 10) } : null
    }),
    keyModules: asRecordList(obj.keyModules, 15, (o) => {
      const name = asString(o.name)
      return name ? { name, role: asString(o.role), keyFiles: stringList(o.keyFiles, 10) } : null
    }),
    techStack: asRecordList(obj.techStack, 15, (o) => {
      const name = asString(o.name)
      return name ? { name, role: asString(o.role), why: asString(o.why) } : null
    }),
    howToRun: stringList(obj.howToRun, 10),
    onboarding: stringList(obj.onboarding, 10),
    strengths: stringList(obj.strengths, 8),
    risks: stringList(obj.risks, 8),
    model,
    generatedAt: new Date().toISOString(),
  }
}

/** A concise RepoNarrative projected from the full report for the Overview card. */
export function projectNarrative(report: DeepAnalysis): RepoNarrative {
  const howItWorks = report.dataFlow
    .slice(0, 6)
    .map((s) => (s.detail ? `${s.step}: ${s.detail}` : s.step))
  if (howItWorks.length === 0) {
    howItWorks.push(...report.keyModules.slice(0, 5).map((m) => (m.role ? `${m.name}: ${m.role}` : m.name)))
  }
  return {
    purpose: report.purpose,
    howItWorks,
    architecture: report.architecture.map((a) => a.component).slice(0, 8),
    strengths: report.strengths,
    risks: report.risks,
    model: report.model,
    generatedAt: report.generatedAt,
  }
}

/* ------------------------------------------------------------------ */
/* Provider calls                                                      */
/* ------------------------------------------------------------------ */

async function callOpenAi(provider: Provider, user: string, signal: AbortSignal): Promise<string | null> {
  const res = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: 'POST',
    cache: 'no-store',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model: provider.model,
      temperature: 0.2,
      max_tokens: MAX_TOKENS,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: user },
      ],
    }),
  })
  if (!res.ok) {
    console.warn(`deep analysis: openai-compatible HTTP ${res.status}`)
    return null
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  return json.choices?.[0]?.message?.content ?? null
}

async function callAnthropic(provider: Provider, user: string, signal: AbortSignal): Promise<string | null> {
  const res = await fetch(`${provider.baseUrl}/v1/messages`, {
    method: 'POST',
    cache: 'no-store',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': provider.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: provider.model,
      max_tokens: MAX_TOKENS,
      temperature: 0.2,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: user }],
    }),
  })
  if (!res.ok) {
    console.warn(`deep analysis: anthropic HTTP ${res.status}`)
    return null
  }
  const json = (await res.json()) as { content?: Array<{ type?: string; text?: string }> }
  return json.content?.find((c) => c.type === 'text')?.text ?? null
}

/**
 * Generate the full deep-analysis report, or null when no provider is
 * configured or anything goes wrong. Never throws.
 */
export async function generateDeepAnalysis(facts: ProjectFacts): Promise<DeepAnalysis | null> {
  const provider = resolveProvider()
  if (!provider) return null

  const user = `Repository facts (JSON):\n${JSON.stringify(
    factsPayload(facts)
  )}\n\nProduce the deep analysis JSON described in your instructions.`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const text =
      provider.kind === 'anthropic'
        ? await callAnthropic(provider, user, controller.signal)
        : await callOpenAi(provider, user, controller.signal)

    if (!text) return null
    return toDeepAnalysis(extractJson(text), provider.model)
  } catch (err) {
    console.warn('deep analysis failed:', err instanceof Error ? err.message : err)
    return null
  } finally {
    clearTimeout(timeout)
  }
}
