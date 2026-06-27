import { useEffect, useState, useCallback } from 'react'
import type { Proposal, ProposalRecord } from '../types'
import { listAllProposals } from '../lib/proposals'
import { investmentTotal } from '../lib/pricing'
import { formatCurrency } from '../lib/util'

const fmtDate = (ms: number) =>
  new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

/** One-line "project summary" derived from the proposal payload. */
function projectSummary(d: Proposal): string {
  if (d.projects.length) {
    const names = d.projects.map((p) => p.title).filter(Boolean)
    const head = names.slice(0, 2).join(', ')
    const more = names.length > 2 ? ` +${names.length - 2} more` : ''
    const label = head || `${d.projects.length} project${d.projects.length === 1 ? '' : 's'}`
    return `${label}${more}`
  }
  return d.settings.summarySubtitle || d.coverMessage || '—'
}

/** Read-only org-wide overview for admins & executives. */
export function ExecutiveView({ onOpen }: { onOpen: (id: string, title: string, readOnly: boolean) => void }) {
  const [list, setList] = useState<ProposalRecord[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    setLoading(true)
    listAllProposals()
      .then(setList)
      .catch((e) => console.error('[exec] list failed', e))
      .finally(() => setLoading(false))
  }, [])
  useEffect(refresh, [refresh])

  const pipeline = list.reduce((s, r) => s + investmentTotal(r.data), 0)

  return (
    <div className="dash">
      <div className="dash__head">
        <div>
          <h1 className="dash__title">Executive overview</h1>
          <p className="dash__sub">Every proposal across the team — a read-only snapshot.</p>
        </div>
      </div>

      <div className="exec-stats">
        <div className="exec-stat">
          <div className="exec-stat__big">{list.length}</div>
          <div className="exec-stat__lbl">Proposals</div>
        </div>
        <div className="exec-stat">
          <div className="exec-stat__big">{formatCurrency(pipeline)}</div>
          <div className="exec-stat__lbl">Total pipeline value</div>
        </div>
      </div>

      {loading ? (
        <div className="dash__empty">Loading…</div>
      ) : list.length === 0 ? (
        <div className="dash__empty">No proposals yet.</div>
      ) : (
        <div className="exectable">
          <div className="exectable__head">
            <span>Title</span>
            <span>Customer</span>
            <span>Salesperson</span>
            <span>Project summary</span>
            <span className="num">Total cost</span>
          </div>
          {list.map((rec) => (
            <button className="exectable__row" key={rec.id} onClick={() => onOpen(rec.id, rec.title, true)}>
              <span className="exectable__title">
                {rec.data.meta.title || rec.title || 'Untitled proposal'}
                <span className="exectable__date">Updated {fmtDate(rec.updatedAt)}</span>
              </span>
              <span>{rec.data.customer.company || '—'}</span>
              <span>{rec.data.preparedBy.repName || '—'}</span>
              <span className="exectable__summary">{projectSummary(rec.data)}</span>
              <span className="num exectable__amt">{formatCurrency(investmentTotal(rec.data))}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
