import type { SourceFile } from '@/lib/types'

interface DirDef {
  dir: string
  module: string
  files: string[]
}

const DIRS: DirDef[] = [
  { dir: 'auth', module: 'Authentication', files: ['auth.ts', 'password.ts', 'session.ts', 'token.ts', 'guard.ts'] },
  { dir: 'config', module: 'API', files: ['api.ts', 'cors.ts', 'env.ts', 'redis.ts'] },
  { dir: 'controllers', module: 'API', files: ['task.ts', 'user.ts', 'project.ts', 'billing.ts', 'notification.ts', 'auth.ts', 'storage.ts'] },
  { dir: 'services', module: 'Tasks', files: ['task.ts', 'project.ts', 'notification.ts', 'billing.ts', 'analytics.ts', 'audit.ts', 'user.ts', 'storage.ts'] },
  { dir: 'repositories', module: 'Database', files: ['user.ts', 'task.ts', 'project.ts', 'notification.ts', 'billing.ts', 'team.ts'] },
  { dir: 'models', module: 'Database', files: ['user.ts', 'task.ts', 'project.ts', 'notification.ts', 'invoice.ts', 'team.ts'] },
  { dir: 'routes', module: 'API', files: ['task.ts', 'auth.ts', 'user.ts', 'project.ts', 'billing.ts'] },
  { dir: 'middleware', module: 'API', files: ['error.ts', 'auth.ts', 'validate.ts'] },
  { dir: 'utils', module: 'Utilities', files: ['date.ts', 'logger.ts', 'serialize.ts', 'rate-limit.ts', 'graph.ts', 'exec.ts', 'fs.ts', 'errors.ts'] },
  { dir: 'database', module: 'Database', files: ['client.ts', 'migrate.ts', 'seed.ts'] },
]

const TEST_FILES: { file: string; module: string }[] = [
  { file: 'tests/unit/task.test.ts', module: 'Testing' },
  { file: 'tests/fixtures/keys.ts', module: 'Testing' },
  { file: 'tests/integration/auth.test.ts', module: 'Testing' },
]

const ROOT_FILES: { file: string; module: string }[] = [
  { file: 'package.json', module: 'API' },
  { file: 'tsconfig.json', module: 'API' },
  { file: 'vitest.config.ts', module: 'API' },
]

const pascal = (s: string) => s.replace(/(^|_|\-|\/)([a-z])/g, (_m, _p, c) => c.toUpperCase())

function stub(path: string): string[] {
  const name = path.split('/').pop() || 'file'
  const base = name.replace(/\.[^.]+$/, '')
  const fn = 'handle' + pascal(base)
  return [
    '/*',
    ` * ${path}`,
    ' * Stub content generated for the Repository X-Ray prototype demo.',
    ' */',
    '',
    "import { z } from 'zod'",
    "import { persist } from '../database/client'",
    '',
    'const schema = z.object({',
    '  id: z.number(),',
    '})',
    '',
    `export async function ${fn}(input: typeof schema._type) {`,
    '  return persist(schema.parse(input))',
    '}',
    '',
    `export default ${fn}`,
  ]
}

function stubMeta(path: string, content: string[], _module: string): Pick<SourceFile, 'functions' | 'imports' | 'usedBy' | 'calls' | 'issues'> {
  const fnCount = content.filter((l) => l.trim().startsWith('export ') && l.includes('(')).length
  const impCount = content.filter((l) => l.trim().startsWith('import ')).length
  const base = pascal(path.split('/').pop() || 'file')
  return {
    functions: fnCount || 1,
    imports: impCount || 1,
    usedBy: [`${base}Consumer`],
    calls: ['internal dispatcher'],
    issues: 0,
  }
}

