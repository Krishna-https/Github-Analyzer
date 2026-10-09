import 'server-only'

import type { EvidenceItem } from '@/lib/types'
import type { FileCategory } from './types'

/**
 * Evidence detection for the Overview evidence card. Each item is produced by
 * one or more independent signals that agree on the same conclusion; the
 * confidence grade mirrors how many agree:
 *   High   — manifest and file-level signals both found it (2+ independent sources)
 *   Medium — exactly one strong signal
 *   Low    — a heuristic guess (folder layout, lone file presence)
 */

export interface EvidenceInput {
  categories: Map<string, FileCategory>
  deps: Array<{ name: string; category: string }>
  pyModules: Map<string, string[]> // relPath -> python module names
  hasTsConfig: boolean
  hasDockerfile: boolean
  hasCI: boolean
  hasRootIndexHtml: boolean
  hasSql: boolean
  hasModelsDir: boolean
  testFileCount: number
  monorepo: boolean
  files: Array<{ relPath: string }>
}

function signal(icon: string, description: string, type: string, confidence: EvidenceItem['confidence']): EvidenceItem {
  return { icon, description, type, confidence }
}

const FRONTEND_PKGS = new Set([
  'react', 'react-dom', 'next', 'vue', 'svelte', 'preact', 'solid-js', 'htmx', '@angular/core', 'ember-source',
])
const BACKEND_PKGS = new Set([
  'express', 'fastify', 'koa', 'hapi', '@nestjs/core', 'hono', 'restify', 'sails', 'feathers', 'adonisjs', 'apollo-server',
])
const BACKEND_PY = new Set(['django', 'flask', 'fastapi', 'bottle', 'tornado', 'aiohttp'])
const DATA_PKGS = new Set([
  'pg', 'mysql', 'mysql2', 'sqlite3', 'better-sqlite3', 'mongoose', 'sequelize', 'typeorm', 'prisma',
  '@prisma/client', 'knex', 'redis', 'ioredis', 'mongodb', 'postgres', 'drizzle-orm', 'mssql', 'supabase',
])
const DATA_PY = new Set(['sqlalchemy', 'sqlmodel', 'peewee', 'psycopg2', 'django-db', 'pymongo', 'sqlite3', 'mysql-connector-python'])
const TEST_PKGS = new Set([
  'jest', 'vitest', 'mocha', 'chai', 'cypress', 'playwright', '@playwright/test',
  'supertest', 'enzyme', 'sinon', 'nock', '@testing-library/react', 'jasmine', 'karma', 'ava',
])

