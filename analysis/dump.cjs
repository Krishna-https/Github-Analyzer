// Runs inside a runner container (node:24-alpine) via:
//   docker exec <id> node -e <this source>
//
// One-shot inventory used by the analysis pipeline: git metadata + the tracked
// file list + the contents of the most relevant text files + churn/contributor
// history, emitted as a single JSON document on stdout. The <script> string is a
// constant shipped by the app (never user input) and is passed as a bare argv
// element, so nothing here is interpolated through a shell.
'use strict'
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const REPO = process.env.ANALYSIS_REPO || '/workspace/repo'

// Directories that are never meaningful for analysis (git internals, vendored
// deps, build output, editor folders). Only used by the filesystem fallback.
const SKIP_DIRS = new Set([
  '.git', 'node_modules', '.next', '.nuxt', 'dist', 'build', 'out',
  'coverage', '.cache', '.turbo', '.parcel-cache', 'target', 'vendor',
  '.venv', 'venv', 'env', '__pycache__', '.mypy_cache', '.pytest_cache',
  '.serverless', '.terraform', 'bower_components', '.idea', '.vscode',
])

// Extensions whose content the analyzer wants to read. This intentionally
// covers the previously-missed schema/config formats: `.prisma` (domain models),
// GraphQL/protobuf, Terraform, Solidity and the common language set.
const SOURCE_EXTS = new Set([
  '.js', '.mjs', '.cjs', '.jsx', '.ts', '.mts', '.cts', '.tsx',
  '.py', '.rb', '.go', '.rs', '.java', '.kt', '.scala', '.php',
  '.cs', '.c', '.h', '.cc', '.cpp', '.hpp', '.swift', '.sh', '.bash',
  '.css', '.scss', '.sass', '.less', '.html', '.htm', '.xml',
  '.sql', '.yml', '.yaml', '.json', '.toml', '.ini', '.cfg', '.conf',
  '.md', '.markdown', '.rst', '.txt', '.vue', '.svelte', '.astro',
  '.prisma', '.graphql', '.gql', '.proto', '.tf', '.hcl', '.sol',
  '.dart', '.lua', '.r', '.pl', '.ex', '.exs', '.fs', '.fsx', '.vb',
  '.groovy', '.gradle', '.properties',
])

// Files with no extension (or an extension the set above can't key on) that
// still carry meaningful setup/runtime information.
const SPECIAL_FILES = new Set([
  'dockerfile', 'makefile', 'procfile', 'gemfile', 'rakefile', 'justfile',
  'cmakelists.txt', 'readme', 'license', 'licence',
])

// Manifests are always read first: they anchor stack detection and run steps.
const MANIFEST_NAMES = new Set([
  'package.json', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock',
  'bun.lockb', 'requirements.txt', 'pyproject.toml', 'poetry.lock',
  'pipfile', 'pipfile.lock', 'go.mod', 'go.sum', 'cargo.toml', 'cargo.lock',
  'pom.xml', 'build.gradle', 'build.gradle.kts', 'settings.gradle',
  'composer.json', 'composer.lock', 'gemfile', 'gemfile.lock', 'mix.exs',
  'pubspec.yaml', 'package.swift', 'tsconfig.json', 'jsconfig.json',
  'next.config.js', 'next.config.mjs', 'next.config.ts', 'vite.config.ts',
  'vite.config.js', 'webpack.config.js', 'rollup.config.js',
  'docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml',
  'makefile', 'procfile', 'schema.prisma',
])

// Lockfiles are huge and low-signal; their existence is enough, so they are
// never read into the content budget.
const LOCKFILES = new Set([
  'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lockb',
  'composer.lock', 'poetry.lock', 'pipfile.lock', 'cargo.lock',
  'go.sum', 'gemfile.lock',
])

// Churn on generated/lock files says nothing about the code, so exclude it.
const CHURN_SKIP = /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb|composer\.lock|poetry\.lock|pipfile\.lock|cargo\.lock|go\.sum|gemfile\.lock)$|\.(min|map)$|(^|\/)(dist|build|out|vendor|coverage|__snapshots__)\//i

// Env files are valuable for key names but must never leak values.
const SAFE_ENV_FILES = new Set([
  '.env.example', '.env.sample', '.env.template', '.env.dist', '.env.defaults',
])

