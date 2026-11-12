'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  CheckCircle2,
  FileCode2,
  FolderGit2,
  HardDrive,
  Loader2,
  TriangleAlert,
} from 'lucide-react'
import { api, FileTreeError } from '@/lib/api/client'
import { useAnalysis } from '@/context/AnalysisContext'
import { StatCard } from '@/components/ui/StatCard'
import type { CloneFileEntry, CloneStatus } from '@/lib/types'

const FEED_LIMIT = 120
const POLL_INTERVAL_MS = 900
const REDIRECT_DELAY_MS = 900

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / 1024 ** exponent
  const rounded = exponent === 0 || value >= 10 ? Math.round(value) : Number(value.toFixed(1))
  return `${rounded} ${units[exponent]}`
}

function repoLabel(url: string): string {
  const match = /github\.com[/:]([^/]+)\/([^/?#]+)/i.exec(url)
  if (!match) return url
  return `${match[1]} / ${match[2].replace(/\.git$/, '')}`
}

interface FeedEntry extends CloneFileEntry {
  id: string
}

export default function Analyze() {
  const { repoUrl, containerId, completeAnalysis } = useAnalysis()
  const router = useRouter()
  const [status, setStatus] = useState<CloneStatus | null>(null)
  const [feed, setFeed] = useState<FeedEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const seenPaths = useRef(new Set<string>())
  const seeded = useRef(false)
  const sequence = useRef(0)
  const navigated = useRef(false)

  useEffect(() => {
    if (!containerId) return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    seenPaths.current = new Set()
    seeded.current = false

    const schedule = (ms: number) => {
      if (cancelled) return
      timer = setTimeout(poll, ms)
    }

    const poll = async () => {
      try {
        const next = await api.getCloneStatus(containerId)
        if (cancelled) return

        setStatus(next)
        setError(null)

        const incoming = next.files.filter((file) => !seenPaths.current.has(file.path))
        incoming.forEach((file) => seenPaths.current.add(file.path))

        if (!seeded.current) {
          // The first response is the baseline: those files were already on
          // disk before this page started watching, so show them without
          // pretending they all just arrived in one batch.
          seeded.current = true
          setFeed(next.files.map((file) => ({ ...file, id: `${file.path}:seed` })))
        } else if (incoming.length > 0) {
          const arrived: FeedEntry[] = incoming.map((file) => ({
            ...file,
            id: `${file.path}:${sequence.current++}`,
          }))
          setFeed((prev) => [...arrived, ...prev].slice(0, FEED_LIMIT))
        }

        if (next.state === 'cloning') schedule(POLL_INTERVAL_MS)
      } catch (err) {
        if (cancelled) return

        const message = err instanceof Error ? err.message : 'Could not reach the server.'
        setError(message)

        // A removed/stopped runner will never recover; stop polling so the UI
        // doesn't hammer Docker with doomed requests.
        if (err instanceof FileTreeError && (err.status === 404 || err.status === 409)) {
          setStatus((prev) => ({
            state: 'failed',
            exitCode: prev?.exitCode ?? null,
            bytes: prev?.bytes ?? 0,
            fileCount: prev?.fileCount ?? 0,
            files: prev?.files ?? [],
            progress: prev?.progress ?? null,
            error: message,
            log: prev?.log ?? [],
          }))
          return
        }

        schedule(2000)
      }
    }

    poll()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [containerId])

  const state = status?.state ?? null

  useEffect(() => {
    if (state !== 'done') return

    const timer = setTimeout(() => {
      if (navigated.current) return
      navigated.current = true
      completeAnalysis()
      router.replace(
        containerId ? `/overview?containerId=${encodeURIComponent(containerId)}` : '/overview'
      )
    }, REDIRECT_DELAY_MS)

    return () => clearTimeout(timer)
  }, [state, completeAnalysis, router, containerId])

  if (!containerId) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-edge bg-card p-10 text-center">
          <FolderGit2 className="mx-auto h-9 w-9 text-white/25" />
          <h1 className="mt-4 text-lg font-bold text-white">No repository queued</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-white/45">
            Start an analysis from the home page. The runner container ID is kept for this
            browser session, so this page can show a live pull once one is running.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-black transition-colors hover:bg-primary/90"
          >
            Analyze a repository
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    )
  }

  const percent = state === 'done' ? 100 : status?.progress?.percent ?? null
  const phase =
    state === 'failed'
      ? 'Clone failed'
      : state === 'done'
        ? 'Clone complete'
        : status?.progress?.phase ?? (status ? 'Pulling repository' : 'Preparing runner')
  const lastLogLine = status && status.log.length > 0 ? status.log[status.log.length - 1] : null
  const detail =
    error ??
    status?.progress?.detail ??
    lastLogLine ??
    (status ? 'Waiting for git to report progress…' : 'Starting the runner container…')

  const chip =
    state === 'failed'
      ? 'border-red-800/60 bg-red-950/40 text-red-300'
      : state === 'done'
        ? 'border-emerald-800/60 bg-emerald-950/40 text-emerald-300'
        : 'border-primary/30 bg-primary/10 text-primary'
  const chipLabel = state === 'failed' ? 'Failed' : state === 'done' ? 'Complete' : 'Live'
  const barColor =
    state === 'failed' ? 'bg-red-500' : state === 'done' ? 'bg-emerald-500' : 'bg-primary'

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
            Repository Scanner · Live clone
          </div>
          <h1 className="mt-1 text-2xl font-bold text-white">Pulling {repoLabel(repoUrl)}</h1>
          <p className="mt-1 line-clamp-1 font-mono text-xs text-white/40">{repoUrl}</p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${chip}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${barColor} ${state === 'cloning' || state === null ? 'animate-pulse-dot' : ''}`} />
          {chipLabel}
        </span>
      </div>

      <div className="rounded-2xl border border-edge bg-card p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {state === 'failed' ? (
              <TriangleAlert className="h-4 w-4 shrink-0 text-red-400" />
            ) : state === 'done' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            ) : (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
            )}
            <span className="truncate text-sm font-semibold text-white">{phase}</span>
          </div>
          <div className="font-mono text-xs tabular-nums text-primary">
            {percent === null ? '—' : `${percent}%`}
          </div>
        </div>

        <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-edge">
          {percent === null ? (
            <div className={`absolute inset-y-0 w-1/3 rounded-full ${barColor} animate-scan-line`} />
          ) : (
            <div
              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${percent}%` }}
            />
          )}
        </div>

        <p className="mt-3 line-clamp-2 animate-fade-up text-xs text-white/45">{detail}</p>

        {state === 'failed' && (
          <Link
            href="/"
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary/80 transition-colors hover:text-primary"
          >
            Try another repository
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}

        <div className="mt-6 grid grid-cols-3 gap-3">
          <StatCard
            label="Total storage"
            value={formatBytes(status?.bytes ?? 0)}
            accent
            className="p-3 sm:p-4"
          />
          <StatCard
            label="Files pulled"
            value={(status?.fileCount ?? 0).toLocaleString()}
            className="p-3 sm:p-4"
          />
          <StatCard
            label="Progress"
            value={percent === null ? '—' : `${percent}%`}
            className="p-3 sm:p-4"
          />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-edge bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-edge px-5 py-3.5">
          <div className="flex items-center gap-2">
            {state === 'cloning' || state === null ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            ) : state === 'done' ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <TriangleAlert className="h-3.5 w-3.5 text-red-400" />
            )}
            <span className="text-xs font-semibold text-white">Live pull activity</span>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-white/30">
            newest first
          </span>
        </div>

        <div className="max-h-[420px] space-y-2 overflow-auto p-3">
          {feed.length === 0 ? (
            <div className="flex items-center gap-2.5 rounded-lg border border-dashed border-edge/70 px-3 py-6 text-xs text-white/35">
              <HardDrive className="h-4 w-4 shrink-0 text-white/25" />
              {state === 'failed'
                ? 'No files were written to the workspace.'
                : 'Waiting for the first files to land on disk…'}
            </div>
          ) : (
            feed.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-2.5 rounded-lg border border-edge/60 bg-shell px-3 py-2 animate-fade-up"
              >
                <FileCode2 className="h-4 w-4 shrink-0 text-primary/70" />
                <span
                  className="min-w-0 flex-1 truncate font-mono text-xs text-white/75"
                  title={file.path}
                >
                  {file.path}
                </span>
                <span className="shrink-0 font-mono text-[10px] tabular-nums text-white/35">
                  {formatBytes(file.bytes)}
                </span>
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary/80 ring-1 ring-primary/20">
                  pulled
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-[11px] text-white/30">
        <span className="rounded-full border border-edge px-2.5 py-1">Live Docker telemetry</span>
        <span className="rounded-full border border-edge px-2.5 py-1">Storage includes .git</span>
        <span className="rounded-full border border-edge px-2.5 py-1">Updates every 0.9s</span>
      </div>
    </div>
  )
}
