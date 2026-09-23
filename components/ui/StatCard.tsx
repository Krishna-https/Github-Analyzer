import type { ReactNode } from 'react'

export function StatCard({
  label,
  value,
  accent = false,
  className = '',
}: {
  label: string
  value: ReactNode
  accent?: boolean
  className?: string
}) {
  return (
    <div className={`rounded-xl border border-edge bg-card p-4 ${className}`}>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-white/45">{label}</div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${accent ? 'text-primary' : 'text-white'}`}>
        {value}
      </div>
    </div>
  )
}