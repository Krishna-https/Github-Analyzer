import { Suspense } from 'react'

import { ModulesView } from './modules-view'

/**
 * The modules view reads ?containerId= and sessionStorage client-side, so it
 * renders inside a Suspense boundary (useSearchParams must not suspend a whole
 * route from the server).
 */
export default function Modules() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-fade-up">
          <div className="space-y-2">
            <div className="h-3 w-24 animate-pulse rounded bg-white/5" />
            <div className="h-7 w-56 animate-pulse rounded bg-white/10" />
            <div className="h-4 w-96 max-w-full animate-pulse rounded bg-white/5" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl border border-edge bg-card" />
            ))}
          </div>
        </div>
      }
    >
      <ModulesView />
    </Suspense>
  )
}
