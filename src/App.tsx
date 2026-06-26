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
  const { enabled, ready, profileReady, user, profile } = useAuth()

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
    return <div className="app-loading">Your account has been disabled. Contact an administrator.</div>
  return <AppShell />
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
