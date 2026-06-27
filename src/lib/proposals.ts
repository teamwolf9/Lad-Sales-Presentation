/**
 * Proposals collection (proposals/{id}). Each doc holds metadata, a membership
 * map, and the full proposal under `data`. Sharing is by uid (existing users).
 */
import {
  collection,
  doc,
  addDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  deleteField,
  type Firestore,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Proposal, ProposalRecord, ShareRole, UserProfile } from '../types'

function database(): Firestore {
  if (!db) throw new Error('Firebase is not configured')
  return db
}

const col = () => collection(database(), 'proposals')
const ref = (id: string) => doc(database(), 'proposals', id)

/** Denormalised list fields pulled from the proposal payload. */
function meta(data: Proposal) {
  return {
    title: data.meta.title || 'Untitled proposal',
    customerCompany: data.customer.company || '',
    number: data.meta.number || '',
  }
}

export async function createProposal(owner: UserProfile, data: Proposal): Promise<string> {
  const now = Date.now()
  const record: Omit<ProposalRecord, 'id'> = {
    ownerUid: owner.uid,
    ownerEmail: owner.email,
    ...meta(data),
    createdAt: now,
    updatedAt: now,
    roles: {},
    memberUids: [owner.uid],
    data,
  }
  const added = await addDoc(col(), record)
  return added.id
}

export async function getProposal(id: string): Promise<ProposalRecord | null> {
  const snap = await getDoc(ref(id))
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<ProposalRecord, 'id'>) }) : null
}

export function watchProposal(id: string, cb: (rec: ProposalRecord | null) => void): () => void {
  return onSnapshot(ref(id), (snap) =>
    cb(snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<ProposalRecord, 'id'>) }) : null),
  )
}

/** Save the proposal payload + refresh denormalised metadata. */
export async function saveProposalData(id: string, data: Proposal): Promise<void> {
  await updateDoc(ref(id), { data, ...meta(data), updatedAt: Date.now() })
}

export async function renameProposal(id: string, title: string): Promise<void> {
  await updateDoc(ref(id), { title, 'data.meta.title': title, updatedAt: Date.now() })
}

export async function deleteProposal(id: string): Promise<void> {
  await deleteDoc(ref(id))
}

/** Proposals the user owns or has been invited to, newest first. */
export async function listAccessibleProposals(uid: string): Promise<ProposalRecord[]> {
  // `array-contains` alone needs no composite index; sort newest-first in code.
  const q = query(col(), where('memberUids', 'array-contains', uid))
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<ProposalRecord, 'id'>) }))
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function shareProposal(id: string, targetUid: string, role: ShareRole): Promise<void> {
  await updateDoc(ref(id), {
    [`roles.${targetUid}`]: role,
    memberUids: arrayUnion(targetUid),
    updatedAt: Date.now(),
  })
}

export async function unshareProposal(id: string, targetUid: string): Promise<void> {
  await updateDoc(ref(id), {
    [`roles.${targetUid}`]: deleteField(),
    memberUids: arrayRemove(targetUid),
    updatedAt: Date.now(),
  })
}
