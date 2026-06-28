/**
 * PowerPoint export — pixel-exact.
 *
 * Renders the on-screen SlideDeck off-screen at full resolution, rasterizes each
 * 1280×720 `.slide` to a PNG (html-to-image), and places one image per 16:9
 * PowerPoint slide. The result matches the on-screen Slides view exactly.
 *
 * Trade-off: slides are images, so text isn't editable in PowerPoint — that's
 * the cost of an exact visual match.
 */
import PptxGenJS from 'pptxgenjs'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { toPng } from 'html-to-image'
import type { Proposal } from '../types'
import { SlideDeck } from '../presentation/SlideDeck'
import { LAD_BRAND } from '../theme/brand'

const SLIDE_W = 1280
const SLIDE_H = 720

/** Wait for every <img> inside the node to finish loading (or error). */
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

export async function exportProposalPptx(proposal: Proposal): Promise<void> {
  // Mount the slide deck off-screen at full resolution so the capture is
  // independent of zoom / scroll / which view is active.
  const host = document.createElement('div')
  host.style.cssText = `position:fixed;left:-100000px;top:0;width:${SLIDE_W}px;background:#ffffff;`
  document.body.appendChild(host)
  const root = createRoot(host)

  try {
    root.render(createElement(SlideDeck, { proposal }))
    // Let React paint, then wait for fonts + images so the raster is complete.
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))
    try {
      await (document as unknown as { fonts?: { ready: Promise<unknown> } }).fonts?.ready
    } catch {
      /* fonts API unavailable — ignore */
    }
    await waitForImages(host)
    await new Promise((r) => setTimeout(r, 200))

    const slides = Array.from(host.querySelectorAll<HTMLElement>('.slide'))
    if (slides.length === 0) throw new Error('No slides to export.')

    const opts = {
      width: SLIDE_W,
      height: SLIDE_H,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      style: { transform: 'none', margin: '0' },
    } as const

    // Warm-up pass: primes html-to-image's font/image embedding cache so the
    // real captures render fonts correctly on the first try.
    try {
      await toPng(slides[0], opts)
    } catch {
      /* ignore */
    }

    const pptx = new PptxGenJS()
    pptx.defineLayout({ name: 'LAD169', width: 13.333, height: 7.5 })
    pptx.layout = 'LAD169'
    pptx.author = LAD_BRAND.name
    pptx.company = LAD_BRAND.name
    pptx.title = proposal.meta.title || 'Irrigation System Proposal'

    for (const el of slides) {
      const dataUrl = await toPng(el, opts)
      const s = pptx.addSlide()
      s.addImage({ data: dataUrl, x: 0, y: 0, w: 13.333, h: 7.5 })
    }

    const safe = (proposal.customer.company || proposal.meta.title || 'Lad-Proposal')
      .replace(/[^\w.-]+/g, '-')
      .replace(/^-+|-+$/g, '')
    await pptx.writeFile({ fileName: `${safe || 'Lad-Proposal'}.pptx` })
  } finally {
    root.unmount()
    host.remove()
  }
}
