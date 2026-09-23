"use client"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts'
import {
  Target,
  ShieldAlert,
  ArrowRight,
  Check,
} from 'lucide-react'
import { Card, SectionTitle } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { api } from '@/lib/api'
import type { EvidenceItem } from '@/lib/types'
import Link from 'next/link'

const evidenceIcons: Record<string, typeof Check> = {
  atom: Check,
  server: Check,
  database: Check,
  route: Check,
  bell: Check,
  layers: Check,
  flask: Check,
}

const evidenceTypes: Record<string, string> = {
  atom: 'bg-primary/10 text-primary',
  server: 'bg-primary/10 text-primary',
  database: 'bg-primary/10 text-primary',
  route: 'bg-primary/10 text-primary',
  bell: 'bg-primary/10 text-primary',
  layers: 'bg-primary/10 text-primary',
  flask: 'bg-primary/10 text-primary',
}

export default function Overview() {
  const overview = api.getRepositoryOverview()
  const repo = overview.repository
  const buckets = api.getComplexityBuckets()
  const langData = overview.languages.map((l) => ({ name: l.name, value: l.percent, color: l.color }))
  const depCounts = api.getDependencyStatusCounts()

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">Repository X-Ray</div>
          <h1 className="mt-1 text-2xl font-bold text-white">acme / taskflow</h1>
          <p className="mt-1 text-sm text-white/50">{repo.description}</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-emerald-800/60 bg-emerald-950/60 px-3.5 py-1.5 text-xs font-semibold text-emerald-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse-dot" />
          Analysis Complete
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Files" value={repo.files} />
        <StatCard label="Source Files" value={repo.sourceFiles} />
        <StatCard label="Functions" value={repo.functions} accent />
        <StatCard label="Modules" value={repo.modules} />
        <StatCard label="Dependencies" value={repo.dependencies} />
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-5">
        <StatCard label="Tests" value={repo.tests} />
        <StatCard label="Classes" value={repo.classes} />
        <StatCard label="Stars" value={repo.stars} />
        <StatCard label="Forks" value={repo.forks} />
        <StatCard label="Open Issues" value={repo.openIssues} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Purpose */}
        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between">
            <SectionTitle>Project Purpose</SectionTitle>
            <span className="flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
              <Target className="h-3 w-3" />
              Inferred from mock repository evidence
            </span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-white/75">
            This repository appears to implement a collaborative task-management platform where users can
            create projects, manage tasks, assign team members, receive notifications and track project
            activity.
          </p>
          <div className="mt-6 rounded-xl border border-edge bg-shell p-4">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-white/35">
              <ShieldAlert className="h-3 w-3" />
              What detected this
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {["React frontend detected", "Express API detected", "User and Project models detected", "PostgreSQL integration detected"].map((x) => (
                <div key={x} className="flex items-center gap-2 text-xs text-white/60">
                  <Check className="h-3.5 w-3.5 text-primary" /> {x}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-edge pt-5">
            <Link href="/architecture" className="flex items-center gap-1.5 text-xs font-semibold text-white/70 transition-colors hover:text-primary">
              View architecture <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link href="/code" className="flex items-center gap-1.5 text-xs font-semibold text-white/70 transition-colors hover:text-primary">
              View code analysis <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link href="/issues" className="flex items-center gap-1.5 text-xs font-semibold text-white/70 transition-colors hover:text-primary">
              View potential issues <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Card>

        {/* Languages */}
        <Card className="lg:col-span-2">
          <SectionTitle>Languages</SectionTitle>
          <div className="mt-2 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={langData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={72} paddingAngle={2} strokeWidth={0}>
                  {langData.map((l) => (
                    <Cell key={l.name} fill={l.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, fontSize: 12 }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-1.5">
            {overview.languages.map((l) => (
              <div key={l.name} className="flex items-center gap-2.5 text-xs">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: l.color }} />
                <span className="w-28 text-white/70">{l.name}</span>
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-edge">
                  <div className="h-full rounded-full" style={{ width: `${l.percent}%`, background: l.color }} />
                </div>
                <span className="w-10 text-right font-mono text-white/45">{l.percent}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Evidence */}
      <Card>
        <div className="flex items-center justify-between">
          <SectionTitle>Evidence</SectionTitle>
          <span className="text-[10px] text-white/30">Confidence assigned by heuristics — not AI</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {overview.evidence.map((e) => {
            const Icon = evidenceIcons[e.icon] ?? Check
            return (
              <div key={e.description} className="rounded-xl border border-edge bg-shell p-3.5">
                <div className="flex items-center justify-between">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${evidenceTypes[e.icon]}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <ConfidenceBadge level={e.confidence} />
                </div>
                <div className="mt-3 text-sm font-medium text-white/85">{e.description}</div>
                <div className="mt-1 text-[10px] uppercase tracking-wide text-white/35">{e.type}</div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Complexity + dependencies */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle>Complexity Distribution</SectionTitle>
          <div className="mt-4 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buckets} margin={{ left: -20, top: 0 }}>
                <XAxis dataKey="name" tick={{ fill: '#ffffff55', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} tickLine={false} />
                <YAxis tick={{ fill: '#ffffff40', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: '#1e293b33' }}
                  contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, fontSize: 12 }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="count" name="Functions" radius={[6, 6, 0, 0]}>
                  {buckets.map((b) => (
                    <Cell key={b.name} fill={b.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            {buckets.map((b) => (
              <div key={b.name} className="flex items-center gap-1.5 text-[11px] text-white/55">
                <span className="h-2 w-2 rounded-full" style={{ background: b.color }} />
                {b.name}: <span className="font-mono text-white/75">{b.count}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle>Dependency Health</SectionTitle>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-edge bg-shell p-4">
              <div className="text-2xl font-bold text-emerald-400">{depCounts.healthy}</div>
              <div className="mt-0.5 text-[10px] uppercase tracking-wider text-white/40">Healthy</div>
            </div>
            <div className="rounded-xl border border-edge bg-shell p-4">
              <div className="text-2xl font-bold text-amber-400">{depCounts.review}</div>
              <div className="mt-0.5 text-[10px] uppercase tracking-wider text-white/40">Review</div>
            </div>
            <div className="rounded-xl border border-edge bg-shell p-4">
              <div className="text-2xl font-bold text-red-400">{depCounts.vulnerable}</div>
              <div className="mt-0.5 text-[10px] uppercase tracking-wider text-white/40">Vulnerable</div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-xl border border-edge bg-shell px-4 py-3">
            <div>
              <div className="text-sm font-medium text-white/85">{repo.dependencies} total packages</div>
              <div className="text-xs text-white/40">16 highlighted in the Dependencies view</div>
            </div>
            <Link href="/dependencies" className="flex items-center gap-1.5 text-xs font-semibold text-primary transition-colors hover:text-primary/80">
              Open <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}

function ConfidenceBadge({ level }: { level: EvidenceItem['confidence'] }) {
  const map: Record<string, string> = {
    High: 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/60',
    Medium: 'bg-amber-950/70 text-amber-400 border border-amber-800/60',
    Low: 'bg-edge text-white/50 border border-edge',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${map[level]}`}>
      {level} confidence
    </span>
  )
}