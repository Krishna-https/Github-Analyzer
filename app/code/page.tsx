import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Search, Activity, ArrowUpRight } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { api } from '../app/api/client'
import { Card, SectionTitle } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { StatusBadge } from '@/components/ui/Badge'

const STATS = [
  { label: 'Functions', value: '438', accent: true },
  { label: 'Classes', value: '34' },
  { label: 'Imports', value: '1,284' },
  { label: 'API Calls', value: '213' },
]

export default function CodeAnalysis() {
  const [search, setSearch] = useState('')
  const functions = api.getFunctions()
  const buckets = api.getComplexityBuckets()
  const complexityFindings = api.getComplexityFindings()

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return functions.filter(
      (fn) =>
        !q || fn.name.toLowerCase().includes(q) || fn.file.toLowerCase().includes(q) || fn.module.toLowerCase().includes(q)
    )
  }, [search])

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">Code Analysis</div>
        <h1 className="mt-1 text-2xl font-bold text-white">Code Structure Analysis</h1>
        <p className="mt-1 max-w-2xl text-sm text-white/50">
          Scan results across 176 source files. Function table, complexity distribution and notable
          high-complexity findings.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATS.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} accent={s.accent} />
        ))}
      </div>

      {/* Complexity overview */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between">
            <SectionTitle>Complexity Distribution</SectionTitle>
            <div className="flex items-center gap-3 text-[11px] text-white/45">
              <Activity className="h-3.5 w-3.5" />
              {buckets.reduce((a, b) => a + b.count, 0)} functions analyzed
            </div>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-white/45">
            Complexity indicates the number of independent execution paths detected in a function. High
            complexity can make code harder to test and maintain.
          </p>
          <div className="mt-4 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={buckets} dataKey="count" nameKey="name" innerRadius={52} outerRadius={80} paddingAngle={2} strokeWidth={0}>
                  {buckets.map((b) => (
                    <Cell key={b.name} fill={b.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, fontSize: 12 }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-4 mt-2">
            {buckets.map((b) => (
              <div key={b.name} className="flex items-center gap-2 text-xs text-white/55">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: b.color }} />
                {b.name}: <span className="font-mono text-white/75">{b.count}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <SectionTitle>High Complexity Findings</SectionTitle>
          <div className="mt-3 space-y-3">
            {complexityFindings.map((cf) => (
              <Link
                key={cf.id}
                to={`/findings/${cf.id}`}
                className="group block rounded-xl border border-edge bg-shell p-3.5 transition-all hover:border-primary/30"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="font-mono text-sm font-semibold text-white/85 group-hover:text-primary/90">
                      {cf.functionName}
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] text-white/40">{cf.file}</div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      cf.status === 'Critical'
                        ? 'bg-red-950/80 text-red-300 border border-red-800/60'
                        : 'bg-orange-950/80 text-orange-300 border border-orange-800/60'
                    }`}
                  >
                    {cf.status}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-3 text-[11px] text-white/50">
                  <span className="font-mono">CC {cf.cyclomatic}</span>
                  <span className="font-mono">Nesting {cf.nestingDepth}</span>
                  <span className="font-mono">{cf.lineCount} lines</span>
                </div>
                <ArrowUpRight className="mt-2 h-3.5 w-3.5 text-white/20 transition-colors group-hover:text-primary" />
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* Function table */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTitle>Function Table</SectionTitle>
          <div className="flex items-center gap-2 rounded-lg border border-edge bg-shell px-3 py-2">
            <Search className="h-3.5 w-3.5 text-white/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search functions, files…"
              className="w-40 bg-transparent text-xs text-white placeholder-white/30 outline-none"
            />
          </div>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-edge text-[10px] font-bold uppercase tracking-wider text-white/35">
              <tr>
                <th className="pb-2 pr-6 font-semibold">Function</th>
                <th className="pb-2 pr-6 font-semibold">File</th>
                <th className="pb-2 pr-6 text-right font-semibold">Lines</th>
                <th className="pb-2 pr-6 text-right font-semibold">Complexity</th>
                <th className="pb-2 pr-6 text-right font-semibold">Calls</th>
                <th className="pb-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge/50 text-white/65">
              {filtered.map((fn) => (
                <tr key={fn.name + fn.file} className="hover:bg-edge/30">
                  <td className="py-2.5 pr-6 font-mono text-white/80">{fn.name}</td>
                  <td className="py-2.5 pr-6 font-mono text-white/40">{fn.file}</td>
                  <td className="py-2.5 pr-6 text-right tabular-nums">{fn.lines}</td>
                  <td className="py-2.5 pr-6 text-right tabular-nums">{fn.complexity}</td>
                  <td className="py-2.5 pr-6 text-right tabular-nums">{fn.calls}</td>
                  <td className="py-2.5">
                    <StatusBadge label={fn.status} />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-white/40">
                    No functions match the search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}