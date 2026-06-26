# Lad Irrigation — Sales Proposal Builder

A standalone web app where a salesperson enters minimal data and the system
produces a **highly visual, world-class proposal** that prints (or saves) as a
pixel-perfect **PDF**. Built with React + TypeScript + Vite, structured so the
components can later be lifted into a **SharePoint SPFx web part**.

## Run it

Requires [Node.js 18+](https://nodejs.org).

```bash
npm install      # first time only
npm run dev      # starts the app at http://localhost:5174
```

Other commands:

```bash
npm run build    # type-check + production build into dist/
npm run preview  # preview the production build
```

## How it works

- **Left panel — the Builder.** A 5-step form: Setup → Customer → Services →
  Items → Pricing. The salesperson types everything in. There is **no fixed
  catalog**; instead, _quick-add templates_ drop an editable line item onto the
  proposal that the rep then adjusts.
- **Right panel — the live preview.** A US-Letter proposal that updates as you
  type: cover, services, equipment showcase, pricing summary, terms, and a
  closing page.
- **Print / Save PDF.** The toolbar button opens the browser print dialog. The
  print stylesheet turns each sheet into one physical page — choose
  "Save as PDF" for a clean, vector, selectable-text document.
- **Drafts auto-save** to the browser (localStorage), so a refresh won't lose work.

## Where to change things

| File | Purpose |
|------|---------|
| `src/theme/brand.ts` | **Brand kit** — colors, fonts, logo, contact info. Swap these for the official Lad brand assets. |
| `src/data/reference.ts` | Service & product **categories**, **quick-add templates**, and default terms. Edit freely. |
| `src/types.ts` | The proposal data model. |
| `src/presentation/Presentation.tsx` | The printed proposal layout (cover → closing). |
| `src/styles/presentation.css` | All proposal styling + the `@media print` page rules. |
| `src/builder/` | The data-entry form (steps, controls, line-item editor). |

## Firebase (Hosting · Firestore · Auth · Storage)

The app runs **standalone** (browser localStorage, no login) until Firebase
config is present. Add the config and it switches on cloud drafts + sign-in
automatically — no code changes.

### One-time setup

1. Install the CLI (first time): `npm i -g firebase-tools` (or use the bundled
   dev dependency via `npx firebase`).
2. Sign in: `firebase login`.
3. Point this folder at your project: `firebase use --add` (pick the project you
   created; this writes `.firebaserc`).
4. In the Firebase console enable: **Authentication** (Google + Email/Password),
   **Firestore**, and **Storage**.
5. Copy the web config: console → Project settings → *Your apps* → SDK setup →
   **Config**. Copy `.env.example` to `.env.local` and paste the values into the
   `VITE_FIREBASE_*` keys.
6. Restart `npm run dev`. You'll now get a sign-in screen; drafts sync to the
   cloud per user.

### Deploy

```bash
firebase deploy                 # builds (predeploy) + deploys hosting, rules
firebase deploy --only hosting  # just the app
firebase deploy --only firestore:rules,storage:rules
```

### What's where

| File | Purpose |
|------|---------|
| `firebase.json` | Hosting (serves `dist/`), Firestore/Storage rules, emulators. |
| `.firebaserc` | Which Firebase project to deploy to. |
| `firestore.rules` / `storage.rules` | Security rules (per-user ownership). |
| `.env.local` | Your `VITE_FIREBASE_*` web config (untracked). |
| `src/lib/firebase.ts` | Guarded SDK init (`firebaseEnabled` flag). |
| `src/lib/auth.tsx` | Auth provider + hooks; `src/auth/SignIn.tsx` is the gate. |
| `src/lib/cloud.ts` | Loads/saves the draft to `users/{uid}/proposals/current`. |
| `src/lib/uploads.ts` | Uploads map/photo images to Storage (data-URL fallback). |

Local emulators (optional): `firebase emulators:start`.

## Next steps / roadmap

- Drop in the **official Lad Irrigation brand kit** (logo file, exact colors,
  fonts) via `src/theme/brand.ts`.
- Optional: image upload (currently image-by-URL) for product photos.
- Later: port the React components into a **SharePoint SPFx web part** and back
  the catalog/templates with a SharePoint list.
