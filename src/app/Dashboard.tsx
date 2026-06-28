import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '../lib/auth'
import type { Proposal, ProposalRecord } from '../types'
import { listAccessibleProposals, createProposal, renameProposal, deleteProposal } from '../lib/proposals'
import { createEmptyProposal } from '../state/proposal'
import { parseJobQuoteXml } from '../lib/importQuote'
import { ShareDialog } from './ShareDialog'
import { Icon } from '../ui/Icon'

const fmtDate = (ms: number) =>
  new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export function Dashboard({ onOpen }: { onOpen: (id: string, title: string, readOnly: boolean) => void }) {
  const { user, profile } = useAuth()
  const [list, setList] = useState<ProposalRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [shareId, setShareId] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [busy, setBusy] = useState(false)
  const quoteRef = useRef<HTMLInputElement>(null)
  const canCreate = profile?.role === 'admin' || profile?.role === 'creator'

  const refresh = useCallback(() => {
    if (!user) return
    setLoading(true)
    listAccessibleProposals(user.uid)
      .then(setList)
      .catch((e) => console.error('[dashboard] list failed', e))
      .finally(() => setLoading(false))
  }, [user])

  useEffect(refresh, [refresh])

  /** Stamp prepared-by with the logged-in user. */
  const withPreparedBy = (data: Proposal): Proposal => ({
    ...data,
    preparedBy: {
      ...data.preparedBy,
      repName: data.preparedBy.repName || profile?.displayName || profile?.email || '',
      repEmail: data.preparedBy.repEmail || profile?.email || '',
    },
  })

  const create = async (data: Proposal, title: string) => {
    if (!profile) return
    setBusy(true)
    try {
      const id = await createProposal(profile, withPreparedBy(data))
      setShowNew(false)
      onOpen(id, title, false)
    } catch (e) {
      console.error(e)
      alert('Could not create a proposal — check your permissions.')
    } finally {
      setBusy(false)
    }
  }

  const startBlank = () => create(createEmptyProposal(), 'New proposal')

  const onPickQuote = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const q = parseJobQuoteXml(await file.text())
      const base = createEmptyProposal()
      const data: Proposal = {
        ...base,
        meta: {
          ...base.meta,
          title: q.meta.title || base.meta.title,
          number: q.meta.number || base.meta.number,
          date: q.meta.date || base.meta.date,
        },
        customer: {
          ...base.customer,
          company: q.customer.company,
          contactName: q.customer.contactName,
          location: q.customer.location,
        },
        projects: q.projects,
        settings: { ...base.settings, showSummary: true },
      }
      await create(data, data.meta.title)
    } catch (err) {
      console.error('Quote import failed', err)
      alert(`Couldn't import that file.\n${err instanceof Error ? err.message : 'Unknown error.'}`)
      setBusy(false)
    }
  }

  const rename = async (rec: ProposalRecord) => {
    const next = prompt('Rename proposal', rec.title)
    if (next && next !== rec.title) {
      await renameProposal(rec.id, next)
      refresh()
    }
  }
  const remove = async (rec: ProposalRecord) => {
    if (confirm(`Delete “${rec.title}”? This cannot be undone.`)) {
      await deleteProposal(rec.id)
      refresh()
    }
  }

  return (
    <div className="dash">
      <div className="dash__head">
        <div>
          <h1 className="dash__title">Proposals</h1>
          <p className="dash__sub">
            {canCreate ? 'Create, open, and share proposals.' : 'Proposals shared with you.'}
          </p>
        </div>
        {canCreate && (
          <button className="btn btn--primary" onClick={() => setShowNew(true)}>
            <Icon name="plus" size={16} /> New proposal
          </button>
        )}
      </div>

      {loading ? (
        <div className="dash__empty">Loading…</div>
      ) : list.length === 0 ? (
        <div className="dash__empty">
          {canCreate ? 'No proposals yet. Create your first one.' : 'Nothing has been shared with you yet.'}
        </div>
      ) : (
        <div className="dash__grid">
          {list.map((rec) => {
            const isOwner = rec.ownerUid === user?.uid
            const myRole = isOwner ? 'owner' : rec.roles[user?.uid ?? '']
            const canEdit = isOwner || myRole === 'editor'
            return (
              <div className="pcard" key={rec.id}>
                <button className="pcard__open" onClick={() => onOpen(rec.id, rec.title, !canEdit)}>
                  <div className="pcard__title">{rec.title || 'Untitled proposal'}</div>
                  <div className="pcard__meta">
                    {rec.customerCompany || '—'}
                    {rec.number ? ` · ${rec.number}` : ''}
                  </div>
                  <div className="pcard__foot">
                    <span className={`pcard__badge pcard__badge--${myRole}`}>{isOwner ? 'Owner' : myRole}</span>
                    <span className="pcard__date">Updated {fmtDate(rec.updatedAt)}</span>
                  </div>
                </button>
                <div className="pcard__actions">
                  {canEdit && (
                    <button className="icon-btn" title="Rename" onClick={() => rename(rec)}>
                      <Icon name="drafting" size={14} />
                    </button>
                  )}
                  {isOwner && (
                    <button className="icon-btn" title="Share" onClick={() => setShareId(rec.id)}>
                      <Icon name="signal" size={14} />
                    </button>
                  )}
                  {isOwner && (
                    <button className="icon-btn" title="Delete" onClick={() => remove(rec)}>
                      <Icon name="trash" size={14} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {shareId && <ShareDialog proposalId={shareId} onClose={() => { setShareId(null); refresh() }} />}

      {showNew && (
        <div className="modal" onClick={() => !busy && setShowNew(false)}>
          <div className="modal__card" onClick={(e) => e.stopPropagation()}>
            <div className="modal__head">
              <h3>New proposal</h3>
              <button className="modal__x" onClick={() => !busy && setShowNew(false)} aria-label="Close">✕</button>
            </div>
            <p className="share__hint" style={{ marginTop: 0 }}>
              Start from a Business Central quote (.xml) to pre-fill the customer, number, date, and line items — or
              start from a blank proposal. Everything stays editable.
            </p>
            <div className="newprop">
              <button className="newprop__opt" disabled={busy} onClick={() => quoteRef.current?.click()}>
                <Icon name="box" size={22} />
                <span className="newprop__t">{busy ? 'Importing…' : 'Import a quote (.xml)'}</span>
                <span className="newprop__d">Upload your WSI Job Quote export</span>
              </button>
              <button className="newprop__opt" disabled={busy} onClick={startBlank}>
                <Icon name="plus" size={22} />
                <span className="newprop__t">Start blank</span>
                <span className="newprop__d">Build from scratch</span>
              </button>
            </div>
            <input
              ref={quoteRef}
              type="file"
              accept=".xml,text/xml,application/xml"
              onChange={onPickQuote}
              style={{ display: 'none' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
