import 'server-only'

import { isBinaryPath, languageInfo } from './languages'
import type { DumpFile, FileCategory, FileClassification } from './types'

/**
 * Detected-by-content package sets. These classify a file by *what it imports*,
 * which is what keeps classification honest when the folder layout is messy.
 */
const FRONTEND_PKGS = [
  'react', 'react-dom', 'react-native', 'next', 'vue', 'vue-router', 'nuxt',
  'nuxt3', 'svelte', 'preact', 'solid-js', 'htmx', 'ember-source',
  '@angular/core', '@angular/common', '@angular/router', 'react-router',
  'react-router-dom', 'redux', '@reduxjs/toolkit', 'zustand', 'mobx', 'jotai',
  'react-query', '@tanstack/react-query', '@testing-library/react',
]
const BACKEND_PKGS = [
  'express', 'fastify', 'koa', 'hapi', 'restify', 'uws', 'hono', 'sails',
  'loopback', 'feathers', 'adonisjs', '@nestjs/core', '@nestjs/common',
  'graphql-yoga', 'apollo-server', 'express-graphql', 'morgan', 'helmet',
  'cors', 'body-parser', 'ws', 'socket.io', 'nodemailer', 'jsonwebtoken',
  'bcrypt', 'bcryptjs', 'passport', 'cookie-parser', 'express-session',
]
const DATA_PKGS = [
  'pg', 'pg-promise', 'mysql', 'mysql2', 'mariadb', 'sqlite3', 'better-sqlite3',
  'sql.js', 'sqlite', 'libsql', 'mongoose', 'sequelize', 'sequelize-typescript',
  'typeorm', 'prisma', '@prisma/client', 'knex', 'redis', 'ioredis', 'mssql',
  'mongodb', 'postgres', 'drizzle-orm', 'drizzle-kit', 'firebase-admin',
  'supabase', '@supabase/supabase-js', 'neo4j-driver', 'clickhouse', 'mysql2/promise',
]
const TEST_PKGS = [
  'jest', 'vitest', 'mocha', 'chai', 'jasmine', 'karma', 'ava', 'tap', 'uvu',
  'cypress', 'playwright', '@playwright/test', 'supertest', 'enzyme', 'puppeteer',
  '@testing-library/jest-dom', '@testing-library/user-event', 'sinon', 'nock',
]

const FRONTEND_SET = new Set(FRONTEND_PKGS)
const BACKEND_SET = new Set(BACKEND_PKGS)
const DATA_SET = new Set(DATA_PKGS)
const TEST_SET = new Set(TEST_PKGS)

/** Maps a dependency specifier to its bare package name ('@scope/pkg' keeps both segments). */
function packageName(spec: string): string {
  const cleaned = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0]
  return cleaned.replace(/^(node:)/, '')
}

/** Import specifiers appearing in a JS/TS file (raw, deduplicated). */
function jsImports(content: string): string[] {
  const found: string[] = []
  const fromRe = /^\s*import\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/gm
  const sideRe = /^\s*import\s+['"]([^'"]+)['"]/gm
  const requireRe = /\brequire\(['"]([^'"]+)['"]\)/g
  const dynamicRe = /\bimport\(['"]([^'"]+)['"]\)/g

  for (const re of [fromRe, sideRe, requireRe, dynamicRe]) {
    let m: RegExpExecArray | null
    while ((m = re.exec(content)) !== null) {
      if (!found.includes(m[1])) found.push(m[1])
    }
  }
  return found
}

/** Python module names from from/import lines (module-relative, so signal is coarser). */
function pyImports(content: string): string[] {
  const found: string[] = []
  const re = /^\s*(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))/gm
  let m: RegExpExecArray | null
  while ((m = re.exec(content)) !== null) {
    const mod = (m[1] || m[2] || '').split('.')[0]
    if (mod && !found.includes(mod)) found.push(mod)
  }
  return found
}

