/**
 * PowerPoint export.
 *
 * Builds a branded 16:9 .pptx from a Proposal — mirroring the printed
 * proposal's sections (cover → services → about/team → locations → equipment →
 * pricing → terms → closing). Runs entirely client-side via pptxgenjs; images
 * are fetched from the app's own /public assets (and any web/data URLs the rep
 * entered) at save time.
 */
import PptxGenJS from 'pptxgenjs'
import type { Proposal } from '../types'
import { LAD_BRAND } from '../theme/brand'
import { SERVICE_CATEGORIES, categoryLabel } from '../data/reference'
import { LAD_STORES, LAD_HOURS } from '../data/stores'
import { computeTotals, lineNet } from './pricing'
import { formatCurrency, formatDate, formatNumber } from './util'

const B = LAD_BRAND

/** Brand palette (hex without #, as pptxgenjs expects). */
const C = {
  green: '79C043',
  greenPress: '4F8A2A',
  green50: 'F1F8E9',
  navy: '1D2B37',
  navyDeep: '0E161D',
  body: '39434B',
  muted: '6C777F',
  line: 'D4DADE',
  white: 'FFFFFF',
  paper: 'F7F9FA',
}
const FONT = 'Arial'

/** Resolve an image src into a pptxgenjs image source (data: stays inline, anything else is fetched by URL). */
function imgSrc(src: string): { data: string } | { path: string } | null {
  if (!src) return null
  if (src.startsWith('data:')) return { data: src }
  try {
    return { path: new URL(src, window.location.href).href }
  } catch {
    return { path: src }
  }
}

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

