import { mockSourceFiles } from './mockSourceFiles'
import type {
  AnalysisStep,
  ArchitectureNode,
  CodeSnippet,
  ComplexityBucket,
  ComplexityFinding,
  DependencyRecord,
  EvidenceItem,
  FunctionRecord,
  Issue,
  ModuleRecord,
  Repository,
  Rule,
  SecurityFinding,
} from '../lib/types'

/* ------------------------------------------------------------------ */
/* Repository                                                          */
/* ------------------------------------------------------------------ */

export const mockRepository: Repository = {
  owner: 'acme',
  name: 'taskflow',
  fullName: 'acme/taskflow',
  description: 'Collaborative task management platform for teams.',
  url: 'https://github.com/acme/taskflow',
  branch: 'main',
  stars: 1284,
  forks: 176,
  openIssues: 43,
  files: 248,
  sourceFiles: 176,
  functions: 438,
  classes: 34,
  modules: 12,
  dependencies: 76,
  tests: 143,
  languages: [
    { name: 'TypeScript', percent: 62, color: '#3178c6' },
    { name: 'JavaScript', percent: 24, color: '#f1e05a' },
    { name: 'CSS', percent: 8, color: '#8250df' },
    { name: 'JSON', percent: 6, color: '#0ea5e9' },
  ],
  lastCommit: '9f3b2c1 — feat(tasks): add bulk status transition',
  license: 'MIT',
}

/* ------------------------------------------------------------------ */
/* Analysis pipeline                                                   */
/* ------------------------------------------------------------------ */

export const analysisSteps: AnalysisStep[] = [
  { id: 'received', label: 'Repository received', detail: 'Cloned remote references from https://github.com/acme/taskflow' },
  { id: 'structure', label: 'Repository structure scanned', detail: 'Indexed 248 files across 12 top-level directories' },
  { id: 'languages', label: 'Languages detected', detail: 'TypeScript 62%, JavaScript 24%, CSS 8%, JSON 6%' },
  { id: 'architecture', label: 'Architecture analyzed', detail: 'Layered pipeline Frontend → Routes → Controllers → Services → Repositories → Database' },
  { id: 'modules', label: 'Modules identified', detail: '12 modules: Authentication, Tasks, Payments, Analytics, ...' },
  { id: 'parsed', label: 'Source files parsed', detail: '176 source files tokenized into 34,209 statements' },
  { id: 'functions', label: 'Functions extracted', detail: '438 function definitions with call relationships' },
  { id: 'complexity', label: 'Complexity analyzed', detail: 'Cyclomatic complexity computed for 438 functions' },
  { id: 'security', label: 'Security rules checked', detail: '16 rule violations across 6 severity classes' },
  { id: 'dependencies', label: 'Dependencies analyzed', detail: '76 dependencies resolved, 1 known mock vulnerability' },
  { id: 'issues', label: 'Potential issues generated', detail: '24 findings grouped by category and severity' },
]

/* ------------------------------------------------------------------ */
/* Evidence                                                            */
/* ------------------------------------------------------------------ */

export const mockEvidence: EvidenceItem[] = [
  {
    icon: 'atom',
    description: 'React frontend detected',
    type: 'Framework Evidence',
    confidence: 'High',
  },
  {
    icon: 'server',
    description: 'Express API detected',
    type: 'Runtime Evidence',
    confidence: 'High',
  },
  {
    icon: 'database',
    description: 'User and Project models detected',
    type: 'Schema Evidence',
    confidence: 'High',
  },
  {
    icon: 'route',
    description: 'Task management routes detected',
    type: 'API Evidence',
    confidence: 'High',
  },
  {
    icon: 'bell',
    description: 'Notification service detected',
    type: 'Architecture Evidence',
    confidence: 'Medium',
  },
  {
    icon: 'layers',
    description: 'PostgreSQL integration detected',
    type: 'Data Evidence',
    confidence: 'High',
  },
  {
    icon: 'flask',
    description: '143 tests detected',
    type: 'Quality Evidence',
    confidence: 'High',
  },
]

/* ------------------------------------------------------------------ */
/* Architecture                                                        */
/* ------------------------------------------------------------------ */

