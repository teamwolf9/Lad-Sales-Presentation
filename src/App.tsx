import { AuthProvider, useAuth } from './lib/auth'
import { SignIn } from './auth/SignIn'
import { ProposalProvider } from './state/proposal'
import { ProposalWorkspace } from './app/ProposalWorkspace'
import { AppShell } from './app/AppShell'

/**
 * Decides what to render:
 * - Firebase off  → standalone single-draft editor (localStorage).
 * - Firebase on   → sign-in gate, then the multi-user app shell.
 */
function Gate() {
  const { enabled, ready, profileReady, user, profile, signOut } = useAuth()

  if (!enabled) {
    return (
      <ProposalProvider>
        <ProposalWorkspace />
      </ProposalProvider>
    )
  }
  if (!ready) return <div className="app-loading">Loading…</div>
  if (!user) return <SignIn />
  if (!profileReady) return <div className="app-loading">Loading your account…</div>
  if (profile?.disabled)
    return (
      <div className="app-gate">
        <div className="app-gate__card">
          <h2>Access pending</h2>
          <p>
            Your account isn’t active yet. Access to the Proposal Builder is invite-only — ask an administrator to grant
            you access.
          </p>
          <button className="btn btn--ghost btn--sm" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </div>
    )
  return <AppShell />
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
