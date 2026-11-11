'use client'

import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from 'react'
import type { CloneVerification } from '@/lib/types'

/**
 * Remembers the last cloned container and repository URL across reloads. A
 * runner container lives until it is stopped or removed, so keeping the ID
 * around makes the app usable after a refresh; if the container has since died,
 * the explorer's banner explains it and the user re-runs an analysis.
 */
const STORAGE_KEY = 'repoXRayContainerId'
const REPO_KEY = 'repoXRayRepoUrl'

/**
 * sessionStorage is a browser-only external store, so it is read through
 * useSyncExternalStore rather than a setState-in-effect. The server snapshot
 * is always the empty value, which keeps SSR/hydration consistent; the real
 * value lands in the client right after mount.
 */
function subscribeToStorage(onChange: () => void): () => void {
  window.addEventListener('storage', onChange)
  return () => window.removeEventListener('storage', onChange)
}

function readContainer(): string | null {
  if (typeof window === 'undefined') return null
  return window.sessionStorage.getItem(STORAGE_KEY)
}

function readRepoUrl(): string {
  if (typeof window === 'undefined') return ''
  return window.sessionStorage.getItem(REPO_KEY) ?? ''
}

interface AnalysisState {
  status: 'idle' | 'analyzing' | 'complete'
  repoUrl: string
  containerId: string | null
  /** Latest clone verification, when the analyze screen has one. */
  cloneVerification: CloneVerification | null
  reviewed: Set<string>
  setRepoUrl: (url: string) => void
  setContainerId: (id: string) => void
  resetContainer: () => void
  setCloneVerification: (verification: CloneVerification | null) => void
  startAnalysis: () => void
  completeAnalysis: () => void
  markReviewed: (id: string) => void
}

const Ctx = createContext<AnalysisState>(null!)

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AnalysisState['status']>('idle')
  const [cloneVerification, setCloneVerification] = useState<CloneVerification | null>(null)
  const [reviewed, setReviewed] = useState(new Set<string>())
  const containerId = useSyncExternalStore(subscribeToStorage, readContainer, () => null)
  const repoUrl = useSyncExternalStore(subscribeToStorage, readRepoUrl, () => '')

  const setRepoUrl = (url: string) => {
    window.sessionStorage.setItem(REPO_KEY, url)
    window.dispatchEvent(new StorageEvent('storage', { key: REPO_KEY, newValue: url }))
  }

  const setContainerId = (id: string) => {
    window.sessionStorage.setItem(STORAGE_KEY, id)
    // Keep the same tab's subscribed components in sync.
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: id }))
  }

  const resetContainer = () => {
    window.sessionStorage.removeItem(STORAGE_KEY)
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: null }))
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
        cloneVerification,
        reviewed,
        setRepoUrl,
        setContainerId,
        resetContainer,
        setCloneVerification,
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

/** Read the persisted container id during client-only code (e.g. an effect). */
export function getStoredContainerId(): string | null {
  if (typeof window === 'undefined') return null
  return window.sessionStorage.getItem(STORAGE_KEY)
}

/** Read the persisted repository URL during client-only code. */
export function getStoredRepoUrl(): string {
  if (typeof window === 'undefined') return ''
  return window.sessionStorage.getItem(REPO_KEY) ?? ''
}