export const mockArchitecture: ArchitectureNode[] = [
  {
    id: 'frontend',
    label: 'React Frontend',
    layer: 'Frontend',
    subtitle: 'Reacts to live task/project updates',
    files: 52,
    functions: 38,
    responsibilities: [
      'Render boards, tasks and reports',
      'Manage local UI state',
      'Call the API through typed client',
    ],
    dependencies: ['routes'],
    description:
      'A single-page React application consuming the TaskFlow API. Detected JSX entry point at src/main.tsx with 38 exported components.',
  },
  {
    id: 'routes',
    label: 'API Routes',
    layer: 'Routing',
    subtitle: 'Express router mounting controllers',
    files: 6,
    functions: 41,
    responsibilities: [
      'Map HTTP endpoints to controllers',
      'Attach middleware guards',
      'Validate request shape',
    ],
    dependencies: ['controller'],
    description:
      'Express routers wire endpoints such as /api/tasks, /api/auth and /api/projects to their controllers.',
  },
  {
    id: 'controller',
    label: 'TaskController',
    layer: 'Controller',
    subtitle: 'HTTP boundary for task operations',
    files: 8,
    functions: 36,
    responsibilities: [
      'Handle HTTP requests',
      'Map domain errors to status codes',
      'Orchestrate service calls',
    ],
    dependencies: ['service'],
    description:
      'Controllers translate HTTP input into service calls and render JSON responses. TaskController exposes create, list, get and update.',
  },
  {
    id: 'service',
    label: 'TaskService',
    layer: 'Service',
    subtitle: 'Business logic for tasks',
    files: 7,
    functions: 28,
    responsibilities: [
      'Create tasks',
      'Update tasks',
      'Assign users',
      'Validate task status',
    ],
    dependencies: ['repository'],
    description:
      'The service layer holds domain rules: status transitions, assignment rules and priority floors. Detected 28 exported functions.',
  },
  {
    id: 'repository',
    label: 'TaskRepository',
    layer: 'Repository',
    subtitle: 'Persistence boundary',
    files: 6,
    functions: 19,
    responsibilities: [
      'Persist task records',
      'Execute queries',
      'Map rows to models',
    ],
    dependencies: ['database'],
    description:
      'Repositories abstract the database behind typed APIs. TaskRepository performs CRUD plus member lookup for assignment validation.',
  },
  {
    id: 'database',
    label: 'PostgreSQL',
    layer: 'Database',
    subtitle: 'Relational datastore',
    files: 9,
    functions: 5,
    responsibilities: [
      'Store relational data',
      'Provide transactions',
      'Maintain indexes',
    ],
    dependencies: [],
    description:
      'PostgreSQL accessed through Prisma Client and a raw pg Pool. Detected 14 migration files defining users, projects, tasks and invoices.',
  },
]

/* ------------------------------------------------------------------ */
/* Modules                                                             */
/* ------------------------------------------------------------------ */

export const mockModules: ModuleRecord[] = [
  {
    id: 'authentication',
    name: 'Authentication',
    description: 'Login, registration, sessions, JWTs and password hashing.',
    files: 14,
    functions: 32,
    icon: 'KeyRound',
    keyFiles: ['src/auth/auth.ts', 'src/auth/password.ts', 'src/auth/session.ts', 'src/routes/auth.ts'],
    responsibilities: ['Issue and refresh sessions', 'Hash and verify passwords', 'Guard protected routes'],
    dependsOn: ['Users', 'Database', 'API'],
  },
  {
    id: 'users',
    name: 'Users',
    description: 'Profiles, roles, invitations and account lifecycle.',
    files: 16,
    functions: 38,
    icon: 'Users',
    keyFiles: ['src/models/user.ts', 'src/services/user.ts', 'src/repositories/user.ts'],
    responsibilities: ['Manage user profiles', 'Assign roles', 'Onboard and suspend accounts'],
    dependsOn: ['Database'],
  },
  {
    id: 'projects',
    name: 'Projects',
    description: 'Workspaces, project membership and plan configuration.',
    files: 18,
    functions: 41,
    icon: 'FolderKanban',
    keyFiles: ['src/models/project.ts', 'src/services/project.ts', 'src/routes/project.ts'],
    responsibilities: ['Create and archive projects', 'Manage membership', 'Read plan configuration'],
    dependsOn: ['Users', 'Database'],
  },
  {
    id: 'tasks',
    name: 'Tasks',
    description: 'Task lifecycle, status transitions, assignments and priorities.',
    files: 27,
    functions: 83,
    icon: 'ListChecks',
    keyFiles: ['src/models/task.ts', 'src/services/task.ts', 'src/controllers/task.ts', 'src/repositories/task.ts'],
    responsibilities: ['Create and update tasks', 'Enforce status transitions', 'Assign and reassign members'],
    dependsOn: ['Projects', 'Notifications', 'Users'],
  },
  {
    id: 'notifications',
    name: 'Notifications',
    description: 'In-app and real-time notifications for task and project events.',
    files: 9,
    functions: 24,
    icon: 'Bell',
    keyFiles: ['src/services/notification.ts', 'src/models/notification.ts', 'src/controllers/notification.ts'],
    responsibilities: ['Send task-completed events', 'Push assignment alerts', 'Fan out to Socket.io'],
    dependsOn: ['Tasks', 'Users'],
  },
  {
    id: 'payments',
    name: 'Payments',
    description: 'Invoicing, billing plans and Stripe webhook handling.',
    files: 13,
    functions: 37,
    icon: 'CreditCard',
    keyFiles: ['src/models/invoice.ts', 'src/services/billing.ts', 'src/controllers/billing.ts'],
    responsibilities: ['Generate invoices', 'Apply plan discounts', 'Handle Stripe webhooks'],
    dependsOn: ['Projects', 'Notifications'],
  },
  {
    id: 'analytics',
    name: 'Analytics',
    description: 'Aggregated metrics, throughput and velocity reporting.',
    files: 11,
    functions: 21,
    icon: 'BarChart3',
    keyFiles: ['src/services/analytics.ts', 'src/repositories/task.ts'],
    responsibilities: ['Aggregate project metrics', 'Compute completion and velocity', 'Feed dashboard charts'],
    dependsOn: ['Tasks', 'Users'],
  },
  {
    id: 'database',
    name: 'Database',
    description: 'Prisma schema, migrations, seeding and connection pooling.',
    files: 15,
    functions: 30,
    icon: 'Database',
    keyFiles: ['src/database/client.ts', 'src/database/migrate.ts', 'src/database/seed.ts'],
    responsibilities: ['Own Prisma models', 'Run migrations', 'Expose typed clients'],
    dependsOn: [],
  },
  {
    id: 'api',
    name: 'API',
    description: 'Routing, middleware, controllers and the public HTTP surface.',
    files: 12,
    functions: 42,
    icon: 'Globe',
    keyFiles: ['src/routes/task.ts', 'src/controllers/task.ts', 'src/middleware/error.ts'],
    responsibilities: ['Expose REST endpoints', 'Mount middleware', 'Standardize error responses'],
    dependsOn: ['Tasks', 'Users', 'Projects', 'Authentication'],
  },
  {
    id: 'ui',
    name: 'UI',
    description: 'React components, hooks and the design-system layer.',
    files: 38,
    functions: 28,
    icon: 'Laptop',
    keyFiles: ['src/components/Board.tsx', 'src/components/TaskCard.tsx'],
    responsibilities: ['Render interactive boards', 'Compose layout primitives', 'Consume API hooks'],
    dependsOn: ['API', 'Tasks'],
  },
  {
    id: 'utilities',
    name: 'Utilities',
    description: 'Date handling, logging, serialization and rate limiting.',
    files: 11,
    functions: 40,
    icon: 'Wrench',
    keyFiles: ['src/utils/date.ts', 'src/utils/logger.ts', 'src/utils/rate-limit.ts'],
    responsibilities: ['Format dates consistently', 'Provide structured logging', 'Throttle callers'],
    dependsOn: [],
  },
  {
    id: 'testing',
    name: 'Testing',
    description: 'Unit, integration and fixture coverage across the repository.',
    files: 66,
    functions: 23,
    icon: 'FlaskConical',
    keyFiles: ['tests/unit/task.test.ts', 'tests/integration/auth.test.ts', 'tests/fixtures/keys.ts'],
    responsibilities: ['Cover service contracts', 'Exercise auth flows', 'Provide test fixtures'],
    dependsOn: ['Tasks', 'Authentication', 'Utilities'],
  },
]

