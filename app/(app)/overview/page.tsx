import { Suspense } from 'react'

import { OverviewView } from './overview-view'

/**
 * The overview view reads ?containerId= and sessionStorage client-side, so it
 * renders inside a Suspense boundary (useSearchParams must not suspend a whole
 * route from the server).
 */
export default function Overview() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-fade-up">
          <div className="space-y-2">
            <div className="h-3 w-28 animate-pulse rounded bg-white/5" />
            <div className="h-7 w-64 animate-pulse rounded bg-white/10" />
            <div className="h-4 w-96 max-w-full animate-pulse rounded bg-white/5" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl border border-edge bg-card" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="h-96 animate-pulse rounded-xl border border-edge bg-card lg:col-span-3" />
            <div className="h-96 animate-pulse rounded-xl border border-edge bg-card lg:col-span-2" />
          </div>
          <div className="h-48 animate-pulse rounded-xl border border-edge bg-card" />
        </div>
      }
    >
      <OverviewView />
    </Suspense>
  )
}