import { Suspense } from 'react'

import { DependenciesView } from './dependencies-view'

/**
 * The dependencies view reads ?containerId= and sessionStorage client-side, so
 * it renders inside a Suspense boundary (useSearchParams must not suspend a
 * whole route from the server).
 */
export default function Dependencies() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-fade-up">
          <div className="space-y-2">
            <div className="h-3 w-24 animate-pulse rounded bg-white/5" />
            <div className="h-7 w-56 animate-pulse rounded bg-white/10" />
            <div className="h-4 w-96 max-w-full animate-pulse rounded bg-white/5" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl border border-edge bg-card" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-2xl border border-edge bg-card" />
        </div>
      }
    >
      <DependenciesView />
    </Suspense>
  )
}
