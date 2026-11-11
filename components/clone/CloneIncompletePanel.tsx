'use client'

import Link from 'next/link'
import { AlertTriangle, ArrowRight, Lock, RefreshCw, ShieldAlert } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import type { CloneVerification } from '@/lib/types'

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, exponent)
  return `${value >= 10 || exponent === 0 ? Math.round(value) : value.toFixed(1)} ${units[exponent]}`
}

/**
 * Shared "analysis locked" surface. Shown whenever the server refuses to
 * analyze because the clone is missing files, so no section can pass sample or
 * partial data off as a real result.
 */
export function CloneIncompletePanel({
  verification,
  title = 'Analysis locked — the repository clone is incomplete',
  onRetry,
  retryLabel = 'Re-clone repository',
  busy = false,
  showStartOver = true,
}: {
  verification: CloneVerification
  title?: string
  onRetry?: () => void
  retryLabel?: string
  busy?: boolean
  showStartOver?: boolean
}) {
  const missingPercent = Math.max(0, 100 - verification.completenessPercent)

  return (
    <Card className="animate-fade-up border-amber-800/50 bg-amber-950/20">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
          <Lock className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-bold text-amber-200">{title}</h2>
            <span className="rounded-full border border-amber-700/50 bg-amber-950/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-400">
              {verification.complete ? 'Verified' : 'Blocked'}
            </span>
          </div>

          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-amber-100/70">
            {verification.reason ??
              'The container does not contain every file GitHub reports for this commit, so analysis was stopped to avoid showing partial results.'}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-lg border border-amber-900/40 bg-amber-950/30 px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/70">Files cloned</div>
              <div className="mt-0.5 font-mono text-sm font-bold text-amber-200">
                {verification.completenessPercent}%
              </div>
              <div className="text-[10px] text-amber-100/50">
                {verification.filesPresent.toLocaleString()} / {verification.filesExpected.toLocaleString()}
              </div>
            </div>

            <div className="rounded-lg border border-amber-900/40 bg-amber-950/30 px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/70">Bytes cloned</div>
              <div className="mt-0.5 font-mono text-sm font-bold text-amber-200">{verification.bytesPercent}%</div>
              <div className="text-[10px] text-amber-100/50">
                {formatBytes(verification.bytesPresent)} / {formatBytes(verification.bytesExpected)}
              </div>
            </div>

            <div className="rounded-lg border border-amber-900/40 bg-amber-950/30 px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/70">Missing files</div>
              <div className="mt-0.5 font-mono text-sm font-bold text-amber-200">
                {verification.filesMissing.toLocaleString()}
              </div>
              <div className="text-[10px] text-amber-100/50">{missingPercent}% of the tree absent</div>
            </div>

            <div className="rounded-lg border border-amber-900/40 bg-amber-950/30 px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/70">Checked via</div>
              <div className="mt-0.5 font-mono text-sm font-bold text-amber-200">
                {verification.source === 'github-api' ? 'GitHub API' : 'git'}
              </div>
              <div className="text-[10px] text-amber-100/50">
                {verification.headSha ? verification.headSha.slice(0, 7) : 'no HEAD'}
              </div>
            </div>
          </div>

          {verification.missingSample.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-400/70">
                <AlertTriangle className="h-3 w-3" />
                Example missing files
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {verification.missingSample.map((path) => (
                  <span
                    key={path}
                    className="max-w-full truncate rounded-md border border-amber-900/40 bg-amber-950/40 px-1.5 py-0.5 font-mono text-[10px] text-amber-100/70"
                    title={path}
                  >
                    {path}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-lg bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />
                {busy ? 'Retrying…' : retryLabel}
              </button>
            )}

            {showStartOver && (
              <Link
                href="/"
                className="flex items-center gap-1.5 rounded-lg border border-edge px-3 py-1.5 text-xs font-semibold text-white/70 transition-colors hover:text-white"
              >
                Start over <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}

            <span className="flex items-center gap-1.5 text-[10px] text-amber-100/40">
              <ShieldAlert className="h-3 w-3" />
              Overview, Deep Analysis and Modules stay locked until the clone is verified.
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}