/* ------------------------------------------------------------------ */
/* Functions                                                           */
/* ------------------------------------------------------------------ */

export const mockFunctions: FunctionRecord[] = [
  { name: 'calculateTaskPriority()', file: 'src/services/task.ts', lines: 18, complexity: 4, calls: 3, status: 'Good', module: 'Tasks' },
  { name: 'processTaskUpdate()', file: 'src/services/task.ts', lines: 76, complexity: 14, calls: 9, status: 'Needs Review', module: 'Tasks' },
  { name: 'authenticateUser()', file: 'src/auth/auth.ts', lines: 42, complexity: 8, calls: 6, status: 'Moderate', module: 'Authentication' },
  { name: 'assignTask()', file: 'src/services/task.ts', lines: 31, complexity: 6, calls: 5, status: 'Good', module: 'Tasks' },
  { name: 'createProject()', file: 'src/services/project.ts', lines: 28, complexity: 5, calls: 4, status: 'Good', module: 'Projects' },
  { name: 'generateInvoice()', file: 'src/services/billing.ts', lines: 64, complexity: 12, calls: 3, status: 'Needs Review', module: 'Payments' },
  { name: 'sendNotification()', file: 'src/services/notification.ts', lines: 35, complexity: 7, calls: 12, status: 'Moderate', module: 'Notifications' },
  { name: 'hashPassword()', file: 'src/auth/password.ts', lines: 14, complexity: 2, calls: 8, status: 'Good', module: 'Authentication' },
  { name: 'resolveDependencies()', file: 'src/utils/graph.ts', lines: 52, complexity: 10, calls: 5, status: 'Moderate', module: 'Utilities' },
  { name: 'parseToken()', file: 'src/auth/token.ts', lines: 22, complexity: 4, calls: 9, status: 'Good', module: 'Authentication' },
  { name: 'serializeProject()', file: 'src/services/project.ts', lines: 16, complexity: 2, calls: 3, status: 'Good', module: 'Projects' },
  { name: 'handleWebhookPayload()', file: 'src/controllers/billing.ts', lines: 88, complexity: 18, calls: 4, status: 'High', module: 'Payments' },
  { name: 'migrateSchema()', file: 'src/database/migrate.ts', lines: 47, complexity: 7, calls: 1, status: 'Good', module: 'Database' },
  { name: 'throttleUpdates()', file: 'src/utils/rate-limit.ts', lines: 26, complexity: 5, calls: 2, status: 'Good', module: 'Utilities' },
  { name: 'runAudit()', file: 'src/services/audit.ts', lines: 59, complexity: 11, calls: 3, status: 'Needs Review', module: 'Analytics' },
  { name: 'aggregateMetrics()', file: 'src/services/analytics.ts', lines: 71, complexity: 13, calls: 6, status: 'Needs Review', module: 'Analytics' },
]

