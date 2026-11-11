import 'server-only'

import type {
  AnalysisOverview,
  ComplexityBucket,
  DeepAnalysis,
  DependencyRecord,
  EvidenceItem,
  LanguageShare,
  Repository,
  SecurityFinding,
} from '@/lib/types'

/* ------------------------------------------------------------------ */
/* Container dump contract                                            */
/* ------------------------------------------------------------------ */

export interface DumpContributor {
  name: string
  commits: number
}

/** Per-file change volume over the last N commits. */
export interface DumpChurn {
  file: string
  commits: number
  insertions: number
  deletions: number
}

export interface DumpGitInfo {
  remoteUrl: string | null
  branch: string | null
  headSha: string | null
  lastCommit: string | null
  lastCommitDate: string | null
  commitCount?: number | null
  contributors?: DumpContributor[]
}

export interface DumpFile {
  relPath: string
  size: number
  content?: string
  binary?: boolean
}

/** The single JSON document produced by analysis/dump.cjs inside the container. */
export interface AnalysisDump {
  repoDir: string
  repoExists: boolean
  git: DumpGitInfo
  files: DumpFile[]
  churn?: DumpChurn[]
  truncated: {
    content: boolean
    filesTotal?: number
    filesWithContent?: number
    contentBytes?: number
  }
}

/* ------------------------------------------------------------------ */
/* File classification                                                 */
/* ------------------------------------------------------------------ */

export type FileCategory =
  | 'frontend'
  | 'backend'
  | 'data'
  | 'test'
  | 'docs'
  | 'config'
  | 'utility'
  | 'unclassified'

export interface FileClassification {
  category: FileCategory
  confidence: EvidenceItem['confidence']
}

/* ------------------------------------------------------------------ */
/* Per-file parsing                                                    */
/* ------------------------------------------------------------------ */

export interface ParsedFile {
  relPath: string
  category: FileCategory
  language: string
  lines: number
  functions: number
  classes: number
  imports: number
  /** Raw import specifiers, used to build the internal dependency graph. */
  importSources?: string[]
  /** Declared function/class names (capped), for module summaries. */
  symbols?: string[]
  /** Per-function metrics (name, line, complexity, calls, nesting), capped. */
  functionDetails?: ParsedFunction[]
}

/** A detected function plus the metrics the Code Analysis page renders. */
export interface ParsedFunction {
  name: string
  line: number
  endLine: number
  lines: number
  complexity: number
  calls: number
  nesting: number
}

/* ------------------------------------------------------------------ */
/* Modules                                                             */
/* ------------------------------------------------------------------ */

export interface ModuleInfo {
  name: string
  files: number
  functions: number
  category: FileCategory | null
}

/* ------------------------------------------------------------------ */
/* Structured project facts                                            */
/* ------------------------------------------------------------------ */

/**
 * The named roles detected in a repository. These decouple the summary and the
 * LLM narrative from the human-readable evidence strings in evidence.ts, so a
 * change to a description can never silently alter the generated prose.
 */
export interface ProjectStack {
  frontend: string | null
  backend: string | null
  data: string | null
}

/* ------------------------------------------------------------------ */
/* Code insights (the raw material for deep analysis)                  */
/* ------------------------------------------------------------------ */

/** An import relationship between two files in the repo. */
export interface ImportEdge {
  from: string
  to: string
  /** 1-based line of the import statement, when known. */
  line?: number
}

/** A detected HTTP route / page. */
export interface CodeRoute {
  method: string
  path: string
  file: string
  /** 1-based line of the handler/registration, when known. */
  line?: number
  /** Handler symbol name (e.g. `GET`, `createUser`), when known. */
  handler?: string
}

/** A detected data model / schema entity. */
export interface CodeModel {
  name: string
  kind: string
  file: string
  fields: string[]
  /** 1-based line where the model is declared, when known. */
  line?: number
}

export type CodeSymbolKind = 'function' | 'class' | 'method' | 'component' | 'const'

/** A declared symbol with an exact source location (from the AST pass). */
export interface CodeSymbol {
  name: string
  kind: CodeSymbolKind
  file: string
  line: number
  endLine?: number
  exported?: boolean
  /** Callee names found inside this symbol's body (unresolved). */
  calls?: string[]
}

/** A resolved call edge between two declared symbols. */
export interface CallEdge {
  /** `${file}:${line}:${name}` of the caller. */
  from: string
  /** `${file}:${line}:${name}` of the callee. */
  to: string
  file: string
  line: number
}

