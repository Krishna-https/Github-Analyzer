'use client'

import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from 'react'

/**
 * Remembers the last cloned container across reloads. A runner container lives
 * until it is stopped or removed, so keeping the ID around makes the app
 * usable after a refresh; if the container has since died, the explorer's
 * banner explains it and the user re-runs an analysis.
 */
const STORAGE_KEY = 'repoXRayContainerId'
const REPO_URL_KEY = 'repoXRayRepoUrl'
const DEFAULT_REPO_URL = 'https://github.com/acme/taskflow'

/**
 * sessionStorage is a browser-only external store, so it is read through
 * useSyncExternalStore rather than a setState-in-effect. The server snapshot
 * is always null, which keeps SSR/hydration consistent; the real value lands
 * in the client right after mount.
 */
function subscribeToStorage(onChange: () => void): () => void {
  window.addEventListener('storage', onChange)
  return () => window.removeEventListener('storage', onChange)
}

function readContainer(): string | null {
  if (typeof window === 'undefined') return null
  return window.sessionStorage.getItem(STORAGE_KEY)
}

function readRepoUrl(): string | null {
  if (typeof window === 'undefined') return null
  return window.sessionStorage.getItem(REPO_URL_KEY)
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
  const [fallbackRepoUrl, setFallbackRepoUrl] = useState(DEFAULT_REPO_URL)
  const [reviewed, setReviewed] = useState(new Set<string>())
  const containerId = useSyncExternalStore(subscribeToStorage, readContainer, () => null)
  const storedRepoUrl = useSyncExternalStore(subscribeToStorage, readRepoUrl, () => null)
  // Survives a refresh on /analyze so the live pull header names the real repo
  // rather than the bundled sample URL.
  const repoUrl = storedRepoUrl ?? fallbackRepoUrl

  const setContainerId = (id: string) => {
    window.sessionStorage.setItem(STORAGE_KEY, id)
    // Keep the same tab's subscribed components in sync.
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: id }))
  }

  const setRepoUrl = (url: string) => {
    setFallbackRepoUrl(url)
    window.sessionStorage.setItem(REPO_URL_KEY, url)
    window.dispatchEvent(new StorageEvent('storage', { key: REPO_URL_KEY, newValue: url }))
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