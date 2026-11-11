'use client'

import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'

import { api, FileTreeError } from '@/lib/api/client'
import { useAnalysis } from '@/context/AnalysisContext'
import { CloneIncompletePanel } from '@/components/clone/CloneIncompletePanel'
import { Card } from '@/components/ui/Card'
import type { CloneVerification } from '@/lib/types'

/** True only after hydration, so SSR and the first client paint agree. */
const subscribeNoop = () => () => {}
function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  )
}

function GateSkeleton() {
  return (
    <div className="space-y-6 animate-fade-up">
      <div className="h-10 w-64 animate-pulse rounded-lg bg-white/5" />
      <div className="h-40 animate-pulse rounded-xl border border-edge bg-card" />
    </div>
  )
}

/** Shared blocked state; the container may already be gone after a failed clone. */
function CloneBlocked({ verification }: { verification: CloneVerification }) {
  const { resetContainer, setCloneVerification, startAnalysis } = useAnalysis()
  const router = useRouter()

  return (
    <CloneIncompletePanel
      verification={verification}
      onRetry={() => {
        resetContainer()
        setCloneVerification(null)
        startAnalysis()
        router.push('/analyze?reclone=1')
      }}
    />
  )
}

/**
 * Guards a section that is not backed by the analysis bundle yet (Modules and
 * friends). When a container exists, it must pass clone verification before the
 * section renders; otherwise the user sees the same locked state as Overview
 * and Deep Analysis instead of sample data.
 */
export function CloneGate({ children }: { children: ReactNode }) {
  const { containerId, cloneVerification } = useAnalysis()
  const hydrated = useHydrated()

  // sessionStorage is unreadable on the server and during hydration. Wait for
  // the client store before deciding between sample mode and the live gate, so
  // an incomplete clone can never flash sample modules first.
  if (!hydrated) return <GateSkeleton />

  // A failed clone removes its container, but its verification is still in
  // context. Keep the section locked instead of falling back to sample data.
  if (!containerId) {
    if (cloneVerification && !cloneVerification.complete) {
      return <CloneBlocked verification={cloneVerification} />
    }
    return <>{children}</>
  }

  return (
    <CloneGateForContainer key={containerId} containerId={containerId}>
      {children}
    </CloneGateForContainer>
  )
}

function CloneGateForContainer({
  containerId,
  children,
}: {
  containerId: string
  children: ReactNode
}) {
  const [verification, setVerification] = useState<CloneVerification | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    api
      .getCloneStatus(containerId)
      .then((result) => {
        if (cancelled) return
        setVerification(result)
        setError(null)
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof FileTreeError ? err.message : 'Could not verify the clone.')
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [containerId])

  if (loading) {
    return <GateSkeleton />
  }

  if (error) {
    return (
      <Card className="animate-fade-up border-amber-800/50 bg-amber-950/20">
        <p className="text-sm font-semibold text-amber-200">Could not verify this repository clone.</p>
        <p className="mt-1 text-xs leading-relaxed text-amber-100/60">{error}</p>
      </Card>
    )
  }

  if (verification && !verification.complete) {
    return <CloneBlocked verification={verification} />
  }

  return <>{children}</>
}
