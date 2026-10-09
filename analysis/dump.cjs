// Runs inside a runner container (node:24-alpine) via:
//   docker exec <id> node -e <this source>
//
// One-shot inventory used by the analysis pipeline: git metadata + a flat file
// inventory + the contents of small source files, emitted as a single JSON
// document on stdout. The <script> string is a constant shipped by the app
// (never user input) and is passed as a bare argv element, so nothing here
// is interpolated through a shell.
'use strict'
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const REPO = '/workspace/repo'

// Directories that are never meaningful for analysis (git internals, vendored
// deps, build output, editor folders).
const SKIP_DIRS = new Set([
  '.git', 'node_modules', '.next', '.nuxt', 'dist', 'build', 'out',
  'coverage', '.cache', '.turbo', '.parcel-cache', 'target', 'vendor',
  '.venv', 'venv', 'env', '__pycache__', '.mypy_cache', '.pytest_cache',
  '.serverless', '.terraform', 'bower_components', '.idea', '.vscode',
])

// Extensions whose content the analyzer wants to read.
const SOURCE_EXTS = new Set([
  '.js', '.mjs', '.cjs', '.jsx', '.ts', '.mts', '.cts', '.tsx',
  '.py', '.rb', '.go', '.rs', '.java', '.kt', '.scala', '.php',
  '.cs', '.c', '.h', '.cc', '.cpp', '.hpp', '.swift', '.sh', '.bash',
  '.css', '.scss', '.sass', '.less', '.html', '.htm', '.xml',
  '.sql', '.yml', '.yaml', '.json', '.toml', '.ini', '.cfg', '.conf',
  '.md', '.markdown', '.rst', '.txt', '.vue', '.svelte', '.astro',
])

// Large files keep their size metadata but no content.
const MAX_FILE_BYTES = 256 * 1024
// Overall content budget so stdout stays bounded for big repositories.
const MAX_TOTAL_BYTES = 8 * 1024 * 1024

function git(args) {
  const r = spawnSync('git', ['-C', REPO, ...args], { encoding: 'utf8' })
  return r.status === 0 ? (r.stdout || '').trim() : null
}

const files = []
let totalContentBytes = 0
let contentTruncated = false

function walk(dir, rel) {
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
      walk(full, childRel)
      continue
    }
    if (!entry.isFile()) continue

    let size = 0
    try {
      size = fs.statSync(full).size
    } catch {
      continue
    }

    const rec = { relPath: childRel, size }
    const dot = entry.name.lastIndexOf('.')
    const ext = dot === -1 ? '' : entry.name.slice(dot).toLowerCase()

    if (SOURCE_EXTS.has(ext) && size > 0 && size <= MAX_FILE_BYTES && !contentTruncated) {
      try {
        const buf = fs.readFileSync(full)
        if (!buf.includes(0)) {
          rec.content = buf.toString('utf8')
          totalContentBytes += buf.length
          if (totalContentBytes >= MAX_TOTAL_BYTES) contentTruncated = true
        } else {
          rec.binary = true
        }
      } catch {
        // Metadata-only inventory entry.
      }
    }
    files.push(rec)
  }
}

walk(REPO, '')

const repoExists = fs.existsSync(REPO)
const lastHash = git(['log', '-1', '--format=%h'])
const lastSubject = git(['log', '-1', '--format=%s'])
const lastDate = git(['log', '-1', '--format=%ai'])

const result = {
  repoDir: REPO,
  repoExists,
  git: {
    remoteUrl: git(['config', '--get', 'remote.origin.url']),
    branch: git(['symbolic-ref', '--short', 'HEAD']) || git(['rev-parse', '--abbrev-ref', 'HEAD']),
    headSha: git(['rev-parse', 'HEAD']),
    lastCommit: lastHash && lastSubject ? lastHash + ' ' + lastSubject : null,
    lastCommitDate: lastDate,
  },
  files,
  truncated: { content: contentTruncated },
}

process.stdout.write(JSON.stringify(result))