/** Whether content plausibly contains JSX (React components). */
function looksLikeJsx(content: string): boolean {
  return /(?:return\s*\(?\s*|=>\s*\(?\s*|\bjsx\()\s*<\s*[a-zA-Z][\w.]*(\s|>|\/)/.test(content)
}

const TEST_NAME = /\.(test|spec)\./i
const TEST_DIR = /(^|\/)(__tests__|tests?|e2e|integration|spec\/)(\/|$)/i
const TEST_PREFIX = /_test\.(py|rb)$/i

/**
 * Tooling/build config files whose extension is `.ts`/`.js` but which are not
 * application source (next.config.ts, vite.config.js, tsconfig.json, …).
 */
const CONFIG_FILE =
  /(^|\/)(next|vite|vitest|jest|tailwind|postcss|webpack|rollup|esbuild|babel|metro|nuxt|astro|svelte|eslint|prettier|commitlint|stylelint|knip|turbo|tsup|tsup-node|drizzle|knexfile|jest\.config|playwright|cypress)\.config\.[cm]?[jt]s$|(^|\/)tsconfig(\..+)?\.json$|(^|\/)jsconfig(\.\w+)?\.json$|(^|\/)\.[a-z]+rc(\.[cm]?[jt]s|\.json|\.ya?ml)?$/i

/** Stylesheet files belong to the presentation layer. */
const STYLE_EXT = /\.(css|scss|sass|less|styl)$/i

/* Strong path markers: an exact directory or filename fragment that itself is enough. */
const PATH_MARKERS: Array<{ re: RegExp; category: FileCategory }> = [
  { re: /(^|\/)(components?|pages?|views?|routes?(?!\/api)|frontend|client|ui)(\/|$)/i, category: 'frontend' },
  { re: /(^|\/)(api|controllers?|server|backend|middleware|handlers?|services?)(\/|$)/i, category: 'backend' },
  { re: /(^|\/)(models?|migrations?|database|db(?:\/|$)|schema|repositories?|repos?)(\/|$)/i, category: 'data' },
  { re: /(^|\/)(utils?|helpers?|lib|shared|common|constants?)(\/|$)/i, category: 'utility' },
]

/**
 * Classifies one file of a cloned repo into a domain bucket.
 *
 * Signal sources, in strength order:
 *  1. manifest-backed imports (react → frontend, express → backend, …)
 *  2. JSX syntax
 *  3. conventional path markers (src/components, api/, models/, …)
 *  4. extension-level role (docs/config/binary)
 *
 * Confidence reflects how many independent sources agree, mirroring the
 * evidence-card grades (High/Medium/Low).
 */
export function classifyFile(file: DumpFile): FileClassification {
  const relPath = file.relPath
  const lower = relPath.toLowerCase()

  // Tests are recognized from naming before anything else.
  if (TEST_NAME.test(relPath) || TEST_DIR.test(lower) || TEST_PREFIX.test(relPath)) {
    return { category: 'test', confidence: 'High' }
  }

  // Build/tooling config files are config regardless of their extension.
  if (CONFIG_FILE.test(relPath)) {
    return { category: 'config', confidence: 'High' }
  }

  const info = languageInfo(relPath)
  if (isBinaryPath(relPath) || (!info.isSource && !info.isConfig && !info.isDoc)) {
    return { category: 'unclassified', confidence: 'Low' }
  }
  if (info.isDoc) return { category: 'docs', confidence: 'High' }
  if (info.isConfig) return { category: 'config', confidence: 'High' }

  const content = file.content
  const isJsFamily = /\.(js|mjs|cjs|jsx|ts|mts|cts|tsx)$/i.test(relPath)
  const isPy = /\.py$/i.test(relPath)

  // Impactful signals map category → count of agreeing sources.
  const votes = new Map<FileCategory, number>()
  const mark = (cat: FileCategory, weight: number) =>
    votes.set(cat, (votes.get(cat) ?? 0) + weight)

  // 1. Package imports (weight 3 each). Only strong when the app actually has
  //    the framework — a lone stray import isn't proof, so we recover that in
  //    the evidence pass; here a single signal is still Medium confidence.
  if (content && isJsFamily) {
    for (const spec of jsImports(content)) {
      // Sub-path imports override the bare package: next/server is a route
      // handler (backend), even though `next` itself is a frontend framework.
      if (spec === 'next/server' || spec === 'next/headers') {
        mark('backend', 3)
        continue
      }
      const pkg = packageName(spec)
      if (FRONTEND_SET.has(pkg)) mark('frontend', 3)
      else if (BACKEND_SET.has(pkg)) mark('backend', 3)
      else if (DATA_SET.has(pkg)) mark('data', 3)
      else if (TEST_SET.has(pkg)) mark('test', 3)
    }
  }
  if (content && isPy) {
    for (const mod of pyImports(content)) {
      if (['django', 'flask', 'fastapi', 'bottle', 'tornado', 'aiohttp'].includes(mod)) mark('backend', 3)
      else if (['sqlalchemy', 'sqlmodel', 'django-db', 'peewee', 'psycopg2'].includes(mod) || mod === 'psycopg2') mark('data', 3)
      else if (['pytest', 'unittest'].includes(mod)) mark('test', 3)
    }
  }

  // 2. JSX syntax (weight 3) — a React file without any visible import still counts.
  if (content && isJsFamily && looksLikeJsx(content)) mark('frontend', 3)

  // 3. Conventional path markers (weight 2).
  for (const marker of PATH_MARKERS) {
    if (marker.re.test(lower)) mark(marker.category, 2)
  }

  if (votes.size === 0) {
    // Stylesheets are part of the presentation layer even without a framework
    // signal; other pure code with no signal is plain utility.
    if (STYLE_EXT.test(relPath)) return { category: 'frontend', confidence: 'Low' }
    return { category: isJsFamily || isPy ? 'utility' : 'unclassified', confidence: 'Low' }
  }

  const [top, score] = [...votes.entries()].sort((a, b) => b[1] - a[1])[0]
  const confidence: FileClassification['confidence'] = score >= 5 ? 'High' : score >= 3 ? 'Medium' : 'Low'
  return { category: top, confidence }
}

/** Share of files per category, used to size modules and spot the dominant layer. */
export function categoryCounts(classified: Map<string, FileCategory>): Record<FileCategory, number> {
  const counts = {
    frontend: 0, backend: 0, data: 0, test: 0, docs: 0, config: 0, utility: 0, unclassified: 0,
  } as Record<FileCategory, number>
  for (const cat of classified.values()) counts[cat] += 1
  return counts
}