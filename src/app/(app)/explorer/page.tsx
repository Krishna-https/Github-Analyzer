import { Suspense } from 'react'
import { ExplorerView } from './explorer-view'

export default function Explorer() {
  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">Code Explorer</div>
        <h1 className="mt-1 text-2xl font-bold text-white">File Browser</h1>
        <p className="mt-1 max-w-2xl text-sm text-white/50">
          Browse the repository structure and view file metadata, code and related issues.
        </p>
      </div>

      {/* The file tree and viewer both read ?file=, which is only known in the
          browser, so the interactive view renders inside a Suspense boundary. */}
      <Suspense
        fallback={
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="h-96 animate-pulse rounded-xl border border-edge bg-card lg:col-span-2" />
            <div className="h-96 animate-pulse rounded-xl border border-edge bg-card lg:col-span-3" />
          </div>
        }
      >
        <ExplorerView />
      </Suspense>
    </div>
  )
}
