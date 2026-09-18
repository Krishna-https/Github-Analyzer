import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, FileCode, CheckCircle2, Book } from 'lucide-react'
import { api } from '../api/client'
import { Card, SectionTitle } from '../components/ui/Card'
import { SeverityBadge } from '../components/ui/Badge'
import { CodeView } from '../components/ui/CodeView'
import { useAnalysis } from '../context/AnalysisContext'

export default function FindingDetail() {
  const { findingId } = useParams<{ findingId: string }>()
  const detail = api.getFindingDetail(findingId ?? '')
  const { reviewed, markReviewed } = useAnalysis()
  const isReviewed = detail ? reviewed.has(detail.id) : false

  if (!detail) {
    return (
      <div className="space-y-4">
        <Link to="/issues" className="flex items-center gap-1.5 text-xs text-white/50 hover:text-primary">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to issues
        </Link>
        <Card>Finding not found.</Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <Link
          to="/issues"
          className="flex w-fit items-center gap-1.5 text-xs text-white/50 transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to issues
        </Link>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">Finding Detail</div>
          <h1 className="mt-1 text-2xl font-bold text-white">{detail.title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <SeverityBadge severity={detail.severity} />
          {detail.ruleId && (
            <Link
              to={`/rules?rule=${detail.ruleId}`}
              className="flex items-center gap-1.5 rounded-full border border-edge px-3 py-1 text-[11px] font-semibold text-white/55 transition-colors hover:border-primary/30 hover:text-primary"
            >
              <Book className="h-3 w-3" /> Rule {detail.ruleId}
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-3">
          {/* WHAT + WHERE */}
          <Card>
            <div className="grid grid-cols-3 gap-4 border-b border-edge pb-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-white/40">WHAT</div>
                <div className="mt-1 text-sm font-medium text-white/85">Unsafe code pattern detected</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-white/40">WHERE</div>
                <div className="mt-1 font-mono text-xs text-primary">
                  {detail.file}:{detail.line}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-white/40">RULE</div>
                <div className="mt-1 font-mono text-xs text-white/65">{detail.ruleId ?? 'Manual review'}</div>
              </div>
            </div>
          </Card>

          {/* Code snippet */}
          <div>
            <SectionTitle>Detected Code</SectionTitle>
            <div className="mt-2">
              {detail.fix?.code ? (
                <CodeView snippet={detail.fix.code} fixed={detail.fixedCode} title="Detected pattern" fileName={detail.file} />
              ) : (
                <div className="rounded-xl border border-edge bg-ink px-4 py-6 text-center text-xs text-white/40">
                  No code snippet for this finding type.
                </div>
              )}
            </div>
          </div>

          {/* WHY */}
          <Card>
            <SectionTitle>WHY it was detected</SectionTitle>
            <ul className="mt-3 space-y-2">
              {detail.account.map((item) => (
                <li key={item} className="flex items-start gap-2.5 rounded-lg border border-edge bg-shell px-3.5 py-2.5 text-sm text-white/75">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>

          {/* Reason */}
          <Card>
            <SectionTitle>Explanation</SectionTitle>
            <p className="mt-3 text-sm leading-relaxed text-white/65">
              {detail.reason.join(' ')}
            </p>
          </Card>
        </div>

        {/* Side panel */}
        <div className="space-y-5 lg:col-span-2">
          {/* HOW */}
          <Card>
            <SectionTitle>HOW to fix</SectionTitle>
            <div className="mt-3 rounded-xl border border-emerald-800/50 bg-emerald-950/40 p-4">
              <div className="text-sm font-semibold text-emerald-300">{detail.fix.label}</div>
              {detail.fixedCode && (
                <div className="mt-3">
                  <CodeView snippet={detail.fixedCode} title="Suggested fix" />
                </div>
              )}
            </div>
          </Card>

          {/* Metadata */}
          <Card>
            <SectionTitle>Finding Metadata</SectionTitle>
            <div className="mt-3 space-y-2">
              <MetaRow label="Severity" value={detail.severity} />
              <MetaRow label="File" value={detail.file} mono />
              <MetaRow label="Line" value={String(detail.line)} mono />
              <MetaRow label="Category" value={detail.category} />
              <MetaRow label="Label" value={detail.label} />
            </div>
          </Card>

          {/* Actions */}
          <Card>
            <div className="space-y-3">
              {detail.ruleId && (
                <Link
                  to={`/rules?rule=${detail.ruleId}`}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-edge px-4 py-2.5 text-xs font-semibold text-white/70 transition-colors hover:border-primary/30 hover:text-primary"
                >
                  <Book className="h-3.5 w-3.5" /> View Rule
                </Link>
              )}
              <Link
                to={`/explorer?file=${encodeURIComponent(detail.file)}`}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-edge px-4 py-2.5 text-xs font-semibold text-white/70 transition-colors hover:border-primary/30 hover:text-primary"
              >
                <FileCode className="h-3.5 w-3.5" /> View File
              </Link>
              <button
                onClick={() => detail && markReviewed(detail.id)}
                disabled={isReviewed}
                className={`flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition-colors ${
                  isReviewed
                    ? 'border-emerald-800/50 bg-emerald-950/50 text-emerald-400 cursor-default'
                    : 'border-edge text-white/70 hover:border-primary/30 hover:text-primary'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {isReviewed ? 'Marked Reviewed' : 'Mark Reviewed'}
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function MetaRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-white/40">{label}</span>
      <span className={`text-right text-white/75 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}