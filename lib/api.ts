import type {
  AnalysisStep,
  ArchitectureNode,
  ComplexityBucket,
  ComplexityFinding,
  DependencyRecord,
  EvidenceItem,
  FunctionRecord,
  Issue,
  LanguageShare,
  ModuleRecord,
  Repository,
  Rule,
  SecurityFinding,
} from './types'
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
} from '../data/mockData'
import { mockSourceFiles, buildTree, type FileTreeNode } from '../data/mockSourceFiles'

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