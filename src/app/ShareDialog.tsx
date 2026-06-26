import { useEffect, useState } from 'react'
import type { ProposalRecord, ShareRole, UserProfile } from '../types'
import { getProposal, shareProposal, unshareProposal } from '../lib/proposals'
import { findUserByEmail, listUsers } from '../lib/users'
import { Icon } from '../ui/Icon'

export function ShareDialog({ proposalId, onClose }: { proposalId: string; onClose: () => void }) {
  const [rec, setRec] = useState<ProposalRecord | null>(null)
  const [byUid, setByUid] = useState<Record<string, UserProfile>>({})
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<ShareRole>('viewer')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const refresh = () => getProposal(proposalId).then(setRec)

  useEffect(() => {
    refresh()
    listUsers()
      .then((list) => setByUid(Object.fromEntries(list.map((u) => [u.uid, u]))))
      .catch(() => {})
  }, [proposalId])

  const invite = async () => {
    setBusy(true)
    setErr('')
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
      await shareProposal(proposalId, u.uid, role)
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
        <p className="share__hint">You can only invite people who have signed in at least once.</p>

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
