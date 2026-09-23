import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { ChevronRight, Folder, FileCode, Layers } from 'lucide-react'
import { api } from '../app/api/client'
import { buildTree, type FileTreeNode } from '../data/mockSourceFiles'
import { Card } from '@/components/ui/Card'
 
const tree = buildTree()

function TreeItem({ node, depth = 0 }: { node: FileTreeNode; depth?: number }) {
  const [open, setOpen] = useState(depth < 2)
  const [params] = useSearchParams()
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
      to={`/explorer?file=${encodeURIComponent(node.path ?? '')}`}
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

export default function Explorer() {
  const [params] = useSearchParams()
  const selectedPath = params.get('file') ?? 'src/services/task.ts'
  const file = api.getFile(selectedPath)

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">Code Explorer</div>
        <h1 className="mt-1 text-2xl font-bold text-white">File Browser</h1>
        <p className="mt-1 max-w-2xl text-sm text-white/50">
          Browse the repository structure and view file metadata, code and related issues.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Tree */}
        <Card className="max-h-[70vh] overflow-auto lg:col-span-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-white/50">
            <Layers className="h-3.5 w-3.5" />
            File Tree
          </div>
          <div className="mt-3 space-y-0.5">
            {tree.map((n) => (
              <TreeItem key={n.name} node={n} depth={0} />
            ))}
          </div>
        </Card>

        {/* File view */}
        <div className="lg:col-span-3">
          {file ? (
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
          ) : (
            <Card className="flex flex-col items-center justify-center py-16 text-center text-white/40">
              <FileCode className="mb-2 h-8 w-8 text-white/15" />
              Select a file to view its content and metadata.
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}