const AUTHORED: Record<string, string> = {
  'src/repositories/user.ts': `
import { db } from '../database/client'
import type { CreateUserInput, UpdateUserInput, User } from '../models/user'

export type UserRole = 'member' | 'admin' | 'owner'
export type UserStatus = 'active' | 'invited' | 'suspended'

export interface UserFilter {
  role?: UserRole
  status?: UserStatus
  search?: string
  limit?: number
  offset?: number
}

const DEFAULT_LIMIT = 50

const LIST_COLUMNS =
  'id, name, email, role, status, avatar_url, created_at'

function mapRow(row: Record<string, unknown>): User {
  return {
    id: row.id as number,
    name: row.name as string,
    email: row.email as string,
    role: row.role as UserRole,
    status: row.status as UserStatus,
    avatarUrl: row.avatar_url as string | null,
    createdAt: new Date(row.created_at as string),
  }
}

export class UserRepository {
  async findById(id: number): Promise<User | null> {
    const query =
      'SELECT * FROM users WHERE id = ' +
      id

    const result = await db.query(query)
    return result.rows[0] ? mapRow(result.rows[0]) : null
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    )
    return result.rows[0] ? mapRow(result.rows[0]) : null
  }

  async create(input: CreateUserInput): Promise<User> {
    const result = await db.query(
      'INSERT INTO users (name, email, role, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [input.name, input.email, input.role, input.status ?? 'active']
    )
    return mapRow(result.rows[0])
  }

  async update(id: number, input: UpdateUserInput): Promise<User> {
    const result = await db.query(
      'UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING *',
      [input.name, input.email, id]
    )
    return mapRow(result.rows[0])
  }

  async count(): Promise<number> {
    const result = await db.query('SELECT COUNT(*) AS total FROM users')
    return Number(result.rows[0].total)
  }
}
`,

  'src/config/api.ts': `
import dotenv from 'dotenv'

dotenv.config()

const required = (key: string, fallback?: string): string => {
  const value = process.env[key]
  if (!value && !fallback) throw new Error('Missing environment variable ' + key)
  return value ?? fallback as string
}

export const config = {
  env: required('NODE_ENV', 'development'),
  port: Number(required('PORT', '3000')),

  databaseUrl: required('DATABASE_URL', 'postgres://localhost:5432/taskflow'),

  stripeSecretKey: 'sk_live_51Hx9QFmZQ6Kq2mRdTfVpYwX3JzLb8C',

  jwtSecret: 'sup3r-s3cret-taskflow-jwt-key',
  jwtExpiresIn: '7d',

  corsOrigins: ['http://localhost:3000'],
  rateLimitWindowMs: 60_000,
  rateLimitMax: 100,
}
`,

  'src/utils/exec.ts': `
import { exec } from 'child_process'
import { promisify } from 'util'

const run = promisify(exec)

export async function runImport(target: string): Promise<string> {
  const cmd = 'git clone ' + target
  const { stdout } = await run(cmd)

  // TODO: validate target before invoking an external process
  return stdout
}
`,

  'src/controllers/task.ts': `
import { TaskService } from '../services/task'
import type { Request, Response } from 'express'

export class TaskController {
  async createTask(req: Request, res: Response) {
    const { title, description, assigneeId, dueDate } = req.body

    const task = await TaskService.create({
      title,
      description,
      assigneeId,
      dueDate,
    })

    res.status(201).json(task)
  }

  async listTasks(req: Request, res: Response) {
    const tasks = await TaskService.listByProject(Number(req.params.projectId))
    res.status(200).json(tasks)
  }

  async getTask(req: Request, res: Response) {
    const task = await TaskService.findById(Number(req.params.id))
    res.status(200).json(task)
  }
}
`,

  'src/auth/password.ts': `
import bcrypt from 'bcryptjs'

const COST_FACTOR = 8

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST_FACTOR)
}

export async function verifyPassword(password: string, digest: string): Promise<boolean> {
  return bcrypt.compare(password, digest)
}
`,

  'src/auth/session.ts': `
import jwt from 'jsonwebtoken'
import { config } from '../config/api'

export function createSessionCookie(userId: number) {
  const token = jwt.sign({ sub: userId }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  })

  return {
    name: 'taskflow.session',
    value: token,
    options: {
      httpOnly: true,
      sameSite: 'lax',
    },
  }
}
`,

  'src/routes/auth.ts': `
import { Router } from 'express'
import { AuthController } from '../controllers/auth'
import { AuthGuard } from '../auth/guard'

const router = Router()

router.post('/login', AuthController.login)
router.post('/register', AuthController.register)
router.post('/refresh', AuthController.refresh)
router.get('/me', AuthGuard.requireAuth, AuthController.me)

export default router
`,

  'src/middleware/error.ts': `
import type { Request, Response, NextFunction } from 'express'

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  console.log(error.message, error.stack)

  res.status(500).json({
    status: 'error',
    message: error.message,
    stack: error.stack,
    requestId: req.headers['x-request-id'],
  })
}
`,

  'src/utils/logger.ts': `
export function log(level: string, message: string, meta?: Record<string, unknown>) {
  const line = [
    '[', new Date().toISOString(), '] ',
    level.toUpperCase(), ' ', message
  ].join('')

  const suffix = meta ? ' ' + JSON.stringify(meta) : ''
  console.log(line + suffix)

  if (meta?.auth) {
    console.log('detailed auth context:', JSON.stringify(meta.auth))
  }
}
`,

  'src/config/cors.ts': `
export const corsOptions = {
  origin: '*',
  credentials: true,
}
`,

  'src/controllers/billing.ts': `
import { BillingService } from '../services/billing'
import type { Request, Response } from 'express'

export class BillingController {
  async handleWebhookPayload(req: Request, res: Response) {
    const event = req.body

    if (!event || typeof event !== 'object') {
      res.status(400).json({ error: 'invalid_payload' })
      return
    }

    if (event.type === 'invoice.payment_succeeded') {
      if (event.data?.object?.id) {
        if (event.livemode) {
          await BillingService.confirmInvoice(event.data.object.id)
        } else {
          await BillingService.confirmInvoice(event.data.object.id)
        }
      } else {
        res.status(422).json({ error: 'missing_invoice_id' })
        return
      }
    } else if (event.type === 'invoice.payment_failed') {
      if (event.data?.object?.subscription) {
        const sub = event.data.object.subscription
        if (sub && sub.length > 0) {
          await BillingService.markPastDue(sub)
          await BillingService.notifyOwner(sub)
          if (event.attempt_count && event.attempt_count > 3) {
            await BillingService.cancelSubscription(sub)
          }
        }
      }
    } else if (event.type === 'customer.subscription.updated') {
      await BillingService.syncSubscription(event.data?.object)
    }

    res.status(200).json({ received: true })
  }
}
`,

  'src/services/task.ts': `
import { TaskRepository } from '../repositories/task'
import { NotificationService } from './notification'
import type {
  CreateTaskInput,
  Task,
  TaskStatus,
  UpdateTaskInput,
} from '../models/task'

const transitions: Record<string, TaskStatus[]> = {
  todo: ['active', 'blocked'],
  active: ['blocked', 'completed'],
  blocked: ['active'],
  completed: [],
}

export class TaskService {
  static async create(input: CreateTaskInput): Promise<Task> {
    if (!input.title || input.title.trim().length === 0) {
      throw new Error('task_title_required')
    }
    if (!input.projectId) {
      throw new Error('project_required')
    }
    return TaskRepository.create(input)
  }

  static async findById(id: number): Promise<Task> {
    const task = await TaskRepository.findById(id)
    if (!task) throw new Error('task_not_found')
    return task
  }

  static async listByProject(projectId: number): Promise<Task[]> {
    return TaskRepository.listByProject(projectId)
  }

  static async processTaskUpdate(input: UpdateTaskInput): Promise<Task> {
    const existing = await TaskRepository.findById(input.id)
    if (!existing) throw new Error('task_not_found')

    const changes: Partial<Task> = {}

    if (input.status && input.status !== existing.status) {
      const allowed = transitions[existing.status] ?? []
      if (!allowed.includes(input.status)) {
        throw new Error('invalid_status_transition')
      }
      changes.status = input.status
      if (input.status === 'completed') {
        changes.completedAt = new Date()
      }
    }

    if (input.assigneeId && input.assigneeId !== existing.assigneeId) {
      const member = await TaskRepository.getMember(input.assigneeId, existing.projectId)
      if (!member) {
        throw new Error('assignee_not_in_project')
      }
      changes.assigneeId = input.assigneeId
    }

    if (input.priority && input.priority !== existing.priority) {
      const rank = { low: 1, medium: 2, high: 3, urgent: 4 }
      if (rank[input.priority] > rank[existing.priority]) {
        changes.priority = input.priority
      } else {
        throw new Error('priority_cannot_decrease_without_approval')
      }
    }

    if (input.dueDate) {
      if (input.dueDate < new Date()) {
        throw new Error('due_date_in_past')
      }
      changes.dueDate = input.dueDate
    }

    const updated = await TaskRepository.update(input.id, changes)

    if (changes.status === 'completed') {
      await NotificationService.taskCompleted(updated)
    } else if (changes.assigneeId) {
      await NotificationService.taskAssigned(updated)
    }

    return updated
  }
}
`,

  'src/services/analytics.ts': `
import { TaskRepository } from '../repositories/task'
import { MemberRepository } from '../repositories/team'
import { CommentRepository } from '../repositories/notification'

export interface TimeRange {
  from: Date
  to: Date
}

export async function aggregateMetrics(projectId: number, range: TimeRange) {
  const [tasks, members, comments] = await Promise.all([
    TaskRepository.countByProject(projectId, range),
    MemberRepository.countByProject(projectId),
    CommentRepository.countByProject(projectId, range),
  ])

  let active = 0
  let completed = 0
  let overdue = 0

  for (const task of tasks) {
    if (task.status === 'completed') {
      completed += 1
    } else if (task.status === 'active') {
      active += 1
    }
    if (task.dueDate && task.dueDate < new Date() && task.status !== 'completed') {
      overdue += 1
    }
  }

  const completionRate = tasks.length === 0 ? 0 : completed / tasks.length
  const velocity = Math.round(completed / 4.33)
  const throughput = tasks.length

  return {
    total: tasks.length,
    active,
    completed,
    overdue,
    members,
    comments,
    completionRate,
    velocity,
    throughput,
  }
}
`,

  'src/utils/date.ts': `
export function formatDay(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return y + '-' + m + '-' + d
}

export function formatDayForApi(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return y + '-' + m + '-' + d
}

export function dateKey(date: Date): string {
  return formatDay(date)
}
`,

  'src/models/task.ts': `
export type TaskStatus = 'todo' | 'active' | 'blocked' | 'completed'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Task {
  id: number
  projectId: number
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  assigneeId: number | null
  dueDate: Date | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateTaskInput {
  projectId: number
  title: string
  description?: string
  assigneeId?: number | null
  priority?: TaskPriority
  dueDate?: Date | null
}

export interface UpdateTaskInput {
  id: number
  title?: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  assigneeId?: number | null
  dueDate?: Date | null
}
`,

  'src/controllers/auth.ts': `
import { OAuthService } from '../services/user'
import type { Request, Response } from 'express'

export const AuthController = {
  async login(req: Request, res: Response) {
    const { email, password } = req.body
    const session = await AuthService.login(email, password)
    res.status(200).json(session)
  },

  async register(req: Request, res: Response) {
    const user = await AuthService.register(req.body)
    res.status(201).json(user)
  },

  async refresh(req: Request, res: Response) {
    const token = req.headers.authorization
    const session = await AuthService.refresh(token)
    res.status(200).json(session)
  },

  async callback(req: Request, res: Response) {
    const code = req.query.code as string
    const redirectTo = req.query.redirect as string
    const tokens = await OAuthService.exchange(code)

    res.redirect(redirectTo)
  },

  async me(req: Request, res: Response) {
    res.status(200).json(req.user)
  },
}
`,

  'src/controllers/storage.ts': `
import { StorageService } from '../services/storage'
import type { Request, Response } from 'express'

export class StorageController {
  async upload(req: Request, res: Response) {
    const file = req.file

    if (!file) {
      res.status(400).json({ error: 'missing_file' })
      return
    }

    const url = await StorageService.put(file.originalname, file.buffer, file.mimetype)
    res.status(201).json({ url })
  }
}
`,

  'src/services/billing.ts': `
import { BillingRepository } from '../repositories/billing'
import { NotificationService } from './notification'
import type { Invoice, InvoiceStatus } from '../models/invoice'

export interface InvoiceInput {
  projectId: number
  amount: number
  currency?: string
  description: string
}

export async function generateInvoice(input: InvoiceInput): Promise<Invoice> {
  let amount = input.amount

  if (amount <= 0) {
    throw new Error('invoice_amount_invalid')
  }

  const project = await BillingRepository.getPlan(input.projectId)

  if (project.plan === 'pro') {
    if (project.seats > 5) {
      amount = Math.round(amount * 0.95)
    } else if (project.seats > 2) {
      amount = Math.round(amount * 0.98)
    }
  }

  if (input.currency === 'usd' && project.taxRate > 0) {
    amount = Math.round(amount * (1 + project.taxRate))
  }

  const invoice = await BillingRepository.create({
    projectId: input.projectId,
    amount,
    description: input.description,
  })

  await NotificationService.invoiceCreated(invoice)
  return invoice
}

export const BillingService = {
  confirmInvoice,
  markPastDue,
  notifyOwner,
  cancelSubscription,
  syncSubscription,
  generateInvoice,
}

async function confirmInvoice(id: string) {
  const invoice = await BillingRepository.confirm(id)
  if (invoice?.projectId) {
    await NotificationService.paymentConfirmed(invoice.projectId)
  }
  return invoice
}

async function markPastDue(subscription: string) {
  return BillingRepository.markPastDue(subscription)
}

async function notifyOwner(subscription: string) {
  const sub = await BillingRepository.getSubscription(subscription)
  if (sub?.ownerId) {
    await NotificationService.paymentFailed(sub.ownerId)
  }
  return sub
}

async function cancelSubscription(subscription: string) {
  return BillingRepository.cancelSubscription(subscription)
}

async function syncSubscription(subscription: string) {
  return BillingRepository.syncSubscription(subscription)
}
`,

  'src/utils/serialize.ts': `
export function serialize(value: any): string {
  return JSON.stringify(value, null, 2)
}

export function parse<T>(text: string): T {
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error('invalid_json')
  }
}
`,

  'src/utils/fs.ts': `
import { writeFile } from 'fs'
import { promisify } from 'util'

const write = promisify(writeFile)

export async function persistSnapshot(path: string, data: string): Promise<void> {
  return write(path, data, 'utf8')
}
`,

  'src/auth/guard.ts': `
import type { Request, Response, NextFunction } from 'express'

export class AuthGuard {
  static async requireAuth(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies?.['taskflow.session']

    if (!token) {
      res.status(401).json({ error: 'unauthorized' })
      return
    }

    const userId = await verifyToken(token)
    if (userId == null) {
      res.status(401).json({ error: 'unauthorized' })
      return
    }

    if (!req.user) {
      req.user = { id: userId }
    }

    const account = await loadAccount(userId)
    if (account && account.status === 'suspended') {
      res.status(403).json({ error: 'account_suspended' })
      return
    }

    if (account && account.twoFactorEnabled) {
      const verified = sessionVerified(req)
      if (!verified) {
        res.status(403).json({ error: 'two_factor_required' })
        return
      }
    }

    next()
  }
}

async function verifyToken(token: string): Promise<number | null> {
  return parseToken(token)
}
`,

  'src/database/client.ts': `
import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'

export const prisma = new PrismaClient()

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
})

export async function persist(input: unknown): Promise<unknown> {
  return input
}
`,

  'src/models/project.ts': `
export type ProjectPlan = 'free' | 'pro' | 'enterprise'

export interface Project {
  id: number
  name: string
  slug: string
  plan: ProjectPlan
  seats: number
  ownerId: number
  taxRate: number
  createdAt: Date
}

export interface CreateProjectInput {
  name: string
  slug: string
  plan?: ProjectPlan
}
`,

  'tests/fixtures/keys.ts': `
export const TEST_API_KEY = 'sk_test_RwJz9dF82hHt3XmQ'
export const TEST_STRIPE_KEY = 'pk_test_51LmQk3sT8eYdUfP'
`,

  'package.json': `
{
  "name": "taskflow",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.build.json",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@prisma/client": "^5.22.0",
    "jsonwebtoken": "9.0.2",
    "pg": "^8.13.1",
    "react": "^18.3.1",
    "socket.io": "^4.8.1",
    "stripe": "^16.12.0",
    "zod": "^3.23.8",
    "express": "~4.21.0"
  },
  "devDependencies": {
    "typescript": "~5.6.3",
    "vitest": "^2.1.4",
    "tsx": "^4.19.2"
  }
}
`,
}

