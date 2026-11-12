import type {
  AnalysisOverview,
  AnalysisStep,
  ArchitectureNode,
  CloneStatus,
  CodeAnalysisReport,
  ComplexityBucket,
  ComplexityFinding,
  DeepAnalysis,
  DependencyRecord,
  EvidenceItem,
  FunctionRecord,
  Issue,
  LanguageShare,
  ModuleRecord,
  ModuleWithFunctions,
  RealFileContent,
  Repository,
  Rule,
  SecurityFinding,
} from '../types'
import {
  analysisSteps,
  complexityBuckets,
  mockArchitecture,
  mockComplexityFindings,
  mockDependencies,
  mockEvidence,
  mockFunctions,
  mockIssues,
  mockModules,
  mockRepository,
  mockRules,
  mockSecurityFindings,
} from '../../data/mockData'
import { mockSourceFiles, buildTree, type FileTreeNode } from '../../data/mockSourceFiles'

/**
 * Raised when the real file tree can't be loaded. Carries the HTTP status so
 * callers can distinguish a stale container (404) from an unreachable server.
 */
export class FileTreeError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'FileTreeError'
  }
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

/*
 * Future-ready service layer.
 * Every method below would one day call a real analysis backend.
 * They are intentionally named like remote endpoints so swapping the
 * mock implementation for fetch() calls requires no page changes.
 */
