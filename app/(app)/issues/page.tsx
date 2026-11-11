import { Suspense } from 'react'

import { IssuesView } from './issues-view'

/**
 * The issues view reads ?containerId= and sessionStorage client-side, so it
 * renders inside a Suspense boundary (useSearchParams must not suspend a whole
 * route from the server).
 */
export default function Issues() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-fade-up">
          <div className="space-y-2">
            <div className="h-3 w-24 animate-pulse rounded bg-white/5" />
            <div className="h-7 w-56 animate-pulse rounded bg-white/10" />
            <div className="h-4 w-96 max-w-full animate-pulse rounded bg-white/5" />
          </div>
          <div className="flex gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-7 w-20 animate-pulse rounded-full bg-white/5" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-2xl border border-edge bg-card" />
        </div>
      }
    >
      <IssuesView />
    </Suspense>
  )
}
