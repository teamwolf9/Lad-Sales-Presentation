/**
 * PowerPoint export.
 *
 * Builds a branded 16:9 .pptx from a Proposal — mirroring the printed proposal
 * (src/presentation/Presentation.tsx) section for section: cover → field map →
 * services/proof/scope → about & team → locations → improvements analysis →
 * investment summary (+ payment) → project detail quotes → equipment showcase →
 * pricing → terms → closing. Runs client-side via pptxgenjs; images are fetched
 * from the app's own /public assets (and any web/data URLs the rep entered).
 */
import PptxGenJS from 'pptxgenjs'
import type { Proposal, ProjectLine } from '../types'
import { LAD_BRAND } from '../theme/brand'
import { SERVICE_CATEGORIES, categoryLabel } from '../data/reference'
import { LAD_STORES, LAD_HOURS } from '../data/stores'
import {
  computeTotals,
  lineNet,
  projectLineTotal,
  projectSubtotal,
  projectTax,
  projectTotal,
  investmentTotal,
} from './pricing'
import { tdhAtPump, psiAtPump, hpRequired } from './hydraulics'
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
  red: 'C0492F',
}
const FONT = 'Arial'
const round0 = (n: number) => Math.round(n).toLocaleString()

/** Split an array into chunks of n. */
function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}
const LINES_PER_SLIDE = 12

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
  const grandInvestment = investmentTotal(p)
  const pptx = new PptxGenJS()
  pptx.defineLayout({ name: 'LAD', width: 13.333, height: 7.5 })
  pptx.layout = 'LAD'
  pptx.author = B.name
  pptx.company = B.name
  pptx.title = p.meta.title || 'Irrigation System Proposal'

  const W = 13.333
  const H = 7.5
  const MX = 0.7

  // page visibility — mirror Presentation.tsx
  const activeServices = SERVICE_CATEGORIES.filter((s) => p.services.includes(s.id))
  const showMap = p.map.enabled && !!p.map.imageUrl
  const showServices = p.settings.showServices
  const showAnalysis =
    p.analysis.enabled && (p.analysis.rows.length > 0 || !!p.analysis.summary || !!p.analysis.conclusion)
  const showAbout = p.settings.showAbout && (p.aboutBody.filter(Boolean).length > 0 || p.team.length > 0)
  const showStores = p.settings.showStores
  const showSummary = p.settings.showSummary && p.projects.length > 0
  const detailProjects = p.projects.filter((pr) => pr.showDetail && pr.lines.length > 0)

  const footer = (slide: PptxGenJS.Slide) => {
    slide.addText(
      [
        { text: `${B.name}`, options: { bold: true, color: C.body } },
        { text: `   ·   ${p.meta.number}`, options: { color: C.muted } },
      ],
      { x: MX, y: H - 0.5, w: 8, h: 0.3, fontSize: 9, fontFace: FONT, align: 'left' },
    )
    slide.addText(p.customer.company || 'Prepared proposal', {
      x: W - 4.7 - MX, y: H - 0.5, w: 4.7, h: 0.3, fontSize: 9, fontFace: FONT, color: C.muted, align: 'right',
    })
  }

  const header = (slide: PptxGenJS.Slide, eyebrow: string, title: string, sub?: string) => {
    slide.addText(eyebrow.toUpperCase(), { x: MX, y: 0.5, w: W - MX * 2, h: 0.3, fontSize: 11, bold: true, color: C.green, fontFace: FONT, charSpacing: 2 })
    slide.addText(title, { x: MX, y: 0.8, w: W - MX * 2, h: 0.7, fontSize: 28, bold: true, color: C.navy, fontFace: FONT })
    if (sub) slide.addText(sub, { x: MX, y: 1.5, w: W - MX * 2, h: 0.28, fontSize: 12, italic: true, color: C.muted, fontFace: FONT })
    slide.addShape(pptx.ShapeType.rect, { x: MX, y: sub ? 1.82 : 1.55, w: 0.7, h: 0.06, fill: { color: C.green } })
  }

  // ------------------------------ COVER ------------------------------
  {
    const s = pptx.addSlide()
    s.background = { color: C.navyDeep }
    const cover = imgSrc(B.photos.pivotSunset)
    if (cover) s.addImage({ ...cover, x: 0, y: 0, w: W, h: H, sizing: { type: 'cover', w: W, h: H } } as any)
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: H, fill: { color: C.navyDeep, transparency: 35 } })
    s.addShape(pptx.ShapeType.rect, { x: 0, y: H - 3.2, w: W, h: 3.2, fill: { color: C.navyDeep, transparency: 12 } })
    const logo = imgSrc(B.logos.primary)
    if (logo) s.addImage({ ...logo, x: MX, y: 0.55, w: 1.5, h: 1.5 } as any)
    s.addText(`${formatDate(p.meta.date)}\n${p.meta.number}`, { x: W - 4 - MX, y: 0.6, w: 4, h: 0.7, align: 'right', fontSize: 11, color: C.white, fontFace: FONT })
    s.addText(B.tagline.toUpperCase(), { x: MX, y: 3.0, w: W - MX * 2, h: 0.3, fontSize: 13, bold: true, color: C.green, fontFace: FONT, charSpacing: 3 })
    s.addText(p.meta.title || 'Irrigation System Proposal', { x: MX, y: 3.35, w: 9.5, h: 1.3, fontSize: 44, bold: true, color: C.white, fontFace: FONT })
    s.addText('PREPARED FOR', { x: MX, y: 4.85, w: 8, h: 0.25, fontSize: 10, bold: true, color: 'C9D3DA', charSpacing: 2, fontFace: FONT })
    s.addText(p.customer.company || 'Your Operation', { x: MX, y: 5.1, w: 9.5, h: 0.5, fontSize: 24, bold: true, color: C.white, fontFace: FONT })
    if (p.customer.location) s.addText(p.customer.location, { x: MX, y: 5.62, w: 9.5, h: 0.3, fontSize: 13, color: 'C9D3DA', fontFace: FONT })
    const meta: { k: string; v: string }[] = [
      { k: 'Prepared by', v: p.preparedBy.repName || B.name },
      { k: 'Valid for', v: `${p.meta.validForDays} days` },
    ]
    if (p.projects.length > 0 || p.lineItems.length > 0) meta.push({ k: 'Investment', v: formatCurrency(grandInvestment) })
    meta.forEach((m, i) => {
      const x = MX + i * 2.7
      s.addText(m.k.toUpperCase(), { x, y: 6.45, w: 2.5, h: 0.25, fontSize: 9, color: C.green, charSpacing: 1, fontFace: FONT })
      s.addText(m.v, { x, y: 6.7, w: 2.6, h: 0.4, fontSize: 15, bold: true, color: C.white, fontFace: FONT })
    })
    const eo = imgSrc(B.logos.employeeOwned)
    if (eo) s.addImage({ ...eo, x: W - 3.0 - MX, y: 6.62, w: 3.0, h: 0.36, sizing: { type: 'contain', w: 3.0, h: 0.36 } } as any)
  }

  // ---------------------------- FIELD MAP ----------------------------
  if (showMap) {
    const s = pptx.addSlide()
    s.background = { color: C.white }
    const map = imgSrc(p.map.imageUrl)
    if (map) s.addImage({ ...map, x: MX, y: 0.5, w: 8.4, h: 6.4, sizing: { type: 'contain', w: 8.4, h: 6.4 } } as any)
    const bx = 9.4
    const logo = imgSrc(B.logos.primary)
    if (logo) s.addImage({ ...logo, x: bx, y: 0.55, w: 1.0, h: 1.0 } as any)
    const fields: [string, string][] = [
      ['Customer', p.customer.company || '—'],
      ['Location', p.map.caption || p.customer.location || '—'],
      ['Scale', p.map.scale || '—'],
      ['Quotation / Order #', p.map.quoteNumber || p.meta.number],
      ['Date', formatDate(p.map.date) || formatDate(p.meta.date)],
      ['Designer', p.map.designer || '—'],
      ['Drawn by', p.map.drawnBy || p.map.designer || '—'],
    ]
    fields.forEach(([k, v], i) => {
      const y = 1.9 + i * 0.62
      s.addText(k.toUpperCase(), { x: bx, y, w: 3.2, h: 0.22, fontSize: 8.5, color: C.green, charSpacing: 1, fontFace: FONT })
      s.addText(v, { x: bx, y: y + 0.2, w: 3.2, h: 0.32, fontSize: 13, bold: true, color: C.navy, fontFace: FONT })
    })
    footer(s)
  }

  // ---------------------------- SERVICES ----------------------------
  if (showServices) {
    const s = pptx.addSlide()
    s.background = { color: C.paper }
    header(s, 'Turn-key solutions', 'One team, end to end.')
    if (p.coverMessage) s.addText(p.coverMessage, { x: MX, y: 1.78, w: W - MX * 2, h: 0.7, fontSize: 14, color: C.body, fontFace: FONT, lineSpacingMultiple: 1.15 })
    const list = (activeServices.length ? activeServices : SERVICE_CATEGORIES.slice(0, 6)).slice(0, 6)
    const cols = 3
    const cardW = (W - MX * 2 - 0.4 * (cols - 1)) / cols
    const cardH = 1.15
    list.forEach((c, i) => {
      const x = MX + (i % cols) * (cardW + 0.4)
      const y = 2.6 + Math.floor(i / cols) * (cardH + 0.25)
      s.addShape(pptx.ShapeType.roundRect, { x, y, w: cardW, h: cardH, fill: { color: C.white }, line: { color: C.line, width: 1 }, rectRadius: 0.08 } as any)
      s.addShape(pptx.ShapeType.rect, { x, y, w: 0.09, h: cardH, fill: { color: C.green } })
      s.addText(c.label, { x: x + 0.25, y: y + 0.12, w: cardW - 0.45, h: 0.3, fontSize: 14, bold: true, color: C.navy, fontFace: FONT })
      s.addText(c.blurb, { x: x + 0.25, y: y + 0.45, w: cardW - 0.45, h: cardH - 0.55, fontSize: 12, color: C.muted, fontFace: FONT, lineSpacingMultiple: 1.0, valign: 'top' })
    })
    const proof = [
      { big: String(B.since), lbl: 'Family-founded. Employee-owned today.' },
      { big: String(LAD_STORES.length), lbl: 'Locations across WA & Colorado.' },
      { big: '#1', lbl: 'Largest pivot team & Valley inventory in the NW.' },
      { big: 'All', lbl: 'Brands built & repaired by certified techs.' },
    ]
    const pw = (W - MX * 2 - 0.4 * 3) / 4
    proof.forEach((pr, i) => {
      const x = MX + i * (pw + 0.4)
      s.addText(pr.big, { x, y: 5.35, w: pw, h: 0.5, fontSize: 24, bold: true, color: C.greenPress, fontFace: FONT })
      s.addText(pr.lbl, { x, y: 5.85, w: pw, h: 0.6, fontSize: 11, color: C.muted, fontFace: FONT })
    })
    const scope = p.scopeNotes.filter(Boolean)
    if (scope.length) {
      s.addText('OUR APPROACH', { x: MX, y: 6.5, w: W - MX * 2, h: 0.22, fontSize: 9, bold: true, color: C.green, charSpacing: 2, fontFace: FONT })
      s.addText(
        scope.map((n, i) => ({ text: `${String(i + 1).padStart(2, '0')}  ${n}`, options: { paraSpaceAfter: 2 } })),
        { x: MX, y: 6.72, w: W - MX * 2, h: 0.5, fontSize: 10, color: C.body, fontFace: FONT },
      )
    }
    footer(s)
  }

  // ------------------------- ABOUT US & TEAM -------------------------
  if (showAbout) {
    const s = pptx.addSlide()
    s.background = { color: C.paper }
    header(s, 'Who we are', p.aboutHeading || 'About Lad Irrigation')
    const story = p.aboutBody.filter(Boolean)
    if (story.length)
      s.addText(
        story.map((para) => ({ text: para, options: { paraSpaceAfter: 8 } })),
        { x: MX, y: 1.9, w: 7.2, h: 2.2, fontSize: 13, color: C.body, fontFace: FONT, lineSpacingMultiple: 1.18, valign: 'top' },
      )
    const photo = imgSrc(B.photos.pumpInstall)
    if (photo) s.addImage({ ...photo, x: 8.3, y: 1.9, w: 4.3, h: 2.5, rounding: true, sizing: { type: 'cover', w: 4.3, h: 2.5 } } as any)
    if (p.team.length) {
      s.addText('THE TEAM ON YOUR PROJECT', { x: MX, y: 4.5, w: W - MX * 2, h: 0.3, fontSize: 11, bold: true, color: C.green, charSpacing: 2, fontFace: FONT })
      const team = p.team.slice(0, 4)
      const cols = team.length <= 2 ? Math.max(team.length, 1) : 4
      const cw = (W - MX * 2 - 0.35 * (cols - 1)) / cols
      team.forEach((m, i) => {
        const x = MX + i * (cw + 0.35)
        const y = 4.9
        s.addShape(pptx.ShapeType.roundRect, { x, y, w: cw, h: 1.95, fill: { color: C.white }, line: { color: C.line, width: 1 }, rectRadius: 0.06 } as any)
        const ph = imgSrc(m.photoUrl)
        if (ph) s.addImage({ ...ph, x: x + 0.2, y: y + 0.2, w: 0.85, h: 0.85, rounding: true, sizing: { type: 'cover', w: 0.85, h: 0.85 } } as any)
        else {
          s.addShape(pptx.ShapeType.ellipse, { x: x + 0.2, y: y + 0.2, w: 0.85, h: 0.85, fill: { color: C.green50 } })
          s.addText(initials(m.name) || '—', { x: x + 0.2, y: y + 0.2, w: 0.85, h: 0.85, align: 'center', valign: 'middle', fontSize: 16, bold: true, color: C.greenPress, fontFace: FONT })
        }
        s.addText(m.name || 'Team member', { x: x + 0.15, y: y + 1.1, w: cw - 0.3, h: 0.28, fontSize: 13, bold: true, color: C.navy, fontFace: FONT })
        if (m.title) s.addText(m.title, { x: x + 0.15, y: y + 1.36, w: cw - 0.3, h: 0.24, fontSize: 10, bold: true, color: C.greenPress, fontFace: FONT })
        if (m.credential) s.addText(m.credential, { x: x + 0.15, y: y + 1.58, w: cw - 0.3, h: 0.22, fontSize: 8.5, color: C.muted, fontFace: FONT })
      })
    }
    footer(s)
  }

  // --------------------------- LOCATIONS ----------------------------
  if (showStores) {
    const s = pptx.addSlide()
    s.background = { color: C.paper }
    header(s, 'Always close by', `${LAD_STORES.length} locations, near your field.`)
    s.addText('Parts, service, and support are never far away — with stores across Washington and Colorado, a Lad crew is close when you need one.', { x: MX, y: 1.78, w: W - MX * 2, h: 0.4, fontSize: 12, color: C.body, fontFace: FONT })
    const cols = 3
    const cw = (W - MX * 2 - 0.35 * (cols - 1)) / cols
    const ch = 1.0
    LAD_STORES.forEach((st, i) => {
      const x = MX + (i % cols) * (cw + 0.35)
      const y = 2.4 + Math.floor(i / cols) * (ch + 0.22)
      s.addShape(pptx.ShapeType.roundRect, { x, y, w: cw, h: ch, fill: { color: C.white }, line: { color: st.hq ? C.green : C.line, width: st.hq ? 1.75 : 1 }, rectRadius: 0.06 } as any)
      s.addText(st.city, { x: x + 0.2, y: y + 0.12, w: cw - 1.4, h: 0.3, fontSize: 14, bold: true, color: C.navy, fontFace: FONT })
      if (st.hq) s.addText('HQ', { x: x + cw - 0.85, y: y + 0.14, w: 0.65, h: 0.25, align: 'center', fontSize: 8, bold: true, color: C.greenPress, fill: { color: C.green50 } as any, fontFace: FONT })
      s.addText(st.address ? `${st.address}, ${st.city}, ${st.state} ${st.zip}` : `${st.city}, ${st.state}`, { x: x + 0.2, y: y + 0.44, w: cw - 0.4, h: 0.25, fontSize: 11, color: C.muted, fontFace: FONT })
      s.addText(st.phone, { x: x + 0.2, y: y + 0.68, w: cw - 0.4, h: 0.25, fontSize: 13, bold: true, color: C.greenPress, fontFace: FONT })
    })
    s.addText(`Store hours · ${LAD_HOURS.weekday} · ${LAD_HOURS.saturday}`, { x: MX, y: H - 1.05, w: W - MX * 2, h: 0.4, fontSize: 14, color: C.body, fill: { color: C.green50 } as any, align: 'center', valign: 'middle', fontFace: FONT })
    footer(s)
  }

  // ---------------------- IMPROVEMENTS ANALYSIS ----------------------
  if (showAnalysis) {
    const s = pptx.addSlide()
    s.background = { color: C.paper }
    const subParts = [p.analysis.subhead, p.analysis.forLine, p.analysis.byLine].filter(Boolean).join('  ·  ')
    header(s, 'Why upgrade', p.analysis.heading || 'Improvements Analysis', subParts || undefined)
    let y = subParts ? 2.05 : 1.78
    if (p.analysis.summary) {
      s.addText([{ text: 'Summary — ', options: { bold: true } }, { text: p.analysis.summary }], { x: MX, y, w: W - MX * 2, h: 0.6, fontSize: 11, color: C.body, fontFace: FONT, lineSpacingMultiple: 1.1, valign: 'top' })
      y += 0.75
    }
    // two comparison tables
    const colW = (W - MX * 2 - 0.4) / 2
    const cols = [
      { label: p.analysis.existingLabel, atKey: 'exAt' as const, chKey: 'exChange' as const, accent: C.muted },
      { label: p.analysis.newLabel, atKey: 'newAt' as const, chKey: 'newChange' as const, accent: C.green },
    ]
    cols.forEach((col, ci) => {
      const x = MX + ci * (colW + 0.4)
      s.addText(col.label || (ci === 0 ? 'Existing' : 'New'), { x, y, w: colW, h: 0.3, fontSize: 13, bold: true, color: ci === 0 ? C.navy : C.greenPress, fontFace: FONT })
      s.addText(p.analysis.unitLabel || '', { x, y: y + 0.28, w: colW, h: 0.24, fontSize: 9.5, italic: true, color: C.muted, fontFace: FONT })
      const rows: PptxGenJS.TableRow[] = [
        [
          { text: 'Feature', options: { bold: true, color: C.white, fill: { color: C.navy }, fontSize: 10, fontFace: FONT } },
          { text: 'At point', options: { bold: true, color: C.white, fill: { color: C.navy }, fontSize: 10, fontFace: FONT, align: 'right' } },
          { text: 'Change', options: { bold: true, color: C.white, fill: { color: C.navy }, fontSize: 10, fontFace: FONT, align: 'right' } },
        ],
        ...p.analysis.rows.map((r): PptxGenJS.TableRow => [
          { text: r.feature, options: { fontSize: 10, color: C.navy, fontFace: FONT } },
          { text: r[col.atKey] || '', options: { fontSize: 10, color: C.body, fontFace: FONT, align: 'right' } },
          { text: r[col.chKey] || '', options: { fontSize: 10, color: C.body, fontFace: FONT, align: 'right' } },
        ]),
      ]
      s.addTable(rows, { x, y: y + 0.56, w: colW, colW: [colW * 0.5, colW * 0.25, colW * 0.25], rowH: 0.3, border: { type: 'solid', color: C.line, pt: 0.5 } as any, valign: 'middle' })
    })
    // hydraulics basis
    if (p.hydraulics.worksheet.designGpm > 0) {
      const basis = [
        ['Design GPM', formatNumber(p.hydraulics.worksheet.designGpm)],
        ['Total dynamic head', `${round0(tdhAtPump(p.hydraulics.worksheet))} ft`],
        ['Pressure @ pump', `${round0(psiAtPump(p.hydraulics.worksheet))} psi`],
        ['HP required', `${round0(hpRequired(p.hydraulics.worksheet))} hp`],
      ]
      const bw = (W - MX * 2 - 0.3 * 3) / 4
      basis.forEach(([k, v], i) => {
        const x = MX + i * (bw + 0.3)
        s.addText(k.toUpperCase(), { x, y: 6.0, w: bw, h: 0.22, fontSize: 8.5, color: C.green, fontFace: FONT })
        s.addText(v, { x, y: 6.2, w: bw, h: 0.32, fontSize: 15, bold: true, color: C.navy, fontFace: FONT })
      })
    }
    if (p.analysis.conclusion) {
      s.addText([{ text: 'Conclusion — ', options: { bold: true } }, { text: p.analysis.conclusion }], { x: MX, y: 6.55, w: W - MX * 2, h: 0.5, fontSize: 10.5, color: C.body, fontFace: FONT, lineSpacingMultiple: 1.1, valign: 'top' })
    }
    footer(s)
  }

  // -------------------------- INVESTMENT SUMMARY --------------------------
  if (showSummary) {
    const s = pptx.addSlide()
    s.background = { color: C.white }
    header(s, 'Investment summary', p.customer.company || 'Your Operation', [p.customer.location, p.settings.summarySubtitle].filter(Boolean).join('  ·  ') || undefined)
    let y = 2.1
    const rows: PptxGenJS.TableRow[] = p.projects.map((pr): PptxGenJS.TableRow => [
      { text: [pr.title || 'Untitled project', pr.location ? `\n${pr.location}` : ''].join(''), options: { fontSize: 12, color: C.navy, bold: true, fontFace: FONT } },
      { text: pr.number || '', options: { fontSize: 11, color: C.muted, fontFace: FONT, align: 'center' } },
      { text: formatCurrency(projectTotal(pr)), options: { fontSize: 12, color: C.navy, bold: true, fontFace: FONT, align: 'right' } },
    ])
    s.addTable(rows, { x: MX, y, w: W - MX * 2, colW: [(W - MX * 2) * 0.6, (W - MX * 2) * 0.2, (W - MX * 2) * 0.2], rowH: 0.45, border: { type: 'solid', color: C.line, pt: 0.5 } as any, valign: 'middle' })
    y += p.projects.length * 0.47 + 0.2
    s.addShape(pptx.ShapeType.rect, { x: MX, y, w: W - MX * 2, h: 0.6, fill: { color: C.green50 } })
    s.addText('Total (includes est. tax)', { x: MX + 0.2, y, w: 6, h: 0.6, fontSize: 14, bold: true, color: C.navy, valign: 'middle', fontFace: FONT })
    s.addText(formatCurrency(grandInvestment), { x: W - 4 - MX, y, w: 4 - 0.2, h: 0.6, fontSize: 18, bold: true, color: C.greenPress, align: 'right', valign: 'middle', fontFace: FONT })
    y += 0.85
    if (p.payment.enabled) {
      const pay: [string, number][] = [
        ['Down payment due upon approval', p.payment.downPayment],
        ['Progress payments', p.payment.progressPayments],
        ['Estimated due upon invoicing', p.payment.dueUponInvoicing],
      ]
      s.addText('PAYMENT SCHEDULE', { x: MX, y, w: 6, h: 0.25, fontSize: 10, bold: true, color: C.green, charSpacing: 1, fontFace: FONT })
      y += 0.3
      pay.forEach(([k, v]) => {
        s.addText(k, { x: MX, y, w: 6, h: 0.3, fontSize: 11, color: C.body, fontFace: FONT })
        s.addText(formatCurrency(v), { x: MX + 6, y, w: 3, h: 0.3, fontSize: 11, color: C.navy, align: 'right', fontFace: FONT })
        y += 0.32
      })
      s.addText('Total', { x: MX, y, w: 6, h: 0.3, fontSize: 12, bold: true, color: C.navy, fontFace: FONT })
      s.addText(formatCurrency(p.payment.downPayment + p.payment.progressPayments + p.payment.dueUponInvoicing), { x: MX + 6, y, w: 3, h: 0.3, fontSize: 12, bold: true, color: C.greenPress, align: 'right', fontFace: FONT })
    }
    footer(s)
  }

  // ------------------------- PROJECT DETAIL QUOTES -------------------------
  for (const pr of detailProjects) {
    const pages = chunk(pr.lines, LINES_PER_SLIDE)
    pages.forEach((lines, pi) => {
      const s = pptx.addSlide()
      s.background = { color: C.white }
      const cont = pages.length > 1 ? ` (cont. ${pi + 1}/${pages.length})` : ''
      header(s, `Project Quote${pr.number ? ` · ${pr.number}` : ''}`, `${pr.title || 'Project'}${cont}`, pr.location || undefined)
      let y = pr.location ? 2.1 : 1.85
      if (pi === 0 && pr.description) {
        s.addText(pr.description, { x: MX, y, w: W - MX * 2, h: 0.4, fontSize: 12, color: C.body, fontFace: FONT })
        y += 0.5
      }
      const rows: PptxGenJS.TableRow[] = [
        [
          { text: 'No.', options: { bold: true, color: C.white, fill: { color: C.navy }, fontSize: 10, fontFace: FONT } },
          { text: 'Description', options: { bold: true, color: C.white, fill: { color: C.navy }, fontSize: 10, fontFace: FONT } },
          { text: 'Qty', options: { bold: true, color: C.white, fill: { color: C.navy }, fontSize: 10, fontFace: FONT, align: 'right' } },
          { text: 'Unit price', options: { bold: true, color: C.white, fill: { color: C.navy }, fontSize: 10, fontFace: FONT, align: 'right' } },
          { text: 'Total', options: { bold: true, color: C.white, fill: { color: C.navy }, fontSize: 10, fontFace: FONT, align: 'right' } },
        ],
        ...lines.map((l: ProjectLine): PptxGenJS.TableRow => {
          const muted = l.isNote || l.excludeFromTotal
          const desc = l.description + (l.excludeFromTotal ? '   (comparison — not included)' : '')
          const amt = l.isNote ? '' : l.excludeFromTotal ? `(${formatCurrency(projectLineTotal(l))})` : formatCurrency(projectLineTotal(l))
          return [
            { text: l.code || '', options: { fontSize: 9.5, color: C.muted, fontFace: FONT } },
            { text: desc, options: { fontSize: 10, italic: !!muted, color: muted ? C.muted : C.navy, fontFace: FONT } },
            { text: l.isNote ? '' : `${formatNumber(l.qty)} ${l.unit}`.trim(), options: { fontSize: 10, color: C.body, fontFace: FONT, align: 'right' } },
            { text: l.isNote ? '' : formatCurrency(l.unitPrice), options: { fontSize: 10, color: C.body, fontFace: FONT, align: 'right' } },
            { text: amt, options: { fontSize: 10, color: muted ? C.muted : C.navy, fontFace: FONT, align: 'right' } },
          ]
        }),
      ]
      const tw = W - MX * 2
      s.addTable(rows, { x: MX, y, w: tw, colW: [tw * 0.1, tw * 0.5, tw * 0.13, tw * 0.13, tw * 0.14], rowH: 0.3, border: { type: 'solid', color: C.line, pt: 0.5 } as any, valign: 'middle', autoPage: false })
      // totals on last page
      if (pi === pages.length - 1) {
        const ty = Math.min(y + rows.length * 0.32 + 0.2, 5.9)
        const tot: [string, string, boolean?][] = [
          ['Subtotal', formatCurrency(projectSubtotal(pr))],
          [`Sales tax (${pr.taxRate || 0}%)`, formatCurrency(projectTax(pr))],
          ['Project total', formatCurrency(projectTotal(pr)), true],
        ]
        tot.forEach(([k, v, grand], i) => {
          const yy = ty + i * 0.34
          s.addText(k, { x: W - 5.5 - MX, y: yy, w: 3.3, h: 0.3, fontSize: grand ? 14 : 12, bold: !!grand, color: grand ? C.navy : C.body, fontFace: FONT, valign: 'middle' })
          s.addText(v, { x: W - 2.2 - MX, y: yy, w: 2.2, h: 0.3, fontSize: grand ? 16 : 12, bold: !!grand, color: grand ? C.greenPress : C.navy, align: 'right', fontFace: FONT, valign: 'middle' })
        })
      }
      footer(s)
    })
  }

  // ------------------------- EQUIPMENT (legacy line items) -------------------------
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
      if (item.summary) { s.addText(item.summary, { x: textX, y: cursor, w: textW, h: 0.5, fontSize: 15, italic: true, color: C.greenPress, fontFace: FONT }); cursor += 0.55 }
      if (item.description) { s.addText(item.description, { x: textX, y: cursor, w: textW, h: 0.9, fontSize: 13, color: C.body, fontFace: FONT, lineSpacingMultiple: 1.1, valign: 'top' }); cursor += 1.0 }
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
      if (hl.length) s.addText(hl.map((h) => ({ text: h, options: { bullet: { characterCode: '2022' }, color: C.body, paraSpaceAfter: 3 } })), { x: textX, y: cursor, w: textW, h: 1.0, fontSize: 13, fontFace: FONT, valign: 'top' })
      s.addText(
        [
          { text: `${formatNumber(item.quantity)} ${item.unit} × ${formatCurrency(item.unitPrice)}`, options: { fontSize: 12, color: C.muted } },
          { text: `   ${formatCurrency(lineNet(item))}`, options: { fontSize: 18, bold: true, color: C.greenPress } },
        ],
        { x: textX, y: 5.85, w: textW, h: 0.5, fontFace: FONT, align: 'left' },
      )
      footer(s)
    })
  }

  // ---------------------------- PRICING (legacy) ----------------------------
  if (p.settings.showPricing && p.lineItems.length) {
    const s = pptx.addSlide()
    s.background = { color: C.white }
    header(s, 'Investment', 'Pricing summary')
    const rows: PptxGenJS.TableRow[] = [
      [
        { text: 'Item', options: { bold: true, color: C.white, fill: { color: C.navy }, fontFace: FONT, fontSize: 11 } },
        { text: 'Qty', options: { bold: true, color: C.white, fill: { color: C.navy }, align: 'right', fontFace: FONT, fontSize: 11 } },
        { text: 'Unit price', options: { bold: true, color: C.white, fill: { color: C.navy }, align: 'right', fontFace: FONT, fontSize: 11 } },
        { text: 'Amount', options: { bold: true, color: C.white, fill: { color: C.navy }, align: 'right', fontFace: FONT, fontSize: 11 } },
      ],
      ...p.lineItems.map((item): PptxGenJS.TableRow => [
        { text: item.name || 'Untitled item', options: { color: C.navy, bold: true, fontFace: FONT, fontSize: 13 } },
        { text: `${formatNumber(item.quantity)} ${item.unit}`, options: { align: 'right', color: C.body, fontFace: FONT, fontSize: 13 } },
        { text: formatCurrency(item.unitPrice), options: { align: 'right', color: C.body, fontFace: FONT, fontSize: 13 } },
        { text: formatCurrency(lineNet(item)), options: { align: 'right', color: C.navy, bold: true, fontFace: FONT, fontSize: 13 } },
      ]),
    ]
    s.addTable(rows, { x: MX, y: 1.9, w: W - MX * 2, colW: [(W - MX * 2) * 0.52, (W - MX * 2) * 0.14, (W - MX * 2) * 0.17, (W - MX * 2) * 0.17], rowH: 0.4, border: { type: 'solid', color: C.line, pt: 0.5 } as any, valign: 'middle' })
    const tRows: { k: string; v: string; grand?: boolean; disc?: boolean }[] = [{ k: 'Subtotal', v: formatCurrency(totals.gross) }]
    if (totals.discount > 0) tRows.push({ k: 'Discount', v: `−${formatCurrency(totals.discount)}`, disc: true })
    if (totals.freight > 0) tRows.push({ k: 'Freight / mobilization', v: formatCurrency(totals.freight) })
    tRows.push({ k: `Tax (${p.settings.taxRate}%)`, v: formatCurrency(totals.tax) })
    tRows.push({ k: 'Total investment', v: formatCurrency(totals.grandTotal), grand: true })
    const ty = Math.min(1.9 + rows.length * 0.42 + 0.3, 4.6)
    tRows.forEach((r, i) => {
      const y = ty + i * 0.42
      s.addText(r.k, { x: W - 5.5 - MX, y, w: 3.3, h: 0.38, fontSize: r.grand ? 15 : 14, bold: r.grand, color: r.grand ? C.navy : C.body, align: 'left', fontFace: FONT, valign: 'middle' })
      s.addText(r.v, { x: W - 2.2 - MX, y, w: 2.2, h: 0.38, fontSize: r.grand ? 17 : 14, bold: r.grand, color: r.grand ? C.greenPress : r.disc ? C.greenPress : C.navy, align: 'right', fontFace: FONT, valign: 'middle' })
    })
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
    s.addText("Meet with our design team to turn your operation's needs into a custom irrigation plan. We build systems meant to run for decades — and we're close by when you need us.", { x: MX, y: 3.9, w: 8.5, h: 1.0, fontSize: 14, color: 'C9D3DA', fontFace: FONT, lineSpacingMultiple: 1.2 })
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
