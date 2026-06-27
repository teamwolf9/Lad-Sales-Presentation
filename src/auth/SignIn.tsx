import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { LAD_BRAND } from '../theme/brand'

/** Full-screen sign-in gate, shown only when Firebase is configured. */
export function SignIn() {
  const { signInGoogle, signInEmail, registerEmail } = useAuth()
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setErr('')
    try {
      await fn()
    } catch (e) {
      const code = (e as { code?: string })?.code ?? ''
      // Friendly, actionable messages — and nudge first-timers to Create account.
      if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
        setErr(
          mode === 'in'
            ? 'No account found for that email yet. If this is your first time, switch to “Create account” to set a password.'
            : 'That didn’t work — check the email and password.',
        )
        if (mode === 'in') setMode('up')
      } else if (code === 'auth/email-already-in-use') {
        setErr('An account already exists for that email — switch to “Sign in.”')
        setMode('in')
      } else if (code === 'auth/weak-password') {
        setErr('Password must be at least 6 characters.')
      } else if (code === 'auth/invalid-email') {
        setErr('That doesn’t look like a valid email address.')
      } else {
        setErr(e instanceof Error ? e.message.replace('Firebase: ', '') : 'Sign-in failed')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="signin">
      <div className="signin__photo" style={{ backgroundImage: `url(${LAD_BRAND.photos.pivotSunset})` }} />
      <div className="signin__scrim" />
      <div className="signin__card">
        <img className="signin__logo" src={LAD_BRAND.logos.primary} alt={LAD_BRAND.name} />
        <h1 className="signin__title">Proposal Builder</h1>
        <p className="signin__sub">{LAD_BRAND.tagline}</p>

        <button className="btn btn--ghost btn--block signin__google" disabled={busy} onClick={() => run(signInGoogle)}>
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
            <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
          </svg>
          Continue with Google
        </button>

        <div className="signin__or">
          <span>or use your email</span>
        </div>

        <div className="signin__seg">
          <button
            type="button"
            className={`signin__segbtn ${mode === 'in' ? 'is-on' : ''}`}
            onClick={() => { setMode('in'); setErr('') }}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`signin__segbtn ${mode === 'up' ? 'is-on' : ''}`}
            onClick={() => { setMode('up'); setErr('') }}
          >
            Create account
          </button>
        </div>
        {mode === 'up' && (
          <p className="signin__hint">First time? Create an account with the email you were invited at.</p>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            run(() => (mode === 'in' ? signInEmail(email, password) : registerEmail(email, password)))
          }}
        >
          <input type="email" placeholder="you@ladirrigation.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          {err && <div className="signin__err">{err}</div>}
          <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
            {busy ? 'Working…' : mode === 'in' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  )
}
