import type { DesignToolkit } from '../types'
import { CALCULATORS, calcDefaults, getCalc, type CalcDef, type CalcGroup } from '../lib/calculators'
import { Icon } from '../ui/Icon'
import { cls } from '../lib/util'
import { Num } from './controls'

const GROUPS: CalcGroup[] = ['Pivot', 'Pump', 'Hydraulic', 'Electrical', 'Cost']

const fmt = (n: number, dp = 1) =>
  (Number.isFinite(n) ? n : 0).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })

function CalculatorCard({
  def,
  values,
  onField,
  onRemove,
}: {
  def: CalcDef
  values: Record<string, number>
  onField: (key: string, v: number) => void
  onRemove: () => void
}) {
  return (
    <div className="li-card">
      <div className="li-card__head">
        <span className="li-card__kind">{def.group}</span>
        <button className="icon-btn" onClick={onRemove} title="Remove calculator">
          <Icon name="trash" size={14} />
        </button>
      </div>
      <div className="calc-card__name">{def.name}</div>
      <p className="calc-card__blurb">{def.blurb}</p>

      {def.fields.map((f) => (
        <Num
          key={f.key}
          label={f.label}
          suffix={f.unit}
          step={f.step}
          value={values[f.key] ?? 0}
          onChange={(v) => onField(f.key, v)}
        />
      ))}
      {def.fields.some((f) => f.hint) && (
        <div className="calc-card__hints">
          {def.fields.filter((f) => f.hint).map((f) => (
            <div key={f.key}>
              <strong>{f.label}:</strong> {f.hint}
            </div>
          ))}
        </div>
      )}

      <div className="calc__out calc__out--wide">
        {def.outputs.map((o) => (
          <div key={o.key}>
            <span>{o.label}</span>
            <span>
              {fmt(o.fn(values), o.dp ?? 1)}
              {o.unit ? ` ${o.unit}` : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function CalculatorToolkit({
  design,
  onChange,
}: {
  design: DesignToolkit
  onChange: (next: DesignToolkit) => void
}) {
  const isOn = (id: string) => design.active.includes(id)

  const toggle = (id: string) => {
    if (isOn(id)) {
      onChange({ ...design, active: design.active.filter((x) => x !== id) })
    } else {
      const def = getCalc(id)!
      onChange({
        ...design,
        active: [...design.active, id],
        values: { [id]: { ...calcDefaults(def), ...design.values[id] }, ...design.values },
      })
    }
  }

  const setField = (id: string, key: string, v: number) =>
    onChange({ ...design, values: { ...design.values, [id]: { ...design.values[id], [key]: v } } })

  return (
    <div>
      <div className="mini-label" style={{ color: 'rgba(233,241,246,.65)', marginTop: 4 }}>
        Add design calculators
      </div>
      {GROUPS.map((grp) => (
        <div key={grp} className="calc-pick">
          <div className="calc-pick__grp">{grp}</div>
          <div className="chips">
            {CALCULATORS.filter((c) => c.group === grp).map((c) => (
              <button key={c.id} className={cls('chip', isOn(c.id) && 'chip--on')} onClick={() => toggle(c.id)}>
                <span className="chip__dot" />
                {c.name}
              </button>
            ))}
          </div>
        </div>
      ))}

      {design.active.length === 0 ? (
        <div className="help-empty" style={{ marginTop: 12 }}>
          Pick the calculators this proposal needs above — a pivot build, a pump station, and a mainline all use
          different ones.
        </div>
      ) : (
        <div style={{ marginTop: 12 }}>
          {design.active.map((id) => {
            const def = getCalc(id)
            if (!def) return null
            return (
              <CalculatorCard
                key={id}
                def={def}
                values={design.values[id] ?? {}}
                onField={(k, v) => setField(id, k, v)}
                onRemove={() => toggle(id)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
