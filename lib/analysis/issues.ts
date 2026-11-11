import 'server-only'

import type { Issue, Severity } from '@/lib/types'
import { buildCodeReport } from './code'
import type { AnalysisBundle } from './types'

/**
 * Aggregates the real findings computed elsewhere in the pipeline into the flat
 * issue list the Issues page renders. Each issue keeps a `refId` that points at
 * the underlying finding (security/complexity id, or a dependency name) so the
 * detail page can resolve the exact evidence from the same cached bundle.
 *
 * Nothing here reads sample data: the list is derived from the cloned source.
 */

const SEVERITY_ORDER: Record<Severity, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 }

export function buildIssues(bundle: AnalysisBundle): Issue[] {
  const issues: Issue[] = []

  for (const finding of bundle.security ?? []) {
    issues.push({
      id: `sec:${finding.id}`,
      severity: finding.severity,
      title: finding.title,
      file: finding.file,
      line: finding.line,
      category: 'Security',
      status: 'Open',
      kind: 'security',
      refId: finding.id,
    })
  }

  for (const finding of buildCodeReport(bundle).findings) {
    issues.push({
      id: `cx:${finding.id}`,
      severity: finding.status,
      title: `High complexity in ${finding.functionName}`,
      file: finding.file,
      line: finding.line,
      category: 'Complexity',
      status: 'Open',
      kind: 'complexity',
      refId: finding.id,
    })
  }

  for (const dep of bundle.dependencies ?? []) {
    if (dep.status === 'healthy') continue
    issues.push({
      id: `dep:${dep.name}`,
      severity: dep.status === 'vulnerable' ? 'High' : 'Medium',
      title:
        dep.status === 'vulnerable'
          ? `Known vulnerability in ${dep.name}`
          : `Review: ${dep.name} version range`,
      file: dep.manifest ?? 'manifest',
      line: 1,
      category: 'Dependencies',
      status: 'Open',
      kind: 'dependency',
      refId: dep.name,
    })
  }

  return issues.sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      a.category.localeCompare(b.category) ||
      a.file.localeCompare(b.file) ||
      a.line - b.line
  )
}
