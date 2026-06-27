import type { LineItem, Project, ProjectLine, Proposal } from '../types'

export function lineGross(item: LineItem): number {
  return item.quantity * item.unitPrice
}

export function lineDiscount(item: LineItem): number {
  return lineGross(item) * (item.discountPct / 100)
}

export function lineNet(item: LineItem): number {
  return lineGross(item) - lineDiscount(item)
}

export interface Totals {
  gross: number
  discount: number
  subtotal: number
  freight: number
  tax: number
  grandTotal: number
}

export function computeTotals(p: Proposal): Totals {
  const gross = p.lineItems.reduce((s, i) => s + lineGross(i), 0)
  const discount = p.lineItems.reduce((s, i) => s + lineDiscount(i), 0)
  const subtotal = gross - discount
  const freight = p.settings.freight || 0
  const tax = (subtotal + freight) * (p.settings.taxRate / 100)
  const grandTotal = subtotal + freight + tax
  return { gross, discount, subtotal, freight, tax, grandTotal }
}

/* -------------------------- Project pricing -------------------------- */

export function projectLineTotal(l: ProjectLine): number {
  return (l.qty || 0) * (l.unitPrice || 0)
}

export function projectSubtotal(pr: Project): number {
  // Lines flagged excludeFromTotal (e.g. comparison alternates) stay on the page
  // but don't count toward the subtotal/total.
  return pr.lines.reduce((s, l) => s + (l.excludeFromTotal ? 0 : projectLineTotal(l)), 0)
}

export function projectTax(pr: Project): number {
  return projectSubtotal(pr) * ((pr.taxRate || 0) / 100)
}

/** Final cost of a project — what the customer sees on the summary line. */
export function projectTotal(pr: Project): number {
  return projectSubtotal(pr) + projectTax(pr)
}

/** Sum of every project's final cost. */
export function projectsGrandTotal(p: Proposal): number {
  return p.projects.reduce((s, pr) => s + projectTotal(pr), 0)
}

/** The headline investment figure: projects if present, else legacy line items. */
export function investmentTotal(p: Proposal): number {
  return p.projects.length ? projectsGrandTotal(p) : computeTotals(p).grandTotal
}
