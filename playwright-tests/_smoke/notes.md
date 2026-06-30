# _smoke — initial Playwright MCP verification

Purpose: confirm Playwright MCP can launch Chromium, reach the local dev server,
and capture a screenshot. Run this once after setup (and after reloading Claude
Code so it picks up `.mcp.json`).

## Steps
1. Start the dev server: `npm run dev` (note the printed URL, e.g. http://localhost:5173).
2. In Claude: *"Open http://localhost:5173 in Playwright and take a screenshot
   into `playwright-tests/_smoke/screenshots/01-home.png`."*
3. First run downloads ~200MB (Playwright + Chromium). Subsequent runs are instant.

## Result
- [ ] Playwright MCP tools available (browser_navigate, browser_click, browser_take_screenshot, …)
- [ ] Chromium launched and loaded the app
- [ ] Screenshot captured to `screenshots/01-home.png`
- [ ] Logged in once (Firebase) — session persists in `.playwright-profile/`

_Fill in date / findings after the first run._