export const complexityBuckets: ComplexityBucket[] = [
  { name: 'Low', count: 312, color: '#4ade80' },
  { name: 'Moderate', count: 94, color: '#facc15' },
  { name: 'High', count: 26, color: '#fb923c' },
  { name: 'Critical', count: 6, color: '#ef4444' },
]

/* ------------------------------------------------------------------ */
/* Complexity findings                                                 */
/* ------------------------------------------------------------------ */

function findLine(path: string, marker: string, nth = 0): number {
  const content = mockSourceFiles[path]?.content ?? []
  let seen = 0
  for (let i = 0; i < content.length; i++) {
    if (content[i].includes(marker)) {
      if (seen === nth) return i
      seen += 1
    }
  }
  return 0
}

function snippet(
  path: string,
  from: string,
  to: string,
  highlights: string[],
  fromOffset = -1
): CodeSnippet {
  const content = mockSourceFiles[path]?.content ?? []
  const start = Math.max(0, findLine(path, from) + fromOffset)
  const end = Math.min(content.length, findLine(path, to) + 1)
  const lines = content.slice(start, end)
  const indent = highlights
    .map((m) => lines.findIndex((l) => l.includes(m)))
    .filter((i) => i >= 0)
  return {
    startLine: start + 1,
    highlight: [...new Set(indent)],
    lines,
  }
}

const primaryLine = (s: CodeSnippet): number => {
  const idx = s.highlight[0] ?? 0
  return s.startLine + idx
}

const complexityFinding = (
  id: string,
  functionName: string,
  file: string,
  lineCount: number,
  cyclomatic: number,
  nestingDepth: number,
  status: 'High' | 'Critical',
  reason: string,
  suggestion: string,
  ruleId: string,
  code: CodeSnippet
): ComplexityFinding => ({
  id,
  functionName,
  file,
  line: primaryLine(code),
  lineCount,
  cyclomatic,
  nestingDepth,
  status,
  reason,
  suggestion,
  ruleId,
  snippet: code,
})

export const mockComplexityFindings: ComplexityFinding[] = [
  complexityFinding(
    'CF-01',
    'processTaskUpdate()',
    'src/services/task.ts',
    76,
    14,
    5,
    'High',
    'The function contains multiple conditional branches and deeply nested logic.',
    'Split validation, task update, and notification logic into separate functions.',
    'QLT-001',
    snippet(
      'src/services/task.ts',
      'processTaskUpdate',
      'return updated',
      ['processTaskUpdate', 'existing.status', 'changes.status', 'if (changes.status']
    )
  ),
  complexityFinding(
    'CF-02',
    'handleWebhookPayload()',
    'src/controllers/billing.ts',
    88,
    18,
    6,
    'Critical',
    'Webhook handling has an execution path count of 18 with 6 levels of nested conditionals.',
    'Extract each event type into a dedicated handler and fail fast on unexpected payloads.',
    'QLT-001',
    snippet(
      'src/controllers/billing.ts',
      'handleWebhookPayload',
      'res.status(200)',
      ['invoice.payment_failed', 'event.attempt_count', 'if (sub && sub.length', 'cancelSubscription']
    )
  ),
  complexityFinding(
    'CF-03',
    'aggregateMetrics()',
    'src/services/analytics.ts',
    71,
    13,
    4,
    'High',
    'Loop-conditioned branches spread across four accumulation phases make the result hard to reason about.',
    'Replace the accumulation loop with a fold over typed aggregators and unit-test each.',
    'QLT-001',
    snippet(
      'src/services/analytics.ts',
      'aggregateMetrics',
      'completionRate',
      ['if (task.status', 'overdue += 1', 'completionRate']
    )
  ),
  complexityFinding(
    'CF-04',
    'requireAuth()',
    'src/auth/guard.ts',
    44,
    11,
    5,
    'High',
    'Authentication guard nests token, account and two-factor checks five levels deep.',
    'Return early for each guard condition instead of nesting, and extract a twoFactorRequired step.',
    'QLT-002',
    snippet(
      'src/auth/guard.ts',
      'static async requireAuth',
      'next()',
      ['twoFactorEnabled', 'if (!verified)', 'next()']
    )
  ),
]

/* ------------------------------------------------------------------ */
/* Security findings                                                   */
/* ------------------------------------------------------------------ */

const securityFinding = (
  id: string,
  severity: SecurityFinding['severity'],
  ruleId: string,
  title: string,
  file: string,
  evidence: string[],
  explanation: string,
  solution: string,
  code: CodeSnippet,
  fixed?: CodeSnippet
): SecurityFinding => ({
  id,
  severity,
  ruleId,
  title,
  file,
  line: primaryLine(code),
  evidence,
  explanation,
  solution,
  snippet: code,
  fixedSnippet: fixed,
})

