/**
 * Share-approval queue (shareRequests/{id}).
 *
 * When a non-admin shares a proposal from the document area, we record a pending
 * request here instead of granting access. An admin approves it (which applies
 * the actual share) or denies it. Admin-initiated shares skip this entirely.
 */
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  type Firestore,
} from 'firebase/firestore'
import { db } from './firebase'
import { shareProposal } from './proposals'
import type { ProposalRecord, ShareRequest, ShareRole, UserProfile } from '../types'

function database(): Firestore {
  if (!db) throw new Error('Firebase is not configured')
  return db
}

const col = () => collection(database(), 'shareRequests')

/** Raise a pending share request (non-admin path). */
export async function createShareRequest(
  rec: ProposalRecord,
  target: UserProfile,
  role: ShareRole,
  requester: UserProfile,
): Promise<void> {
  const req: Omit<ShareRequest, 'id'> = {
    proposalId: rec.id,
    proposalTitle: rec.title || 'Untitled proposal',
    targetUid: target.uid,
    targetEmail: target.email,
    role,
    requestedByUid: requester.uid,
    requestedByEmail: requester.email,
    status: 'pending',
    createdAt: Date.now(),
  }
  await addDoc(col(), req)
}

/** All pending requests (admin view), newest first. */
export async function listPendingRequests(): Promise<ShareRequest[]> {
  const snap = await getDocs(query(col(), where('status', '==', 'pending')))
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<ShareRequest, 'id'>) }))
    .sort((a, b) => b.createdAt - a.createdAt)
}

/** A requester's own pending requests for one proposal (to show status in the dialog). */
export async function listMyRequestsForProposal(proposalId: string, uid: string): Promise<ShareRequest[]> {
  const snap = await getDocs(
    query(col(), where('proposalId', '==', proposalId), where('requestedByUid', '==', uid)),
  )
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ShareRequest, 'id'>) }))
}

/** Admin: approve — apply the share, then clear the request. */
export async function approveShareRequest(req: ShareRequest): Promise<void> {
  await shareProposal(req.proposalId, req.targetUid, req.role)
  await deleteDoc(doc(database(), 'shareRequests', req.id))
}

/** Admin (or the requester): deny / cancel — drop the request. */
export async function denyShareRequest(reqId: string): Promise<void> {
  await deleteDoc(doc(database(), 'shareRequests', reqId))
}