export async function exportProposalPptx(proposal: Proposal): Promise<void> {
  const p = proposal
  const totals = computeTotals(p)
  const pptx = new PptxGenJS()
  pptx.defineLayout({ name: 'LAD', width: 13.333, height: 7.5 })
  pptx.layout = 'LAD'
  pptx.author = B.name
  pptx.company = B.name
  pptx.title = p.meta.title || 'Irrigation System Proposal'

  const W = 13.333
  const H = 7.5
  const MX = 0.7 // content margin x

  /** Standard footer on content slides. */
  const footer = (slide: PptxGenJS.Slide) => {
    slide.addText(
      [
        { text: `${B.name}`, options: { bold: true, color: C.body } },
        { text: `   ·   ${p.meta.number}`, options: { color: C.muted } },
      ],
      { x: MX, y: H - 0.5, w: 8, h: 0.3, fontSize: 9, fontFace: FONT, align: 'left' },
    )
    slide.addText(p.customer.company || 'Prepared proposal', {
      x: W - 4.7 - MX,
      y: H - 0.5,
      w: 4.7,
      h: 0.3,
      fontSize: 9,
      fontFace: FONT,
      color: C.muted,
      align: 'right',
    })
  }

  /** Section header (eyebrow + title + rule) used on most content slides. */
  const header = (slide: PptxGenJS.Slide, eyebrow: string, title: string) => {
    slide.addText(eyebrow.toUpperCase(), {
      x: MX,
      y: 0.55,
      w: W - MX * 2,
      h: 0.3,
      fontSize: 11,
      bold: true,
      color: C.green,
      fontFace: FONT,
      charSpacing: 2,
    })
    slide.addText(title, {
      x: MX,
      y: 0.85,
      w: W - MX * 2,
      h: 0.7,
      fontSize: 30,
      bold: true,
      color: C.navy,
      fontFace: FONT,
    })
    slide.addShape(pptx.ShapeType.rect, { x: MX, y: 1.62, w: 0.7, h: 0.06, fill: { color: C.green } })
  }

  // ------------------------------ COVER ------------------------------
  {
    const s = pptx.addSlide()
    s.background = { color: C.navyDeep }
    const cover = imgSrc(B.photos.pivotSunset)
    if (cover) s.addImage({ ...cover, x: 0, y: 0, w: W, h: H, sizing: { type: 'cover', w: W, h: H } } as any)
    // navy scrim
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: H, fill: { color: C.navyDeep, transparency: 35 } })
    s.addShape(pptx.ShapeType.rect, { x: 0, y: H - 3.2, w: W, h: 3.2, fill: { color: C.navyDeep, transparency: 12 } })

    const logo = imgSrc(B.logos.primary)
    if (logo) s.addImage({ ...logo, x: MX, y: 0.55, w: 1.5, h: 1.5 } as any)
    s.addText(`${formatDate(p.meta.date)}\n${p.meta.number}`, {
      x: W - 4 - MX,
      y: 0.6,
      w: 4,
      h: 0.7,
      align: 'right',
      fontSize: 11,
      color: C.white,
      fontFace: FONT,
    })

    s.addText(B.tagline.toUpperCase(), {
      x: MX,
      y: 3.0,
      w: W - MX * 2,
      h: 0.3,
      fontSize: 13,
      bold: true,
      color: C.green,
      fontFace: FONT,
      charSpacing: 3,
    })
    s.addText(p.meta.title || 'Irrigation System Proposal', {
      x: MX,
      y: 3.35,
      w: 9.5,
      h: 1.3,
      fontSize: 44,
      bold: true,
      color: C.white,
      fontFace: FONT,
    })
    s.addText('PREPARED FOR', {
      x: MX,
      y: 4.85,
      w: 8,
      h: 0.25,
      fontSize: 10,
      bold: true,
      color: 'C9D3DA',
      charSpacing: 2,
      fontFace: FONT,
    })
    s.addText(p.customer.company || 'Your Operation', {
      x: MX,
      y: 5.1,
      w: 9.5,
      h: 0.5,
      fontSize: 24,
      bold: true,
      color: C.white,
      fontFace: FONT,
    })
    if (p.customer.location)
      s.addText(p.customer.location, { x: MX, y: 5.62, w: 9.5, h: 0.3, fontSize: 13, color: 'C9D3DA', fontFace: FONT })

    // bottom meta row
    const meta: { k: string; v: string }[] = [
      { k: 'Prepared by', v: p.preparedBy.repName || B.name },
      { k: 'Valid for', v: `${p.meta.validForDays} days` },
    ]
    if (p.lineItems.length) meta.push({ k: 'Investment', v: formatCurrency(totals.grandTotal) })
    meta.forEach((m, i) => {
      const x = MX + i * 2.7
      s.addText(m.k.toUpperCase(), { x, y: 6.45, w: 2.5, h: 0.25, fontSize: 9, color: C.green, charSpacing: 1, fontFace: FONT })
      s.addText(m.v, { x, y: 6.7, w: 2.6, h: 0.4, fontSize: 15, bold: true, color: C.white, fontFace: FONT })
    })
    const eo = imgSrc(B.logos.employeeOwned)
    if (eo) s.addImage({ ...eo, x: W - 2.1 - MX, y: 6.45, w: 2.1, h: 0.7, sizing: { type: 'contain', w: 2.1, h: 0.7 } } as any)
  }

  // ---------------------------- SERVICES ----------------------------
  {
    const s = pptx.addSlide()
    s.background = { color: C.paper }
    header(s, 'Turn-key solutions', 'One team, end to end.')
    if (p.coverMessage)
      s.addText(p.coverMessage, { x: MX, y: 1.85, w: W - MX * 2, h: 0.8, fontSize: 15, color: C.body, fontFace: FONT, lineSpacingMultiple: 1.2 })

    const active = SERVICE_CATEGORIES.filter((c) => p.services.includes(c.id))
    const list = (active.length ? active : SERVICE_CATEGORIES.slice(0, 6)).slice(0, 6)
    const cols = 3
    const cardW = (W - MX * 2 - 0.4 * (cols - 1)) / cols
    const cardH = 1.35
    list.forEach((c, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = MX + col * (cardW + 0.4)
      const y = 2.75 + row * (cardH + 0.3)
      s.addShape(pptx.ShapeType.roundRect, { x, y, w: cardW, h: cardH, fill: { color: C.white }, line: { color: C.line, width: 1 }, rectRadius: 0.08 } as any)
      s.addShape(pptx.ShapeType.rect, { x, y, w: 0.09, h: cardH, fill: { color: C.green } })
      s.addText(c.label, { x: x + 0.25, y: y + 0.15, w: cardW - 0.45, h: 0.35, fontSize: 14, bold: true, color: C.navy, fontFace: FONT })
      s.addText(c.blurb, { x: x + 0.25, y: y + 0.5, w: cardW - 0.45, h: cardH - 0.6, fontSize: 12, color: C.muted, fontFace: FONT, lineSpacingMultiple: 1.05, valign: 'top' })
    })

    // proof stats
    const proof = [
      { big: String(B.since), lbl: 'Family-founded. Employee-owned today.' },
      { big: String(LAD_STORES.length), lbl: 'Locations across WA & Colorado.' },
      { big: '#1', lbl: 'Largest pivot team & Valley inventory in the NW.' },
      { big: 'All', lbl: 'Brands built & repaired by certified techs.' },
    ]
    const pw = (W - MX * 2 - 0.4 * 3) / 4
    proof.forEach((pr, i) => {
      const x = MX + i * (pw + 0.4)
      s.addText(pr.big, { x, y: 6.0, w: pw, h: 0.5, fontSize: 26, bold: true, color: C.greenPress, fontFace: FONT })
      s.addText(pr.lbl, { x, y: 6.5, w: pw, h: 0.7, fontSize: 11, color: C.muted, fontFace: FONT, lineSpacingMultiple: 1.0 })
    })
    footer(s)
  }

  // ------------------------- ABOUT US & TEAM -------------------------
  const showAbout = p.settings.showAbout && (p.aboutBody.filter(Boolean).length > 0 || p.team.length > 0)
  if (showAbout) {
    const s = pptx.addSlide()
    s.background = { color: C.paper }
    header(s, 'Who we are', p.aboutHeading || 'About Lad Irrigation')

    const story = p.aboutBody.filter(Boolean)
    if (story.length)
      s.addText(
        story.map((para) => ({ text: para, options: { paraSpaceAfter: 8 } })),
        { x: MX, y: 1.9, w: 7.2, h: 2.0, fontSize: 14, color: C.body, fontFace: FONT, lineSpacingMultiple: 1.18, valign: 'top' },
      )
    const photo = imgSrc(B.photos.pumpInstall)
    if (photo) s.addImage({ ...photo, x: 8.3, y: 1.9, w: 4.3, h: 2.5, rounding: true, sizing: { type: 'cover', w: 4.3, h: 2.5 } } as any)

    if (p.team.length) {
      s.addText('THE TEAM ON YOUR PROJECT', { x: MX, y: 4.5, w: W - MX * 2, h: 0.3, fontSize: 11, bold: true, color: C.green, charSpacing: 2, fontFace: FONT })
      const team = p.team.slice(0, 4)
      const cols = team.length <= 2 ? team.length : 4
      const cw = (W - MX * 2 - 0.35 * (cols - 1)) / cols
      team.forEach((m, i) => {
        const x = MX + i * (cw + 0.35)
        const y = 4.9
        s.addShape(pptx.ShapeType.roundRect, { x, y, w: cw, h: 1.9, fill: { color: C.white }, line: { color: C.line, width: 1 }, rectRadius: 0.06 } as any)
        const ph = imgSrc(m.photoUrl)
        if (ph) {
          s.addImage({ ...ph, x: x + 0.2, y: y + 0.2, w: 0.9, h: 0.9, rounding: true, sizing: { type: 'cover', w: 0.9, h: 0.9 } } as any)
        } else {
          s.addShape(pptx.ShapeType.ellipse, { x: x + 0.2, y: y + 0.2, w: 0.9, h: 0.9, fill: { color: C.green50 } })
          s.addText(initials(m.name) || '—', { x: x + 0.2, y: y + 0.2, w: 0.9, h: 0.9, align: 'center', valign: 'middle', fontSize: 16, bold: true, color: C.greenPress, fontFace: FONT })
        }
        s.addText(m.name || 'Team member', { x: x + 0.15, y: y + 1.15, w: cw - 0.3, h: 0.3, fontSize: 13, bold: true, color: C.navy, fontFace: FONT })
        if (m.title) s.addText(m.title, { x: x + 0.15, y: y + 1.42, w: cw - 0.3, h: 0.25, fontSize: 10, bold: true, color: C.greenPress, fontFace: FONT })
        if (m.credential) s.addText(m.credential, { x: x + 0.15, y: y + 1.65, w: cw - 0.3, h: 0.22, fontSize: 10, color: C.muted, fontFace: FONT })
      })
    }
    footer(s)
  }

  // --------------------------- LOCATIONS ----------------------------
  if (p.settings.showStores) {
    const s = pptx.addSlide()
    s.background = { color: C.paper }
    header(s, 'Always close by', `${LAD_STORES.length} locations, near your field.`)
    s.addText(
      'Parts, service, and support are never far away. With stores across Washington and Colorado, a Lad crew is close when you need one.',
      { x: MX, y: 1.85, w: W - MX * 2, h: 0.5, fontSize: 14, color: C.body, fontFace: FONT },
    )
    const cols = 3
    const cw = (W - MX * 2 - 0.35 * (cols - 1)) / cols
    const ch = 1.0
    LAD_STORES.forEach((st, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = MX + col * (cw + 0.35)
      const y = 2.5 + row * (ch + 0.22)
      s.addShape(pptx.ShapeType.roundRect, {
        x, y, w: cw, h: ch,
        fill: { color: C.white },
        line: { color: st.hq ? C.green : C.line, width: st.hq ? 1.75 : 1 },
        rectRadius: 0.06,
      } as any)
      s.addText(st.city, { x: x + 0.2, y: y + 0.12, w: cw - 1.4, h: 0.3, fontSize: 14, bold: true, color: C.navy, fontFace: FONT })
      if (st.hq)
        s.addText('HQ', { x: x + cw - 0.85, y: y + 0.14, w: 0.65, h: 0.25, align: 'center', fontSize: 8, bold: true, color: C.greenPress, fill: { color: C.green50 } as any, fontFace: FONT })
      s.addText(st.address ? `${st.address}, ${st.city}, ${st.state} ${st.zip}` : `${st.city}, ${st.state}`, {
        x: x + 0.2, y: y + 0.44, w: cw - 0.4, h: 0.25, fontSize: 11, color: C.muted, fontFace: FONT,
      })
      s.addText(st.phone, { x: x + 0.2, y: y + 0.68, w: cw - 0.4, h: 0.25, fontSize: 13, bold: true, color: C.greenPress, fontFace: FONT })
    })
    s.addText(`Store hours · ${LAD_HOURS.weekday} · ${LAD_HOURS.saturday}`, {
      x: MX, y: H - 1.05, w: W - MX * 2, h: 0.4, fontSize: 14, color: C.body, fill: { color: C.green50 } as any, align: 'center', valign: 'middle', fontFace: FONT,
    })
    footer(s)
  }

  // ------------------------- EQUIPMENT (one per item) -------------------------
  if (p.lineItems.length) {
    p.lineItems.forEach((item, idx) => {
      const s = pptx.addSlide()
      s.background = { color: C.white }
      if (idx === 0) header(s, 'The system', 'Equipment & services')
      const top = idx === 0 ? 1.9 : 0.7
      const media = imgSrc(item.imageUrl)
      const textX = media ? 6.0 : MX
      const textW = media ? W - 6.0 - MX : W - MX * 2
      if (media) s.addImage({ ...media, x: MX, y: top, w: 4.9, h: 4.6, rounding: true, sizing: { type: 'cover', w: 4.9, h: 4.6 } } as any)

      s.addText(categoryLabel(item.category).toUpperCase(), { x: textX, y: top, w: textW, h: 0.3, fontSize: 10, bold: true, color: C.green, charSpacing: 2, fontFace: FONT })
      s.addText(item.name || 'Untitled item', { x: textX, y: top + 0.3, w: textW, h: 0.6, fontSize: 24, bold: true, color: C.navy, fontFace: FONT })
      let cursor = top + 1.0
      if (item.summary) {
        s.addText(item.summary, { x: textX, y: cursor, w: textW, h: 0.5, fontSize: 15, italic: true, color: C.greenPress, fontFace: FONT })
        cursor += 0.55
      }
      if (item.description) {
        s.addText(item.description, { x: textX, y: cursor, w: textW, h: 0.9, fontSize: 13, color: C.body, fontFace: FONT, lineSpacingMultiple: 1.1, valign: 'top' })
        cursor += 1.0
      }
      const specs = item.specs.filter((sp) => sp.label || sp.value)
      if (specs.length) {
        s.addTable(
          specs.map((sp) => [
            { text: sp.label, options: { fontSize: 12, bold: true, color: C.muted, fontFace: FONT } },
            { text: sp.value, options: { fontSize: 12, color: C.navy, fontFace: FONT, align: 'right' as const } },
          ]),
          { x: textX, y: cursor, w: Math.min(textW, 5.5), colW: [Math.min(textW, 5.5) * 0.55, Math.min(textW, 5.5) * 0.45], rowH: 0.28, border: { type: 'solid', color: C.line, pt: 0.5 } as any },
        )
        cursor += specs.length * 0.3 + 0.2
      }
      const hl = item.highlights.filter(Boolean)
      if (hl.length) {
        s.addText(
          hl.map((h) => ({ text: h, options: { bullet: { characterCode: '2022' }, color: C.body, paraSpaceAfter: 3 } })),
          { x: textX, y: cursor, w: textW, h: 1.0, fontSize: 13, fontFace: FONT, valign: 'top' },
        )
      }
      // price chip
      const net = lineNet(item)
      s.addText(
        [
          { text: `${formatNumber(item.quantity)} ${item.unit} × ${formatCurrency(item.unitPrice)}`, options: { fontSize: 12, color: C.muted } },
          { text: `   ${formatCurrency(net)}`, options: { fontSize: 18, bold: true, color: C.greenPress } },
        ],
        { x: textX, y: 5.85, w: textW, h: 0.5, fontFace: FONT, align: 'left' },
      )
      footer(s)
    })
  }

  // ---------------------------- PRICING ----------------------------
  if (p.settings.showPricing && p.lineItems.length) {
    const s = pptx.addSlide()
    s.background = { color: C.white }
    header(s, 'Investment', 'Pricing summary')
    const rows: PptxGenJS.TableRow[] = [
      [
        { text: 'Item', options: { bold: true, color: C.white, fill: { color: C.navy }, fontFace: FONT, fontSize: 13 } },
        { text: 'Qty', options: { bold: true, color: C.white, fill: { color: C.navy }, align: 'right', fontFace: FONT, fontSize: 13 } },
        { text: 'Unit price', options: { bold: true, color: C.white, fill: { color: C.navy }, align: 'right', fontFace: FONT, fontSize: 13 } },
        { text: 'Amount', options: { bold: true, color: C.white, fill: { color: C.navy }, align: 'right', fontFace: FONT, fontSize: 13 } },
      ],
      ...p.lineItems.map((item): PptxGenJS.TableRow => [
        { text: item.name || 'Untitled item', options: { color: C.navy, bold: true, fontFace: FONT, fontSize: 13 } },
        { text: `${formatNumber(item.quantity)} ${item.unit}`, options: { align: 'right', color: C.body, fontFace: FONT, fontSize: 13 } },
        { text: formatCurrency(item.unitPrice), options: { align: 'right', color: C.body, fontFace: FONT, fontSize: 13 } },
        { text: formatCurrency(lineNet(item)), options: { align: 'right', color: C.navy, bold: true, fontFace: FONT, fontSize: 13 } },
      ]),
    ]
    s.addTable(rows, {
      x: MX, y: 1.9, w: W - MX * 2,
      colW: [(W - MX * 2) * 0.52, (W - MX * 2) * 0.14, (W - MX * 2) * 0.17, (W - MX * 2) * 0.17],
      rowH: 0.4, border: { type: 'solid', color: C.line, pt: 0.5 } as any, valign: 'middle',
    })

    // totals block (right-aligned)
    const tRows: { k: string; v: string; grand?: boolean; disc?: boolean }[] = [
      { k: 'Subtotal', v: formatCurrency(totals.gross) },
    ]
    if (totals.discount > 0) tRows.push({ k: 'Discount', v: `−${formatCurrency(totals.discount)}`, disc: true })
    if (totals.freight > 0) tRows.push({ k: 'Freight / mobilization', v: formatCurrency(totals.freight) })
    tRows.push({ k: `Tax (${p.settings.taxRate}%)`, v: formatCurrency(totals.tax) })
    tRows.push({ k: 'Total investment', v: formatCurrency(totals.grandTotal), grand: true })
    const ty = Math.min(1.9 + rows.length * 0.42 + 0.3, 4.6)
    tRows.forEach((r, i) => {
      const y = ty + i * 0.42
      s.addText(r.k, { x: W - 5.5 - MX, y, w: 3.3, h: 0.38, fontSize: r.grand ? 15 : 14, bold: r.grand, color: r.grand ? C.navy : C.body, align: 'left', fontFace: FONT, valign: 'middle' })
      s.addText(r.v, { x: W - 2.2 - MX, y, w: 2.2, h: 0.38, fontSize: r.grand ? 17 : 14, bold: r.grand, color: r.grand ? C.greenPress : r.disc ? C.greenPress : C.navy, align: 'right', fontFace: FONT, valign: 'middle' })
      if (r.grand) s.addShape(pptx.ShapeType.line, { x: W - 5.5 - MX, y: y - 0.05, w: 4.8, h: 0, line: { color: C.line, width: 1 } })
    })
    s.addText(`Valid ${p.meta.validForDays} days from ${formatDate(p.meta.date)}.`, { x: W - 5.5 - MX, y: ty + tRows.length * 0.42 + 0.1, w: 4.8, h: 0.3, fontSize: 9, italic: true, color: C.muted, align: 'right', fontFace: FONT })
    footer(s)
  }

  // ----------------------------- TERMS -----------------------------
  {
    const s = pptx.addSlide()
    s.background = { color: C.white }
    header(s, 'The agreement', 'Terms & acceptance')
    const terms = p.terms.filter(Boolean)
    if (terms.length)
      s.addText(
        terms.map((t) => ({ text: t, options: { bullet: { characterCode: '2022' }, paraSpaceAfter: 8, color: C.body } })),
        { x: MX, y: 1.95, w: W - MX * 2, h: 3.6, fontSize: 13.5, fontFace: FONT, lineSpacingMultiple: 1.15, valign: 'top' },
      )
    // signature lines
    s.addShape(pptx.ShapeType.line, { x: MX, y: 6.2, w: 5.2, h: 0, line: { color: C.navy, width: 1 } })
    s.addText('Accepted by (customer signature & date)', { x: MX, y: 6.25, w: 5.2, h: 0.3, fontSize: 10, color: C.muted, fontFace: FONT })
    s.addShape(pptx.ShapeType.line, { x: W - 5.2 - MX, y: 6.2, w: 5.2, h: 0, line: { color: C.navy, width: 1 } })
    s.addText(`${B.name} — ${p.preparedBy.repName || 'Authorized representative'}`, { x: W - 5.2 - MX, y: 6.25, w: 5.2, h: 0.3, fontSize: 10, color: C.muted, fontFace: FONT })
    footer(s)
  }

  // ---------------------------- CLOSING ----------------------------
  {
    const s = pptx.addSlide()
    s.background = { color: C.navyDeep }
    const logo = imgSrc(B.logos.white) || imgSrc(B.logos.primary)
    if (logo) s.addImage({ ...logo, x: MX, y: 0.8, w: 2.2, h: 1.0, sizing: { type: 'contain', w: 2.2, h: 1.0 } } as any)
    s.addText("LET'S GET WATER WHERE IT'S NEEDED", { x: MX, y: 2.5, w: W - MX * 2, h: 0.3, fontSize: 12, bold: true, color: C.green, charSpacing: 3, fontFace: FONT })
    s.addText('Put Lad to the test.', { x: MX, y: 2.85, w: W - MX * 2, h: 0.9, fontSize: 40, bold: true, color: C.white, fontFace: FONT })
    s.addText(
      "Meet with our design team to turn your operation's needs into a custom irrigation plan. We build systems meant to run for decades — and we're close by when you need us.",
      { x: MX, y: 3.9, w: 8.5, h: 1.0, fontSize: 14, color: 'C9D3DA', fontFace: FONT, lineSpacingMultiple: 1.2 },
    )
    const contact = [
      { k: 'Call', v: p.preparedBy.repPhone || B.contact.phone },
      { k: 'Online', v: B.contact.website },
      { k: 'Stores', v: B.contact.storesNote },
    ]
    contact.forEach((c, i) => {
      const x = MX + i * 3.4
      s.addText(c.k.toUpperCase(), { x, y: 5.6, w: 3.2, h: 0.25, fontSize: 10, color: C.green, charSpacing: 1, fontFace: FONT })
      s.addText(c.v, { x, y: 5.85, w: 3.2, h: 0.4, fontSize: 16, bold: true, color: C.white, fontFace: FONT })
    })
  }

  const safe = (p.customer.company || p.meta.title || 'Lad-Proposal').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '')
  await pptx.writeFile({ fileName: `${safe || 'Lad-Proposal'}.pptx` })
}
