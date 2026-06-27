/**
 * Invite directory (invites/{email}). Only admins write here; an invite
 * pre-authorizes an email so that, on first sign-in, the user's profile is
 * created at the invited role with access enabled. Everyone else who signs in
 * lands blocked until an admin invites or enables them.
 */
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  orderBy,
  query,
  type Firestore,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Invite, OrgRole } from '../types'

function database(): Firestore {
  if (!db) throw new Error('Firebase is not configured')
  return db
}

const norm = (email: string) => email.trim().toLowerCase()
const inviteRef = (email: string) => doc(database(), 'invites', norm(email))

/** Look up an invite by email (used during sign-in provisioning). */
export async function getInvite(email: string): Promise<Invite | null> {
  if (!email) return null
  const snap = await getDoc(inviteRef(email))
  return snap.exists() ? (snap.data() as Invite) : null
}

/** Admin: create or update an invite. */
export async function createInvite(email: string, role: OrgRole, invitedByEmail: string): Promise<void> {
  const invite: Invite = { email: norm(email), role, invitedByEmail, createdAt: Date.now() }
  await setDoc(inviteRef(email), invite)
}

/** Admin: revoke a pending invite. */
export async function deleteInvite(email: string): Promise<void> {
  await deleteDoc(inviteRef(email))
}

/** Admin: list all pending invites. */
export async function listInvites(): Promise<Invite[]> {
  const q = query(collection(database(), 'invites'), orderBy('email'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data() as Invite)
}
