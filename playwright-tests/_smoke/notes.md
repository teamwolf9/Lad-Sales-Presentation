# _smoke — initial Playwright MCP verification

Purpose: confirm Playwright MCP can launch Chromium, reach the app, and capture
a screenshot. Run this once after setup (and after reloading Claude Code so it
picks up `.mcp.json`).

## Base URL
Default Playwright target is the **deployed** app at its custom domain:

    https://pb.ladcustomerservice.com

This is the Firebase Hosting site for project `proposal-builder-3f23c` (aliases:
`proposal-builder-3f23c.web.app` / `.firebaserc`). Use it for smoke tests so we
exercise exactly what's live. To test local changes instead, run `npm run dev`
and use the printed URL (Vite uses 5173 if free, else bumps to 5174, 5175, …).

## Steps
1. In Claude: *"Open https://pb.ladcustomerservice.com in Playwright and take a
   screenshot into `playwright-tests/_smoke/screenshots/01-home.png`."*
2. First run downloads ~200MB (Playwright + Chromium). Subsequent runs are instant.

## Result
- [x] Chromium launched and loaded the app (https://pb.ladcustomerservice.com/)
- [x] Playwright MCP tools visible to Claude (browser_navigate, …)
- [x] Screenshot captured to `screenshots/01-home.png`
- [ ] Logged in once (Firebase) — session persists in `.playwright-profile/`

Verified the custom domain serves the same build as `web.app` and the current
source tree (bundle `index-CMRiF32z.js`). Sign-in screen loads; log in once to
persist the session for deeper smoke flows.
