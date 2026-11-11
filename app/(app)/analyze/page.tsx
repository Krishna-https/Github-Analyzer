'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowRight,
  CheckCircle2,
  Cpu,
  FileSearch,
  GitBranch,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react'

import { api, CloneIncompleteError, FileTreeError } from '@/lib/api/client'
import { CloneIncompletePanel } from '@/components/clone/CloneIncompletePanel'
import { getStoredContainerId, getStoredRepoUrl, useAnalysis } from '@/context/AnalysisContext'
import type { CloneVerification } from '@/lib/types'

type Phase = 'cloning' | 'verifying' | 'analyzing' | 'complete' | 'error'

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, exponent)
  return `${value >= 10 || exponent === 0 ? Math.round(value) : value.toFixed(1)} ${units[exponent]}`
}

function repoLabel(repoUrl: string): string {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/?#]+)/i)
  if (!match) return repoUrl || 'repository'
  return `${match[1]} / ${match[2].replace(/\.git$/i, '')}`
}

function AnalyzeSkeleton() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="h-6 w-56 animate-pulse rounded bg-white/5" />
      <div className="mt-6 h-56 animate-pulse rounded-2xl border border-edge bg-card" />
    </div>
  )
}

function AnalyzeRunner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const forceReclone = searchParams.get('reclone') === '1'

  const {
    repoUrl,
    containerId,
    cloneVerification,
    setContainerId,
    setCloneVerification,
    resetContainer,
    startAnalysis,
    completeAnalysis,
  } = useAnalysis()

  // Capture the starting verification once; the flow updates context later and
  // must not re-run the clone effect on those updates.
  const [phase, setPhase] = useState<Phase>('cloning')
  const [verification, setVerification] = useState<CloneVerification | null>(cloneVerification)
  const [error, setError] = useState<string | null>(null)
  const [urlMissing, setUrlMissing] = useState(false)
  const [attempt, setAttempt] = useState(0)

  const started = useRef(false)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    // React StrictMode re-runs effects in development; only the first run may
    // start a clone. Retry resets this ref before bumping `attempt`.
    if (started.current) return
    started.current = true

    async function run() {
      try {
        setError(null)
        setUrlMissing(false)

        // Prefer the live context value, but fall back to sessionStorage for the
        // hydration window (useSyncExternalStore reports null on the server).
        const existingId = containerId ?? getStoredContainerId()
        const canReuse = !forceReclone && attempt === 0 && Boolean(existingId)
        const url = repoUrl || getStoredRepoUrl()

        let id: string

        if (canReuse) {
          id = existingId!
          if (cloneVerification?.complete) {
            setVerification(cloneVerification)
            setPhase('analyzing')
          } else {
            setPhase('verifying')
            const existing = await api.getCloneStatus(id)
            if (!mounted.current) return

            setVerification(existing)
            setCloneVerification(existing)
            if (!existing.complete) {
              setError(existing.reason ?? 'The repository clone is incomplete.')
              setPhase('error')
              return
            }
            setPhase('analyzing')
          }
        } else {
          if (!url) {
            setUrlMissing(true)
            setError('No repository selected. Start a new analysis from the home page.')
            setPhase('error')
            return
          }

          setPhase('cloning')
          resetContainer()
          setCloneVerification(null)
          setVerification(null)

          const cloned = await api.cloneRepository(url)
          if (!mounted.current) return

          id = cloned.containerId
          setContainerId(id)
          setCloneVerification(cloned.verification)
          setVerification(cloned.verification)
          setPhase('verifying')

          if (!cloned.verification.complete) {
            setError(cloned.verification.reason ?? 'The repository clone is incomplete.')
            setPhase('error')
            return
          }
          setPhase('analyzing')
        }

        // Build the real bundle. The server re-checks the clone gate.
        await api.rerunAnalysis(id)
        if (!mounted.current) return

        setPhase('complete')
        completeAnalysis()
        // Give the user a beat to see the verified percentage before moving on.
        await new Promise((resolve) => setTimeout(resolve, 700))
        if (!mounted.current) return
        router.replace(`/overview?containerId=${encodeURIComponent(id)}`)
      } catch (err) {
        if (!mounted.current) return

        if (err instanceof CloneIncompleteError) {
          setVerification(err.verification)
          // Remember the blocked state so the other sections can refuse to
          // fall back to sample data after this incomplete clone.
          setCloneVerification(err.verification)
          setError(err.message)
        } else {
          setError(err instanceof FileTreeError ? err.message : 'Something went wrong while analyzing the repository.')
        }
        setPhase('error')
      }
    }

    run()
    // Deliberately keyed on retry/reclone only: the flow owns the context
    // updates it makes (containerId, verification) and must not restart on them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, forceReclone])

  const retry = () => {
    started.current = false
    setError(null)
    setVerification(null)
    setPhase('cloning')
    resetContainer()
    setCloneVerification(null)
    startAnalysis()
    setAttempt((value) => value + 1)
  }

  const cloneDone = Boolean(verification)
  const verifyDone = Boolean(verification?.complete)
  const analyzeDone = phase === 'complete'
  const failed = phase === 'error'

  // The only percentage we ever show is the verified clone completeness. Before
  // verification exists the bar is indeterminate instead of faking progress.
  // Use the weaker of files/bytes so a byte gap can't look like 100%.
  const clonePercent = verification
    ? Math.min(verification.completenessPercent, verification.bytesPercent)
    : null
  const barPct = clonePercent ?? (analyzeDone ? 100 : 0)

  const steps = [
    {
      id: 'clone',
      label: 'Clone repository',
      icon: GitBranch,
      done: cloneDone,
      failed: failed && !verification,
      detail: verification
        ? `${verification.filesExpected.toLocaleString()} files · ${formatBytes(verification.bytesExpected)}`
        : 'Waiting for git clone to finish…',
    },
    {
      id: 'verify',
      label: 'Verify every file against GitHub',
      icon: FileSearch,
      done: verifyDone,
      failed: failed && Boolean(verification) && !verification?.complete,
      detail: verification
        ? `${verification.completenessPercent}% of files · ${verification.bytesPercent}% of bytes`
        : '—',
    },
    {
      id: 'analyze',
      label: 'Parse source and build report',
      icon: Cpu,
      done: analyzeDone,
      failed: failed && Boolean(verification?.complete),
      detail: analyzeDone ? 'Bundle generated' : phase === 'analyzing' ? 'Reading files, modules and dependencies…' : '—',
    },
    {
      id: 'ready',
      label: 'Open overview',
      icon: ArrowRight,
      done: analyzeDone,
      failed: false,
      detail: analyzeDone ? 'Done' : '—',
    },
  ]

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Repository Scanner</div>
        <h1 className="mt-1 text-2xl font-bold text-white">Analyzing {repoLabel(repoUrl)}</h1>
        <p className="mt-1 line-clamp-1 font-mono text-xs text-white/40">{repoUrl}</p>
      </div>

      <div className="rounded-2xl border border-edge bg-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            {phase === 'complete' ? (
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            ) : failed ? (
              <XCircle className="h-4 w-4 text-amber-400" />
            ) : (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            )}
            {phase === 'cloning'
              ? 'Cloning repository…'
              : phase === 'verifying'
                ? 'Verifying clone completeness…'
                : phase === 'analyzing'
                  ? 'Building analysis…'
                  : phase === 'complete'
                    ? 'Analysis complete'
                    : 'Analysis stopped'}
          </div>
          <div className="font-mono text-xs text-primary tabular-nums">
            {clonePercent !== null
              ? `${clonePercent}%`
              : phase === 'cloning'
                ? 'Cloning…'
                : phase === 'verifying'
                  ? 'Verifying…'
                  : phase === 'complete'
                    ? '100%'
                    : phase === 'error'
                      ? 'Stopped'
                      : 'Working…'}
          </div>
        </div>

        <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-edge">
          {phase === 'cloning' ? (
            <div className="absolute inset-y-0 left-0 w-1/3 animate-pulse rounded-full bg-primary/60" />
          ) : (
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-500"
              style={{ width: `${barPct}%` }}
            />
          )}
        </div>

        <div className="mt-6 space-y-2">
          {steps.map((step) => {
            const StepIcon = step.icon
            return (
              <div
                key={step.id}
                className={[
                  'flex items-center gap-2.5 rounded-lg border px-3 py-2',
                  step.failed
                    ? 'border-amber-800/50 bg-amber-950/30'
                    : step.done
                      ? 'border-edge/60 bg-shell'
                      : 'border-edge/40 bg-card/40',
                ].join(' ')}
              >
                {step.failed ? (
                  <XCircle className="h-4 w-4 shrink-0 text-amber-400" />
                ) : step.done ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <StepIcon className="h-4 w-4 shrink-0 text-white/30" />
                )}
                <span className={`text-xs font-medium ${step.done ? 'text-white/75' : 'text-white/50'}`}>
                  {step.label}
                </span>
                <span className="ml-auto max-w-[55%] truncate text-right font-mono text-[10px] text-white/30">
                  {step.detail}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Real clone verification, not a simulated animation. */}
      {verification && (
        <div className="mt-4 rounded-2xl border border-edge bg-card p-5 animate-fade-up">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-white">Clone completeness</span>
            </div>
            <span
              className="rounded-full border border-primary/25 bg-primary/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary"
              title={`Verified with ${verification.source === 'github-api' ? 'the GitHub tree API' : 'git integrity checks'}`}
            >
              {verification.source === 'github-api' ? 'GitHub API' : 'git verified'}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-lg border border-edge bg-shell px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/35">Files</div>
              <div className="mt-0.5 font-mono text-lg font-bold text-primary">
                {verification.completenessPercent}%
              </div>
              <div className="text-[10px] text-white/40">
                {verification.filesPresent.toLocaleString()} / {verification.filesExpected.toLocaleString()}
              </div>
            </div>
            <div className="rounded-lg border border-edge bg-shell px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/35">Bytes</div>
              <div className="mt-0.5 font-mono text-lg font-bold text-primary">{verification.bytesPercent}%</div>
              <div className="text-[10px] text-white/40">
                {formatBytes(verification.bytesPresent)} / {formatBytes(verification.bytesExpected)}
              </div>
            </div>
            <div className="rounded-lg border border-edge bg-shell px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/35">Missing</div>
              <div className="mt-0.5 font-mono text-lg font-bold text-primary">
                {verification.filesMissing.toLocaleString()}
              </div>
              <div className="text-[10px] text-white/40">files</div>
            </div>
            <div className="rounded-lg border border-edge bg-shell px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/35">Commit</div>
              <div className="mt-0.5 font-mono text-lg font-bold text-primary">
                {verification.headSha ? verification.headSha.slice(0, 7) : '—'}
              </div>
              <div className="text-[10px] text-white/40">
                {verification.headMatch === false
                  ? 'HEAD mismatch'
                  : verification.headMatch === true
                    ? 'HEAD matches GitHub'
                    : 'HEAD not compared'}
              </div>
            </div>
          </div>
        </div>
      )}

      {failed && verification && !verification.complete && (
        <div className="mt-4">
          <CloneIncompletePanel
            verification={verification}
            onRetry={retry}
            retryLabel="Re-clone repository"
            showStartOver
          />
        </div>
      )}

      {failed && (!verification || verification.complete) && (
        <div className="mt-4 rounded-2xl border border-amber-800/50 bg-amber-950/30 p-5 animate-fade-up">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <div>
              <div className="text-sm font-semibold text-amber-200">Analysis failed</div>
              <p className="mt-1 text-sm leading-relaxed text-amber-100/60">{error}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {!urlMissing && (
                  <button
                    type="button"
                    onClick={retry}
                    className="flex items-center gap-1.5 rounded-lg bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-500/25"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Retry
                  </button>
                )}
                <Link
                  href="/"
                  className="flex items-center gap-1.5 rounded-lg border border-edge px-3 py-1.5 text-xs font-semibold text-white/70 transition-colors hover:text-white"
                >
                  Start over <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 text-[11px] text-white/30">
        <span className="rounded-full border border-edge px-2.5 py-1">Real clone</span>
        <span className="rounded-full border border-edge px-2.5 py-1">GitHub-verified file count</span>
        <span className="rounded-full border border-edge px-2.5 py-1">Analysis blocked if incomplete</span>
      </div>
    </div>
  )
}

export default function Analyze() {
  return (
    <Suspense fallback={<AnalyzeSkeleton />}>
      <AnalyzeRunner />
    </Suspense>
  )
}
