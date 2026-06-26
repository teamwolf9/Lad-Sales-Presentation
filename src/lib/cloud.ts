/**
 * Firestore persistence for the current proposal draft.
 *
 * Stored at users/{uid}/proposals/current. No-ops (and returns null) when
 * Firebase isn't configured, so the caller transparently falls back to
 * localStorage.
 */
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db, firebaseEnabled } from './firebase'
import type { Proposal } from '../types'

const draftDoc = (uid: string) => doc(db!, 'users', uid, 'proposals', 'current')

export async function loadCloudProposal(uid: string): Promise<Proposal | null> {
  if (!firebaseEnabled || !db) return null
  const snap = await getDoc(draftDoc(uid))
  if (!snap.exists()) return null
  const data = snap.data()
  return (data.proposal ?? null) as Proposal | null
}

export async function saveCloudProposal(uid: string, proposal: Proposal): Promise<void> {
  if (!firebaseEnabled || !db) return
  await setDoc(draftDoc(uid), { proposal, ownerUid: uid, updatedAt: Date.now() })
}
