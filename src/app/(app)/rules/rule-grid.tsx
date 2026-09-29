'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Book } from 'lucide-react'
import { SeverityBadge } from '@/components/ui/Badge'
import type { Rule } from '@/lib/types'

export function RuleGrid({ groups }: { groups: { label: string; rules: Rule[] }[] }) {
  const params = useSearchParams()
  const activeRuleId = params.get('rule')
  const containerRef = useRef<HTMLDivElement>(null)
  const [highlight, setHighlight] = useState<string | null>(activeRuleId)

  useEffect(() => {
    setHighlight(activeRuleId)
    if (activeRuleId) {
      const el = document.getElementById('rule-' + activeRuleId)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [activeRuleId])

  return (
    <div ref={containerRef} className="space-y-8">
      {groups.map((g) => (
        <div key={g.label}>
          <div className="text-[10px] font-bold uppercase tracking-wider text-white/30">{g.label} Rules</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.rules.map((r) => {
              const isHL = highlight === r.id
              return (
                <div
                  key={r.id}
                  id={`rule-${r.id}`}
                  className={`rounded-xl border bg-shell p-4 transition-all ${
                    isHL ? 'border-primary/60 shadow-lime-glow' : 'border-edge'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <Book className="h-4 w-4 text-primary/80" />
                      <span className="font-mono text-xs font-bold text-primary/90">{r.id}</span>
                    </div>
                    <SeverityBadge severity={r.severity} />
                  </div>
                  <div className="mt-2.5 text-sm font-bold text-white/85">{r.name}</div>
                  <div className="mt-1 text-[11px] text-white/45">{r.description}</div>

                  <div className="mt-3 rounded-lg border border-edge bg-ink px-3 py-2 font-mono text-[10px] text-white/55">
                    <span className="font-semibold text-white/40">Condition: </span>
                    {r.condition}
                  </div>

                  <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-[11px] text-primary/90">
                    Detected: <span className="font-bold">{r.detected.toLocaleString()}</span>{' '}
                    {r.detected === 1 ? 'item' : 'items'}
                  </div>

                  <div className="mt-3 rounded-lg border border-edge bg-shell px-3 py-2 text-[10px] text-white/50">
                    <span className="font-semibold text-white/40">Example: </span>
                    {r.example}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
