import 'server-only'

import type { CodeSnippet, SecurityFinding, Severity } from '@/lib/types'
import type { AnalysisBundle, DumpFile } from './types'

/**
 * Deterministic security scanner for the cloned repository.
 *
 * It runs a set of line-oriented rules over the source captured by the analysis
 * dump and reports every hit with an exact file/line and a code snippet. No
 * sample data is involved: each finding is derived from the repository's own
 * text, so the Security page can show real evidence for a real container.
 *
 * The rules are intentionally high-signal heuristics (the same class of check a
 * linter performs), not a vulnerability database.
 */

interface RuleDef {
  ruleId: string
  title: string
  severity: Severity
  evidence: string[]
  explanation: string
  solution: string
  /** Only scan files whose path matches this (defaults to every text file). */
  exts?: RegExp
  /** Whole-file gate; the rule only runs when this matches the file content. */
  requireContent?: RegExp
  /** True when the line should be reported. */
  match: (line: string) => boolean
  /** Comment lines are skipped by default; set false to also scan them. */
  skipComment?: boolean
}

/* ------------------------------------------------------------------ */
/* File selection                                                      */
/* ------------------------------------------------------------------ */

const SCANNABLE_EXT =
  /\.(ts|tsx|js|jsx|mjs|cjs|mts|cts|py|rb|go|java|kt|kts|php|cs|vue|svelte|astro|sh|bash|tf|env|prisma|sql|json|ya?ml|toml)$/i

const LOCKFILE_RE =
  /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb|composer\.lock|poetry\.lock|pipfile\.lock|cargo\.lock|go\.sum|gemfile\.lock)$/i

const MINIFIED_RE = /\.min\.(js|css)$|\.map$/i

function isScannable(relPath: string): boolean {
  if (LOCKFILE_RE.test(relPath) || MINIFIED_RE.test(relPath)) return false
  const name = relPath.slice(relPath.lastIndexOf('/') + 1)
  return SCANNABLE_EXT.test(name) || name === '.env'
}

