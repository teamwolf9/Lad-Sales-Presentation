/**
 * Import a Microsoft Business Central "WSI Job Quote" report export (.xml) into
 * the app's Project model.
 *
 * The export nests Job → Job_Task → Job_Planning_Line, and also emits a flat
 * `WSIJobPlanningLine` list (same rows, plus discount columns). We read the flat
 * list for the line items and the `Job` header for project/customer details.
 *
 * - `Type = "Text"` rows are SECTION HEADERS (e.g. "PVC for Snakeview Farm").
 *   Each one starts a new project; the following item rows belong to it.
 * - The "Sales Tax …" row is pulled out and converted into a tax rate applied
 *   to every project so totals reconcile (no double-charging).
 * - Email / phone are NOT present in this export, so they're left blank.
 */
import type { Project } from '../types'
import { uid, todayISO } from './util'

export interface ImportedQuote {
  meta: { title: string; number: string; date: string }
  /** Bill-to details, for pre-filling the proposal customer (no email/phone in BC export). */
  customer: { company: string; contactName: string; location: string }
  salesperson: string
  /** One project per section header (or a single project if none). */
  projects: Project[]
  /** Non-fatal notes about the import. */
  notes: string[]
}

/** Parse "7,300" / "$110.95" / "" → number. */
function num(s: string | null | undefined): number {
  if (!s) return 0
  const n = parseFloat(s.replace(/[$,\s]/g, ''))
  return isFinite(n) ? n : 0
}

const clean = (s: string) => s.replace(/\s*\*PO Required\s*/i, '').trim()

/** Read a <Column name="X"> within a given element. */
function col(el: Element | null, name: string): string {
  if (!el) return ''
  const c = el.querySelector(`Column[name="${name}"]`)
  return (c?.textContent ?? '').trim()
}

const isSalesTax = (code: string, desc: string) => /sales\s*tax/i.test(code) || /sales\s*tax/i.test(desc)

/** "June 26, 2026" → "2026-06-26" (falls back to today on parse failure). */
function toISODate(s: string): string {
  const d = new Date(s)
  if (isNaN(d.getTime())) return todayISO()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

function newProject(title: string): Project {
  return {
    id: uid('pr'),
    number: '',
    title,
    location: '',
    description: '',
    mapUrl: '',
    lines: [],
    taxRate: 0,
    showDetail: true,
  }
}

/**
 * Parse a WSI Job Quote XML string. Throws if it isn't a recognizable export.
 * `fallbackTaxRate` is used when the file has no detectable sales-tax line.
 */
export function parseJobQuoteXml(xml: string, fallbackTaxRate = 0): ImportedQuote {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.querySelector('parsererror')) throw new Error('This file is not valid XML.')

  const job = doc.querySelector('DataItem[name="Job"]')
  const jobCols = job?.querySelector(':scope > Columns') ?? null
  const lineEls = Array.from(doc.querySelectorAll('DataItem[name="WSIJobPlanningLine"]'))
  if (!job || lineEls.length === 0) {
    throw new Error('No Business Central job-quote data found in this file.')
  }

  const number = col(jobCols, 'No_Job')
  const company = clean(col(jobCols, 'BillToAddress1'))
  const contactName = clean(col(jobCols, 'BillToAddress3'))
  const location = clean(col(jobCols, 'ShipToAddress5') || col(jobCols, 'BillToAddress5'))
  const salesperson = col(jobCols, 'WSI_Salesperson_Name')
  const jobTitle = clean(col(jobCols, 'Description_Job'))

  const projects: Project[] = []
  let current: Project | null = null
  let taxAmount = 0
  let itemSubtotal = 0
  let lineCount = 0

  const ensureProject = () => {
    if (!current) {
      current = newProject(jobTitle || company || `Quote ${number}`)
      projects.push(current)
    }
    return current
  }

  for (const el of lineEls) {
    const type = col(el, 'WSIType')
    const code = col(el, 'WSINo')
    const description = col(el, 'WSIDescription')
    const qty = num(col(el, 'WSIQuantity'))
    const unitPrice = num(col(el, 'WSIUnitPrice'))
    const amount = num(col(el, 'WSILineAmount'))

    if (!description && !code) continue // skip empty spacer rows

    if (isSalesTax(code, description)) {
      taxAmount += amount || qty * unitPrice
      continue // folded into a tax rate below
    }

    const isHeader = type === 'Text' || (qty === 0 && unitPrice === 0 && !!description)
    if (isHeader) {
      // Start a new project section.
      current = newProject(description)
      projects.push(current)
      continue
    }

    itemSubtotal += amount || qty * unitPrice
    lineCount++
    ensureProject().lines.push({
      id: uid('pl'),
      code: code === 'NS' ? '' : code, // "NS" = non-stock placeholder, not a real SKU
      description,
      qty,
      unit: '',
      unitPrice,
      isNote: false,
      excludeFromTotal: false,
    })
  }

  // Drop header-only sections that ended up with no line items.
  const filled = projects.filter((pr) => pr.lines.length > 0)
  const finalProjects = filled.length ? filled : projects
  if (finalProjects.length === 0) {
    finalProjects.push({ ...newProject(jobTitle || company || `Quote ${number}`) })
  }

  // Convert the captured sales-tax amount into a percentage and apply to each.
  const taxRate =
    taxAmount > 0 && itemSubtotal > 0 ? Math.round((taxAmount / itemSubtotal) * 1000) / 10 : fallbackTaxRate
  finalProjects.forEach((pr) => (pr.taxRate = taxRate))

  const notes: string[] = []
  if (taxAmount > 0) notes.push(`Sales-tax line converted to a ${taxRate}% rate on each section.`)
  notes.push(
    `Imported ${lineCount} line${lineCount === 1 ? '' : 's'} into ${finalProjects.length} project${
      finalProjects.length === 1 ? '' : 's'
    } from ${number || 'the quote'}.`,
  )

  return {
    meta: { title: jobTitle, number, date: toISODate(col(jobCols, 'TodayFormatted')) },
    customer: { company, contactName, location },
    salesperson,
    projects: finalProjects,
    notes,
  }
}
