'use client'

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { chartTooltip } from '@/lib/colors'
import type { ComplexityBucket } from '@/lib/types'

export function ComplexityBars({ buckets }: { buckets: ComplexityBucket[] }) {
  return (
    <div className="h-44">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={buckets} margin={{ left: -20, top: 0 }}>
          <XAxis dataKey="name" tick={{ fill: '#ffffff55', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} tickLine={false} />
          <YAxis tick={{ fill: '#ffffff40', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: '#1e293b33' }} {...chartTooltip} />
          <Bar dataKey="count" name="Functions" radius={[6, 6, 0, 0]}>
            {buckets.map((b) => (
              <Cell key={b.name} fill={b.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
