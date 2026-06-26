/**
 * Hydraulic calculations — faithful replicas of Lad's "SYSTEM DESIGN" workbook.
 *
 * Pipe friction loss → "PIPE FRICTION LOSS CALCULATION SHEET" (PIPE<<<).
 * Hydraulic worksheet  → "HYDRAULIC WORKSHEET" (<LOSS).
 * Formulas and constants match the spreadsheet cell-for-cell.
 */
import type { PipeSegment, HydraulicWorksheet } from '../types'

const safe = (n: number) => (Number.isFinite(n) ? n : 0)

/* ----------------------------- Pipe friction loss ----------------------------- */

/** Cubic feet per second  = GPM / 450. */
export function segCfs(s: PipeSegment): number {
  return safe(s.gpm / 450)
}

/** Velocity (ft/s) = 0.408 * GPM / ID². */
export function segVelocity(s: PipeSegment): number {
  return s.pipeId > 0 ? safe((0.408 * s.gpm) / (s.pipeId * s.pipeId)) : 0
}

/** Hazen-Williams loss per 100 ft (ft) = 1045 * (GPM / C)^1.852 / ID^4.87. */
export function segLossPer100(s: PipeSegment): number {
  if (s.pipeId <= 0 || s.hazenC <= 0) return 0
  return safe((1045 * Math.pow(s.gpm / s.hazenC, 1.852)) / Math.pow(s.pipeId, 4.87))
}

/** Total friction loss for the run (ft) = lossPer100 / 100 * length. */
export function segLossFt(s: PipeSegment): number {
  return safe((segLossPer100(s) / 100) * s.length)
}

/** Friction loss in PSI = lossFt / 2.31. */
export function segLossPsi(s: PipeSegment): number {
  return safe(segLossFt(s) / 2.31)
}

/** Recommended air-vent placement (ft from entrance) = velocity * ID / 12 * 1.76. */
export function segAirVent(s: PipeSegment): number {
  return safe((segVelocity(s) * s.pipeId) / 12 * 1.76)
}

/** Safety margin of head available (ft) = availableFall − lossFt. */
export function segSafetyMargin(s: PipeSegment): number {
  return safe(s.availableFall - segLossFt(s))
}

/* ------------------------------ Hydraulic worksheet ------------------------------ */

/** Subtotal TDH (ft) = static + sys loss + ML loss + elevation + pivot ht. */
export function tdhSubtotal(w: HydraulicWorksheet): number {
  return safe(w.staticReqd + w.sysLoss + w.mlLoss + w.elevation + w.pivotHt)
}

/** TDH required @ pump (ft) = subtotal + misc losses. */
export function tdhAtPump(w: HydraulicWorksheet): number {
  return safe(tdhSubtotal(w) + w.miscLosses)
}

/** PSI required @ pump = TDH@pump / 2.31. */
export function psiAtPump(w: HydraulicWorksheet): number {
  return safe(tdhAtPump(w) / 2.31)
}

/** Subtotal PSI = subtotal TDH / 2.31. */
export function psiSubtotal(w: HydraulicWorksheet): number {
  return safe(tdhSubtotal(w) / 2.31)
}

/** HP required @ pump = (TDH@pump * designGPM) / 0.8 / 3960. */
export function hpRequired(w: HydraulicWorksheet): number {
  return w.designGpm > 0 ? safe((tdhAtPump(w) * w.designGpm) / 0.8 / 3960) : 0
}
