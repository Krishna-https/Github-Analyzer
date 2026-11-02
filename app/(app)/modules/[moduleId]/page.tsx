import { Suspense } from 'react'

import { ModuleDetailView } from '../module-detail-view'

/**
 * The module detail view reads ?containerId= and sessionStorage client-side, so
 * it renders inside a Suspense boundary (useSearchParams must not suspend a
 * whole route from the server).
 */
export default function ModuleDetail() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-fade-up">
          <div className="h-3 w-24 animate-pulse rounded bg-white/5" />
          <div className="h-10 w-64 animate-pulse rounded bg-white/10" />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="h-72 animate-pulse rounded-xl border border-edge bg-card lg:col-span-2" />
            <div className="h-72 animate-pulse rounded-xl border border-edge bg-card" />
          </div>
        </div>
      }
    >
      <ModuleDetailView />
    </Suspense>
  )
}
