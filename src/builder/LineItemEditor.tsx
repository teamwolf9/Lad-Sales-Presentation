import type { LineItem } from '../types'
import { PRODUCT_CATEGORIES, SERVICE_CATEGORIES } from '../data/reference'
import { Icon } from '../ui/Icon'
import { uid } from '../lib/util'
import { Text, Area, Num } from './controls'

const UNITS = ['ea', 'system', 'lot', 'ft', 'acre', 'hrs', 'set']

export function LineItemEditor({
  item,
  index,
  onChange,
  onRemove,
}: {
  item: LineItem
  index: number
  onChange: (next: LineItem) => void
  onRemove: () => void
}) {
  const set = <K extends keyof LineItem>(key: K, value: LineItem[K]) => onChange({ ...item, [key]: value })

  const cats = item.kind === 'service' ? SERVICE_CATEGORIES : PRODUCT_CATEGORIES

  const setSpec = (id: string, field: 'label' | 'value', v: string) =>
    set(
      'specs',
      item.specs.map((s) => (s.id === id ? { ...s, [field]: v } : s)),
    )
  const addSpec = () => set('specs', [...item.specs, { id: uid('sp'), label: '', value: '' }])
  const removeSpec = (id: string) => set('specs', item.specs.filter((s) => s.id !== id))

  const setHl = (i: number, v: string) =>
    set('highlights', item.highlights.map((h, hi) => (hi === i ? v : h)))
  const addHl = () => set('highlights', [...item.highlights, ''])
  const removeHl = (i: number) => set('highlights', item.highlights.filter((_, hi) => hi !== i))

  return (
    <div className="li-card">
      <div className="li-card__head">
        <span className="li-card__kind" data-kind={item.kind}>
          {item.kind} · {String(index + 1).padStart(2, '0')}
        </span>
        <button className="icon-btn" onClick={onRemove} title="Remove item">
          <Icon name="trash" size={16} />
        </button>
      </div>

      <div className="field-row">
        <div className="field">
          <label>Type</label>
          <select value={item.kind} onChange={(e) => set('kind', e.target.value as LineItem['kind'])}>
            <option value="product">Product</option>
            <option value="service">Service</option>
          </select>
        </div>
        <div className="field">
          <label>Category</label>
          <select value={item.category} onChange={(e) => set('category', e.target.value)}>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Text label="Name" value={item.name} onChange={(v) => set('name', v)} placeholder="e.g. Center Pivot — 7-Tower" />
      <Text
        label="One-line summary"
        value={item.summary}
        onChange={(v) => set('summary', v)}
        placeholder="Short headline shown under the name"
      />
      <Area
        label="Description"
        value={item.description}
        onChange={(v) => set('description', v)}
        placeholder="A sentence or two of detail"
      />
      <Text
        label="Image URL (optional)"
        value={item.imageUrl}
        onChange={(v) => set('imageUrl', v)}
        placeholder="https://… product photo"
      />

      <div className="mini-label">Specs</div>
      {item.specs.map((s) => (
        <div className="spec-row" key={s.id}>
          <input placeholder="Label" value={s.label} onChange={(e) => setSpec(s.id, 'label', e.target.value)} />
          <input placeholder="Value" value={s.value} onChange={(e) => setSpec(s.id, 'value', e.target.value)} />
          <button className="icon-btn" onClick={() => removeSpec(s.id)} title="Remove spec">
            <Icon name="trash" size={14} />
          </button>
        </div>
      ))}
      <button className="btn btn--ghost btn--sm" onClick={addSpec}>
        <Icon name="plus" size={14} /> Add spec
      </button>

      <div className="mini-label">Highlights</div>
      {item.highlights.map((h, i) => (
        <div className="spec-row" key={i} style={{ gridTemplateColumns: '1fr 32px' }}>
          <input placeholder="Feature / benefit" value={h} onChange={(e) => setHl(i, e.target.value)} />
          <button className="icon-btn" onClick={() => removeHl(i)} title="Remove">
            <Icon name="trash" size={14} />
          </button>
        </div>
      ))}
      <button className="btn btn--ghost btn--sm" onClick={addHl}>
        <Icon name="plus" size={14} /> Add highlight
      </button>

      <div className="mini-label">Pricing</div>
      <div className="field-row">
        <Num label="Quantity" value={item.quantity} min={0} onChange={(v) => set('quantity', v)} />
        <div className="field">
          <label>Unit</label>
          <select value={item.unit} onChange={(e) => set('unit', e.target.value)}>
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field-row">
        <Num label="Unit price" prefix="$" value={item.unitPrice} min={0} step={0.01} onChange={(v) => set('unitPrice', v)} />
        <Num label="Discount" suffix="%" value={item.discountPct} min={0} step={1} onChange={(v) => set('discountPct', v)} />
      </div>
    </div>
  )
}
