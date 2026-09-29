'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { chartTooltip } from '@/lib/colors'
import type { LanguageShare } from '@/lib/types'

export function LanguageDonut({ languages }: { languages: LanguageShare[] }) {
  const data = languages.map((l) => ({ name: l.name, value: l.percent, color: l.color }))

  return (
    <div className="h-44">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={72} paddingAngle={2} strokeWidth={0}>
            {data.map((l) => (
              <Cell key={l.name} fill={l.color} />
            ))}
          </Pie>
          <Tooltip {...chartTooltip} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
