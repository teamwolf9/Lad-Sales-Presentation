/**
 * User directory (users/{uid}). Profiles auto-provision on first sign-in;
 * admins manage roles from the Users page.
 */
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  type Firestore,
} from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { db } from './firebase'
import { isAdminEmail } from './config'
import { getInvite } from './invites'
import type { OrgRole, UserProfile } from '../types'

function database(): Firestore {
  if (!db) throw new Error('Firebase is not configured')
  return db
}

const userRef = (uid: string) => doc(database(), 'users', uid)

/**
 * Create the profile on first sign-in (or return the existing one). Access is
 * invite-only: a new user is granted a role + enabled ONLY if they are the
 * bootstrap admin or an admin pre-invited their email. Everyone else is created
 * blocked (disabled) and must be invited or enabled by an admin.
 */
export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const ref = userRef(user.uid)
  const snap = await getDoc(ref)
  if (snap.exists()) return snap.data() as UserProfile

  const email = (user.email ?? '').toLowerCase()
  const invite = isAdminEmail(email) ? null : await getInvite(email).catch(() => null)

  let role: OrgRole = 'viewer'
  let disabled = true
  if (isAdminEmail(email)) {
    role = 'admin'
    disabled = false
  } else if (invite) {
    role = invite.role
    disabled = false
  }

  const profile: UserProfile = {
    uid: user.uid,
    email,
    displayName: user.displayName || email || 'User',
    role,
    disabled,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  await setDoc(ref, profile)
  return profile
}

/** Live profile subscription (so admin role changes apply without re-login). */
export function watchUserProfile(uid: string, cb: (p: UserProfile | null) => void): () => void {
  return onSnapshot(userRef(uid), (snap) => cb(snap.exists() ? (snap.data() as UserProfile) : null))
}

/** All users, for the admin page. */
export async function listUsers(): Promise<UserProfile[]> {
  const q = query(collection(database(), 'users'), orderBy('email'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data() as UserProfile)
}

export async function findUserByEmail(email: string): Promise<UserProfile | null> {
  const q = query(collection(database(), 'users'), where('email', '==', email.trim().toLowerCase()))
  const snap = await getDocs(q)
  return snap.empty ? null : (snap.docs[0].data() as UserProfile)
}

export async function setUserRole(uid: string, role: OrgRole): Promise<void> {
  await updateDoc(userRef(uid), { role, updatedAt: Date.now() })
}

export async function setUserDisabled(uid: string, disabled: boolean): Promise<void> {
  await updateDoc(userRef(uid), { disabled, updatedAt: Date.now() })
}
