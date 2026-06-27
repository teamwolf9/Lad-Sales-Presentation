import { useEffect, useState, useCallback } from 'react'
import type { ProposalRecord, ShareRequest, ShareRole, UserProfile } from '../types'
import { getProposal, shareProposal, unshareProposal } from '../lib/proposals'
import { findUserByEmail, listUsers } from '../lib/users'
import { createShareRequest, listMyRequestsForProposal, denyShareRequest } from '../lib/shareRequests'
import { useAuth } from '../lib/auth'
import { Icon } from '../ui/Icon'

export function ShareDialog({ proposalId, onClose }: { proposalId: string; onClose: () => void }) {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [rec, setRec] = useState<ProposalRecord | null>(null)
  const [byUid, setByUid] = useState<Record<string, UserProfile>>({})
  const [pending, setPending] = useState<ShareRequest[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<ShareRole>('viewer')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [note, setNote] = useState('')

  const refresh = useCallback(() => {
    getProposal(proposalId).then(setRec)
    if (profile?.uid)
      listMyRequestsForProposal(proposalId, profile.uid).then(setPending).catch(() => {})
  }, [proposalId, profile?.uid])

  useEffect(() => {
    refresh()
    listUsers()
      .then((list) => setByUid(Object.fromEntries(list.map((u) => [u.uid, u]))))
      .catch(() => {})
  }, [proposalId, refresh])

  const invite = async () => {
    setBusy(true)
    setErr('')
    setNote('')
    try {
      const u = await findUserByEmail(email)
      if (!u) {
        setErr('No user with that email. They must sign in once before they can be invited.')
        return
      }
      if (rec && u.uid === rec.ownerUid) {
        setErr('That person already owns this proposal.')
        return
      }
      if (isAdmin) {
        await shareProposal(proposalId, u.uid, role)
        setNote('Access granted.')
      } else if (rec && profile) {
        await createShareRequest(rec, u, role, profile)
        setNote('Request sent — an admin must approve it before access is granted.')
      }
      setEmail('')
      await refresh()
    } catch {
      setErr('Could not share — you may not have permission.')
    } finally {
      setBusy(false)
    }
  }

  const members = rec ? Object.entries(rec.roles) : []

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal__card" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h3>Share “{rec?.title ?? 'proposal'}”</h3>
          <button className="modal__x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="share__invite">
          <input
            type="email"
            placeholder="teammate@ladirrigation.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <select value={role} onChange={(e) => setRole(e.target.value as ShareRole)}>
            <option value="viewer">Can view</option>
            <option value="editor">Can edit</option>
          </select>
          <button className="btn btn--primary btn--sm" disabled={busy || !email} onClick={invite}>
            Invite
          </button>
        </div>
        {err && <div className="share__err">{err}</div>}
        {note && <div className="share__note">{note}</div>}
        <p className="share__hint">
          You can only invite people who have signed in at least once.
          {!isAdmin && ' Shares you add need admin approval before access is granted.'}
        </p>

        {pending.length > 0 && (
          <div className="share__pending">
            <div className="share__pending-label">Awaiting admin approval</div>
            {pending.map((req) => (
              <div className="share__row" key={req.id}>
                <div>
                  <div className="share__email">{req.targetEmail}</div>
                  <div className="share__sub">{req.role === 'editor' ? 'Can edit' : 'Can view'} · pending</div>
                </div>
                <button className="icon-btn" title="Cancel request" onClick={() => denyShareRequest(req.id).then(refresh)}>
                  <Icon name="trash" size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="share__list">
          <div className="share__row share__row--owner">
            <div>
              <div className="share__email">{rec?.ownerEmail}</div>
              <div className="share__sub">Owner</div>
            </div>
          </div>
          {members.map(([uid, r]) => (
            <div className="share__row" key={uid}>
              <div>
                <div className="share__email">{byUid[uid]?.email ?? uid}</div>
                <div className="share__sub">{r === 'editor' ? 'Can edit' : 'Can view'}</div>
              </div>
              <button
                className="icon-btn"
                title="Remove access"
                onClick={() => unshareProposal(proposalId, uid).then(refresh)}
              >
                <Icon name="trash" size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
