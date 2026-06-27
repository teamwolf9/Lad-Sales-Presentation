import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../lib/auth'
import type { Invite, OrgRole, UserProfile } from '../types'
import { listUsers, setUserRole, setUserDisabled } from '../lib/users'
import { listInvites, createInvite, deleteInvite } from '../lib/invites'
import { Icon } from '../ui/Icon'

const ROLES: OrgRole[] = ['admin', 'creator', 'viewer']

export function AdminUsers() {
  const { user, profile } = useAuth()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)

  // invite form
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<OrgRole>('creator')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const refresh = useCallback(() => {
    setLoading(true)
    Promise.all([listUsers(), listInvites()])
      .then(([u, i]) => {
        setUsers(u)
        setInvites(i)
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
    await setUserDisabled(u.uid, !u.disabled)
    refresh()
  }

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    const clean = email.trim().toLowerCase()
    if (!clean) return
    setBusy(true)
    setErr('')
    try {
      await createInvite(clean, role, profile?.email || user?.email || 'admin')
      setEmail('')
      refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not create invite')
    } finally {
      setBusy(false)
    }
  }
  const revoke = async (inv: Invite) => {
    await deleteInvite(inv.email)
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
                  <button className="icon-btn" onClick={() => revoke(inv)} title="Revoke invite">
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

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
                  title={u.disabled ? 'Click to grant access' : 'Click to block access'}
                >
                  {u.disabled ? 'No access' : 'Active'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
