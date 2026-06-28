import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../lib/auth'
import type { Invite, OrgRole, ShareRequest, UserProfile } from '../types'
import { listUsers, setUserRole, setUserDisabled } from '../lib/users'
import { listInvites, createInvite, deleteInvite } from '../lib/invites'
import { listPendingRequests, approveShareRequest, denyShareRequest } from '../lib/shareRequests'
import { Icon } from '../ui/Icon'

const ROLES: OrgRole[] = ['admin', 'executive', 'creator', 'viewer']

export function AdminUsers() {
  const { user, profile } = useAuth()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [requests, setRequests] = useState<ShareRequest[]>([])
  const [loading, setLoading] = useState(true)

  // invite form
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<OrgRole>('creator')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [sent, setSent] = useState('')

  const refresh = useCallback(() => {
    setLoading(true)
    Promise.all([listUsers(), listInvites(), listPendingRequests()])
      .then(([u, i, r]) => {
        setUsers(u)
        setInvites(i)
        setRequests(r)
      })
      .catch((e) => console.error('[admin] load failed', e))
      .finally(() => setLoading(false))
  }, [])
  useEffect(refresh, [refresh])

  const changeRole = async (u: UserProfile, r: OrgRole) => {
    await setUserRole(u.uid, r)
    refresh()
  }
  const toggleDisabled = async (u: UserProfile) => {
    const freezing = !u.disabled
    const msg = freezing
      ? `Freeze ${u.email}? They'll be signed out and can't view or change anything until you unfreeze them.`
      : `Unfreeze ${u.email}? They'll regain access at their current role.`
    if (!confirm(msg)) return
    await setUserDisabled(u.uid, freezing)
    refresh()
  }

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    const clean = email.trim().toLowerCase()
    if (!clean) return
    setBusy(true)
    setErr('')
    setSent('')
    try {
      await createInvite(clean, role, profile?.email || user?.email || 'admin')
      setEmail('')
      setSent(`Invited ${clean} — an email is on its way.`)
      refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not create invite')
    } finally {
      setBusy(false)
    }
  }
  const revoke = async (inv: Invite) => {
    if (!confirm(`Cancel the invite for ${inv.email}? They won't be able to sign in unless re-invited.`)) return
    await deleteInvite(inv.email)
    refresh()
  }
  const approveReq = async (req: ShareRequest) => {
    await approveShareRequest(req)
    refresh()
  }
  const denyReq = async (req: ShareRequest) => {
    await denyShareRequest(req.id)
    refresh()
  }

  const userEmails = new Set(users.map((u) => u.email))

  return (
    <div className="dash">
      <div className="dash__head">
        <div>
          <h1 className="dash__title">Users &amp; access</h1>
          <p className="dash__sub">
            Access is invite-only. Invite an email to grant access — they come in at the role you choose the first time
            they sign in. Admins manage everyone; creators make &amp; share proposals; viewers only see what's shared.
          </p>
        </div>
      </div>

      {/* ---- Invite someone ---- */}
      <div className="invite-card">
        <form className="invite-form" onSubmit={sendInvite}>
          <input
            type="email"
            placeholder="name@ladirrigation.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <select value={role} onChange={(e) => setRole(e.target.value as OrgRole)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn--primary btn--sm" disabled={busy}>
            <Icon name="plus" size={14} /> {busy ? 'Inviting…' : 'Invite'}
          </button>
        </form>
        {err && <div className="invite-err">{err}</div>}
        {sent && <div className="invite-sent">{sent}</div>}

        {invites.length > 0 && (
          <div className="invite-list">
            <div className="invite-list__label">Pending invites</div>
            {invites.map((inv) => {
              const accepted = userEmails.has(inv.email)
              return (
                <div className="invite-row" key={inv.email}>
                  <span className="invite-row__email">{inv.email}</span>
                  <span className="invite-row__role">{inv.role}</span>
                  <span className={`invite-row__state ${accepted ? 'is-accepted' : ''}`}>
                    {accepted ? 'Joined' : 'Awaiting sign-in'}
                  </span>
                  <button className="icon-btn" onClick={() => revoke(inv)} title="Cancel invite">
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ---- Share requests awaiting approval ---- */}
      {requests.length > 0 && (
        <div className="invite-card req-card">
          <div className="invite-list__label">Share requests awaiting approval</div>
          {requests.map((req) => (
            <div className="req-row" key={req.id}>
              <div className="req-row__main">
                <span className="req-row__who">{req.requestedByEmail}</span> wants to share{' '}
                <strong>“{req.proposalTitle}”</strong> with <span className="req-row__who">{req.targetEmail}</span> as{' '}
                <span className="req-row__role">{req.role === 'editor' ? 'editor' : 'viewer'}</span>
              </div>
              <div className="req-row__actions">
                <button className="btn btn--primary btn--sm" onClick={() => approveReq(req)}>
                  <Icon name="check" size={14} /> Approve
                </button>
                <button className="btn btn--ghost btn--sm" onClick={() => denyReq(req)}>
                  Deny
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="dash__empty">Loading…</div>
      ) : (
        <div className="utable">
          <div className="utable__head">
            <span>User</span>
            <span>Role</span>
            <span>Status</span>
          </div>
          {users.map((u) => (
            <div className="utable__row" key={u.uid}>
              <div>
                <div className="utable__name">
                  {u.displayName} {u.uid === user?.uid && <span className="utable__you">you</span>}
                </div>
                <div className="utable__email">{u.email}</div>
              </div>
              <div>
                <select
                  className="utable__role"
                  value={u.role}
                  onChange={(e) => changeRole(u, e.target.value as OrgRole)}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <button
                  className={`utable__status ${u.disabled ? 'is-off' : 'is-on'}`}
                  onClick={() => toggleDisabled(u)}
                  title={u.disabled ? 'Frozen — click to unfreeze' : 'Active — click to freeze (block sign-in & access)'}
                >
                  {u.disabled ? 'Frozen' : 'Active'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
