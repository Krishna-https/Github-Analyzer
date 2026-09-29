'use client'

import { CheckCircle2 } from 'lucide-react'
import { useAnalysis } from '@/context/AnalysisContext'

export function ReviewedToggle({ findingId }: { findingId: string }) {
  const { reviewed, markReviewed } = useAnalysis()
  const isReviewed = reviewed.has(findingId)

  return (
    <button
      onClick={() => markReviewed(findingId)}
      disabled={isReviewed}
      className={`flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition-colors ${
        isReviewed
          ? 'border-emerald-800/50 bg-emerald-950/50 text-emerald-400 cursor-default'
          : 'border-edge text-white/70 hover:border-primary/30 hover:text-primary'
      }`}
    >
      <CheckCircle2 className="h-3.5 w-3.5" />
      {isReviewed ? 'Marked Reviewed' : 'Mark Reviewed'}
    </button>
  )
}