export function detectEvidence(input: EvidenceInput): { evidence: EvidenceItem[]; detectedBy: string[] } {
  const evidence: EvidenceItem[] = []
  const detectedBy: string[] = []

  const depNames = input.deps.map((d) => d.name)
  const depSet = new Set(depNames)

  // Python-level signals are only reachable through imports, not a manifest.
  const pyBackendHits = [...input.pyModules.values()].flat().filter((m) => BACKEND_PY.has(m)).length
  const pyDataHits = [...input.pyModules.values()].flat().filter((m) => DATA_PY.has(m)).length

  const jsxFiles = [...input.categories.entries()].filter(([, c]) => c === 'frontend').length
  const backendFiles = [...input.categories.entries()].filter(([, c]) => c === 'backend').length
  const dataFiles = [...input.categories.entries()].filter(([, c]) => c === 'data').length

  const frameworkInManifest = (pkgSet: Set<string>) => [...depSet].some((d) => pkgSet.has(d))

  /* Frontend framework */
  const feManifest = frameworkInManifest(FRONTEND_PKGS)
  const feFile = jsxFiles > 0
  if (feManifest && feFile) {
    evidence.push(signal('atom', 'React frontend detected', 'Framework Evidence', 'High'))
  } else if (feManifest) {
    // Name it by what's actually in the manifest.
    const name = [...depSet].find((d) => FRONTEND_PKGS.has(d))!
    const pretty = name === '@angular/core' ? 'Angular' : name[0].toUpperCase() + name.slice(1)
    evidence.push(signal('atom', `${pretty} frontend detected`, 'Framework Evidence', 'High'))
  } else if (feFile) {
    evidence.push(signal('atom', 'Frontend components detected', 'Framework Evidence', 'Medium'))
  }

  /* Backend / API */
  const beManifest = frameworkInManifest(BACKEND_PKGS)
  const bePy = pyBackendHits > 0
  const beFile = backendFiles > 0
  if ((beManifest && beFile) || (beManifest && bePy)) {
    const name = [...depSet].find((d) => BACKEND_PKGS.has(d)) ?? (bePy ? 'Python' : 'backend')
    evidence.push(signal('server', `${name} API detected`, 'Runtime Evidence', 'High'))
  } else if (beManifest || bePy || beFile) {
    evidence.push(signal('server', 'Backend service detected', 'Runtime Evidence', 'Medium'))
  }

  /* Data layer */
  const dbManifest = frameworkInManifest(DATA_PKGS)
  const dbPy = pyDataHits > 0
  const dbFile = dataFiles > 0 || (input.hasModelsDir && (dataFiles > 0 || dbManifest)) || input.hasSql
  if ((dbManifest && dbFile) || (dbManifest && dbPy)) {
    let dbName = [...depSet].find((d) => DATA_PKGS.has(d)) ?? ''
    dbName =
      dbName === 'pg' || dbName === 'postgres' || dbName === 'pg-promise'
        ? 'PostgreSQL'
        : dbName === 'mongoose' || dbName === 'mongodb'
          ? 'MongoDB'
          : dbName === 'redis' || dbName === 'ioredis'
            ? 'Redis'
            : dbName === 'mysql' || dbName === 'mysql2'
              ? 'MySQL'
              : dbName === 'sqlite3' || dbName === 'better-sqlite3'
                ? 'SQLite'
                : dbName === 'prisma' || dbName === '@prisma/client' ? 'Prisma' : dbName
    evidence.push(signal('database', `${dbName} integration detected`, 'Data Evidence', 'High'))
  } else if (dbManifest || dbPy || dbFile) {
    evidence.push(signal('database', 'Data layer detected', 'Data Evidence', 'Medium'))
  }

  /* TypeScript */
  if (input.hasTsConfig) {
    const tsFiles = input.files.filter((f) => /\.(ts|tsx|mts|cts)$/i.test(f.relPath)).length
    evidence.push(
      signal('layers', `TypeScript project (${tsFiles} .ts files)`, 'Language Evidence', tsFiles > 0 ? 'High' : 'Medium')
    )
  }

  /* Tests */
  if (input.testFileCount > 0) {
    const hasTestFramework = [...depSet].some((d) => TEST_PKGS.has(d))
    evidence.push(
      signal(
        'flask',
        `${input.testFileCount} test file${input.testFileCount === 1 ? '' : 's'} detected`,
        'Quality Evidence',
        hasTestFramework ? 'High' : 'Medium'
      )
    )
  }

  /* Static site */
  if (input.hasRootIndexHtml && !feManifest && !feFile && !beManifest && !beFile && !dbManifest && !dbFile) {
    evidence.push(signal('atom', 'Static website detected', 'Project Evidence', 'Medium'))
  }

  /* Docker */
  if (input.hasDockerfile) {
    evidence.push(signal('layers', 'Containerized with Docker', 'Infrastructure Evidence', 'High'))
  }

  /* CI */
  if (input.hasCI) {
    evidence.push(signal('route', 'GitHub Actions CI detected', 'Engineering Evidence', 'High'))
  }

  /* Monorepo */
  if (input.monorepo) {
    evidence.push(signal('layers', 'Monorepo / workspace detected', 'Project Evidence', 'High'))
  }

  detectedBy.push(...evidence.map((e) => e.description))

  return { evidence: evidence.slice(0, 8), detectedBy: detectedBy.slice(0, 6) }
}