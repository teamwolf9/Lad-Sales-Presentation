import { useAuth } from '../lib/auth'
import { Icon } from '../ui/Icon'

/** Compact account chip — initials avatar (ring = role), email, sign-out. */
export function AccountInfo() {
  const { profile, signOut } = useAuth()
  if (!profile) return null
  const initial = (profile.email || '?').charAt(0).toUpperCase()
  return (
    <div className="acct" title={`${profile.role} · ${profile.email}`}>
      <span className={`acct__avatar acct__avatar--${profile.role}`}>{initial}</span>
      <span className="acct__email">{profile.email}</span>
      <button className="icon-btn acct__out" onClick={() => signOut()} title="Sign out">
        <Icon name="exit" size={14} />
      </button>
    </div>
  )
}