// Large files keep their size metadata but no content.
const MAX_FILE_BYTES = 256 * 1024
// Overall content budget so stdout stays bounded for big repositories.
const MAX_TOTAL_BYTES = 12 * 1024 * 1024
const MAX_CHURN_FILES = 40
const MAX_CONTRIBUTORS = 10
const CHURN_COMMITS = 200

function baseName(rel) {
  const slash = rel.lastIndexOf('/')
  return slash === -1 ? rel : rel.slice(slash + 1)
}

function extOf(rel) {
  const name = baseName(rel)
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '' : name.slice(dot).toLowerCase()
}

function isEnvFile(name) {
  return name === '.env' || name.startsWith('.env.')
}

function git(args, maxBuffer = 16 * 1024 * 1024) {
  const r = spawnSync('git', ['-C', REPO, ...args], { encoding: 'utf8', maxBuffer })
  return r.status === 0 ? (r.stdout || '').trim() : null
}

/* ------------------------------------------------------------------ */
/* Inventory                                                           */
/* ------------------------------------------------------------------ */

function walk(dir, rel, out) {
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    if (entry.name === '.' || entry.name === '..') continue
    const full = path.join(dir, entry.name)
    const childRel = rel ? rel + '/' + entry.name : entry.name

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      walk(full, childRel, out)
      continue
    }
    if (entry.isFile()) out.push(childRel)
  }
}

function listTracked() {
  const out = git(['ls-files', '-z'], 32 * 1024 * 1024)
  if (!out) return null
  return out.split('\0').filter(Boolean)
}

const records = []
const seen = new Set()

function addRecord(rel) {
  if (seen.has(rel)) return
  seen.add(rel)
  const full = path.join(REPO, rel)
  let size = 0
  try {
    const st = fs.statSync(full)
    if (!st.isFile()) return // submodule gitlink, directory, etc.
    size = st.size
  } catch {
    return // tracked but deleted in the working tree
  }
  records.push({ relPath: rel, size })
}

const tracked = listTracked()
if (tracked) {
  for (const rel of tracked) addRecord(rel)
} else {
  const found = []
  walk(REPO, '', found)
  for (const rel of found) addRecord(rel)
}

/* ------------------------------------------------------------------ */
/* Prioritise what gets content                                        */
/* ------------------------------------------------------------------ */