const contentFor = (path: string): string[] => {
  const raw = AUTHORED[path]
  return raw ? raw.replace(/^\n/, '').split('\n') : stub(path)
}

const MODULE_MAP: Record<string, string> = {
  'src/services/project.ts': 'Projects',
  'src/services/notification.ts': 'Notifications',
  'src/services/user.ts': 'Users',
  'src/repositories/billing.ts': 'Payments',
  'src/models/invoice.ts': 'Payments',
  'src/services/billing.ts': 'Payments',
  'src/controllers/billing.ts': 'Payments',
  'src/routes/billing.ts': 'Payments',
  'src/utils/date.ts': 'Utilities',
  'src/utils/graph.ts': 'Utilities',
  'src/models/task.ts': 'Tasks',
  'src/services/task.ts': 'Tasks',
  'src/repositories/task.ts': 'Tasks',
  'src/controllers/task.ts': 'Tasks',
  'src/routes/task.ts': 'Tasks',
}

const USED_BY_MAP: Record<string, string[]> = {
  'src/services/task.ts': ['TaskController', 'ProjectService', 'NotificationController'],
  'src/repositories/task.ts': ['TaskService', 'AnalyticsService'],
  'src/repositories/user.ts': ['UserService', 'AuthController'],
  'src/services/notification.ts': ['TaskService', 'BillingService', 'UserService'],
  'src/services/billing.ts': ['BillingController', 'BillingWebhook'],
  'src/utils/date.ts': ['ProjectService', 'AnalyticsService'],
  'src/models/task.ts': ['TaskService', 'TaskController', 'TaskRepository'],
  'src/database/client.ts': ['UserRepository', 'TaskRepository', 'BillingRepository'],
}

