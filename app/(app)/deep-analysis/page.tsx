import { Suspense } from 'react'

import { DeepAnalysisView } from './deep-analysis-view'

/**
 * The deep-analysis view reads ?containerId= and sessionStorage client-side, so
 * it renders inside a Suspense boundary (useSearchParams must not suspend the
 * whole route from the server).
 */
export default function DeepAnalysisPage() {
  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">Repository X-Ray</div>
        <h1 className="mt-1 text-2xl font-bold text-white">Deep Analysis</h1>
        <p className="mt-1 max-w-2xl text-sm text-white/50">
          An AI-generated report built from the repository’s source — architecture, data flow, domain model and risks
          that aren’t visible from the GitHub page.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="space-y-6">
            <div className="h-40 animate-pulse rounded-xl border border-edge bg-card" />
            <div className="h-64 animate-pulse rounded-xl border border-edge bg-card" />
          </div>
        }
      >
        <DeepAnalysisView />
      </Suspense>
    </div>
  )
}
