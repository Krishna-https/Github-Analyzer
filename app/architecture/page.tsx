import { useState } from 'react'
import { ArrowDown, Database, Layers, FileCode, Boxes } from 'lucide-react'
import { api } from '../app/api/client'
import { Card, SectionTitle } from '@/components/ui/Card'

const layerIcons: Record<string, typeof FileCode> = {
  Frontend: FileCode,
  Routing: ArrowDown,
  Controller: Layers,
  Service: Boxes,
  Repository: Layers,
  Database: Database,
}

export default function Architecture() {
  const nodes = api.getArchitecture()
  const [activeId, setActiveId] = useState('service')
  const active = nodes.find((n) => n.id === activeId) ?? nodes[0]

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">Architecture</div>
        <h1 className="mt-1 text-2xl font-bold text-white">Layered Architecture</h1>
        <p className="mt-1 max-w-2xl text-sm text-white/50">
          Detected data flow through six layers. Select a layer to inspect its responsibilities and
          dependencies.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Flow */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-edge bg-card p-6">
            <div className="flex items-center justify-between">
              <SectionTitle>Data Flow</SectionTitle>
              <span className="text-[10px] text-white/30">Click a node to inspect</span>
            </div>
            <div className="mt-5 flex flex-col items-center">
              {nodes.map((node, i) => {
                const LayerIcon = layerIcons[node.layer] ?? Layers
                const isActive = node.id === activeId
                return (
                  <div key={node.id} className="w-full max-w-md">
                    <button
                      onClick={() => setActiveId(node.id)}
                      className={[
                        'group w-full rounded-xl border p-4 text-left transition-all',
                        isActive
                          ? 'border-primary/60 bg-primary/5 shadow-lime-glow'
                          : 'border-edge bg-shell hover:border-white/20',
                      ].join(' ')}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                            isActive ? 'bg-primary/15 text-primary' : 'bg-edge text-white/50'
                          }`}
                        >
                          <LayerIcon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${isActive ? 'text-primary' : 'text-white'}`}>
                              {node.label}
                            </span>
                            <span className="rounded border border-edge px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/35">
                              {node.layer}
                            </span>
                          </div>
                          <div className="truncate text-xs text-white/45">{node.subtitle}</div>
                        </div>
                        <div className="hidden shrink-0 flex-col items-end gap-0.5 sm:flex">
                          <span className="font-mono text-xs text-white/60 tabular-nums">{node.files} files</span>
                          <span className="font-mono text-xs text-white/35 tabular-nums">
                            {node.functions} functions
                          </span>
                        </div>
                      </div>
                    </button>
                    {i < nodes.length - 1 && (
                      <div className="flex justify-center py-1 text-white/25">
                        <ArrowDown className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <div className="flex items-center justify-between">
              <SectionTitle>Layer Detail</SectionTitle>
              <span className="font-mono text-[10px] text-white/30">{active.id.toUpperCase()}</span>
            </div>

            <div className="mt-4">
              <div className="text-lg font-bold text-white">{active.label}</div>
              <p className="mt-1.5 text-xs leading-relaxed text-white/50">{active.description}</p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-edge bg-shell p-3.5">
                <div className="font-mono text-xl font-bold text-primary">{active.files}</div>
                <div className="text-[10px] uppercase tracking-wider text-white/40">Files</div>
              </div>
              <div className="rounded-xl border border-edge bg-shell p-3.5">
                <div className="font-mono text-xl font-bold text-primary">{active.functions}</div>
                <div className="text-[10px] uppercase tracking-wider text-white/40">Functions</div>
              </div>
            </div>

            <div className="mt-5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/40">Responsibilities</div>
              <ul className="mt-2 space-y-1.5">
                {active.responsibilities.map((r) => (
                  <li key={r} className="flex items-start gap-2 text-sm text-white/70">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/40">Depends On</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {active.dependencies.length === 0 && (
                  <span className="text-xs text-white/40">No internal dependencies</span>
                )}
                {active.dependencies.map((id) => {
                  const dep = nodes.find((n) => n.id === id)
                  return (
                    <button
                      key={id}
                      onClick={() => dep && setActiveId(id)}
                      className="rounded-full border border-edge bg-shell px-3 py-1 text-xs font-medium text-white/75 transition-colors hover:border-primary/40 hover:text-primary"
                    >
                      {dep?.label ?? id}
                    </button>
                  )
                })}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}