export const mockSecurityFindings: SecurityFinding[] = [
  securityFinding(
    'SEC-001',
    'High',
    'SEC-001',
    'Potential SQL Injection',
    'src/repositories/user.ts',
    ['User-controlled input detected', 'SQL query detected', 'String concatenation detected'],
    'User-controlled input is combined with SQL query construction. Direct concatenation of a numeric path parameter into a raw query allows query shape to be influenced by a caller.',
    'Use parameterized queries instead of directly concatenating user input.',
    snippet('src/repositories/user.ts', 'const query', 'db.query(query)', ["SELECT * FROM users WHERE id", "' + '", "db.query(query)"]),
    {
      startLine: primaryLine(
        snippet('src/repositories/user.ts', 'const query', 'db.query(query)', ["db.query(query)"])
      ),
      highlight: [0],
      lines: [
        "const query = 'SELECT * FROM users WHERE id = $1'",
        'return db.query(query, [id])',
      ],
    }
  ),
  securityFinding(
    'SEC-002',
    'High',
    'SEC-002',
    'Hardcoded API Credential',
    'src/config/api.ts',
    ['Credential-like value detected', 'Literal secret in source code', 'No environment fallback'],
    'Credential-like value detected directly in source code. A Stripe live key and JWT secret are committed verbatim, which would leak through version control.',
    'Move the credential to environment-based configuration.',
    snippet('src/config/api.ts', 'stripeSecretKey', "jwtExpiresIn", ["stripeSecretKey", "jwtSecret"]),
    {
      startLine: 1,
      highlight: [0, 2],
      lines: [
        "stripeSecretKey: process.env.STRIPE_SECRET_KEY,",
        '',
        "jwtSecret: process.env.JWT_SECRET,",
      ],
    }
  ),
  securityFinding(
    'SEC-003',
    'Critical',
    'SEC-003',
    'Dangerous Command Execution',
    'src/utils/exec.ts',
    ['External process invocation detected', 'Shell built from untrusted input'],
    'A shell command is constructed by concatenating caller-provided input and executed through child_process. This can lead to arbitrary command injection.',
    'Import packages without shell execution, or validate the target against a strict allowlist.',
    snippet('src/utils/exec.ts', 'const cmd', 'return stdout', ["const cmd", "'git clone ' + target", "await run(cmd)"])
  ),
  securityFinding(
    'SEC-004',
    'Medium',
    'SEC-004',
    'Missing Input Validation',
    'src/controllers/task.ts',
    ['Request body accessed', 'Body passed straight to service', 'Validation pattern absent'],
    'Request data reaches business logic without the expected validation pattern. Controller destructures req.body and forwards it directly to the service layer.',
    'Validate the request payload with a schema (e.g. zod) before reaching business logic.',
    snippet('src/controllers/task.ts', 'createTask', 'res.status(201)', ["req.body", "TaskService.create"])
  ),
  securityFinding(
    'SEC-005',
    'Medium',
    'SEC-005',
    'Weak Password Hashing Configuration',
    'src/auth/password.ts',
    ['Low bcrypt cost factor', 'Hardcoded cost constant'],
    'Password hashing uses a bcrypt cost factor of 8. Modern guidance recommends a cost of at least 12 for interactive logins.',
    'Raise COST_FACTOR to 12 and make it environment-configurable.',
    snippet('src/auth/password.ts', 'COST_FACTOR', 'bcrypt.hash', ["COST_FACTOR = 8"])
  ),
  securityFinding(
    'SEC-006',
    'Medium',
    'SEC-006',
    'Session Cookie Missing Secure Flag',
    'src/auth/session.ts',
    ['Cookie options incomplete', 'secure flag absent'],
    'The session cookie sets httpOnly and sameSite but omits the secure flag, allowing transmission over plain HTTP in production.',
    'Set secure: true when NODE_ENV is production.',
    snippet('src/auth/session.ts', 'httpOnly', 'sameSite', ["httpOnly: true", "sameSite: 'lax'"])
  ),
  securityFinding(
    'SEC-007',
    'Medium',
    'SEC-007',
    'Login Route Without Rate Limiting',
    'src/routes/auth.ts',
    ['Auth endpoint detected', 'Rate-limit middleware absent'],
    'The login endpoint is mounted without rate-limiting middleware, enabling credential-stuffing and brute-force attempts.',
    'Attach rate limiting to auth endpoints and add account lockout after repeated failures.',
    snippet('src/routes/auth.ts', 'router', "router.post('/login')", ["router.post('/login')"])
  ),
  securityFinding(
    'SEC-008',
    'Medium',
    'SEC-008',
    'Unrestricted File Upload',
    'src/controllers/storage.ts',
    ['Upload endpoint detected', 'Size constraint absent', 'MIME allowlist absent'],
    'The upload handler stores whatever the client sends without size or type constraints, risking disk exhaustion and stored XSS.',
    'Reject files above a size limit and validate against an extension/MIME allowlist.',
    snippet('src/controllers/storage.ts', 'async upload', 'res.status(201)', ["const file = req.file", 'StorageService.put'])
  ),
  securityFinding(
    'SEC-009',
    'Low',
    'SEC-009',
    'Verbose Error Response',
    'src/middleware/error.ts',
    ['Internal details returned to client', 'Stack trace exposed'],
    'The global error handler returns error.message and the stack trace to clients, disclosing internals about the application.',
    'Log the stack server-side and return a generic error envelope to clients.',
    snippet('src/middleware/error.ts', 'errorHandler', 'requestId', ["message: error.message", "stack: error.stack"])
  ),
  securityFinding(
    'SEC-010',
    'Low',
    'SEC-010',
    'Use of any Type',
    'src/utils/serialize.ts',
    ['any typed parameter', 'Type unsoundness risk'],
    'serialize() accepts an any-typed value, disabling type-checking for every caller and hiding structural bugs.',
    'Type as unknown and validate before serializing.',
    snippet('src/utils/serialize.ts', 'export function serialize', 'JSON.stringify', ["value: any"])
  ),
  securityFinding(
    'SEC-011',
    'Low',
    'SEC-011',
    'Dependency Version Not Pinned',
    'package.json',
    ['Range specifier used', 'Reproducible builds at risk'],
    'Express and TypeScript are listed with range specifiers (~, ^). A floating dependency can change behavior between installs.',
    'Pin exact versions and use a lockfile for all environments.',
    snippet('package.json', '"dependencies"', '"devDependencies"', ['"express": "~4.21.0"', '"typescript": "~5.6.3"'], 0)
  ),
  securityFinding(
    'SEC-012',
    'Low',
    'SEC-012',
    'Information Disclosure in Logs',
    'src/utils/logger.ts',
    ['Auth data serialized to logs', 'Meta written verbatim'],
    'When meta contains an auth field, the full auth context is serialized and logged, potentially capturing tokens or headers.',
    'Redact sensitive fields before logging.',
    snippet('src/utils/logger.ts', 'meta?.auth', "'detailed auth context'", ["meta?.auth", "JSON.stringify(meta.auth)"])
  ),
  securityFinding(
    'SEC-013',
    'Low',
    'SEC-013',
    'CORS Origin Allowlist Missing',
    'src/config/cors.ts',
    ["origin '*' detected", 'Credentials enabled with wildcard'],
    'The CORS policy allows any origin while also sending credentials, enabling cross-site request forgery from arbitrary hosts.',
    'Restrict origin to an explicit allowlist.',
    snippet('src/config/cors.ts', 'corsOptions', 'credentials', ["origin: '*'", "credentials: true"])
  ),
  securityFinding(
    'SEC-014',
    'Low',
    'SEC-014',
    'Deprecated Node API Usage',
    'src/utils/fs.ts',
    ['Deprecated fs API detected'],
    'The project uses callback-based writeFile from the fs module rather than the promise-based fs/promises API.',
    'Use fs/promises and remove the promisify wrapper.',
    snippet('src/utils/fs.ts', "writeFile", 'persistSnapshot', ["writeFile"])
  ),
  securityFinding(
    'SEC-015',
    'Low',
    'SEC-015',
    'API Key in Test Fixtures',
    'tests/fixtures/keys.ts',
    ['Secret-like literal detected', 'Committed fixture'],
    'A test API key is committed under tests/fixtures. Test secrets should be generated per-environment and never resemble production values.',
    'Use per-run fake tokens generated from an env-provided seed.',
    snippet('tests/fixtures/keys.ts', 'TEST_API_KEY', 'TEST_STRIPE_KEY', ["TEST_API_KEY"])
  ),
  securityFinding(
    'SEC-016',
    'Low',
    'SEC-016',
    'Unvalidated Redirect',
    'src/controllers/auth.ts',
    ['User input drives redirect', 'Target not allowlisted'],
    'The OAuth callback redirects to a caller-supplied redirect parameter without validating it against a trusted host list.',
    'Validate redirect targets against an allowlist before issuing res.redirect.',
    snippet('src/controllers/auth.ts', 'redirectTo', "res.redirect", ["redirectTo", "res.redirect"])
  ),
]

