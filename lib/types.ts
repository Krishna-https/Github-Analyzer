export type Severity = 'Critical' | 'High' | 'Medium' | 'Low'
export type IssueStatus = 'Open' | 'Reviewed' | 'Fixed'

export type IssueCategory =
  | 'Security'
  | 'Complexity'
  | 'Maintainability'
  | 'Dependencies'
  | 'Code Quality'

export interface LanguageShare {
  name: string
  percent: number
  color: string
}

export interface Repository {
  owner: string
  name: string
  fullName: string
  description: string
  url: string
  branch: string
  stars: number
  forks: number
  openIssues: number
  files: number
  sourceFiles: number
  functions: number
  classes: number
  modules: number
  dependencies: number
  tests: number
  languages: LanguageShare[]
  lastCommit: string
  license: string
}

export interface AnalysisStep {
  id: string
  label: string
  detail: string
}

export interface ModuleRecord {
  id: string
  name: string
  description: string
  files: number
  functions: number
  icon: string
  keyFiles: string[]
  responsibilities: string[]
  dependsOn: string[]
}

export interface ArchitectureNode {
  id: string
  label: string
  layer: string
  subtitle: string
  files: number
  functions: number
  responsibilities: string[]
  dependencies: string[]
  description: string
}

export type FunctionStatus = 'Good' | 'Moderate' | 'Needs Review' | 'High' | 'Critical'

export interface FunctionRecord {
  name: string
  file: string
  lines: number
  complexity: number
  calls: number
  status: FunctionStatus
  module: string
}

export interface ComplexityBucket {
  name: string
  count: number
  color: string
}

export interface CodeSnippet {
  startLine: number
  highlight: number[]
  lines: string[]
}

export interface ComplexityFinding {
  id: string
  functionName: string
  file: string
  line: number
  lineCount: number
  cyclomatic: number
  nestingDepth: number
  status: 'High' | 'Critical'
  reason: string
  suggestion: string
  ruleId: string
  snippet: CodeSnippet
}

export interface SecurityFinding {
  id: string
  severity: Severity
  ruleId: string
  title: string
  file: string
  line: number
  evidence: string[]
  explanation: string
  solution: string
  snippet: CodeSnippet
  fixedSnippet?: CodeSnippet
}

export interface DependencyRecord {
  name: string
  version: string
  category: string
  status: 'healthy' | 'review' | 'vulnerable'
  reason?: string
}

export interface Issue {
  id: string
  severity: Severity
  title: string
  file: string
  line: number
  category: IssueCategory
  status: IssueStatus
  kind: 'security' | 'complexity' | 'dependency' | 'quality'
  refId: string
}

export interface EvidenceItem {
  icon: string
  description: string
  type: string
  confidence: 'High' | 'Medium' | 'Low'
}

export interface Rule {
  id: string
  name: string
  category: 'Security' | 'Quality' | 'Architecture'
  severity: Severity
  condition: string
  detected: number
  description: string
  example: string
}

export interface SourceFile {
  path: string
  module: string
  language: string
  lines: number
  functions: number
  imports: number
  usedBy: string[]
  calls: string[]
  issues: number
  content: string[]
}

/** A file read back out of a runner container by /api/file. */
export interface RealFileContent {
  path: string
  language: string
  lines: number
  bytes: number
  truncated: boolean
  content: string[]
}

export interface FindingDetailPayload {
  id: string
  title: string
  severity: Severity
  file: string
  line: number
  category: IssueCategory
  label: string
  account: string[]
  reason: string[]
  fix: { label: string; code: CodeSnippet }
}

/**
 * Real analysis results served by /api/analysis for a cloned runner container.
 * Everything the Overview page renders comes out of one bundle that the server
 * computes once and caches keyed by containerId (invalidated when HEAD moves).
 */
export interface AnalysisOverview {
  repository: Repository
  languages: LanguageShare[]
  evidence: EvidenceItem[]
  complexityBuckets: ComplexityBucket[]
  dependencyHealth: { healthy: number; review: number; vulnerable: number }
  /** Plain-language summary bullet points ("the repo in simple words"). */
  summary: string[]
  /** Short evidence strings behind the summary, e.g. "React frontend detected". */
  detectedBy: string[]
  /** True when the repo has no conventional folder layout; modules were classified by content. */
  weakStructure: boolean
  /** Stat labels that cannot come from a clone (e.g. Stars) — display as N/A. */
  statsUnavailable: string[]
  computedAt: string
}