/** Lower is more important. Config/entry/route/model files get read first. */
function priorityOf(rec) {
  const rel = rec.relPath
  const name = baseName(rel).toLowerCase()
  const ext = extOf(rel)

  if (MANIFEST_NAMES.has(name)) return 0
  if (name.startsWith('docker-compose') || name.startsWith('compose.')) return 0
  if (name === 'dockerfile' || name.endsWith('.dockerfile')) return 0
  if (/\.prisma$/i.test(rel)) return 0
  if (isEnvFile(name)) return 0

  if (/(^|\/)(app|pages)\/.*\/(route|page|layout|loading|error|not-found|middleware|template)\.(t|j)sx?$/.test(rel)) return 1
  if (/(^|\/)(src\/)?(index|main|server|app|cli|worker|bootstrap)\.(t|j)sx?$/.test(rel)) return 1
  if (/(^|\/)(main|app|manage|wsgi|asgi|settings|urls)\.py$/.test(rel)) return 1

  if (/(^|\/)(routes?|controllers?|handlers?|endpoints?|api|resolvers?)\//.test(rel)) return 2
  if (/(^|\/)(models?|entities|schemas?|dto|migrations?|db|database|repositor(y|ies)|services?|auth|middleware)\//.test(rel)) return 2

  // Docs are useful context but should never crowd out source under the budget.
  if (/\.(md|markdown|rst|txt)$/i.test(rel)) return 4

  if (SOURCE_EXTS.has(ext) || SPECIAL_FILES.has(name)) return 3
  return 4
}

records.sort((a, b) => priorityOf(a) - priorityOf(b) || a.relPath.localeCompare(b.relPath))

/* ------------------------------------------------------------------ */
/* Content (budgeted, priority order)                                  */
/* ------------------------------------------------------------------ */

function redactEnv(text) {
  // Keep KEY names, drop values and comments so secrets never leave the repo.
  return text
    .split('\n')
    .map((line) => {
      const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/)
      return m ? m[1] + '=' : ''
    })
    .join('\n')
}

let totalContentBytes = 0
let contentTruncated = false
let filesWithContent = 0

for (const rec of records) {
  const name = baseName(rec.relPath).toLowerCase()
  const ext = extOf(rec.relPath)
  const readable = SOURCE_EXTS.has(ext) || SPECIAL_FILES.has(name) || isEnvFile(name)
  if (!readable) continue
  if (LOCKFILES.has(name)) continue
  if (rec.size <= 0 || rec.size > MAX_FILE_BYTES || contentTruncated) continue

  const full = path.join(REPO, rec.relPath)
  try {
    if (isEnvFile(name)) {
      const text = fs.readFileSync(full, 'utf8')
      if (text.includes('\0')) {
        rec.binary = true
        continue
      }
      rec.content = SAFE_ENV_FILES.has(name) ? text : redactEnv(text)
      totalContentBytes += rec.content.length
      filesWithContent++
      if (totalContentBytes >= MAX_TOTAL_BYTES) contentTruncated = true
      continue
    }

    const buf = fs.readFileSync(full)
    if (buf.includes(0)) {
      rec.binary = true
      continue
    }
    rec.content = buf.toString('utf8')
    totalContentBytes += buf.length
    filesWithContent++
    if (totalContentBytes >= MAX_TOTAL_BYTES) contentTruncated = true
  } catch {
    // Metadata-only inventory entry.
  }
}

/* ------------------------------------------------------------------ */
/* Git history                                                         */
/* ------------------------------------------------------------------ */

function normalizeRename(p) {
  if (!p.includes('=>')) return p
  const braced = p.match(/^(.*)\{(.*) => (.*)\}(.*)$/)
  if (braced) return `${braced[1]}${braced[3]}${braced[4]}`
  return p.split('=>').pop().trim()
}

function readChurn() {
  const raw = git(['log', '-n', String(CHURN_COMMITS), '--numstat', '--format='], 64 * 1024 * 1024)
  if (!raw) return []
  const map = new Map()
  for (const line of raw.split('\n')) {
    const m = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/)
    if (!m) continue
    const file = normalizeRename(m[3].trim())
    if (CHURN_SKIP.test(file)) continue
    let entry = map.get(file)
    if (!entry) {
      entry = { file, commits: 0, insertions: 0, deletions: 0 }
      map.set(file, entry)
    }
    entry.commits++
    if (m[1] !== '-') entry.insertions += Number(m[1])
    if (m[2] !== '-') entry.deletions += Number(m[2])
  }
  return [...map.values()]
    .sort((a, b) => b.insertions + b.deletions - (a.insertions + a.deletions))
    .slice(0, MAX_CHURN_FILES)
}

function readContributors() {
  const raw = git(['shortlog', '-sn', 'HEAD'])
  if (!raw) return []
  return raw
    .split('\n')
    .map((line) => line.match(/^\s*(\d+)\s+(.+)$/))
    .filter(Boolean)
    .map((m) => ({ commits: Number(m[1]), name: m[2] }))
    .slice(0, MAX_CONTRIBUTORS)
}

/* ------------------------------------------------------------------ */
/* Emit                                                                */
/* ------------------------------------------------------------------ */

const repoExists = fs.existsSync(REPO)
const lastHash = git(['log', '-1', '--format=%h'])
const lastSubject = git(['log', '-1', '--format=%s'])
const lastDate = git(['log', '-1', '--format=%ai'])
const commitCountRaw = git(['rev-list', '--count', 'HEAD'])

const result = {
  repoDir: REPO,
  repoExists,
  git: {
    remoteUrl: git(['config', '--get', 'remote.origin.url']),
    branch: git(['symbolic-ref', '--short', 'HEAD']) || git(['rev-parse', '--abbrev-ref', 'HEAD']),
    headSha: git(['rev-parse', 'HEAD']),
    lastCommit: lastHash && lastSubject ? lastHash + ' ' + lastSubject : null,
    lastCommitDate: lastDate,
    commitCount: commitCountRaw ? Number(commitCountRaw) : null,
    contributors: readContributors(),
  },
  files: records,
  churn: readChurn(),
  truncated: {
    content: contentTruncated,
    filesTotal: records.length,
    filesWithContent,
    contentBytes: totalContentBytes,
  },
}

process.stdout.write(JSON.stringify(result))