/* ------------------------------------------------------------------ */
/* Dependencies                                                        */
/* ------------------------------------------------------------------ */

export const mockDependencies: DependencyRecord[] = [
  { name: 'react', version: '18.3.1', category: 'Frontend Framework', status: 'healthy' },
  { name: 'express', version: '4.21.0', category: 'Backend Framework', status: 'healthy' },
  { name: 'prisma', version: '5.22.0', category: 'ORM', status: 'healthy' },
  { name: '@prisma/client', version: '5.22.0', category: 'ORM', status: 'healthy' },
  { name: 'pg', version: '8.13.1', category: 'PostgreSQL Client', status: 'healthy' },
  { name: 'jsonwebtoken', version: '9.0.2', category: 'Authentication', status: 'healthy' },
  { name: 'socket.io', version: '4.8.1', category: 'Real-time communication', status: 'healthy' },
  { name: 'stripe', version: '16.12.0', category: 'Payments', status: 'healthy' },
  { name: 'zod', version: '3.23.8', category: 'Validation', status: 'healthy' },
  { name: 'dotenv', version: '16.4.5', category: 'Configuration', status: 'healthy' },
  { name: 'vitest', version: '2.1.4', category: 'Testing', status: 'healthy' },
  { name: 'tsx', version: '4.19.2', category: 'Tooling', status: 'healthy' },
  {
    name: 'axios',
    version: '1.5.0',
    category: 'HTTP Client',
    status: 'vulnerable',
    reason: 'Mock vulnerability record detected (CVE-2024-XXXX placeholder).',
  },
  {
    name: 'ioredis',
    version: '5.4.1',
    category: 'Caching',
    status: 'review',
    reason: 'Mock record: released version lags recommended patch line.',
  },
  {
    name: 'bcryptjs',
    version: '2.4.3',
    category: 'Password Hashing',
    status: 'review',
    reason: 'Mock record: cost-factor guidance suggests newer major version.',
  },
  {
    name: 'lodash',
    version: '4.17.21',
    category: 'Utilities',
    status: 'review',
    reason: 'Mock record: prototype-pollution fix landed in a backport; review usage.',
  },
]

