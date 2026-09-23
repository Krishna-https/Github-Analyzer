import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Loader2, ArrowRight } from 'lucide-react'
import { api } from '../app/api/client'
import { useAnalysis } from '@/context/AnalysisContext'
import type { AnalysisStep } from '../lib/types'

export default function Analyze() {
  const { repoUrl, completeAnalysis } = useAnalysis()
  const navigate = useNavigate()
  const [steps, setSteps] = useState<AnalysisStep[]>([])
  const [current, setCurrent] = useState(0)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    api.analyzeRepository(repoUrl).then((res) => {
      setSteps(res.steps)
      res.steps.forEach((_, i) => {
        setTimeout(() => setCurrent(i + 1), (i + 1) * 520)
      })
      setTimeout(() => {
        completeAnalysis()
        navigate('/overview', { replace: true })
      }, res.steps.length * 520 + 600)
    })
  }, [repoUrl, navigate, completeAnalysis])

  const done = steps.slice(0, current)
  const activeStep = steps[current]
  const pct = steps.length === 0 ? 0 : Math.round((current / steps.length) * 100)

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Repository Scanner</div>
        <h1 className="mt-1 text-2xl font-bold text-white">Analyzing acme / taskflow</h1>
        <p className="mt-1 line-clamp-1 font-mono text-xs text-white/40">{repoUrl}</p>
      </div>

      <div className="rounded-2xl border border-edge bg-card p-6">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-white">
            {activeStep ? activeStep.label : 'Preparing…'}
          </div>
          <div className="font-mono text-xs text-primary tabular-nums">{pct}%</div>
        </div>

        <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-edge">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>

        {activeStep && (
          <p className="mt-3 animate-fade-up text-xs text-white/45">{activeStep.detail}</p>
        )}

        <div className="mt-6 space-y-2">
          {done.map((s) => (
            <div key={s.id} className="flex items-center gap-2.5 rounded-lg border border-edge/60 bg-shell px-3 py-2 animate-fade-up">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              <span className="text-xs font-medium text-white/75">{s.label}</span>
              <span className="ml-auto font-mono text-[10px] text-white/30">{s.detail}</span>
            </div>
          ))}
          {activeStep && (
            <div className="flex items-center gap-2.5 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
              <span className="text-xs font-semibold text-primary">{activeStep.label}</span>
            </div>
          )}
          {!activeStep && steps.length > 0 && (
            <div className="flex items-center justify-between rounded-lg border border-primary/25 bg-primary/5 px-3 py-2">
              <span className="text-xs font-semibold text-primary">Completing analysis…</span>
              <ArrowRight className="h-4 w-4 text-primary" />
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-[11px] text-white/30">
        <span className="rounded-full border border-edge px-2.5 py-1">Prototype</span>
        <span className="rounded-full border border-edge px-2.5 py-1">Steps are simulated locally</span>
        <span className="rounded-full border border-edge px-2.5 py-1">No repository is cloned</span>
      </div>
    </div>
  )
}