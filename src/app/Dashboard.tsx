import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../lib/auth'
import type { ProposalRecord } from '../types'
import { listAccessibleProposals, createProposal, renameProposal, deleteProposal } from '../lib/proposals'
import { createEmptyProposal } from '../state/proposal'
import { ShareDialog } from './ShareDialog'
import { Icon } from '../ui/Icon'

const fmtDate = (ms: number) =>
  new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export function Dashboard({ onOpen }: { onOpen: (id: string, title: string, readOnly: boolean) => void }) {
  const { user, profile } = useAuth()
  const [list, setList] = useState<ProposalRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [shareId, setShareId] = useState<string | null>(null)
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

  const newProposal = async () => {
    if (!profile) return
    try {
      const id = await createProposal(profile, createEmptyProposal())
      onOpen(id, 'New proposal', false)
    } catch (e) {
      console.error(e)
      alert('Could not create a proposal — check your permissions.')
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
          <button className="btn btn--primary" onClick={newProposal}>
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
    </div>
  )
}
