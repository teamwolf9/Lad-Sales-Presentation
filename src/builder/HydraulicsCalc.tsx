import type { Hydraulics, PipeSegment } from '../types'
import { Icon } from '../ui/Icon'
import { uid } from '../lib/util'
import { Text, Num } from './controls'
import {
  segVelocity,
  segLossPer100,
  segLossFt,
  segLossPsi,
  segAirVent,
  segSafetyMargin,
  tdhSubtotal,
  tdhAtPump,
  psiAtPump,
  hpRequired,
} from '../lib/hydraulics'

const r1 = (n: number) => (Math.round(n * 10) / 10).toLocaleString()
const r2 = (n: number) => (Math.round(n * 100) / 100).toLocaleString()

export function HydraulicsCalc({
  hydraulics,
  onChange,
  onPushSegment,
}: {
  hydraulics: Hydraulics
  onChange: (next: Hydraulics) => void
  onPushSegment: (seg: PipeSegment) => void
}) {
  const h = hydraulics
  const w = h.worksheet

  const setSeg = (id: string, patch: Partial<PipeSegment>) =>
    onChange({ ...h, segments: h.segments.map((s) => (s.id === id ? { ...s, ...patch } : s)) })
  const addSeg = () =>
    onChange({
      ...h,
      segments: [
        ...h.segments,
        { id: uid('seg'), label: '', length: 0, pipeId: 0, gpm: 0, hazenC: 150, availableFall: 0 },
      ],
    })
  const removeSeg = (id: string) => onChange({ ...h, segments: h.segments.filter((s) => s.id !== id) })
  const setW = (patch: Partial<typeof w>) => onChange({ ...h, worksheet: { ...w, ...patch } })

  return (
    <div className="calc">
      <div className="calc__banner">
        <Icon name="drafting" size={15} />
        <span>
          <strong>Hydraulic calculator</strong> — same inputs as the Lad system-design sheet. Outputs compute live.
        </span>
      </div>

      {/* ---- Pipe friction loss segments ---- */}
      <div className="mini-label" style={{ color: 'rgba(233,241,246,.65)', marginTop: 4 }}>
        Pipe friction loss — one run per segment
      </div>
      {h.segments.length === 0 && (
        <div className="help-empty" style={{ padding: 16 }}>
          No pipe segments yet. Add one to compute velocity and friction loss.
        </div>
      )}
      {h.segments.map((s) => (
        <div className="li-card" key={s.id}>
          <div className="li-card__head">
            <span className="li-card__kind">pipe run</span>
            <button className="icon-btn" onClick={() => removeSeg(s.id)} title="Remove">
              <Icon name="trash" size={14} />
            </button>
          </div>
          <Text label="Feature / label" value={s.label} onChange={(v) => setSeg(s.id, { label: v })} placeholder="e.g. River BP Discharge — 26&quot; MLS" />
          <div className="field-row">
            <Num label="Length" suffix="ft" value={s.length} onChange={(v) => setSeg(s.id, { length: v })} />
            <Num label="Pipe ID" suffix="in" value={s.pipeId} step={0.125} onChange={(v) => setSeg(s.id, { pipeId: v })} />
          </div>
          <div className="field-row">
            <Num label="GPM" value={s.gpm} step={10} onChange={(v) => setSeg(s.id, { gpm: v })} />
            <Num label="Pipe C" value={s.hazenC} step={5} onChange={(v) => setSeg(s.id, { hazenC: v })} />
          </div>
          <Num label="Available fall" suffix="ft" value={s.availableFall} onChange={(v) => setSeg(s.id, { availableFall: v })} />

          <div className="calc__out">
            <div><span>Velocity</span><span>{r2(segVelocity(s))} fps</span></div>
            <div><span>Loss / 100 ft</span><span>{r2(segLossPer100(s))} ft</span></div>
            <div><span>Friction loss</span><span>{r1(segLossFt(s))} ft</span></div>
            <div><span>Loss in PSI</span><span>{r2(segLossPsi(s))} psi</span></div>
            <div><span>Air vent at</span><span>{r1(segAirVent(s))} ft</span></div>
            <div><span>Safety margin</span><span>{r1(segSafetyMargin(s))} ft</span></div>
          </div>
          <button className="btn btn--ghost btn--sm" style={{ marginTop: 8 }} onClick={() => onPushSegment(s)}>
            <Icon name="plus" size={13} /> Add to analysis as a row
          </button>
        </div>
      ))}
      <button className="btn btn--ghost btn--sm" onClick={addSeg}>
        <Icon name="plus" size={14} /> Add pipe segment
      </button>

      {/* ---- Hydraulic worksheet (TDH) ---- */}
      <div className="mini-label" style={{ color: 'rgba(233,241,246,.65)' }}>
        Hydraulic worksheet — total dynamic head
      </div>
      <div className="field-row">
        <Num label="Static reqd" suffix="ft" value={w.staticReqd} onChange={(v) => setW({ staticReqd: v })} />
        <Num label="System loss" suffix="ft" value={w.sysLoss} onChange={(v) => setW({ sysLoss: v })} />
      </div>
      <div className="field-row">
        <Num label="Mainline loss" suffix="ft" value={w.mlLoss} onChange={(v) => setW({ mlLoss: v })} />
        <Num label="Elevation" suffix="ft" value={w.elevation} onChange={(v) => setW({ elevation: v })} />
      </div>
      <div className="field-row">
        <Num label="Pivot height" suffix="ft" value={w.pivotHt} onChange={(v) => setW({ pivotHt: v })} />
        <Num label="Misc losses" suffix="ft" value={w.miscLosses} onChange={(v) => setW({ miscLosses: v })} />
      </div>
      <Num label="Design GPM" value={w.designGpm} step={10} onChange={(v) => setW({ designGpm: v })} />

      <div className="calc__out calc__out--wide">
        <div><span>Subtotal TDH</span><span>{r1(tdhSubtotal(w))} ft</span></div>
        <div><span>TDH @ pump</span><span>{r1(tdhAtPump(w))} ft</span></div>
        <div><span>PSI @ pump</span><span>{r1(psiAtPump(w))} psi</span></div>
        <div><span>HP required</span><span>{r1(hpRequired(w))} hp</span></div>
      </div>
    </div>
  )
}
