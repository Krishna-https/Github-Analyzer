import 'server-only'

import type { AnalysisOverview, Repository } from '@/lib/types'

/**
 * Template-based repo summary — deterministic and offline, built from the same
 * computed facts the evidence card shows. Each entry becomes one bullet point
 * on the Overview "Project Purpose" card. (An LLM-backed summary could later
 * consume the identical facts for richer prose; this keeps the UI working with
 * zero external calls.)
 */

export interface SummaryInput {
  repo: Repository
  languages: AnalysisOverview['languages']
  evidence: AnalysisOverview['evidence']
  modulesCount: number
  tests: number
  weakStructure: boolean
  dependencyHealth: AnalysisOverview['dependencyHealth']
  totalDependencies: number
  lowComplexityPct: number
}

function detected(evidence: { description: string }[], needle: RegExp): string | null {
  return evidence.find((e) => needle.test(e.description))?.description ?? null
}

export function buildSummary(input: SummaryInput): { summary: string[]; detectedBy: string[] } {
  const { repo, languages, evidence } = input
  const points: string[] = []
  const detectedBy = evidence.map((e) => e.description)

  const topLang = languages[0]
  const langText = topLang ? `Written primarily in ${topLang.name} (${topLang.percent}%).` : 'No recognized source languages found.'

  const react = detected(evidence, /React|Frontend|frontend/)
  const api = detected(evidence, /API|api/)
  const db = detected(evidence, /integration|Data layer/i)

  // 1. What kind of project this is.
  const appKinds: string[] = []
  if (detected(evidence, /React frontend/)) appKinds.push('a React frontend')
  else if (detected(evidence, /frontend/i)) appKinds.push('a frontend codebase')
  if (detected(evidence, / API detected/)) appKinds.push('a backend API')
  else if (evContains(evidence, 'Backend service detected')) appKinds.push('a backend service')
  if (db) appKinds.push('a data layer')

  if (appKinds.length === 1) {
    points.push(`This repository contains ${appKinds[0]}.`)
  } else if (appKinds.length > 1) {
    const last = appKinds.pop()!
    points.push(`This repository contains ${appKinds.join(', ')} and ${last}.`)
  } else if (detected(evidence, /Static website/)) {
    points.push('This repository is a static website.')
  } else if (topLang) {
    points.push(`This repository is a ${topLang.name} codebase.`)
  } else {
    points.push('This repository contains source code.')
  }

  // 2. Scale and structure.
  points.push(
    `It contains ${repo.modules} module${repo.modules === 1 ? '' : 's'}, ${repo.sourceFiles} source file${repo.sourceFiles === 1 ? '' : 's'}, ${repo.functions} function${repo.functions === 1 ? '' : 's'} and ${repo.classes} class${repo.classes === 1 ? '' : 'es'}.`
  )

  // 3. Stack from evidence.
  const stack: string[] = []
  if (react) stack.push(react)
  if (api) stack.push(api)
  if (db) stack.push(db)
  if (stack.length > 0) {
    points.push(`Key stack: ${stack.join(' · ')}.`)
  } else {
    points.push(langText)
  }

  // 4. Quality: tests + complexity.
  if (input.tests === 0) {
    points.push('No automated tests were detected.')
  } else {
    points.push(`${input.tests} test file${input.tests === 1 ? '' : 's'} were detected.`)
  }
  points.push(`${input.lowComplexityPct}% of functions are low-complexity.`)

  // 5. Structure note.
  if (input.weakStructure) {
    points.push('The repository is not organized around conventional folders — modules were classified by file content.')
  }

  // 6. Dependencies.
  const { review } = input.dependencyHealth
  if (input.totalDependencies === 0) {
    points.push('No dependency manifests were found.')
  } else if (review === 0) {
    points.push(`${input.totalDependencies} dependencies were detected, all resolved.`)
  } else {
    points.push(`${input.totalDependencies} dependencies detected (${review} flagged for review).`)
  }

  return { summary: points.slice(0, 8), detectedBy: detectedBy.slice(0, 6) }
}

function evContains(evidence: { description: string }[], text: string): boolean {
  return evidence.some((e) => e.description === text)
}