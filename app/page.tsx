"use client";
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ScanLine,
  BrainCircuit,
  ShieldAlert,
  // Github,
  ArrowRight,
  Wand2,
  FileCode,
  Boxes,
  Package,
} from 'lucide-react'
import { useAnalysis } from '@/context/AnalysisContext'
import { mockRepository } from '../data/mockData'

const features = [
  {
    icon: ScanLine,
    title: 'Repository X-Ray',
    body: 'Understand what the repository contains and how it is structured.',
    to: '/overview',
  },
  {
    icon: BrainCircuit,
    title: 'Code Intelligence',
    body: 'Explore modules, functions, dependencies and complexity.',
    to: '/code',
  },
  {
    icon: ShieldAlert,
    title: 'Issue Detection',
    body: 'See potential security, maintainability and code-quality issues with exact file and line references.',
    to: '/issues',
  },
]

const flow = [
  { label: 'Frontend', Icon: FileCode },
  { label: 'API', Icon: ScanLine },
  { label: 'Services', Icon: Boxes },
  { label: 'Database', Icon: Package },
]

export default function Home() {
  const { setRepoUrl, startAnalysis } = useAnalysis()
  const [url, setUrl] = useState('')
  const router = useRouter()

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setRepoUrl(url.trim() || 'https://github.com/acme/taskflow')
    startAnalysis()
    router.push('/analyze')
  }

  return (
    <div className="min-h-screen bg-ink">
      <header className="flex items-center gap-2.5 border-b border-edge px-6 py-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
            <path d="M3 20l6-8 4 5 5-9 3 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="20" cy="6" r="2" fill="currentColor"/>
          </svg>
        </span>
        <div>
          <div className="text-sm font-bold text-white">Repository X-Ray</div>
          <div className="text-[11px] text-white/40">GitHub Repository Analyzer</div>
        </div>
        <span className="ml-auto hidden rounded-full border border-edge px-3 py-1 text-[11px] font-medium text-white/45 sm:block">
          Prototype
        </span>
      </header>

      <main className="px-6 pb-20">
        <div className="mx-auto max-w-5xl pt-20 text-center">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-3.5 py-1.5 text-xs font-semibold text-primary animate-fade-up">
            <Wand2 className="h-3.5 w-3.5" />
            Mock Analysis Demo — no code is actually cloned
          </div>

          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl">
            See What's Really Inside
            <br />
            <span className="text-gradient-primary">a Repository.</span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base text-white/55 sm:text-lg">
            Turn an unfamiliar GitHub codebase into an interactive X-ray of its architecture, modules,
            dependencies and potential issues.
          </p>

          <form onSubmit={onSubmit} className="mx-auto mt-10 max-w-2xl">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex flex-1 items-center gap-2.5 rounded-xl border border-edge bg-card px-4 py-3.5 transition-colors focus-within:border-primary/50">
                {/* <Github className="h-4 w-4 shrink-0 text-white/35" /> */}
                Github
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://github.com/example/project"
                  className="w-full bg-transparent font-mono text-sm text-white placeholder-white/30 outline-none"
                  aria-label="GitHub repository URL"
                />
              </div>
              <button
                type="submit"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-black transition-all hover:bg-primary/90 hover:shadow-lime-glow"
              >
                Analyze Repository
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </form>

          <div className="mt-4 flex items-center justify-center gap-3 text-[11px] text-white/35">
            <span className="rounded-full border border-edge px-2.5 py-1">Prototype</span>
            <span className="rounded-full border border-edge px-2.5 py-1">Mock Analysis</span>
          </div>
          <p className="mt-3 text-[11px] text-white/30">
            This prototype demonstrates the future analysis workflow using sample repository data.
          </p>
        </div>

        {/* Preview pipeline */}
        <div className="mx-auto mt-16 max-w-4xl">
          <div className="rounded-2xl border border-edge bg-card p-6 sm:p-8">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/45">
              {/* <Github className="h-3.5 w-3.5" /> */}
              Github
              Preview — repository pipeline
            </div>
            <div className="mt-5 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
              {flow.map((item, i) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="flex flex-1 items-center gap-3 rounded-xl border border-edge bg-shell px-5 py-4 text-sm font-semibold text-white/80 sm:flex-none">
                    <item.Icon className="h-4 w-4 text-primary" />
                    {item.label}
                  </div>
                  {i < flow.length - 1 && (
                    <span className="hidden text-primary/40 sm:block">↓</span>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-7 grid grid-cols-2 gap-4 border-t border-edge pt-6 sm:grid-cols-4">
              <div>
                <div className="text-2xl font-bold text-primary">{mockRepository.files}</div>
                <div className="text-[11px] uppercase tracking-wider text-white/40">Files</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{mockRepository.functions}</div>
                <div className="text-[11px] uppercase tracking-wider text-white/40">Functions</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{mockRepository.modules}</div>
                <div className="text-[11px] uppercase tracking-wider text-white/40">Modules</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{mockRepository.dependencies}</div>
                <div className="text-[11px] uppercase tracking-wider text-white/40">Dependencies</div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature cards */}
        <div className="mx-auto mt-6 max-w-4xl">
          <div className="grid gap-4 sm:grid-cols-3">
            {features.map((f) => (
              <Link
                key={f.title}
                href={f.to}
                className="group rounded-2xl border border-edge bg-card p-6 transition-all hover:border-primary/30 hover:shadow-lime-glow"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <div className="mt-4 text-sm font-bold text-white">{f.title}</div>
                <p className="mt-1.5 text-xs leading-relaxed text-white/50">{f.body}</p>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-primary/80 opacity-0 transition-opacity group-hover:opacity-100">
                  Open <ArrowRight className="h-3 w-3" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        <footer className="mx-auto mt-12 max-w-4xl border-t border-edge pt-5 text-center text-[11px] text-white/30">
          Frontend-only prototype · no GitHub API, no backend, no AI · all results derived from centralized mock data
        </footer>
      </main>
    </div>
  )
}