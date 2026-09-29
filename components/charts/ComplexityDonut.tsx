'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { chartTooltip } from '@/lib/colors'
import type { ComplexityBucket } from '@/lib/types'

export function ComplexityDonut({ buckets }: { buckets: ComplexityBucket[] }) {
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={buckets} dataKey="count" nameKey="name" innerRadius={52} outerRadius={80} paddingAngle={2} strokeWidth={0}>
            {buckets.map((b) => (
              <Cell key={b.name} fill={b.color} />
            ))}
          </Pie>
          <Tooltip {...chartTooltip} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
