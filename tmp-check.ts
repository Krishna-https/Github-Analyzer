import { readFileSync } from 'node:fs'
import { analyzeDump } from './lib/analysis/analyze'
import { writeCachedBundle } from './lib/analysis/cache'
import { buildDeterministicReport } from './lib/analysis/deepFallback'
import type { AnalysisDump, DumpFile } from './lib/analysis/types'

const paths = [
  'app/api/analysis/route.ts',
  'app/api/deep-analysis/route.ts',
  'lib/analysis/extract.ts',
  'lib/analysis/ast.ts',
  'lib/analysis/deepFallback.ts',
  'lib/types.ts',
  'package.json',
]

const files: DumpFile[] = paths.map((p) => ({
  relPath: p,
  size: 1,
  content: readFileSync(p, 'utf8'),
}))

const dump: AnalysisDump = {
  repoDir: '/workspace/repo',
  repoExists: true,
  git: {
    remoteUrl: 'https://github.com/example/test',
    branch: 'main',
    headSha: 'abc123',
    lastCommit: 'abc123 test commit',
    lastCommitDate: '2026-01-01',
    commitCount: 42,
    contributors: [{ name: 'Alice', commits: 30 }],
  },
  files,
  churn: [
    { file: 'lib/analysis/extract.ts', commits: 5, insertions: 100, deletions: 20 },
    { file: 'app/api/analysis/route.ts', commits: 3, insertions: 40, deletions: 10 },
  ],
  truncated: { content: false, filesTotal: files.length, filesWithContent: files.length },
}

const bundle = analyzeDump('test', dump)
writeCachedBundle(bundle)
const insights = bundle.facts?.insights

console.log('schemaVersion:', bundle.schemaVersion)
console.log('functions:', bundle.facts?.repo.functions)
console.log('routes:', insights?.routes.slice(0, 6))
console.log('symbols:', insights?.symbols.slice(0, 6).map((s) => `${s.file}:${s.line} ${s.kind} ${s.name}`))
console.log('calls:', insights?.calls.slice(0, 6))
console.log('hotspots:', insights?.git.hotspots.slice(0, 3))

if (!bundle.facts) throw new Error('no facts')
const report = buildDeterministicReport(bundle.facts)
console.log(
  JSON.stringify(
    {
      whatItDoes: report.whatItDoes,
      dataFlow: report.dataFlow,
      hotspots: report.hotspots,
      domainModel: report.domainModel.slice(0, 2),
      keyModules: report.keyModules.slice(0, 2),
      deepAnalysisModel: report.domainModel.find((d) => d.entity === 'DeepAnalysis'),
    },
    null,
    2
  )
)
