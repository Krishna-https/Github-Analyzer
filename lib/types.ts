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

export interface FileTreeNode {
  type: 'file' | 'dir'
  name: string
}