/** A file ranked by change volume and code size. */
export interface Hotspot {
  file: string
  commits: number
  insertions: number
  deletions: number
  score: number
}

/** Repository history signals derived from the container's git metadata. */
export interface GitInsights {
  commitCount: number | null
  contributors: DumpContributor[]
  churn: DumpChurn[]
  hotspots: Hotspot[]
}

/** A selected, size-capped file excerpt sent to the model. */
export interface FileExcerpt {
  path: string
  reason: string
  content: string
  truncated: boolean
  startLine?: number
  endLine?: number
}

/** Project configuration extracted from manifests and infra files. */
export interface RepoConfig {
  packageName: string | null
  scripts: string[]
  envKeys: string[]
  composeServices: string[]
  ciWorkflows: string[]
  /** A Dockerfile was found in the repository. */
  hasDockerfile?: boolean
  /** A Makefile was found in the repository. */
  hasMakefile?: boolean
}

/** A per-module roll-up; the deterministic seed for a future map-reduce pass. */
export interface ModuleSummary {
  name: string
  files: number
  functions: number
  topFiles: string[]
  symbols: string[]
  importsFrom: string[]
}

/**
 * Everything the deep-analysis payload is built from. Derived deterministically
 * from the cloned source — this is what lets the model describe things that are
 * not visible on the GitHub page.
 */
export interface CodeInsights {
  imports: ImportEdge[]
  routes: CodeRoute[]
  models: CodeModel[]
  config: RepoConfig
  moduleSummaries: ModuleSummary[]
  excerpts: FileExcerpt[]
  /** Declared symbols with exact source locations (JS/TS AST pass). */
  symbols: CodeSymbol[]
  /** Resolved call edges between declared symbols. */
  calls: CallEdge[]
  /** Git history signals (churn, contributors, hotspots). */
  git: GitInsights
}

/**
 * Every deterministic fact the analysis pipeline computes about a repository.
 * The template summary (summary.ts) and the optional LLM narrative (llm.ts)
 * both consume exactly this object — one source of truth, no duplicated
 * heuristics.
 */
export interface ProjectFacts {
  repo: Repository
  languages: LanguageShare[]
  evidence: EvidenceItem[]
  stack: ProjectStack
  modules: ModuleInfo[]
  topLevelDirs: string[]
  entryPoints: string[]
  keyDependencies: string[]
  totalDependencies: number
  dependencyHealth: { healthy: number; review: number; vulnerable: number }
  tests: number
  weakStructure: boolean
  lowComplexityPct: number
  readmeExcerpt: string | null
  /** Structured code insights (import graph, routes, models, config, excerpts). */
  insights: CodeInsights
}

/* ------------------------------------------------------------------ */
/* Cached bundle                                                       */
/* ------------------------------------------------------------------ */

/**
 * Bump when the extracted shape changes so cached bundles are re-computed
 * instead of being served with missing fields. Old bundles stay readable; the
 * API just treats them as stale.
 */
export const ANALYSIS_SCHEMA_VERSION = 6

export interface AnalysisBundle {
  containerId: string
  headSha: string | null
  computedAt: string
  schemaVersion?: number
  overview: AnalysisOverview
  // Future sections (code explorer metadata, issues, dependencies page) read
  // these records from the same bundle instead of recomputing.
  files: ParsedFile[]
  modules: ModuleInfo[]
  topLevelDirs: string[]
  /** Real security findings scanned from the cloned source (Security page). */
  security?: SecurityFinding[]
  /** Real dependencies parsed from the repo's manifests (Dependencies page). */
  dependencies?: DependencyRecord[]
  /** Deterministic facts behind the overview; used to (re)build the narrative. */
  facts?: ProjectFacts
  /** The full AI report served by /api/deep-analysis (once generated). */
  deepAnalysis?: DeepAnalysis
}

export const COMPLEXITY_BUCKETS: ComplexityBucket[] = [
  { name: 'Low', count: 0, color: '#4ade80' },
  { name: 'Moderate', count: 0, color: '#facc15' },
  { name: 'High', count: 0, color: '#fb923c' },
  { name: 'Critical', count: 0, color: '#ef4444' },
]

export function complexityBucketName(cyclomatic: number): 'Low' | 'Moderate' | 'High' | 'Critical' {
  if (cyclomatic <= 5) return 'Low'
  if (cyclomatic <= 10) return 'Moderate'
  if (cyclomatic <= 20) return 'High'
  return 'Critical'
}

export type { AnalysisOverview, LanguageShare, Repository, EvidenceItem }