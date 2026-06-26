import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { auth, firebaseEnabled } from './firebase'

interface AuthCtx {
  /** Firebase user, or null when signed out / standalone. */
  user: User | null
  /** Auth state has resolved (avoid flashing the sign-in screen). */
  ready: boolean
  /** Firebase is configured. When false, the app runs without sign-in. */
  enabled: boolean
  signInGoogle: () => Promise<void>
  signInEmail: (email: string, password: string) => Promise<void>
  registerEmail: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(!firebaseEnabled)

  useEffect(() => {
    if (!firebaseEnabled || !auth) return
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setReady(true)
    })
  }, [])

  const signInGoogle = async () => {
    if (!auth) return
    await signInWithPopup(auth, new GoogleAuthProvider())
  }
  const signInEmail = async (email: string, password: string) => {
    if (!auth) return
    await signInWithEmailAndPassword(auth, email, password)
  }
  const registerEmail = async (email: string, password: string) => {
    if (!auth) return
    await createUserWithEmailAndPassword(auth, email, password)
  }
  const signOut = async () => {
    if (!auth) return
    await fbSignOut(auth)
  }

  return (
    <Ctx.Provider value={{ user, ready, enabled: firebaseEnabled, signInGoogle, signInEmail, registerEmail, signOut }}>
      {children}
    </Ctx.Provider>
  )
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
