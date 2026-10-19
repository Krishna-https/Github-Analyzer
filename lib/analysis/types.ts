import 'server-only'

import type {
  AnalysisOverview,
  ComplexityBucket,
  DeepAnalysis,
  EvidenceItem,
  LanguageShare,
  Repository,
} from '@/lib/types'

/* ------------------------------------------------------------------ */
/* Container dump contract                                            */
/* ------------------------------------------------------------------ */

export interface DumpGitInfo {
  remoteUrl: string | null
  branch: string | null
  headSha: string | null
  lastCommit: string | null
  lastCommitDate: string | null
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
  truncated: { content: boolean }
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
}

/** A detected HTTP route / page. */
export interface CodeRoute {
  method: string
  path: string
  file: string
}

/** A detected data model / schema entity. */
export interface CodeModel {
  name: string
  kind: string
  file: string
  fields: string[]
}

/** A selected, size-capped file excerpt sent to the model. */
export interface FileExcerpt {
  path: string
  reason: string
  content: string
  truncated: boolean
}

/** Project configuration extracted from manifests and infra files. */
export interface RepoConfig {
  packageName: string | null
  scripts: string[]
  envKeys: string[]
  composeServices: string[]
  ciWorkflows: string[]
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

export interface AnalysisBundle {
  containerId: string
  headSha: string | null
  computedAt: string
  overview: AnalysisOverview
  // Future sections (code explorer metadata, issues, dependencies page) read
  // these records from the same bundle instead of recomputing.
  files: ParsedFile[]
  modules: ModuleInfo[]
  topLevelDirs: string[]
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