import { Link } from 'react-router-dom'
import { GitBranch } from 'lucide-react'

export function TopBar() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-edge bg-shell px-5">
      <Link to="/" className="flex items-center gap-2.5 text-sm font-bold tracking-tight text-white">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-primary">
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
            <path d="M3 20l6-8 4 5 5-9 3 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="20" cy="6" r="2" fill="currentColor"/>
          </svg>
        </span>
        <span>Repo X-Ray</span>
      </Link>
      <div className="ml-4 hidden items-center gap-2 rounded-full border border-edge bg-card px-3 py-1 text-xs font-medium text-white/60 sm:flex">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        <span>acme / taskflow</span>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <div className="hidden items-center gap-1.5 rounded-full border border-emerald-800/60 bg-emerald-950/60 px-3 py-1 text-[11px] font-semibold text-emerald-400 sm:flex">
          <GitBranch className="h-3 w-3" />
          <span>main</span>
        </div>
        <div className="hidden rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary sm:block">
          Analysis Complete
        </div>
        <Link
          to="/"
          className="rounded-lg border border-edge px-3 py-1.5 text-xs font-medium text-white/60 transition-colors hover:bg-edge hover:text-white"
        >
          New Analysis
        </Link>
      </div>
    </header>
  )
}