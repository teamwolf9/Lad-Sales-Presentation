import { useRef } from 'react'
import type { Project, ProjectLine } from '../types'
import { Icon } from '../ui/Icon'
import { uid, formatCurrency, cls } from '../lib/util'
import { uploadImageFile } from '../lib/uploads'
import { projectLineTotal, projectSubtotal, projectTax, projectTotal } from '../lib/pricing'
import { Text, Area, Num } from './controls'

const UNITS = ['ea', 'ft', 'lot', 'system', 'set', 'hrs', 'acre']

export function ProjectEditor({
  project,
  index,
  uid: ownerUid,
  onChange,
  onRemove,
}: {
  project: Project
  index: number
  uid?: string | null
  onChange: (next: Project) => void
  onRemove: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const set = <K extends keyof Project>(key: K, value: Project[K]) => onChange({ ...project, [key]: value })

  const setLine = (id: string, patch: Partial<ProjectLine>) =>
    set('lines', project.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  const addLine = (isNote = false) =>
    set('lines', [
      ...project.lines,
      { id: uid('pl'), code: '', description: '', qty: 1, unit: 'ea', unitPrice: 0, isNote },
    ])
  const removeLine = (id: string) => set('lines', project.lines.filter((l) => l.id !== id))

  const onPickMap = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      set('mapUrl', await uploadImageFile(file, ownerUid, 'project-maps'))
    } catch {
      alert('Could not read that image. Try a JPG or PNG.')
    }
    e.target.value = ''
  }

  return (
    <div className="li-card">
      <div className="li-card__head">
        <span className="li-card__kind">
          project · {String(index + 1).padStart(2, '0')}
        </span>
        <button className="icon-btn" onClick={onRemove} title="Remove project">
          <Icon name="trash" size={16} />
        </button>
      </div>

      <div className="field-row">
        <Text label="Project #" value={project.number} onChange={(v) => set('number', v)} placeholder="PR01966" />
        <Num label="Tax rate" suffix="%" value={project.taxRate} step={0.1} onChange={(v) => set('taxRate', v)} />
      </div>
      <Text label="Title" value={project.title} onChange={(v) => set('title', v)} placeholder="e.g. Snakeview River Lift Station" />
      <Text label="Farm / location" value={project.location} onChange={(v) => set('location', v)} placeholder="e.g. Snake View Farm · Burbank, WA" />
      <Area label="Scope summary" rows={2} value={project.description} onChange={(v) => set('description', v)} placeholder="One sentence describing this scope of work." />

      {/* Map / photo upload */}
      <div className="mini-label">Project map / photo (optional)</div>
      {project.mapUrl ? (
        <div className="upload-thumb">
          <img src={project.mapUrl} alt="project map" />
          <button className="icon-btn" onClick={() => set('mapUrl', '')} title="Remove">
            <Icon name="trash" size={14} />
          </button>
        </div>
      ) : (
        <button className="btn btn--ghost btn--sm" onClick={() => fileRef.current?.click()}>
          <Icon name="map" size={14} /> Upload image
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/png,image/jpeg" onChange={onPickMap} style={{ display: 'none' }} />

      {/* Line items */}
      <div className="mini-label">Line items</div>
      {project.lines.map((l) => (
        <div className={cls('pline', l.isNote && 'pline--note', l.excludeFromTotal && 'pline--excluded')} key={l.id}>
          <div className="pline__top">
            <input
              className="pline__code"
              placeholder={l.isNote ? 'note' : 'No. / SKU'}
              value={l.code}
              onChange={(e) => setLine(l.id, { code: e.target.value })}
            />
            <label className="pline__notetoggle" title="Note line (no price emphasis)">
              <input type="checkbox" checked={l.isNote} onChange={(e) => setLine(l.id, { isNote: e.target.checked })} />
              note
            </label>
            {!l.isNote && (
              <label className="pline__notetoggle" title="Keep on the page but exclude from the subtotal/total (e.g. a comparison alternate)">
                <input
                  type="checkbox"
                  checked={!!l.excludeFromTotal}
                  onChange={(e) => setLine(l.id, { excludeFromTotal: e.target.checked })}
                />
                exclude
              </label>
            )}
            <button className="icon-btn" onClick={() => removeLine(l.id)} title="Remove line">
              <Icon name="trash" size={13} />
            </button>
          </div>
          <textarea
            className="pline__desc"
            rows={2}
            placeholder="Description"
            value={l.description}
            onChange={(e) => setLine(l.id, { description: e.target.value })}
          />
          {!l.isNote && (
            <div className="pline__nums">
              <input
                type="number"
                placeholder="Qty"
                value={l.qty}
                onChange={(e) => setLine(l.id, { qty: parseFloat(e.target.value) || 0 })}
              />
              <select value={l.unit} onChange={(e) => setLine(l.id, { unit: e.target.value })}>
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Unit $"
                value={l.unitPrice}
                onChange={(e) => setLine(l.id, { unitPrice: parseFloat(e.target.value) || 0 })}
              />
              <span className="pline__total" title={l.excludeFromTotal ? 'Excluded from total' : undefined}>
                {l.excludeFromTotal ? <s>{formatCurrency(projectLineTotal(l))}</s> : formatCurrency(projectLineTotal(l))}
              </span>
            </div>
          )}
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button className="btn btn--ghost btn--sm" onClick={() => addLine(false)}>
          <Icon name="plus" size={14} /> Add line
        </button>
        <button className="btn btn--ghost btn--sm" onClick={() => addLine(true)}>
          <Icon name="plus" size={14} /> Add note
        </button>
      </div>

      {/* Live total */}
      <div className="pmini-totals">
        <div>
          <span>Subtotal</span>
          <span>{formatCurrency(projectSubtotal(project))}</span>
        </div>
        <div>
          <span>Tax ({project.taxRate || 0}%)</span>
          <span>{formatCurrency(projectTax(project))}</span>
        </div>
        <div className="pmini-totals__grand">
          <span>Project total</span>
          <span>{formatCurrency(projectTotal(project))}</span>
        </div>
      </div>

      <label className="chip" style={{ marginTop: 12 }}>
        <input
          type="checkbox"
          checked={project.showDetail}
          onChange={(e) => set('showDetail', e.target.checked)}
          style={{ width: 'auto' }}
        />
        Include detailed line-item page in the document
      </label>
    </div>
  )
}