/* ------------------------------------------------------------------ */
/* Rules                                                               */
/* ------------------------------------------------------------------ */

export const mockRules: Rule[] = [
  {
    id: 'SEC-001',
    name: 'SQL Injection Detection',
    category: 'Security',
    severity: 'High',
    condition: 'SQL query string built with concatenation of a user-controlled value',
    detected: 1,
    description: 'Flags query strings combined with dynamic input instead of bind parameters.',
    example: '"SELECT * FROM users WHERE id = " + userId',
  },
  {
    id: 'SEC-002',
    name: 'Hardcoded Secret Detection',
    category: 'Security',
    severity: 'High',
    condition: 'Literal secret-like value assigned to a credential constant',
    detected: 2,
    description: 'Detects key-like literals (sk_, pk_, jwt, secret) assigned to config values.',
    example: "stripeSecretKey: 'sk_live_51Hx...'",
  },
  {
    id: 'SEC-003',
    name: 'Dangerous Command Execution',
    category: 'Security',
    severity: 'Critical',
    condition: 'child_process executed with unsanitized string input',
    detected: 1,
    description: 'Flags exec/spawn invocations built from non-literal template segments.',
    example: "exec('git clone ' + target)",
  },
  {
    id: 'SEC-004',
    name: 'Missing Input Validation',
    category: 'Security',
    severity: 'Medium',
    condition: 'Request reach business logic without a schema guard',
    detected: 5,
    description: 'Warns when controller payloads bypass an expected validation pattern.',
    example: 'const { title } = req.body // never validated',
  },
  {
    id: 'SEC-005',
    name: 'Weak Crypto Configuration',
    category: 'Security',
    severity: 'Medium',
    condition: 'bcrypt cost factor below 12 or legacy hash algorithm',
    detected: 2,
    description: 'Identifies weak hashing parameters and deprecated algorithms.',
    example: 'bcrypt.hash(password, 8)',
  },
  {
    id: 'SEC-006',
    name: 'Unsafe Cookie Configuration',
    category: 'Security',
    severity: 'Low',
    condition: 'Session cookie missing secure/sameSite flags',
    detected: 1,
    description: 'Reviews cookie options against browser security best practices.',
    example: 'options: { httpOnly: true }',
  },
  {
    id: 'QLT-001',
    name: 'High Cyclomatic Complexity',
    category: 'Quality',
    severity: 'Medium',
    condition: 'Cyclomatic Complexity > 10',
    detected: 32,
    description: 'Flags functions whose independent execution paths exceed the threshold.',
    example: 'processTaskUpdate(): complexity 14',
  },
  {
    id: 'QLT-002',
    name: 'Deep Nesting',
    category: 'Quality',
    severity: 'Low',
    condition: 'Nesting depth > 4',
    detected: 18,
    description: 'Identifies control flow nested more than four levels deep.',
    example: 'if > for > if > if > if',
  },
  {
    id: 'QLT-003',
    name: 'Duplicate Code',
    category: 'Quality',
    severity: 'Low',
    condition: 'Similar token sequence ≥ 40 tokens across 2+ files',
    detected: 7,
    description: 'Detects near-identical blocks such as repeated date formatting.',
    example: 'formatDay() and formatDayForApi()',
  },
  {
    id: 'ARC-001',
    name: 'High Module Coupling',
    category: 'Architecture',
    severity: 'Medium',
    condition: 'Module depends on more than 12 other modules',
    detected: 2,
    description: 'Reports modules whose dependency fan-out harms testability.',
    example: 'src/controllers/task.ts',
  },
  {
    id: 'ARC-002',
    name: 'Cyclic Dependency',
    category: 'Architecture',
    severity: 'High',
    condition: 'Import cycle detected between modules',
    detected: 1,
    description: 'Finds module import graphs that loop back on themselves.',
    example: 'analytics -> tasks -> analytics',
  },
]

/* ------------------------------------------------------------------ */
/* Issues                                                              */
/* ------------------------------------------------------------------ */

const issue = (
  id: string,
  severity: Issue['severity'],
  title: string,
  file: string,
  line: number,
  category: Issue['category'],
  kind: Issue['kind'],
  refId: string
): Issue => ({ id, severity, title, file, line, category, status: 'Open', kind, refId })

const secLine = (id: string): number => mockSecurityFindings.find((f) => f.id === id)?.line ?? 0
const cxLine = (id: string): number => mockComplexityFindings.find((f) => f.id === id)?.line ?? 0

