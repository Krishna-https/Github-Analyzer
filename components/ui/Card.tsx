import type { ReactNode } from 'react'

export function Card({
  children,
  className = '',
  onClick,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={[
        'rounded-xl border border-edge bg-card p-5 transition-all',
        onClick && 'cursor-pointer hover:border-edge hover:ring-1 hover:ring-primary/20',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}

export function SectionTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h3 className={`text-sm font-semibold uppercase tracking-wide text-white/60 ${className}`}>{children}</h3>
}

export function Mono({ children }: { children: ReactNode }) {
  return <span className="font-mono text-sm text-white/80">{children}</span>
}