/**
 * Import a Microsoft Business Central "WSI Job Quote" report export (.xml) into
 * the app's Project model.
 *
 * The export nests Job → Job_Task → Job_Planning_Line, and also emits a flat
 * `WSIJobPlanningLine` list (same rows, plus discount columns). We read the flat
 * list for the line items and the `Job` header for project/customer details.
 *
 * - `Type = "Text"` rows are section headers (e.g. "PVC for Snakeview Farm") and
 *   become $0 note lines.
 * - The "Sales Tax …" row is pulled out and converted into the project's tax
 *   rate so totals reconcile to the original (no double-charging).
 */
import type { Project, ProjectLine } from '../types'
import { uid } from './util'

export interface ImportedQuote {
  project: Project
  /** Bill-to details, for optionally pre-filling the proposal customer. */
  customer: { company: string; contactName: string; location: string }
  salesperson: string
  /** Non-fatal notes about the import (e.g. detected tax rate). */
  notes: string[]
}

/** Parse "7,300" / "$110.95" / "" → number. */
function num(s: string | null | undefined): number {
  if (!s) return 0
  const n = parseFloat(s.replace(/[$,\s]/g, ''))
  return isFinite(n) ? n : 0
}

const clean = (s: string) => s.replace(/\s*\*PO Required\s*/i, '').trim()

/** Read a <Column name="X"> within a given element (direct columns only). */
function col(el: Element | null, name: string): string {
  if (!el) return ''
  const c = el.querySelector(`Column[name="${name}"]`)
  return (c?.textContent ?? '').trim()
}

const isSalesTax = (code: string, desc: string) => /sales\s*tax/i.test(code) || /sales\s*tax/i.test(desc)

/**
 * Parse a WSI Job Quote XML string. Throws if it isn't a recognizable export.
 * `taxRate` falls back to this value when the file has no detectable tax line.
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

  const lines: ProjectLine[] = []
  let taxAmount = 0
  let itemSubtotal = 0
  let firstHeader = ''

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
      continue // folded into taxRate below
    }

    const isNote = type === 'Text' || (qty === 0 && unitPrice === 0)
    if (isNote && !firstHeader && description) firstHeader = description
    if (!isNote) itemSubtotal += amount || qty * unitPrice

    lines.push({
      id: uid('pl'),
      code: code === 'NS' ? '' : code, // "NS" = non-stock placeholder, not a real SKU
      description,
      qty,
      unit: '',
      unitPrice,
      isNote,
    })
  }

  // Convert the captured sales-tax amount back into a percentage rate.
  const taxRate =
    taxAmount > 0 && itemSubtotal > 0
      ? Math.round((taxAmount / itemSubtotal) * 1000) / 10
      : fallbackTaxRate

  const notes: string[] = []
  if (taxAmount > 0) notes.push(`Sales tax line converted to a ${taxRate}% rate.`)
  notes.push(`Imported ${lines.length} line${lines.length === 1 ? '' : 's'} from ${number || 'the quote'}.`)

  const project: Project = {
    id: uid('pr'),
    number,
    title: firstHeader || company || `Quote ${number}`,
    location,
    description: salesperson ? `Prepared by ${salesperson}` : '',
    mapUrl: '',
    lines: lines.length ? lines : [{ id: uid('pl'), code: '', description: '', qty: 1, unit: '', unitPrice: 0, isNote: false }],
    taxRate,
    showDetail: true,
  }

  return { project, customer: { company, contactName, location }, salesperson, notes }
}