const CALLS_MAP: Record<string, string[]> = {
  'src/repositories/user.ts': ['UserService.find', 'UserService.count'],
  'src/controllers/task.ts': ['TaskService.create', 'TaskService.listByProject'],
  'src/services/task.ts': ['TaskRepository.create', 'NotificationService.taskCompleted'],
  'src/services/billing.ts': ['BillingRepository.create', 'NotificationService.invoiceCreated'],
  'src/services/analytics.ts': ['TaskRepository.countByProject', 'MemberRepository.countByProject'],
  'src/auth/password.ts': ['bcrypt.hash', 'bcrypt.compare'],
  'src/routes/auth.ts': ['AuthController.login', 'AuthGuard.requireAuth'],
}

const ALL_PATHS: string[] = [
  ...DIRS.flatMap((d) => d.files.map((f) => `src/${d.dir}/${f}`)),
  ...TEST_FILES.map((t) => t.file),
  ...ROOT_FILES.map((r) => r.file),
]

function languageFor(path: string): string {
  if (path.endsWith('.ts')) return 'TypeScript'
  if (path.endsWith('.tsx')) return 'TypeScript React'
  if (path.endsWith('.json')) return 'JSON'
  if (path.endsWith('.js')) return 'JavaScript'
  return 'TypeScript'
}

