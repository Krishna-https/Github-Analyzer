'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ChevronRight, Folder, FileCode, Layers } from 'lucide-react'
import { api } from '@/lib/api/client'
import { useAnalysis } from '@/context/AnalysisContext'
import type { FileTreeNode } from '@/data/mockSourceFiles'
import type { RealFileContent } from '@/lib/types'
import { Card } from '@/components/ui/Card'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function TreeItem({ node, depth = 0 }: { node: FileTreeNode; depth?: number }) {
  const [open, setOpen] = useState(depth < 2)
  const params = useSearchParams()
  const selected = params.get('file') === node.path
  const indent = depth * 16

  if (node.type === 'dir') {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-white/65 transition-colors hover:bg-edge hover:text-white"
          style={{ paddingLeft: indent + 8 }}
        >
          <ChevronRight
            className={`h-3 w-3 shrink-0 text-white/30 transition-transform ${open ? 'rotate-90' : ''}`}
          />
          <Folder className="h-3.5 w-3.5 shrink-0 text-amber-400/70" />
          {node.name}
        </button>
        {open && node.children && (
          <div className="ml-2 border-l border-edge/60">
            {node.children.map((child) => (
              <TreeItem key={child.name} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Link
      href={`/explorer?file=${encodeURIComponent(node.path ?? '')}`}
      className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-xs font-mono transition-colors ${
        selected
          ? 'bg-primary/10 text-primary'
          : 'text-white/55 hover:bg-edge hover:text-white/80'
      }`}
      style={{ paddingLeft: indent + 8 }}
    >
      <FileCode className="h-3.5 w-3.5 shrink-0 text-white/25" />
      {node.name}
    </Link>
  )
}

export function ExplorerView() {
  const params = useSearchParams()
  const { containerId: sessionContainerId } = useAnalysis()
  // Prefer the explicit URL parameter (survives reloads), fall back to the
  // container created by the current analysis session.
  const containerId = params.get('containerId') ?? sessionContainerId
  // With a live container the file paths are container-absolute
  // (/workspace/repo/...), so a selected path is passed straight to /api/file.
  const selectedPath = params.get('file')

  // The result is tagged with the containerId it belongs to, so a containerId
  // change marks the previous result stale instead of flashing old data. All
  // setState happens in the promise callbacks, never in the effect body.
  const [result, setResult] = useState<{
    containerId: string
    tree: FileTreeNode[] | null
    error: string | null
  } | null>(null)

  useEffect(() => {
    if (!containerId) return

    let cancelled = false

    api
      .getRealFileTree(containerId)
      .then((next) => {
        if (cancelled) return
        setResult({
          containerId,
          tree: next.length > 0 ? next : null,
          error: next.length > 0 ? null : 'The container returned no files.',
        })
      })
      .catch((cause: unknown) => {
        if (cancelled) return
        setResult({
          containerId,
          tree: null,
          error: cause instanceof Error ? cause.message : 'Could not load the file tree.',
        })
      })

    return () => {
      cancelled = true
    }
  }, [containerId])

  const matched = result && result.containerId === containerId ? result : null
  const loading = Boolean(containerId) && !matched
  const error = matched?.error ?? null

  // With no container, show the bundled sample tree so the explorer still
  // demonstrates something. With a container that failed to load, we still fall
  // back, but `error` says why — silently swapping in mock data would read as
  // if it were a real repo listing.
  const realTree = matched?.tree ?? null
  const tree = realTree ?? api.getFileTree()
  const usingFallback = Boolean(containerId) && !loading && !realTree

  // Real files come from a live container whose tree actually loaded; the
  // sample pane stays for the no-container explorer and the failed-container
  // fallback (whose banner already says it's sample data). The selected path
  // must be container-absolute — stale relative bookmarks (?file=js/foo.js
  // from the mock era) must not be sent to /api/file.
  const selectedIsAbsolute = selectedPath !== null && selectedPath.startsWith('/') && selectedPath.length > 1
  const realFileMode =
    Boolean(containerId) && !usingFallback && Boolean(selectedPath) && selectedIsAbsolute

  // A live container with a relative ?file= is a stale bookmark, not a real
  // file — surface it instead of silently showing sample content.
  const staleRelativePath = Boolean(containerId) && Boolean(selectedPath) && !selectedIsAbsolute

  // Real file content, tagged with the containerId+path pair it belongs to so
  // a container or file switch can't flash a stale readout. setState happens
  // only in the promise callbacks.
  const [fileResult, setFileResult] = useState<{
    containerId: string
    path: string
    file: RealFileContent | null
    error: string | null
  } | null>(null)

  useEffect(() => {
    if (!containerId || !selectedPath) return

    let cancelled = false

    api
      .getFileContent(containerId, selectedPath)
      .then((file) => {
        if (cancelled) return
        setFileResult({ containerId, path: selectedPath, file, error: null })
      })
      .catch((cause: unknown) => {
        if (cancelled) return
        setFileResult({
          containerId,
          path: selectedPath,
          file: null,
          error: cause instanceof Error ? cause.message : 'Could not load the file.',
        })
      })

    return () => {
      cancelled = true
    }
  }, [containerId, selectedPath])

  const matchedFile =
    fileResult && fileResult.containerId === containerId && fileResult.path === selectedPath
      ? fileResult
      : null
  const realFile = matchedFile?.file ?? null
  const fileError = matchedFile?.error ?? null

  // Sample content only makes sense when there is no container at all, or when
  // the real tree failed and the banner already says sample data is showing.
  // A live container with no file selected should sit on the placeholder.
  const sampleMode = !containerId || usingFallback
  const mockFile = sampleMode ? api.getFile(selectedPath ?? 'src/services/task.ts') : null
  const file = mockFile

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Tree */}
      <Card className="max-h-[70vh] overflow-auto lg:col-span-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-white/50">
          <Layers className="h-3.5 w-3.5" />
          File Tree
        </div>

        {usingFallback && (
          <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
            <div className="text-xs font-semibold text-amber-300">
              Could not load files from the container
            </div>
            <div className="mt-1 break-words font-mono text-[11px] leading-relaxed text-amber-200/70">
              {error}
            </div>
            <div className="mt-1.5 text-[11px] text-white/45">
              Showing sample data instead. The container may have been stopped or removed.
            </div>
          </div>
        )}

        {loading ? (
          <div className="mt-3 animate-pulse space-y-2 rounded-lg border border-edge bg-shell/50 px-3 py-3">
            <div className="text-xs text-white/50">Reading container files…</div>
            <div className="space-y-1.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-3 rounded bg-white/5" style={{ width: `${80 - i * 12}%` }} />
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-3 space-y-0.5">
            {tree.map((n) => (
              <TreeItem key={n.name} node={n} depth={0} />
            ))}
          </div>
        )}
      </Card>

      {/* File view */}
      <div className="lg:col-span-3">
        {realFileMode ? (
          realFile ? (
            <div className="space-y-4">
              <Card>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileCode className="h-4 w-4 text-white/35" />
                      <span className="font-mono text-sm font-semibold text-white/85">{realFile.path}</span>
                    </div>
                    <div className="mt-1.5 text-xs text-white/45">
                      {realFile.lines} lines · {formatBytes(realFile.bytes)} in the runner container
                    </div>
                  </div>
                  <span className="rounded-full border border-edge px-2.5 py-0.5 text-[10px] font-semibold text-white/50">
                    {realFile.language}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs">
                  <div className="rounded-xl border border-edge bg-shell p-3">
                    <div className="font-mono text-lg font-bold text-primary">{realFile.lines}</div>
                    <div className="text-[10px] uppercase tracking-wider text-white/35">Lines</div>
                  </div>
                  <div className="rounded-xl border border-edge bg-shell p-3">
                    <div className="font-mono text-lg font-bold text-primary">{formatBytes(realFile.bytes)}</div>
                    <div className="text-[10px] uppercase tracking-wider text-white/35">Size</div>
                  </div>
                  <div className="rounded-xl border border-edge bg-shell p-3">
                    <div className="font-mono text-lg font-bold text-primary">{realFile.language}</div>
                    <div className="text-[10px] uppercase tracking-wider text-white/35">Language</div>
                  </div>
                </div>

                {realFile.truncated && (
                  <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-[11px] text-amber-200/80">
                    Preview truncated — only the first 512 KB of this file is shown.
                  </div>
                )}

                <div className="mt-3 rounded-lg border border-edge/60 bg-shell px-3 py-2 text-[11px] text-white/40">
                  Functions, imports, callers and issues are computed during analysis; this pane shows the
                  raw file straight from the container.
                </div>
              </Card>

              <Card className="overflow-hidden p-0">
                <div className="flex items-center justify-between border-b border-edge bg-shell px-4 py-2.5">
                  <div className="text-xs font-semibold text-white/60">Source</div>
                  <div className="font-mono text-[10px] text-white/35">
                    {realFile.lines} lines{realFile.truncated ? ' · truncated' : ''}
                  </div>
                </div>
                <pre className="max-h-[60vh] overflow-auto px-4 py-3 text-[12px] leading-6">
                  {realFile.content.map((line, i) => (
                    <div key={i} className="flex text-white/55 hover:bg-edge/40">
                      <span className="mr-4 select-none w-6 shrink-0 text-right text-white/20">{i + 1}</span>
                      <span className="flex-1 whitespace-pre font-mono">{line}</span>
                    </div>
                  ))}
                </pre>
              </Card>
            </div>
          ) : fileError ? (
            <Card className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <FileCode className="mb-1 h-8 w-8 text-white/15" />
              <div className="text-sm font-semibold text-white/70">Could not read this file</div>
              <div className="max-w-md break-words font-mono text-xs leading-relaxed text-white/40">
                {fileError}
              </div>
            </Card>
          ) : (
            <Card className="flex flex-col items-center justify-center py-16 text-center text-white/40">
              <div className="mb-2 h-4 w-24 animate-pulse rounded bg-white/5" />
              <div className="text-xs text-white/50">Reading file from container…</div>
            </Card>
          )
        ) : file ? (
          <div className="space-y-4">
            <Card>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <FileCode className="h-4 w-4 text-white/35" />
                    <span className="font-mono text-sm font-semibold text-white/85">{file.path}</span>
                  </div>
                  <div className="mt-1.5 text-xs text-white/45">{file.module} module</div>
                </div>
                <span className="rounded-full border border-edge px-2.5 py-0.5 text-[10px] font-semibold text-white/50">
                  {file.language}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-4 gap-3 text-center text-xs">
                <div className="rounded-xl border border-edge bg-shell p-3">
                  <div className="font-mono text-lg font-bold text-primary">{file.lines}</div>
                  <div className="text-[10px] uppercase tracking-wider text-white/35">Lines</div>
                </div>
                <div className="rounded-xl border border-edge bg-shell p-3">
                  <div className="font-mono text-lg font-bold text-primary">{file.functions}</div>
                  <div className="text-[10px] uppercase tracking-wider text-white/35">Functions</div>
                </div>
                <div className="rounded-xl border border-edge bg-shell p-3">
                  <div className="font-mono text-lg font-bold text-primary">{file.imports}</div>
                  <div className="text-[10px] uppercase tracking-wider text-white/35">Imports</div>
                </div>
                <div className="rounded-xl border border-edge bg-shell p-3">
                  <div className="font-mono text-lg font-bold text-primary">{file.issues}</div>
                  <div className="text-[10px] uppercase tracking-wider text-white/35">Issues</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-white/40">Used By</div>
                  <div className="mt-1.5 space-y-1">
                    {file.usedBy.map((u) => (
                      <div key={u} className="rounded-lg border border-edge bg-shell px-2.5 py-1.5 text-xs font-medium text-white/65">
                        {u}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-white/40">Calls</div>
                  <div className="mt-1.5 space-y-1">
                    {file.calls.map((c) => (
                      <div key={c} className="rounded-lg border border-edge bg-shell px-2.5 py-1.5 text-xs font-medium text-white/65">
                        {c}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-edge bg-shell px-4 py-2.5">
                <div className="text-xs font-semibold text-white/60">Source</div>
                <div className="font-mono text-[10px] text-white/35">{file.lines} lines</div>
              </div>
              <pre className="max-h-[60vh] overflow-auto px-4 py-3 text-[12px] leading-6">
                {file.content.map((line, i) => (
                  <div key={i} className="flex text-white/55 hover:bg-edge/40">
                    <span className="mr-4 select-none w-6 shrink-0 text-right text-white/20">{i + 1}</span>
                    <span className="flex-1 whitespace-pre font-mono">{line}</span>
                  </div>
                ))}
              </pre>
            </Card>
          </div>
        ) : staleRelativePath ? (
          <Card className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <FileCode className="mb-1 h-8 w-8 text-white/15" />
            <div className="text-sm font-semibold text-white/70">Pick a file from the tree</div>
            <div className="max-w-md font-mono text-xs leading-relaxed text-white/40">
              “{selectedPath}” is a relative path from the sample explorer. Real files live at
              /workspace/repo/… inside the container. Select one from the file tree to view it.
            </div>
          </Card>
        ) : (
          <Card className="flex flex-col items-center justify-center py-16 text-center text-white/40">
            <FileCode className="mb-2 h-8 w-8 text-white/15" />
            Select a file to view its content and metadata.
          </Card>
        )}
      </div>
    </div>
  )
}