export const api = {
  async analyzeRepository(_url: string): Promise<{ steps: AnalysisStep[]; repository: Repository }> {
    await delay(200)
    return { steps: analysisSteps, repository: mockRepository }
  },

  /**
   * Live clone telemetry for a runner container, from /api/clone/status.
   * While the repo is being pulled this reports git's phase/percentage, the
   * bytes on disk, the working-tree file count and the newest files, so the
   * Analyze page can show real progress instead of a simulated script.
   *
   * Throws FileTreeError so callers can distinguish a stale container (404),
   * a stopped container (409), or an unreachable server (0).
   */
  async getCloneStatus(containerId: string): Promise<CloneStatus> {
    let res: Response

    try {
      res = await fetch(
        `/api/clone/status?containerId=${encodeURIComponent(containerId)}`,
        { cache: 'no-store' }
      )
    } catch {
      throw new FileTreeError('Could not reach the server.', 0)
    }

    if (!res.ok) {
      let message = `Clone status request failed with status ${res.status}`
      try {
        const body = (await res.json()) as { error?: string }
        if (body.error) message = body.error
      } catch {
        // Non-JSON error body; keep the status-based message.
      }
      throw new FileTreeError(message, res.status)
    }

    const data = (await res.json()) as { status?: CloneStatus }
    if (!data.status) throw new FileTreeError('Clone status returned no data.', 502)
    return data.status
  },

  getRepositoryOverview(): {
    repository: Repository
    languages: LanguageShare[]
    evidence: EvidenceItem[]
    complexityBuckets: ComplexityBucket[]
  } {
    return {
      repository: mockRepository,
      languages: mockRepository.languages,
      evidence: mockEvidence,
      complexityBuckets,
    }
  },

  /**
   * Real analysis overview from a cloned runner container, fetched through
   * /api/analysis. The server computes the bundle once (git metadata, language
   * share, file classification, code parsing, dependencies, evidence) and caches
   * it keyed by containerId until the repo's HEAD changes.
   *
   * Throws FileTreeError so callers can distinguish a stale container (404),
   * an unanalyzable repo (400/502), or an unreachable server (0).
   */
  async getAnalysisOverview(containerId: string): Promise<AnalysisOverview> {
    let res: Response

    try {
      res = await fetch(`/api/analysis?containerId=${encodeURIComponent(containerId)}`)
    } catch {
      throw new FileTreeError('Could not reach the server.', 0)
    }

    if (!res.ok) {
      let message = `Analysis request failed with status ${res.status}`
      try {
        const body = (await res.json()) as { error?: string }
        if (body.error) message = body.error
      } catch {
        // Non-JSON error body; keep the status-based message.
      }
      throw new FileTreeError(message, res.status)
    }

    const data = (await res.json()) as { overview?: AnalysisOverview }
    if (!data.overview) throw new FileTreeError('Analysis returned no overview data.', 502)
    return data.overview
  },

  /**
   * Modules detected in a cloned runner container, from /api/modules. The
   * server derives them from the cached analysis bundle (computing it if this is
   * the first request), so the pages never fall back to sample data silently.
   *
   * Throws FileTreeError so callers can distinguish a stale container (404),
   * an unanalyzable repo (400/502), or an unreachable server (0).
   */
  async getModulesFromContainer(containerId: string): Promise<ModuleWithFunctions[]> {
    let res: Response
    try {
      res = await fetch(`/api/modules?containerId=${encodeURIComponent(containerId)}`)
    } catch {
      throw new FileTreeError('Could not reach the server.', 0)
    }

    if (!res.ok) {
      let message = `Modules request failed with status ${res.status}`
      try {
        const body = (await res.json()) as { error?: string }
        if (body.error) message = body.error
      } catch {
        // Non-JSON error body; keep the status-based message.
      }
      throw new FileTreeError(message, res.status)
    }

    const data = (await res.json()) as { modules?: ModuleWithFunctions[] }
    return data.modules ?? []
  },

  /**
   * The real Code Analysis report for a container, from /api/code. The server
   * aggregates the per-function metrics captured while parsing the cloned
   * source, so the function table, complexity buckets and high-complexity
   * findings are all derived from the actual repository.
   *
   * Throws FileTreeError so callers can distinguish a stale container (404),
   * an unanalyzable repo (400/502), or an unreachable server (0).
   */
  async getCodeAnalysis(containerId: string): Promise<CodeAnalysisReport> {
    let res: Response
    try {
      res = await fetch(`/api/code?containerId=${encodeURIComponent(containerId)}`)
    } catch {
      throw new FileTreeError('Could not reach the server.', 0)
    }

    if (!res.ok) {
      let message = `Code analysis request failed with status ${res.status}`
      try {
        const body = (await res.json()) as { error?: string }
        if (body.error) message = body.error
      } catch {
        // Non-JSON error body; keep the status-based message.
      }
      throw new FileTreeError(message, res.status)
    }

    const data = (await res.json()) as { report?: CodeAnalysisReport }
    if (!data.report) throw new FileTreeError('Code analysis returned no report data.', 502)
    return data.report
  },

  /**
   * The real security findings for a container, from /api/security. The server
   * scans the cached analysis bundle (computing it once if this is the first
   * request), so every finding is derived from the cloned source rather than the
   * bundled sample data.
   *
   * Throws FileTreeError so callers can distinguish a stale container (404),
   * an unanalyzable repo (400/502), or an unreachable server (0).
   */
  async getSecurityFindingsFromContainer(containerId: string): Promise<SecurityFinding[]> {
    let res: Response
    try {
      res = await fetch(`/api/security?containerId=${encodeURIComponent(containerId)}`)
    } catch {
      throw new FileTreeError('Could not reach the server.', 0)
    }

    if (!res.ok) {
      let message = `Security request failed with status ${res.status}`
      try {
        const body = (await res.json()) as { error?: string }
        if (body.error) message = body.error
      } catch {
        // Non-JSON error body; keep the status-based message.
      }
      throw new FileTreeError(message, res.status)
    }

    const data = (await res.json()) as { findings?: SecurityFinding[] }
    return data.findings ?? []
  },

  /**
   * The real dependency list for a container, from /api/dependencies. The server
   * parses the repo's manifests into the cached analysis bundle, so every entry
   * carries the declared name/version rather than the bundled sample data.
   *
   * Throws FileTreeError so callers can distinguish a stale container (404),
   * an unanalyzable repo (400/502), or an unreachable server (0).
   */
  async getDependenciesFromContainer(containerId: string): Promise<DependencyRecord[]> {
    let res: Response
    try {
      res = await fetch(`/api/dependencies?containerId=${encodeURIComponent(containerId)}`)
    } catch {
      throw new FileTreeError('Could not reach the server.', 0)
    }

    if (!res.ok) {
      let message = `Dependencies request failed with status ${res.status}`
      try {
        const body = (await res.json()) as { error?: string }
        if (body.error) message = body.error
      } catch {
        // Non-JSON error body; keep the status-based message.
      }
      throw new FileTreeError(message, res.status)
    }

    const data = (await res.json()) as { dependencies?: DependencyRecord[] }
    return data.dependencies ?? []
  },

  /**
   * The real issue list for a container, from /api/issues. The server aggregates
   * the security/complexity/dependency findings from the cached analysis bundle,
   * so every row points at the cloned source rather than the bundled sample data.
   *
   * Throws FileTreeError so callers can distinguish a stale container (404),
   * an unanalyzable repo (400/502), or an unreachable server (0).
   */
  async getIssuesFromContainer(containerId: string): Promise<Issue[]> {
    let res: Response
    try {
      res = await fetch(`/api/issues?containerId=${encodeURIComponent(containerId)}`)
    } catch {
      throw new FileTreeError('Could not reach the server.', 0)
    }

    if (!res.ok) {
      let message = `Issues request failed with status ${res.status}`
      try {
        const body = (await res.json()) as { error?: string }
        if (body.error) message = body.error
      } catch {
        // Non-JSON error body; keep the status-based message.
      }
      throw new FileTreeError(message, res.status)
    }

    const data = (await res.json()) as { issues?: Issue[] }
    return data.issues ?? []
  },

  /**
   * The full deep-analysis report for a container, from /api/deep-analysis.
   * The AI report is generated and cached by /api/analysis; this only reads it,
   * falling back to a deterministic report built from the cached facts.
   * `report` is null only when the container was never analyzed.
   */
  async getDeepAnalysis(containerId: string): Promise<{ report: DeepAnalysis | null; aiAvailable: boolean }> {
    let res: Response
    try {
      res = await fetch(`/api/deep-analysis?containerId=${encodeURIComponent(containerId)}`)
    } catch {
      throw new FileTreeError('Could not reach the server.', 0)
    }

    if (!res.ok) {
      let message = `Deep analysis request failed with status ${res.status}`
      try {
        const body = (await res.json()) as { error?: string }
        if (body.error) message = body.error
      } catch {
        // Non-JSON error body; keep the status-based message.
      }
      throw new FileTreeError(message, res.status)
    }

    const data = (await res.json()) as { deepAnalysis?: DeepAnalysis | null; aiAvailable?: boolean }
    return { report: data.deepAnalysis ?? null, aiAvailable: Boolean(data.aiAvailable) }
  },

  /**
   * Force a full re-analysis (POST /api/analysis), ignoring the cache. Used to
   * regenerate the report — e.g. to pick up code insights on an older bundle,
   * or to produce the AI report after a provider key was added.
   */
  async rerunAnalysis(containerId: string): Promise<AnalysisOverview> {
    let res: Response
    try {
      res = await fetch(`/api/analysis?containerId=${encodeURIComponent(containerId)}`, { method: 'POST' })
    } catch {
      throw new FileTreeError('Could not reach the server.', 0)
    }

    if (!res.ok) {
      let message = `Re-analysis failed with status ${res.status}`
      try {
        const body = (await res.json()) as { error?: string }
        if (body.error) message = body.error
      } catch {
        // Non-JSON error body; keep the status-based message.
      }
      throw new FileTreeError(message, res.status)
    }

    const data = (await res.json()) as { overview?: AnalysisOverview }
    if (!data.overview) throw new FileTreeError('Re-analysis returned no overview data.', 502)
    return data.overview
  },

  getArchitecture(): ArchitectureNode[] {
    return mockArchitecture
  },

  getModules(): ModuleRecord[] {
    return mockModules
  },

  getModuleById(id: string): { module: ModuleRecord; functions: FunctionRecord[] } | null {
    const mod = mockModules.find((m) => m.id === id)
    const functions = mod
      ? mockFunctions.filter((f) => f.module.toLowerCase() === mod.name.toLowerCase())
      : []
    return mod ? { module: mod, functions } : null
  },

  getFunctions(): FunctionRecord[] {
    return mockFunctions
  },

  getComplexityFindings(): ComplexityFinding[] {
    return mockComplexityFindings
  },

  getSecurityFindings(): SecurityFinding[] {
    return mockSecurityFindings
  },

  getDependencies(): DependencyRecord[] {
    return mockDependencies
  },

  getIssues(category?: string): Issue[] {
    if (category && category !== 'All') {
      return mockIssues.filter((i) => i.category === category)
    }
    return mockIssues
  },

  getRules(): Rule[] {
    return mockRules
  },

  getFile(path: string) {
    return mockSourceFiles[path] ?? null
  },

  getFileTree(): FileTreeNode[] {
    return buildTree()
  },

  /**
   * Real file tree from a cloned runner container. The Docker socket is only
   * reachable server-side, so this goes through /api/files rather than talking
   * to dockerode directly.
   *
   * Throws FileTreeError so callers can tell the user why they're seeing the
   * mock fallback instead of real files.
   */
  async getRealFileTree(containerId: string): Promise<FileTreeNode[]> {
    let res: Response

    try {
      res = await fetch(`/api/files?containerId=${encodeURIComponent(containerId)}`)
    } catch {
      // fetch only rejects on network failure, not on a non-2xx status.
      throw new FileTreeError('Could not reach the server.', 0)
    }

    if (!res.ok) {
      let message = `File tree request failed with status ${res.status}`

      try {
        const body = (await res.json()) as { error?: string }
        if (body.error) message = body.error
      } catch {
        // Non-JSON error body; keep the status-based message.
      }

      throw new FileTreeError(message, res.status)
    }

    const data = (await res.json()) as { tree?: FileTreeNode[] }
    return data.tree ?? []
  },

  /**
   * Real file content from a cloned runner container, fetched through /api/file.
   * The path is container-absolute (/workspace/repo/src/app.tsx) and passed to
   * `cat` inside the container as a plain argv element.
   *
   * Throws FileTreeError so callers can distinguish a stale container (404),
   * a bad path (400), a binary file (415), or an unreachable server.
   */
  async getFileContent(containerId: string, path: string): Promise<RealFileContent> {
    let res: Response

    try {
      res = await fetch(
        `/api/file?containerId=${encodeURIComponent(containerId)}&path=${encodeURIComponent(path)}`
      )
    } catch {
      // fetch only rejects on network failure, not on a non-2xx status.
      throw new FileTreeError('Could not reach the server.', 0)
    }

    if (!res.ok) {
      let message = `File request failed with status ${res.status}`

      try {
        const body = (await res.json()) as { error?: string }
        if (body.error) message = body.error
      } catch {
        // Non-JSON error body; keep the status-based message.
      }

      throw new FileTreeError(message, res.status)
    }

    const data = (await res.json()) as { file?: RealFileContent }
    return data.file ?? { path, language: 'Text', lines: 0, bytes: 0, truncated: false, content: [] }
  },

  getEvidence(): EvidenceItem[] {
    return mockEvidence
  },

  getComplexityBuckets(): ComplexityBucket[] {
    return complexityBuckets
  },

  getLanguages(): LanguageShare[] {
    return mockRepository.languages
  },

  getSecurityCounts(): Record<SecurityFinding['severity'], number> {
    const counts: Record<SecurityFinding['severity'], number> = {
      Critical: 0,
      High: 0,
      Medium: 0,
      Low: 0,
    }
    for (const f of mockSecurityFindings) counts[f.severity] += 1
    return counts
  },

  getDependencyStatusCounts(): { healthy: number; review: number; vulnerable: number } {
    const healthy = mockDependencies.filter((d) => d.status === 'healthy').length
    const review = mockDependencies.filter((d) => d.status === 'review').length
    const vulnerable = mockDependencies.filter((d) => d.status === 'vulnerable').length
    return { healthy, review, vulnerable }
  },

  getFindingDetail(id: string): {
    id: string
    title: string
    severity: string
    file: string
    line: number
    category: string
    label: string
    account: string[]
    reason: string[]
    fix: { label: string; code?: { lines: string[]; highlight: number[]; startLine: number } }
    ruleId?: string
    fixedCode?: { lines: string[]; highlight: number[]; startLine: number }
  } | null {
    const sec = mockSecurityFindings.find((f) => f.id === id)
    if (sec) {
      return {
        id: sec.id,
        title: sec.title,
        severity: sec.severity,
        file: sec.file,
        line: sec.line,
        category: 'Security',
        label: 'Rule Engine Result',
        account: sec.evidence,
        reason: [sec.explanation],
        fix: { label: 'Suggested fix', code: sec.fixedSnippet },
        ruleId: sec.ruleId,
        fixedCode: sec.fixedSnippet,
      }
    }

    const cx = mockComplexityFindings.find((f) => f.id === id)
    if (cx) {
      return {
        id: cx.id,
        title: `${cx.functionName} complexity`,
        severity: cx.status,
        file: cx.file,
        line: cx.line,
        category: 'Complexity',
        label: 'Rule Engine Result',
        account: [
          `Cyclomatic Complexity: ${cx.cyclomatic}`,
          `Nesting Depth: ${cx.nestingDepth}`,
          `Lines: ${cx.lineCount}`,
        ],
        reason: [cx.reason],
        fix: { label: 'Suggested improvement' },
        ruleId: cx.ruleId,
      }
    }

    const dep = mockDependencies.find((d) => d.name === id)
    if (dep) {
      return {
        id: dep.name,
        title: `${dep.name} ${dep.status}`,
        severity: dep.status === 'vulnerable' ? 'High' : dep.status === 'review' ? 'Medium' : 'Low',
        file: 'package.json',
        line: 1,
        category: 'Dependencies',
        label: 'Dependency Analysis',
        account: [`Version: ${dep.version}`, `Category: ${dep.category}`, `Status: ${dep.status}`],
        reason: dep.reason ? [dep.reason] : ['Status is healthy.'],
        fix: {
          label:
            dep.status === 'vulnerable'
              ? 'Upgrade to patched version'
              : dep.status === 'review'
                ? 'Review recommended patch line'
                : 'No action required',
        },
      }
    }

    return {
      id,
      title: id,
      severity: 'Low',
      file: 'src/',
      line: 1,
      category: 'Code Quality',
      label: 'Heuristic Analysis',
      account: ['Detected by duplicate-code heuristic', 'Pattern match against known block'],
      reason: ['Manual review recommended for quality findings.'],
      fix: { label: 'Suggested improvement' },
    }
  },
}