'use client'

import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from 'react'

/**
 * Remembers the last cloned container across reloads. A runner container lives
 * until it is stopped or removed, so keeping the ID around makes the app
 * usable after a refresh; if the container has since died, the explorer's
 * banner explains it and the user re-runs an analysis.
 */
const STORAGE_KEY = 'repoXRayContainerId'

/**
 * sessionStorage is a browser-only external store, so it is read through
 * useSyncExternalStore rather than a setState-in-effect. The server snapshot
 * is always null, which keeps SSR/hydration consistent; the real value lands
 * in the client right after mount.
 */
function subscribeToContainer(onChange: () => void): () => void {
  window.addEventListener('storage', onChange)
  return () => window.removeEventListener('storage', onChange)
}

function readContainer(): string | null {
  if (typeof window === 'undefined') return null
  return window.sessionStorage.getItem(STORAGE_KEY)
}

interface AnalysisState {
  status: 'idle' | 'analyzing' | 'complete'
  repoUrl: string
  containerId: string | null
  reviewed: Set<string>
  setRepoUrl: (url: string) => void
  setContainerId: (id: string) => void
  startAnalysis: () => void
  completeAnalysis: () => void
  markReviewed: (id: string) => void
}

const Ctx = createContext<AnalysisState>(null!)

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AnalysisState['status']>('idle')
  const [repoUrl, setRepoUrl] = useState('https://github.com/acme/taskflow')
  const [reviewed, setReviewed] = useState(new Set<string>())
  const containerId = useSyncExternalStore(subscribeToContainer, readContainer, () => null)

  const setContainerId = (id: string) => {
    window.sessionStorage.setItem(STORAGE_KEY, id)
    // Keep the same tab's subscribed components in sync.
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: id }))
  }

  const startAnalysis = () => setStatus('analyzing')
  const completeAnalysis = () => setStatus('complete')
  const markReviewed = (id: string) => setReviewed((prev) => new Set(prev).add(id))

  return (
    <Ctx.Provider
      value={{
        status,
        repoUrl,
        containerId,
        reviewed,
        setRepoUrl,
        setContainerId,
        startAnalysis,
        completeAnalysis,
        markReviewed,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useAnalysis() {
  return useContext(Ctx)
}