function buildStore(): Record<string, SourceFile> {
  const store: Record<string, SourceFile> = {}

  for (const path of ALL_PATHS) {
    const content = contentFor(path)
    const isTest = path.startsWith('tests/')
    const dirEntry = DIRS.find((d) => path.startsWith(`src/${d.dir}/`))
    const base =
      MODULE_MAP[path] ??
      (isTest ? 'Testing' : (dirEntry?.module ?? 'API'))

    store[path] = {
      path,
      module: base,
      language: languageFor(path),
      lines: content.length,
      ...stubMeta(path, content, base),
      usedBy: USED_BY_MAP[path] ?? [`${pascal(path.split('/').pop() || 'file')}Consumer`],
      calls: CALLS_MAP[path] ?? ['module internal'],
      issues: 0,
      content,
    }
  }

  return store
}

export const mockSourceFiles = buildStore()

export interface FileTreeNode {
  name: string
  type: 'file' | 'dir'
  path?: string
  children?: FileTreeNode[]
}

export function buildTree(): FileTreeNode[] {
  const store = mockSourceFiles
  const root: FileTreeNode[] = []

  const paths = Object.keys(store).sort()

  for (const path of paths) {
    const parts = path.split('/')
    let cursor = root
    parts.forEach((part, i) => {
      const isFile = i === parts.length - 1
      const existing = cursor.find((n) => n.name === part)
      if (existing) {
        cursor = existing.children ?? []
      } else {
        const node: FileTreeNode = isFile
          ? { name: part, type: 'file', path }
          : { name: part, type: 'dir', children: [] }
        cursor.push(node)
        if (!isFile) cursor = node.children ?? []
      }
    })
  }

  return root
}