export const mockIssues: Issue[] = [
  issue('I-001', 'Critical', 'Dangerous Command Execution', 'src/utils/exec.ts', secLine('SEC-003'), 'Security', 'security', 'SEC-003'),
  issue('I-002', 'High', 'Potential SQL Injection', 'src/repositories/user.ts', 84, 'Security', 'security', 'SEC-001'),
  issue('I-003', 'High', 'Hardcoded API Credential', 'src/config/api.ts', secLine('SEC-002'), 'Security', 'security', 'SEC-002'),
  issue('I-004', 'Medium', 'Missing Input Validation', 'src/controllers/task.ts', secLine('SEC-004'), 'Security', 'security', 'SEC-004'),
  issue('I-005', 'Medium', 'Weak Password Hashing Configuration', 'src/auth/password.ts', secLine('SEC-005'), 'Security', 'security', 'SEC-005'),
  issue('I-006', 'Medium', 'Login Route Without Rate Limiting', 'src/routes/auth.ts', secLine('SEC-007'), 'Security', 'security', 'SEC-007'),
  issue('I-007', 'Medium', 'Session Cookie Missing Secure Flag', 'src/auth/session.ts', secLine('SEC-006'), 'Security', 'security', 'SEC-006'),
  issue('I-008', 'Low', 'Verbose Error Response', 'src/middleware/error.ts', secLine('SEC-009'), 'Security', 'security', 'SEC-009'),
  issue('I-009', 'Low', 'Dependency Version Not Pinned', 'package.json', secLine('SEC-011'), 'Security', 'security', 'SEC-011'),
  issue('I-010', 'Low', 'Information Disclosure in Logs', 'src/utils/logger.ts', secLine('SEC-012'), 'Security', 'security', 'SEC-012'),
  issue('I-011', 'High', 'High Complexity in processTaskUpdate()', 'src/services/task.ts', cxLine('CF-01'), 'Complexity', 'complexity', 'CF-01'),
  issue('I-012', 'Critical', 'Critical Complexity in handleWebhookPayload()', 'src/controllers/billing.ts', cxLine('CF-02'), 'Complexity', 'complexity', 'CF-02'),
  issue('I-013', 'High', 'High Complexity in aggregateMetrics()', 'src/services/analytics.ts', cxLine('CF-03'), 'Complexity', 'complexity', 'CF-03'),
  issue('I-014', 'Medium', 'Deep Nesting in requireAuth()', 'src/auth/guard.ts', cxLine('CF-04'), 'Complexity', 'complexity', 'CF-04'),
  issue('I-015', 'High', 'Known Vulnerability in axios', 'package.json', 52, 'Dependencies', 'dependency', 'axios'),
  issue('I-016', 'Medium', 'Review: ioredis patch level', 'package.json', 55, 'Dependencies', 'dependency', 'ioredis'),
  issue('I-017', 'Low', 'Review: bcryptjs version line', 'package.json', 58, 'Dependencies', 'dependency', 'bcryptjs'),
  issue('I-018', 'Medium', 'Overloaded Service Class', 'src/services/task.ts', 15, 'Maintainability', 'quality', 'M-01'),
  issue('I-019', 'Medium', 'God Database Module', 'src/database/client.ts', 1, 'Maintainability', 'quality', 'M-02'),
  issue('I-020', 'Low', 'Untested Utility Function', 'src/utils/graph.ts', 9, 'Maintainability', 'quality', 'M-03'),
  issue('I-021', 'Low', 'Duplicate Logic', 'src/utils/date.ts', 24, 'Code Quality', 'quality', 'Q-01'),
  issue('I-022', 'Low', 'Unused Imports', 'src/controllers/task.ts', 1, 'Code Quality', 'quality', 'Q-02'),
  issue('I-023', 'Low', 'Magic Values', 'src/services/billing.ts', 21, 'Code Quality', 'quality', 'Q-03'),
  issue('I-024', 'Low', 'TODO Without Ticket Reference', 'src/utils/exec.ts', 3, 'Code Quality', 'quality', 'Q-04'),
]

/* ------------------------------------------------------------------ */
/* Derived helpers                                                     */
/* ------------------------------------------------------------------ */

export function countFindingsByFile(path: string): number {
  const files = [mockSecurityFindings, mockComplexityFindings]
  return files.reduce((acc, list) => acc + list.filter((f) => f.file === path).length, 0)
}

export function injectIssueCounts(): void {
  for (const file of Object.values(mockSourceFiles)) {
    file.issues = countFindingsByFile(file.path)
  }
}

export function getSecurityCounts(): Record<SecurityFinding['severity'], number> {
  const counts: Record<SecurityFinding['severity'], number> = {
    Critical: 0,
    High: 0,
    Medium: 0,
    Low: 0,
  }
  for (const f of mockSecurityFindings) counts[f.severity] += 1
  return counts
}

export function getDependencyStatusCounts(): { healthy: number; review: number; vulnerable: number } {
  return {
    healthy: mockDependencies.filter((d) => d.status === 'healthy').length,
    review: mockDependencies.filter((d) => d.status === 'review').length,
    vulnerable: mockDependencies.filter((d) => d.status === 'vulnerable').length,
  }
}

injectIssueCounts()