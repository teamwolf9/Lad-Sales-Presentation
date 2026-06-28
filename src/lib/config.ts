/**
 * App-level config for the multi-user system.
 *
 * ADMIN_EMAILS are seeded as Admin on first sign-in. Keep this in sync with the
 * hard-coded admin check in firestore.rules. Admins can promote others from the
 * Users page, so this list only needs the bootstrap admin(s).
 */
export const ADMIN_EMAILS = ['teamwolf9@gmail.com']

/** Public site URL — used in invite emails so recipients have a link to sign in. */
export const SITE_URL = 'https://proposal-builder-3f23c.web.app'

/**
 * From-address for outgoing invite emails. The domain (ladcustomerservice.com)
 * must be verified in the email provider (Resend) for delivery to succeed.
 */
export const MAIL_FROM = 'Lad Irrigation <noreply@ladcustomerservice.com>'

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(email.toLowerCase())
}
