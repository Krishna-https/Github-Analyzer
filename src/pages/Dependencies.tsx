import { api } from '../api/client'
import { Card, SectionTitle } from '../components/ui/Card'
import { depStatusColor, depStatusLabel } from '../lib/colors'
import { Package } from 'lucide-react'

export default function Dependencies() {
  const deps = api.getDependencies()
  const counts = api.getDependencyStatusCounts()

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">Dependencies</div>
        <h1 className="mt-1 text-2xl font-bold text-white">Dependency Analysis</h1>
        <p className="mt-1 max-w-2xl text-sm text-white/50">
          76 packages resolved. Showing the 16 most relevant entries across frameworks, ORMs and client
          libraries.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-edge bg-card p-4">
          <div className="text-2xl font-bold text-emerald-400">{counts.healthy}</div>
          <div className="text-[10px] uppercase tracking-wider text-white/40">Healthy</div>
        </div>
        <div className="rounded-xl border border-edge bg-card p-4">
          <div className="text-2xl font-bold text-amber-400">{counts.review}</div>
          <div className="text-[10px] uppercase tracking-wider text-white/40">Review</div>
        </div>
        <div className="rounded-xl border border-edge bg-card p-4">
          <div className="text-2xl font-bold text-red-400">{counts.vulnerable}</div>
          <div className="text-[10px] uppercase tracking-wider text-white/40">Vulnerable</div>
        </div>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <SectionTitle>Packages</SectionTitle>
          <span className="text-[10px] text-white/30">Mock status indicators — not a real vulnerability database</span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {deps.map((d) => (
            <div key={d.name} className="rounded-xl border border-edge bg-shell p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <Package className="h-4 w-4 text-white/30" />
                  <div>
                    <div className="font-mono text-sm font-semibold text-white/85">{d.name}</div>
                    <div className="font-mono text-[10px] text-white/40">{d.version}</div>
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${depStatusColor[d.status]}`}>
                  {depStatusLabel[d.status]}
                </span>
              </div>
              <div className="mt-2.5 text-[11px] font-medium text-white/45">{d.category}</div>
              {d.reason && (
                <div className="mt-2 rounded-lg border border-amber-800/30 bg-amber-950/30 px-3 py-2 text-[11px] text-amber-200/70">
                  {d.reason}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}