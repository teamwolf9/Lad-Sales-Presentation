import type { LineItem, Proposal } from '../types'

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
