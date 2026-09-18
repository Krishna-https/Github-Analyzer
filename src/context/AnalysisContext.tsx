import { createContext, useContext, useState, type ReactNode } from 'react'

interface AnalysisState {
  status: 'idle' | 'analyzing' | 'complete'
  repoUrl: string
  reviewed: Set<string>
  setRepoUrl: (url: string) => void
  startAnalysis: () => void
  completeAnalysis: () => void
  markReviewed: (id: string) => void
}

const Ctx = createContext<AnalysisState>(null!)

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AnalysisState['status']>('idle')
  const [repoUrl, setRepoUrl] = useState('https://github.com/acme/taskflow')
  const [reviewed, setReviewed] = useState(new Set<string>())

  const startAnalysis = () => setStatus('analyzing')
  const completeAnalysis = () => setStatus('complete')
  const markReviewed = (id: string) => setReviewed((prev) => new Set(prev).add(id))

  return (
    <Ctx.Provider
      value={{ status, repoUrl, reviewed, setRepoUrl, startAnalysis, completeAnalysis, markReviewed }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useAnalysis() {
  return useContext(Ctx)
}