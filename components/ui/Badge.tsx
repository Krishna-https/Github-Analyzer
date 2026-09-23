export function Badge({ label, className = '' }: { label: string; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${className}`}>
      {label}
    </span>
  )
}

export function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    Critical: 'bg-red-950/80 text-red-300 ring-1 ring-red-800/60',
    High: 'bg-orange-950/80 text-orange-300 ring-1 ring-orange-800/60',
    Medium: 'bg-amber-950/80 text-amber-300 ring-1 ring-amber-800/60',
    Low: 'bg-sky-950/80 text-sky-300 ring-1 ring-sky-800/60',
  }
  return <Badge label={severity} className={map[severity] ?? 'bg-edge text-white/60'} />
}

export function StatusBadge({ label }: { label: string }) {
  const map: Record<string, string> = {
    Good: 'bg-emerald-950/80 text-emerald-300 ring-1 ring-emerald-800/60',
    Moderate: 'bg-amber-950/80 text-amber-300 ring-1 ring-amber-800/60',
    'Needs Review': 'bg-orange-950/80 text-orange-300 ring-1 ring-orange-800/60',
    High: 'bg-red-950/80 text-red-300 ring-1 ring-red-800/60',
    Critical: 'bg-red-950 text-red-200 ring-1 ring-red-700',
    Open: 'bg-amber-950/80 text-amber-300 ring-1 ring-amber-800/60',
    Reviewed: 'bg-sky-950/80 text-sky-300 ring-1 ring-sky-800/60',
    Fixed: 'bg-emerald-950/80 text-emerald-300 ring-1 ring-emerald-800/60',
  }
  return <Badge label={label} className={map[label] ?? 'bg-edge text-white/60'} />
}