function isComment(trimmed: string): boolean {
  return /^(\/\/|\/\*|\*|#|<!--|--\s)/.test(trimmed)
}

/* ------------------------------------------------------------------ */
/* Rules                                                               */
/* ------------------------------------------------------------------ */

const SECRET_KEYWORD_RE =
  /\b(password|passwd|pwd|secret|api[_-]?key|apikey|access[_-]?key|secret[_-]?key|auth[_-]?token|private[_-]?key|client[_-]?secret|token)\b\s*[:=]\s*['"]([^'"]+)['"]/i
const SECRET_PREFIX_RE =
  /\b(sk_live_[0-9A-Za-z]{10,}|sk_test_[0-9A-Za-z]{10,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35}|ghp_[0-9A-Za-z]{36}|xox[baprs]-[0-9A-Za-z-]{10,})\b/
const SECRET_PLACEHOLDER_RE =
  /^(process\.env|import\.meta|your|changeme|change_me|placeholder|example|xxxx|\*+|\.{3,}|<.*>)/i

function weakBcryptCost(line: string): boolean {
  const salt = line.match(/saltRounds\s*[:=]\s*([0-9]+)/i)
  if (salt && Number(salt[1]) < 10) return true
  const gen = line.match(/bcrypt\.(?:genSalt|genSaltSync)\s*\(\s*([0-9]+)/i)
  if (gen && Number(gen[1]) < 10) return true
  const cost = line.match(/(?:cost|cost_factor|rounds)\s*[:=]\s*([0-9]+)/i)
  if (cost && Number(cost[1]) < 12) return true
  return false
}

const RULES: RuleDef[] = [
  {
    ruleId: 'SEC-001',
    title: 'SQL Injection Detection',
    severity: 'High',
    evidence: ['SQL keyword inside a string literal', 'String concatenation / interpolation nearby'],
    explanation:
      'A SQL statement is built by concatenating or interpolating a value into the query string. If any part is user-controlled the query shape can be altered, enabling SQL injection.',
    solution:
      'Use parameterized queries / prepared statements with bind placeholders instead of building the query text from values.',
    match: (line) =>
      /(?:SELECT|INSERT|UPDATE|DELETE)\b[^'"`]*['"`]\s*\+/i.test(line) ||
      /\$\{[^}]+\}[^'"`]*(?:SELECT|INSERT|UPDATE|DELETE)/i.test(line) ||
      /(?:SELECT|INSERT|UPDATE|DELETE)[^'"`]*\$\{/i.test(line),
  },
  {
    ruleId: 'SEC-002',
    title: 'Hardcoded Secret Detection',
    severity: 'High',
    evidence: ['Credential-like key detected', 'Literal value assigned in source'],
    explanation:
      'A credential-like key is assigned a literal value in source code. Committed secrets leak through version control and cannot be rotated without a code change.',
    solution:
      'Move the value to environment-based configuration and load it at runtime (e.g. process.env / a secrets manager).',
    match: (line) => {
      const m = line.match(SECRET_KEYWORD_RE)
      if (m) {
        const value = m[2]
        if (value.length >= 6 && !SECRET_PLACEHOLDER_RE.test(value)) return true
      }
      return SECRET_PREFIX_RE.test(line)
    },
  },
  {
    ruleId: 'SEC-003',
    title: 'Dangerous Command Execution',
    severity: 'Critical',
    evidence: ['External process invocation detected', 'Command built from dynamic input'],
    explanation:
      'A shell command is constructed from a template literal or concatenation and executed. If any segment is user-controlled this allows arbitrary command injection.',
    solution:
      'Avoid a shell: pass an argv array to spawn/execFile, or validate the target against a strict allowlist.',
    match: (line) =>
      /(?:exec|execSync|spawn|spawnSync|execFile)\s*\(\s*`[^`]*\$\{/i.test(line) ||
      /(?:exec|execSync)\s*\([^)]*\+/i.test(line),
  },
  {
    ruleId: 'SEC-005',
    title: 'Weak Crypto Configuration',
    severity: 'Medium',
    evidence: ['Weak hash algorithm or cost factor', 'Below recommended strength'],
    explanation:
      'A deprecated hash algorithm (MD5/SHA-1) or a below-recommended password hashing cost factor is used. These are fast to brute-force and unsuitable for passwords or integrity.',
    solution:
      'Use a modern password hash (bcrypt cost ≥ 12, scrypt or argon2) and SHA-256 or better for integrity checks.',
    match: (line) =>
      /createHash\s*\(\s*['"](?:md5|sha1)['"]/i.test(line) ||
      /hashlib\.(?:md5|sha1)\s*\(/i.test(line) ||
      weakBcryptCost(line),
  },
  {
    ruleId: 'SEC-006',
    title: 'Unsafe Cookie Configuration',
    severity: 'Low',
    evidence: ['Cookie options set without secure flag', 'httpOnly/sameSite present'],
    explanation:
      'A session cookie sets httpOnly/sameSite but omits secure, allowing the cookie to travel over plain HTTP in production.',
    solution: 'Set `secure: true` when serving over HTTPS (e.g. when NODE_ENV is production).',
    match: (line) => /(?:httpOnly|sameSite)\s*:/i.test(line) && !/\bsecure\s*:\s*true/i.test(line),
  },
  {
    ruleId: 'SEC-007',
    title: 'CORS Misconfiguration',
    severity: 'Medium',
    evidence: ['Wildcard origin configured', 'Credentials enabled'],
    explanation:
      'The CORS policy allows any origin while also sending credentials, which lets arbitrary sites make authenticated requests on a user’s behalf.',
    solution: 'Restrict `origin` to an explicit allowlist of trusted hosts.',
    requireContent: /credentials\s*:\s*true/i,
    match: (line) => /\borigin\s*:\s*['"]\*['"]/i.test(line),
  },
  {
    ruleId: 'SEC-008',
    title: 'TLS Verification Disabled',
    severity: 'High',
    evidence: ['Certificate verification turned off'],
    explanation:
      'TLS certificate verification is disabled, so the connection accepts any certificate and is open to man-in-the-middle attacks.',
    solution: 'Remove the override and trust the platform CA store, or pin the expected certificate.',
    match: (line) =>
      /rejectUnauthorized\s*:\s*false/i.test(line) ||
      /NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]?0/i.test(line) ||
      /\bverify\s*=\s*False\b/.test(line),
  },
  {
    ruleId: 'SEC-009',
    title: 'Information Disclosure',
    severity: 'Low',
    evidence: ['Stack trace / error internals returned', 'Response construction nearby'],
    explanation:
      'A stack trace or raw error object appears to be returned to the caller, disclosing internals about the application and its dependencies.',
    solution: 'Log the detail server-side and return a generic error envelope to clients.',
    match: (line) => /\.stack\b/.test(line) && /\b(res|reply|response|json|send|payload|body)\b/i.test(line),
  },
  {
    ruleId: 'SEC-010',
    title: 'Use of any Type',
    severity: 'Low',
    evidence: ['any-typed value detected', 'Type soundness disabled'],
    explanation:
      'An `any` type disables type-checking for every value that flows through it, hiding structural bugs from the compiler.',
    solution: 'Type the value as `unknown` and narrow/validate it before use.',
    exts: /\.(ts|tsx)$/i,
    match: (line) => /:\s*any\b/.test(line),
  },
  {
    ruleId: 'SEC-011',
    title: 'Dynamic Code Execution',
    severity: 'High',
    evidence: ['Runtime code evaluation detected'],
    explanation:
      'eval()/new Function() executes a string as code. If the string can be influenced by input this enables arbitrary code execution.',
    solution: 'Replace dynamic evaluation with explicit, statically-analysable logic (e.g. a lookup map).',
    match: (line) => /\beval\s*\(/.test(line) || /\bnew\s+Function\s*\(/.test(line),
  },
  {
    ruleId: 'SEC-012',
    title: 'Insecure Randomness',
    severity: 'Medium',
    evidence: ['Non-cryptographic RNG used', 'Security-sensitive value nearby'],
    explanation:
      'Math.random()/random.random() is not cryptographically secure. Using it for tokens, secrets or identifiers makes them predictable.',
    solution: 'Use a CSPRNG (crypto.randomUUID / crypto.getRandomValues, or Python’s secrets module).',
    match: (line) =>
      /\b(?:Math\.random|random\.random)\s*\(\)/.test(line) &&
      /\b(token|secret|password|passwd|otp|nonce|salt|session|api[_-]?key|id)\b/i.test(line),
  },
  {
    ruleId: 'SEC-013',
    title: 'Plaintext HTTP Endpoint',
    severity: 'Low',
    evidence: ['http:// URL literal detected'],
    explanation:
      'A hardcoded http:// endpoint sends data in plaintext and can be intercepted or tampered with in transit.',
    solution: 'Use https:// (or a configurable base URL) instead of a hardcoded plaintext endpoint.',
    match: (line) => /['"`]http:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0)[^'"`\s]+['"`]/i.test(line),
  },
  {
    ruleId: 'SEC-014',
    title: 'Cross-Site Scripting Sink',
    severity: 'Medium',
    evidence: ['Raw HTML injection sink detected'],
    explanation:
      'Writing unescaped HTML via innerHTML/dangerouslySetInnerHTML/document.write can execute attacker-controlled markup (XSS) if the value is not sanitised.',
    solution: 'Render text through the framework’s escaping, or sanitise HTML with a trusted library.',
    match: (line) =>
      /dangerouslySetInnerHTML/.test(line) || /\.innerHTML\s*=/.test(line) || /document\.write\s*\(/.test(line),
  },
  {
    ruleId: 'SEC-015',
    title: 'Credentials in URL',
    severity: 'High',
    evidence: ['User:password pair embedded in a URL'],
    explanation:
      'A URL literal contains an inline username:password pair. These credentials are visible in source and often in logs.',
    solution: 'Move credentials to environment/secret configuration and build the connection from parts.',
    match: (line) =>
      /(?:https?|ftp|postgres|postgresql|mysql|mongodb|mongodb\+srv|redis|amqp):\/\/[^/\s:'"`]+:[^/\s@'"`]+@/i.test(line),
  },
]

/* ------------------------------------------------------------------ */
/* Finding construction                                                */
/* ------------------------------------------------------------------ */

/** Stable, URL-safe id for a finding (no slashes/colons). */
function findingId(ruleId: string, file: string, line: number): string {
  const input = `${ruleId}:${file}:${line}`
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return `sec-${(hash >>> 0).toString(36)}`
}

/** A small window of lines around the hit, with the matched line highlighted. */
function snippetAt(lines: string[], lineNo: number): CodeSnippet {
  const start = Math.max(0, lineNo - 3)
  const end = Math.min(lines.length, lineNo + 2)
  return {
    startLine: start + 1,
    highlight: [lineNo - 1 - start],
    lines: lines.slice(start, end),
  }
}

const MAX_FINDINGS = 300

const SEVERITY_ORDER: Record<Severity, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 }

/**
 * Scans the dump's files and returns the real security findings, ordered by
 * severity. Findings are de-duplicated by rule+file+line.
 */
export function scanSecurity(files: DumpFile[]): SecurityFinding[] {
  const findings: SecurityFinding[] = []
  const seen = new Set<string>()

  for (const file of files) {
    if (file.binary || !file.content) continue
    if (!isScannable(file.relPath)) continue

    const lines = file.content.split('\n')

    for (const rule of RULES) {
      if (rule.exts && !rule.exts.test(file.relPath)) continue
      if (rule.requireContent && !rule.requireContent.test(file.content)) continue

      for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim()
        if (!trimmed) continue
        if (rule.skipComment !== false && isComment(trimmed)) continue
        if (!rule.match(trimmed)) continue

        const id = findingId(rule.ruleId, file.relPath, i + 1)
        if (seen.has(id)) continue
        seen.add(id)

        findings.push({
          id,
          severity: rule.severity,
          ruleId: rule.ruleId,
          title: rule.title,
          file: file.relPath,
          line: i + 1,
          evidence: rule.evidence,
          explanation: rule.explanation,
          solution: rule.solution,
          snippet: snippetAt(lines, i + 1),
        })
      }
    }
  }

  return findings
    .sort(
      (a, b) =>
        SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
        a.file.localeCompare(b.file) ||
        a.line - b.line
    )
    .slice(0, MAX_FINDINGS)
}

/** Find a real security finding by its stable id (used by the detail page). */
export function findSecurityFinding(bundle: AnalysisBundle, id: string): SecurityFinding | null {
  return bundle.security?.find((finding) => finding.id === id) ?? null
}
