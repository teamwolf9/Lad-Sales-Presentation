/**
 * Email a proposal as a PDF via the Trigger Email (Postmark) extension.
 *
 * Builds a pixel-exact PDF, uploads it to Storage, then writes a `mail` doc with
 * the PDF attached (by URL — keeps us under Firestore's 1 MB doc limit) to the
 * recipient + CC. Also writes a separate notification email to all admins.
 */
import { collection, addDoc } from 'firebase/firestore'
import { db, firebaseEnabled } from './firebase'
import { MAIL_FROM } from './config'
import { LAD_BRAND } from '../theme/brand'
import { listUsers } from './users'
import { buildProposalPdf } from './pdf'
import { uploadPdf } from './uploads'
import type { Proposal } from '../types'

const B = LAD_BRAND

export interface EmailSender {
  uid: string
  email: string
  name: string
}

const splitEmails = (s: string): string[] =>
  (s || '')
    .split(/[,;\s]+/)
    .map((e) => e.trim())
    .filter(Boolean)

export async function emailProposalPdf(
  proposal: Proposal,
  opts: { to: string; cc?: string; note?: string },
  sender: EmailSender,
): Promise<{ attachmentUrl: string; adminsNotified: number }> {
  if (!firebaseEnabled || !db) throw new Error('Email is not available (Firebase not configured).')
  const to = opts.to.trim()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) throw new Error('Enter a valid recipient email address.')
  const cc = splitEmails(opts.cc || '')

  const title = proposal.meta.title || 'Irrigation Proposal'
  const company = proposal.customer.company || 'your operation'
  const fileBase = (title || 'Proposal').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '')
  const filename = `${fileBase || 'Proposal'}.pdf`

  // 1. Build + upload the PDF.
  const blob = await buildProposalPdf(proposal)
  const attachmentUrl = await uploadPdf(blob, sender.uid, filename)

  // 2. Email it to the recipient (+ CC), PDF attached by URL.
  const note = opts.note?.trim()
  await addDoc(collection(db, 'mail'), {
    to: [to],
    ...(cc.length ? { cc } : {}),
    from: MAIL_FROM,
    ...(sender.email ? { replyTo: sender.email } : {}),
    message: {
      subject: `${B.name} Proposal — ${title}`,
      text: `${note ? note + '\n\n' : ''}Please find attached the proposal "${title}" for ${company}.\n\nThank you,\n${sender.name || B.name}\n${B.name} · ${B.contact.phone}`,
      html: `<div style="font-family:Arial,Helvetica,sans-serif;color:#13212e;line-height:1.5">
        ${note ? `<p>${note.replace(/\n/g, '<br>')}</p>` : ''}
        <p>Please find attached the proposal <strong>“${title}”</strong> for ${company}.</p>
        <p>Thank you,<br>${sender.name || B.name}<br><strong>${B.name}</strong> · ${B.contact.phone}</p>
      </div>`,
      attachments: [{ filename, path: attachmentUrl }],
    },
  })

  // 3. Notify all (active) admins that a proposal was emailed.
  let adminsNotified = 0
  try {
    const admins = (await listUsers())
      .filter((u) => u.role === 'admin' && !u.disabled && u.email)
      .map((u) => u.email)
    if (admins.length) {
      adminsNotified = admins.length
      await addDoc(collection(db, 'mail'), {
        to: admins,
        from: MAIL_FROM,
        message: {
          subject: `Proposal sent: ${title}`,
          text: `${sender.name || sender.email} (${sender.email}) emailed the proposal "${title}" for ${company} to ${to}${
            cc.length ? ` (cc: ${cc.join(', ')})` : ''
          }.`,
        },
      })
    }
  } catch (e) {
    console.error('[email] admin notification failed', e)
  }

  return { attachmentUrl, adminsNotified: adminsNotified }
}
