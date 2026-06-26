import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../lib/auth'
import type { OrgRole, UserProfile } from '../types'
import { listUsers, setUserRole, setUserDisabled } from '../lib/users'

const ROLES: OrgRole[] = ['admin', 'creator', 'viewer']

export function AdminUsers() {
  const { user } = useAuth()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    setLoading(true)
    listUsers()
      .then(setUsers)
      .catch((e) => console.error('[admin] list failed', e))
      .finally(() => setLoading(false))
  }, [])
  useEffect(refresh, [refresh])

  const changeRole = async (u: UserProfile, role: OrgRole) => {
    await setUserRole(u.uid, role)
    refresh()
  }
  const toggleDisabled = async (u: UserProfile) => {
    await setUserDisabled(u.uid, !u.disabled)
    refresh()
  }

  return (
    <div className="dash">
      <div className="dash__head">
        <div>
          <h1 className="dash__title">Users</h1>
          <p className="dash__sub">
            Admins manage everyone. Creators can make &amp; share proposals. Viewers only see what's shared with them.
          </p>
        </div>
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
                >
                  {u.disabled ? 'Disabled' : 'Active'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
