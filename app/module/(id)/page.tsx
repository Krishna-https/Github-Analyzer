import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import { api } from '../app/api/client'
import { Card, SectionTitle } from '@/components/ui/Card'
import { ModuleIcon } from '@/components/ui/Icon'
import { StatusBadge } from '@/components/ui/Badge'

export default function ModuleDetail() {
  const { moduleId } = useParams<{ moduleId: string }>()
  const result = api.getModuleById(moduleId ?? '')

  if (!result) {
    return (
      <div className="space-y-4">
        <Link to="/modules" className="flex items-center gap-1.5 text-xs text-white/50 hover:text-primary">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to modules
        </Link>
        <Card>Module not found.</Card>
      </div>
    )
  }

  const { module: m, functions } = result

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <Link
          to="/modules"
          className="flex w-fit items-center gap-1.5 text-xs text-white/50 transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to modules
        </Link>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ModuleIcon name={m.icon} className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">{m.id} module</div>
            <h1 className="mt-0.5 text-2xl font-bold text-white">{m.name}</h1>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionTitle>Module Analysis</SectionTitle>
          <p className="mt-3 text-sm leading-relaxed text-white/65">{m.description}</p>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-edge bg-shell p-4">
              <div className="text-2xl font-bold text-primary">{m.files}</div>
              <div className="text-[10px] uppercase tracking-wider text-white/40">Files</div>
            </div>
            <div className="rounded-xl border border-edge bg-shell p-4">
              <div className="text-2xl font-bold text-primary">{m.functions}</div>
              <div className="text-[10px] uppercase tracking-wider text-white/40">Functions</div>
            </div>
            <div className="rounded-xl border border-edge bg-shell p-4">
              <div className="text-2xl font-bold text-primary">{functions.length}</div>
              <div className="text-[10px] uppercase tracking-wider text-white/40">Key functions</div>
            </div>
          </div>

          <div className="mt-5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/40">Responsibilities</div>
            <ul className="mt-2 space-y-1.5">
              {m.responsibilities.map((r) => (
                <li key={r} className="flex items-start gap-2 text-sm text-white/70">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Card>
          <SectionTitle>Dependencies</SectionTitle>
          <div className="mt-3 space-y-2">
            {m.dependsOn.map((d) => (
              <div key={d} className="flex items-center gap-2 rounded-xl border border-edge bg-shell px-3.5 py-2.5 text-sm text-white/75">
                <span className="h-1.5 w-1.5 rounded-full bg-white/25" />
                {d}
              </div>
            ))}
          </div>

          <div className="mt-5">
            <SectionTitle>Key Files</SectionTitle>
            <div className="mt-3 space-y-1.5">
              {m.keyFiles.map((path) => (
                <Link
                  key={path}
                  to={`/explorer?file=${encodeURIComponent(path)}`}
                  className="flex items-center justify-between gap-2 rounded-xl border border-edge bg-shell px-3.5 py-2.5 text-xs font-mono text-white/65 transition-colors hover:border-primary/30 hover:text-primary"
                >
                  {path}
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-white/25" />
                </Link>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <SectionTitle>Functions in {m.name}</SectionTitle>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-edge text-[10px] font-bold uppercase tracking-wider text-white/35">
              <tr>
                <th className="pb-2 pr-6 font-semibold">Function</th>
                <th className="pb-2 pr-6 font-semibold">File</th>
                <th className="pb-2 pr-6 text-right font-semibold">Lines</th>
                <th className="pb-2 pr-6 text-right font-semibold">Complexity</th>
                <th className="pb-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge/50 text-white/65">
              {functions.map((fn) => (
                <tr key={fn.name} className="hover:bg-edge/30">
                  <td className="py-2.5 pr-6 font-mono text-white/80">{fn.name}</td>
                  <td className="py-2.5 pr-6 font-mono text-white/40">{fn.file}</td>
                  <td className="py-2.5 pr-6 text-right tabular-nums">{fn.lines}</td>
                  <td className="py-2.5 pr-6 text-right tabular-nums">{fn.complexity}</td>
                  <td className="py-2.5">
                    <StatusBadge label={fn.status} />
                  </td>
                </tr>
              ))}
              {functions.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-white/40">
                    No key functions listed for this module.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}