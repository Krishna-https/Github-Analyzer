import 'server-only'

import type { ProjectFacts } from './types'

/**
 * Template-based repo summary — deterministic and offline, built from the same
 * structured facts the evidence card and the optional LLM narrative use. Each
 * entry becomes one bullet point on the Overview "Project Purpose" card.
 *
 * This reads `facts.stack` (named roles) rather than regex-matching the
 * human-readable evidence descriptions, so copy edits to evidence.ts can never
 * silently change the generated prose.
 */

/** Prefix a label with the correct indefinite article ("an Express backend"). */
function withArticle(label: string): string {
  return /^[aeiou]/i.test(label) ? `an ${label}` : `a ${label}`
}

function joinWithAnd(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

export function buildSummary(facts: ProjectFacts): { summary: string[]; detectedBy: string[] } {
  const { repo, languages, evidence, stack } = facts
  const points: string[] = []
  const detectedBy = evidence.map((e) => e.description)

  const topLang = languages[0]
  const langText = topLang
    ? `Written primarily in ${topLang.name} (${topLang.percent}%).`
    : 'No recognized source languages found.'

  /* Named roles, with a readable label each. */
  const roleLabels: string[] = []
  if (stack.frontend) {
    roleLabels.push(stack.frontend === 'Frontend' ? 'frontend application' : `${stack.frontend} frontend`)
  }
  if (stack.backend) {
    roleLabels.push(
      stack.backend === 'Backend'
        ? 'backend service'
        : stack.backend === 'Python'
          ? 'Python backend'
          : `${stack.backend} backend`
    )
  }
  if (stack.data) {
    roleLabels.push(stack.data === 'Database' ? 'data layer' : `${stack.data} data layer`)
  }

  // 1. What kind of project this is.
  if (roleLabels.length === 1) {
    points.push(`This repository is ${withArticle(roleLabels[0])}.`)
  } else if (roleLabels.length > 1) {
    points.push(`This repository combines ${joinWithAnd(roleLabels.map(withArticle))}.`)
  } else if (topLang) {
    points.push(`This repository is primarily a ${topLang.name} codebase.`)
  } else {
    points.push('This repository contains source code.')
  }

  // 2. Scale and structure.
  points.push(
    `It contains ${repo.modules} module${repo.modules === 1 ? '' : 's'}, ${repo.sourceFiles} source file${repo.sourceFiles === 1 ? '' : 's'}, ${repo.functions} function${repo.functions === 1 ? '' : 's'} and ${repo.classes} class${repo.classes === 1 ? '' : 'es'}.`
  )

  // 3. Stack from the detected roles.
  if (roleLabels.length > 0) {
    points.push(`Key stack: ${roleLabels.join(' · ')}.`)
  } else {
    points.push(langText)
  }

  // 4. Quality: tests + complexity.
  if (facts.tests === 0) {
    points.push('No automated tests were detected.')
  } else {
    points.push(`${facts.tests} test file${facts.tests === 1 ? '' : 's'} were detected.`)
  }
  points.push(`${facts.lowComplexityPct}% of functions are low-complexity.`)

  // 5. Structure note.
  if (facts.weakStructure) {
    points.push('The repository is not organized around conventional folders — modules were classified by file content.')
  }

  // 6. Dependencies.
  const { review } = facts.dependencyHealth
  if (facts.totalDependencies === 0) {
    points.push('No dependency manifests were found.')
  } else if (review === 0) {
    points.push(`${facts.totalDependencies} dependencies were detected, all resolved.`)
  } else {
    points.push(`${facts.totalDependencies} dependencies detected (${review} flagged for review).`)
  }

  return { summary: points.slice(0, 8), detectedBy: detectedBy.slice(0, 6) }
}
