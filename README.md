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

## Next steps / roadmap

- Drop in the **official Lad Irrigation brand kit** (logo file, exact colors,
  fonts) via `src/theme/brand.ts`.
- Optional: image upload (currently image-by-URL) for product photos.
- Later: port the React components into a **SharePoint SPFx web part** and back
  the catalog/templates with a SharePoint list.
