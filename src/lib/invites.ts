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
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  type Firestore,
} from 'firebase/firestore'
import { db } from './firebase'
import { SITE_URL, MAIL_FROM } from './config'
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

/** Admin: create or update an invite, and queue an invite email. */
export async function createInvite(email: string, role: OrgRole, invitedByEmail: string): Promise<void> {
  const to = norm(email)
  const invite: Invite = { email: to, role, invitedByEmail, createdAt: Date.now() }
  await setDoc(inviteRef(email), invite)
  // Best-effort: enqueue an email for the "Trigger Email" extension to send.
  // If the extension/Blaze isn't set up yet, this doc simply waits (or fails
  // silently) and never blocks the invite itself.
  try {
    await addDoc(collection(database(), 'mail'), buildInviteEmail(to, role, invitedByEmail))
  } catch (err) {
    console.warn('[invite] could not queue invite email', err)
  }
}

/** Compose the `mail/{id}` document the Trigger Email extension sends. */
function buildInviteEmail(to: string, role: OrgRole, invitedByEmail: string) {
  const roleLine =
    role === 'viewer'
      ? 'view proposals shared with you'
      : role === 'executive'
        ? 'see the executive overview of all proposals'
        : role === 'creator'
          ? 'create and manage proposals'
          : 'full admin access'
  const subject = 'You’re invited to the Lad Irrigation Proposal Builder'
  const text =
    `${invitedByEmail} invited you to the Lad Irrigation Proposal Builder.\n\n` +
    `Your access: ${role} — you can ${roleLine}.\n\n` +
    `Get started: ${SITE_URL}\n\n` +
    `Sign in with this email address (${to}). If it's your first time, choose ` +
    `"Create account" to set a password — or use "Continue with Google" if this is a Google account.`
  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#1d2b37">
    <div style="background:#0e161d;padding:24px 28px;border-radius:12px 12px 0 0">
      <div style="color:#79c043;font-weight:700;letter-spacing:.12em;font-size:12px;text-transform:uppercase">Lad Irrigation</div>
      <div style="color:#fff;font-size:22px;font-weight:700;margin-top:6px">You’re invited to the Proposal Builder</div>
    </div>
    <div style="background:#f7f9fa;padding:24px 28px;border:1px solid #e7ecef;border-top:none;border-radius:0 0 12px 12px">
      <p style="font-size:15px;line-height:1.55">
        <strong>${invitedByEmail}</strong> has given you access to the Lad Irrigation Proposal Builder.
      </p>
      <p style="font-size:15px;line-height:1.55">
        Your role: <strong style="color:#4f8a2a;text-transform:capitalize">${role}</strong> — you can ${roleLine}.
      </p>
      <p style="text-align:center;margin:26px 0">
        <a href="${SITE_URL}" style="background:#79c043;color:#0e161d;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:999px;display:inline-block">Open the Proposal Builder</a>
      </p>
      <p style="font-size:13px;line-height:1.55;color:#6c777f">
        Sign in with <strong>${to}</strong>. First time? Choose <strong>“Create account”</strong> to set a password,
        or use <strong>“Continue with Google”</strong> if this is a Google account.
      </p>
    </div>
  </div>`
  return { to: [to], from: MAIL_FROM, message: { subject, text, html } }
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
