import { Link } from 'react-router-dom'
import { ArrowUpRight, FileCode, Activity } from 'lucide-react'
import { api } from '../api/client'
import { ModuleIcon } from '../components/ui/Icon'

export default function Modules() {
  const modules = api.getModules()

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">Modules</div>
        <h1 className="mt-1 text-2xl font-bold text-white">Detected Modules</h1>
        <p className="mt-1 max-w-2xl text-sm text-white/50">
          The scanner groups source files into functional modules. Click a module to inspect its analysis.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => (
          <Link
            key={m.id}
            to={`/modules/${m.id}`}
            className="group rounded-2xl border border-edge bg-card p-5 transition-all hover:border-primary/30 hover:shadow-lime-glow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ModuleIcon name={m.icon} />
                </div>
                <div>
                  <div className="text-sm font-bold text-white group-hover:text-primary/90">{m.name}</div>
                  <div className="text-[11px] text-white/40">{m.id}</div>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-white/20 transition-colors group-hover:text-primary" />
            </div>

            <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-white/50">{m.description}</p>

            <div className="mt-4 flex items-center gap-4 border-t border-edge pt-3.5 text-xs text-white/55">
              <span className="flex items-center gap-1.5">
                <FileCode className="h-3.5 w-3.5 text-white/30" />
                {m.files} files
              </span>
              <span className="flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-white/30" />
                {m.functions} functions
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}