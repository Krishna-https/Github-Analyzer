import { useState } from 'react'
import type { CodeSnippet } from '../@/lib/types'

export function CodeView({
  snippet,
  fixed,
  title,
  fileName,
}: {
  snippet: CodeSnippet
  fixed?: CodeSnippet
  title?: string
  fileName?: string
}) {
  const [showFix, setShowFix] = useState(false)
  const active = showFix && fixed ? fixed : snippet

  return (
    <div className="rounded-xl border border-edge bg-ink overflow-hidden">
      {(title || fileName) && (
        <div className="flex items-center justify-between border-b border-edge bg-shell px-4 py-2.5">
          <div className="flex items-center gap-2 text-xs">
            {title && <span className="font-semibold text-white/80">{title}</span>}
            {fileName && <span className="font-mono text-white/40">{fileName}</span>}
          </div>
          {fixed && (
            <button
              onClick={() => setShowFix(!showFix)}
              className="rounded-md bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/20"
            >
              {showFix ? 'Show Original' : 'Show Fixed Version'}
            </button>
          )}
        </div>
      )}
      <div className="overflow-x-auto">
        <pre className="text-[13px] leading-6">
          {active.lines.map((line, i) => {
            const lineNum = active.startLine + i
            const highlighted = active.highlight.includes(i)
            return (
              <div
                key={i}
                className={`flex ${highlighted ? 'bg-primary/10 border-l-2 border-primary' : 'border-l-2 border-transparent'} px-4`}
              >
                <span className="mr-4 select-none text-right text-white/25 w-6 shrink-0">{lineNum}</span>
                <span className={`flex-1 whitespace-pre font-mono ${highlighted ? 'text-primary/90' : 'text-white/75'}`}>
                  {line}
                </span>
              </div>
            )
          })}
        </pre>
      </div>
    </div>
  )
}