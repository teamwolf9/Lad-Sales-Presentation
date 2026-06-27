# Setup & Email Invites — handoff notes

Quick reference for running this on another computer and for turning on real
email invites.

---

## 1. Run it on a new machine

```bash
git clone https://github.com/teamwolf9/Lad-Sales-Presentation.git
cd Lad-Sales-Presentation
npm install
```

Create a **`.env.local`** file in the project root (it's gitignored). These are
the Firebase web config values for the `proposal-builder-3f23c` project — they
ship to the browser, so they aren't secret:

```
VITE_FIREBASE_API_KEY=AIzaSyBal9kCzxvCThiOMBB_fpD_dBIbKFLL7gg
VITE_FIREBASE_AUTH_DOMAIN=proposal-builder-3f23c.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=proposal-builder-3f23c
VITE_FIREBASE_STORAGE_BUCKET=proposal-builder-3f23c.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=337095846876
VITE_FIREBASE_APP_ID=1:337095846876:web:dc3075886bc74c08f93d19
```

Then:

```bash
npm run dev      # http://localhost:5174  (full Firebase-enabled app)
```

Without `.env.local` the app runs in standalone mode (no sign-in, localStorage
only) — so the file is required to see the multi-user / invite features.

## 2. Deploy to the live site

```bash
npm i -g firebase-tools     # if not installed
firebase login              # one-time, opens the browser
firebase deploy --only firestore:rules,hosting --project proposal-builder-3f23c
```

Live site: https://proposal-builder-3f23c.web.app

---

## 3. Turn ON real email invites (Trigger Email extension)

The app already **queues** a branded invite email (writes a doc to the `mail`
collection) every time an admin invites someone — see `src/lib/invites.ts`.
Nothing is actually sent until the extension below is installed.

### Step A — Upgrade the project to the Blaze plan (required)
Firebase Console → ⚙️ Project settings → **Usage and billing** → Modify plan →
**Blaze** (pay-as-you-go). The free tier covers this volume; add a budget alert
if you want. Cloud Functions / email extensions don't run on the free Spark plan.

### Step B — Get a sending account (recommended: Resend)
1. Sign up at https://resend.com (free tier ~3k emails/mo).
2. Create an **API key** (`re_...`).
3. To start instantly, send from `onboarding@resend.dev`. Later, verify the
   `ladirrigation.com` domain in Resend (add the DNS records they give you) so
   invites come from `noreply@ladirrigation.com`.

Other providers work too — the extension just needs an SMTP connection URI:
- **SendGrid:** `smtps://apikey:SG_KEY@smtp.sendgrid.net:465`
- **Gmail/Workspace:** `smtps://you@ladirrigation.com:APP_PASSWORD@smtp.gmail.com:465`

### Step C — Install the Trigger Email extension
```bash
firebase ext:install firebase/firestore-send-email --project proposal-builder-3f23c
```
Config values to enter when prompted:
- **SMTP connection URI:** `smtps://resend:re_YOURKEY@smtp.resend.com:465`
- **Default FROM address:** `onboarding@resend.dev` (or your verified address)
- **Email documents collection:** `mail`
- (leave the rest as defaults)

Deploy if asked. The extension watches the `mail` collection and sends each
queued message via the Admin SDK (bypasses Firestore rules).

### Step D — Test
In the app: **Users & access → invite an email**. The recipient should get the
invite email with a sign-in link. They sign in with that exact email
("Create account" to set a password, or "Continue with Google").

---

## How the access model works (recap)

- **Invite-only:** new sign-ins are blocked unless the bootstrap admin
  (`teamwolf9@gmail.com`) or a pre-invited email. Uninvited users see "Access
  pending."
- **Roles:** `admin` (everything) · `executive` (read-only org-wide Overview) ·
  `creator` (make/share proposals) · `viewer` (only shared proposals).
- **Sharing needs approval:** when a non-admin shares a proposal, it creates a
  pending request an admin approves on the Users page. Admin shares apply
  immediately. A shared user sees only that one proposal.

Rules live in `firestore.rules`; bootstrap admin is in `src/lib/config.ts`
(keep both in sync).
