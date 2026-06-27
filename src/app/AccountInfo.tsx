import { useAuth } from '../lib/auth'

/** Role badge + email + sign-out — shown top-right on every signed-in screen. */
export function AccountInfo() {
  const { profile, signOut } = useAuth()
  if (!profile) return null
  return (
    <div className="acct">
      <span className={`acct__role acct__role--${profile.role}`}>{profile.role}</span>
      <span className="acct__email">{profile.email}</span>
      <button className="btn btn--ghost btn--sm" onClick={() => signOut()}>
        Sign out
      </button>
    </div>
  )
}
