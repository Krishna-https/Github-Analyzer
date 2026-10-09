import 'server-only'

import type { DependencyRecord } from '@/lib/types'
import type { DumpFile } from './types'

/**
 * Manifest detection + dependency extraction. In scope for a first pass:
 * package.json (+ lockfile check), requirements.txt, go.mod, Cargo.toml and
 * composer.json. Versions come straight from the manifests; vulnerability
 * status is deliberately honest — no advisory feed yet, so 'vulnerable' stays
 * at 0 and 'review' flags suspect/unresolved version ranges.
 */

export interface ManifestSummary {
  deps: DependencyRecord[]
  manifests: string[]
  monorepo: boolean
}

const FRONTEND_CAT = new Set([
  'react', 'react-dom', 'next', 'vue', 'svelte', 'preact', '@angular/core',
  'react-router', 'react-router-dom', 'zustand', 'redux', '@reduxjs/toolkit',
  'tailwindcss', 'styled-components', 'emotion', 'sass', 'less',
])
const BACKEND_CAT = new Set([
  'express', 'fastify', 'koa', 'hapi', '@nestjs/core', 'hono', 'body-parser',
  'cors', 'helmet', 'morgan', 'graphql', 'apollo-server', 'ws', 'socket.io',
])
const DATA_CAT = new Set([
  'pg', 'mysql', 'mysql2', 'sqlite3', 'better-sqlite3', 'mongoose', 'sequelize',
  'typeorm', 'prisma', '@prisma/client', 'knex', 'redis', 'ioredis', 'mongodb',
  'postgres', 'drizzle-orm', '@supabase/supabase-js', 'firebase-admin',
])
const TEST_CAT = new Set([
  'jest', 'vitest', 'mocha', 'chai', 'cypress', 'playwright', '@playwright/test',
  'supertest', 'enzyme', 'sinon', 'nock', '@testing-library/react',
])

function categoryOf(name: string): string {
  if (FRONTEND_CAT.has(name)) return 'Frontend'
  if (BACKEND_CAT.has(name)) return 'Backend'
  if (DATA_CAT.has(name)) return 'Database'
  if (TEST_CAT.has(name)) return 'Testing'
  return 'Library'
}

/**
 * Flags versions that a human should actually look at: floating tags, git/file
 * links, and non-semver strings. Ordinary ranges (`^1.2.3`, `~2`, `>=1`) are
 * normal npm/go/cargo constraints and are *not* flagged.
 */
function isReviewable(version: string): boolean {
  const v = version.trim()
  if (!v) return true
  if (/^(latest|\*|x)$/i.test(v)) return true
  if (/(git\+|git:|file:|link:|workspace:|npm:|https?:|github:)/i.test(v)) return true
  if (!/\d/.test(v)) return true
  return false
}

function record(name: string, version: string): DependencyRecord {
  const v = version?.trim() || 'latest'
  const review = isReviewable(v)
  return {
    name,
    version: v,
    category: categoryOf(name),
    status: review ? 'review' : 'healthy',
    reason: review ? 'Floating or non-semver version range' : undefined,
  }
}

function parsePackageJson(content: string, out: DependencyRecord[], manifests: string[]): void {
  try {
    const pkg = JSON.parse(content) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
      workspaces?: unknown
    }
    // Workspaces implies a monorepo signal, surfaced by the evidence pass.
    if (!manifests.includes('package.json (workspaces)') && pkg.workspaces) {
      manifests.push('package.json (workspaces)')
    }
    for (const [name, version] of Object.entries({ ...pkg.dependencies, ...pkg.devDependencies })) {
      if (name === '') continue
      out.push(record(name, version ?? 'latest'))
    }
  } catch {
    // Malformed manifest — skip silently; the evidence pass already knows it exists.
  }
}

function parseRequirements(content: string, out: DependencyRecord[], manifests: string[]): void {
  if (!manifests.includes('requirements.txt')) manifests.push('requirements.txt')
  for (const raw of content.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#') || line.startsWith('-')) continue
    const m = line.match(/^([A-Za-z0-9_.\-]+)\s*(?:==|>=|<=|~=|!=|<|>)?\s*([^;\s]*)/)
    if (!m || !m[1]) continue
    out.push(record(m[1], m[2] || 'latest'))
  }
}

function parseGoMod(content: string, out: DependencyRecord[], manifests: string[]): void {
  if (!manifests.includes('go.mod')) manifests.push('go.mod')
  let inBlock = false
  for (const raw of content.split('\n')) {
    const line = raw.trim()
    if (line === 'require (') {
      inBlock = true
      continue
    }
    if (inBlock && line === ')') {
      inBlock = false
      continue
    }
    const m = line.match(/^require\s+([^\s]+)\s+([^\s]+)/) // single line
    const b = inBlock ? line.match(/^([^\s]+)\s+([^\s]+)/) : null // block line
    const hit = m ?? b
    if (hit) out.push(record(hit[1], hit[2]))
  }
}

function parseCargo(content: string, out: DependencyRecord[], manifests: string[]): void {
  if (!manifests.includes('Cargo.toml')) manifests.push('Cargo.toml')
  let inDeps = false
  for (const raw of content.split('\n')) {
    const line = raw.trim()
    if (line.startsWith('[')) {
      inDeps = /^\[dependencies/.test(line)
      continue
    }
    if (!inDeps) continue
    const m = line.match(/^([A-Za-z0-9_\-]+)\s*=\s*"?([^"#]+)"?/)
    if (m) out.push(record(m[1], m[2].trim()))
  }
}

function parseComposer(content: string, out: DependencyRecord[], manifests: string[]): void {
  if (!manifests.includes('composer.json')) manifests.push('composer.json')
  try {
    const pkg = JSON.parse(content) as { require?: Record<string, string>; 'require-dev'?: Record<string, string> }
    for (const [name, version] of Object.entries({ ...pkg.require, ...pkg['require-dev'] })) {
      out.push(record(name, version ?? 'latest'))
    }
  } catch {
    // ignore malformed composer.json
  }
}

export function parseDependencies(files: DumpFile[]): ManifestSummary {
  const deps: DependencyRecord[] = []
  const manifests: string[] = []
  let monorepo = false
  let pkgCount = 0

  // Read every manifest that has content; deepest package.json wins for monorepo check.
  for (const file of files) {
    if (!file.content) continue
    const name = file.relPath.slice(file.relPath.lastIndexOf('/') + 1)

    if (name === 'package.json') {
      pkgCount++
      parsePackageJson(file.content, deps, manifests)
    } else if (name === 'requirements.txt') {
      parseRequirements(file.content, deps, manifests)
    } else if (name === 'go.mod') {
      parseGoMod(file.content, deps, manifests)
    } else if (name === 'Cargo.toml') {
      parseCargo(file.content, deps, manifests)
    } else if (name === 'composer.json') {
      parseComposer(file.content, deps, manifests)
    }
  }

  if (
    manifests.includes('package.json (workspaces)') ||
    files.some((f) => f.relPath === 'pnpm-workspace.yaml' && f.content) ||
    pkgCount > 1
  ) {
    monorepo = true
  }

  // Deduplicate by name, keeping the first (sorted later for stability).
  const seen = new Set<string>()
  const unique = deps.filter((d) => {
    if (seen.has(d.name)) return false
    seen.add(d.name)
    return true
  })

  return { deps: unique.sort((a, b) => a.name.localeCompare(b.name)), manifests, monorepo }
}