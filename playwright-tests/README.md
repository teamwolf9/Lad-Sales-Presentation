# playwright-tests

Browser-automation scratch area for this project, driven by **Playwright MCP**
through Claude Code. Two uses:

1. **Help guides** — walk a real user flow, capture annotated screenshots.
2. **Smoke tests** — drive a UI path end-to-end, optionally verifying Firestore.

The app is React + Vite. Start the dev server with `npm run dev` (it prints the
local URL, usually `http://localhost:5173` — Vite bumps the port if busy). Auth
is Firebase (Google sign-in + email/password); log in once in the persisted
Chromium profile and the session sticks across runs.

## Folder shape — one folder per flow

```
playwright-tests/<test-slug>/
├── notes.md            # run findings, expected vs actual, console warnings, open questions
├── guide.md            # optional — draft customer-facing guide
└── screenshots/
    ├── 01-<step>.png
    ├── 02-<step>.png
    └── ...
```

Conventions:
- **Folder slug** — kebab-case describing the flow (`create-proposal`, `email-pdf-smoke`, `map-annotate`).
- **Screenshots** — `NN-<step>.png`, zero-padded so they sort in flow order.
- **Utility/setup folders** — prefix with `_` (e.g. `_smoke`) so they sort to the top.

## Screenshots are gitignored by default

They're large and regenerable from the flow. `playwright-tests/.gitignore`
ignores `**/screenshots/`, with an opt-in (`!<slug>/screenshots/`) for any set
worth committing (visual-regression reference, finalized guide handoff). The
`_smoke/` screenshots are committed so a fresh clone has a reference of a
working first run.

## Verifying data (smoke tests)

This project is on Firestore. For data checks, use a small verifier script under
`scripts/` (e.g. `scripts/verify-firestore.js`) invoked via Bash, or the gcloud
REST pattern already used in this repo's deploy scripts. Ask Claude to write one
to match the collection/fields you're asserting.

## Typical prompts

- Guide: *"Set up `playwright-tests/<slug>/`. Walk through <flow> on
  http://localhost:5173, screenshotting each step into `screenshots/`
  (`NN-<step>.png`). Write `notes.md` and a draft `guide.md`."*
- Smoke: *"Set up `playwright-tests/<slug>-smoke/`. Open
  http://localhost:5173/<path>, verify <elements> are visible, screenshot each
  step, write a pass/fail report to `notes.md`."*

See the original setup guide (`claude-browser-automation-setup-generic.md`) for
full details, multi-role profiles, and troubleshooting.
