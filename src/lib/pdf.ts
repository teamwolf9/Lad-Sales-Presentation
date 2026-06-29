/**
 * PDF export — pixel-exact.
 *
 * Renders the document (Presentation) off-screen at full size, rasterizes each
 * 816×1056 (US-Letter @96dpi) `.sheet` to a JPEG, and assembles a portrait
 * Letter PDF — one page per sheet. Matches the on-screen document exactly.
 */
import { jsPDF } from 'jspdf'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { toJpeg } from 'html-to-image'
import type { Proposal } from '../types'
import { Presentation } from '../presentation/Presentation'

const SHEET_W = 816
const SHEET_H = 1056

async function waitForImages(root: HTMLElement): Promise<void> {
  const imgs = Array.from(root.querySelectorAll('img'))
  await Promise.all(
    imgs.map((img) =>
      img.complete && img.naturalWidth > 0
        ? Promise.resolve()
        : new Promise<void>((res) => {
            img.onload = () => res()
            img.onerror = () => res()
          }),
    ),
  )
}

/** Build a print-exact PDF of the proposal document. Returns a Blob. */
export async function buildProposalPdf(proposal: Proposal): Promise<Blob> {
  const host = document.createElement('div')
  host.style.cssText = `position:fixed;left:-100000px;top:0;width:${SHEET_W}px;background:#ffffff;`
  document.body.appendChild(host)
  const root = createRoot(host)

  try {
    root.render(createElement(Presentation, { proposal }))
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))
    try {
      await (document as unknown as { fonts?: { ready: Promise<unknown> } }).fonts?.ready
    } catch {
      /* ignore */
    }
    await waitForImages(host)
    await new Promise((r) => setTimeout(r, 200))

    const sheets = Array.from(host.querySelectorAll<HTMLElement>('.sheet'))
    if (sheets.length === 0) throw new Error('Nothing to export.')

    const opts = {
      width: SHEET_W,
      height: SHEET_H,
      pixelRatio: 2,
      quality: 0.92,
      backgroundColor: '#ffffff',
      style: { transform: 'none', margin: '0' },
    }

    // Warm-up so fonts/images embed on the first real capture.
    try {
      await toJpeg(sheets[0], opts)
    } catch {
      /* ignore */
    }

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'letter' })
    for (let i = 0; i < sheets.length; i++) {
      const data = await toJpeg(sheets[i], opts)
      if (i > 0) pdf.addPage()
      pdf.addImage(data, 'JPEG', 0, 0, 8.5, 11)
    }
    return pdf.output('blob')
  } finally {
    root.unmount()
    host.remove()
  }
}
