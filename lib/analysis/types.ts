import 'server-only'

import type {
  AnalysisOverview,
  ComplexityBucket,
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