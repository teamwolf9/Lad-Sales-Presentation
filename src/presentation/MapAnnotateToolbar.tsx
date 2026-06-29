/** Annotation toolbar for the live map — rendered above the preview (unscaled).
 *  Drives the shared MapEditContext that the interactive overlay reads. */
import { useMapEdit, MAP_COLORS, type MapTool } from './mapEdit'
import { Icon } from '../ui/Icon'
import { cls } from '../lib/util'

const TOOLS: { tool: MapTool; icon: string; label: string }[] = [
  { tool: 'text', icon: 'text', label: 'Text' },
  { tool: 'rect', icon: 'square', label: 'Box' },
  { tool: 'ellipse', icon: 'circle', label: 'Ellipse' },
  { tool: 'arrow', icon: 'arrow', label: 'Arrow' },
  { tool: 'line', icon: 'line', label: 'Line' },
]
const FILL_COLORS = ['transparent', '#ffffff', '#0f172a', '#e11d2a', '#f59e0b', '#16a34a', '#2563eb']
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

export function MapAnnotateToolbar() {
  const ctx = useMapEdit()
  if (!ctx) return null
  const { annotations, onChange, tool, setTool, selectedId, editingId, setEditingId } = ctx
  const selected = annotations.find((a) => a.id === selectedId) || null
  const patch = (id: string, p: Record<string, unknown>) => onChange(annotations.map((a) => (a.id === id ? { ...a, ...p } : a)))
  const remove = (id: string) => onChange(annotations.filter((a) => a.id !== id))
  const editing = !!selected && editingId === selected.id
  const exec = (cmd: string) => document.execCommand(cmd, false)
  const isText = selected?.kind === 'text'
  const isStroke = selected?.kind === 'arrow' || selected?.kind === 'line'
  const hasFill = !!selected && !isStroke
  const isBold = selected?.bold !== false
  const curWeight = selected?.weight ?? (selected?.kind === 'line' ? 8 : 6)

  return (
    <div className="maptb no-print">
      <span className="maptb__hint">Click a tool, then click the map. Drag to move, corner to resize.</span>

      <span className="maped__group">
        {TOOLS.map((t) => (
          <button key={t.tool} type="button" className={cls('maped__tool', tool === t.tool && 'is-on')} onClick={() => setTool(tool === t.tool ? 'select' : t.tool)}>
            <Icon name={t.icon} size={15} /> {t.label}
          </button>
        ))}
      </span>

      {selected && (
        <span className="maped__group maped__group--sel">
          {isText && (
            <>
              <button type="button" className={cls('maped__tool', editing && 'is-on')} onClick={() => (editing ? setEditingId(null) : setEditingId(selected.id))} title="Edit text">
                <Icon name="text" size={15} /> {editing ? 'Done' : 'Edit'}
              </button>
              <button
                type="button"
                className={cls('maped__tool maped__tool--b', !editing && isBold && 'is-on')}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => (editing ? exec('bold') : patch(selected.id, { bold: !isBold }))}
                title={editing ? 'Bold selected words' : 'Bold (whole box)'}
              >
                B
              </button>
              <button
                type="button"
                className={cls('maped__tool maped__tool--u', !editing && selected.underline && 'is-on')}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => (editing ? exec('underline') : patch(selected.id, { underline: !selected.underline }))}
                title={editing ? 'Underline selected words' : 'Underline (whole box)'}
              >
                U
              </button>
              <button type="button" className="maped__tool" onClick={() => patch(selected.id, { fontPct: clamp((selected.fontPct || 3.4) - 0.5, 1.5, 9) })} title="Smaller text">A−</button>
              <button type="button" className="maped__tool" onClick={() => patch(selected.id, { fontPct: clamp((selected.fontPct || 3.4) + 0.5, 1.5, 9) })} title="Larger text">A+</button>
            </>
          )}

          {isStroke && (
            <>
              <span className="maptb__label">Width</span>
              <button type="button" className="maped__tool" onClick={() => patch(selected.id, { weight: clamp(curWeight - 2, 2, 40) })} title="Thinner">−</button>
              <span className="maptb__val">{curWeight}</span>
              <button type="button" className="maped__tool" onClick={() => patch(selected.id, { weight: clamp(curWeight + 2, 2, 40) })} title="Thicker">+</button>
            </>
          )}

          <span className="maptb__label">{isText ? 'Text' : 'Line'}</span>
          {MAP_COLORS.map((c) => (
            <button key={c} type="button" className={cls('maped__swatch', selected.color === c && 'is-on')} style={{ background: c }} onClick={() => patch(selected.id, { color: c })} title="Text / line color" />
          ))}

          {hasFill && (
            <>
              <span className="maptb__label">Fill</span>
              {FILL_COLORS.map((c) => {
                const cur = selected.fill ?? (isText ? '#ffffff' : 'transparent')
                return (
                  <button
                    key={c}
                    type="button"
                    className={cls('maped__swatch', c === 'transparent' && 'maped__swatch--none', cur === c && 'is-on')}
                    style={c === 'transparent' ? undefined : { background: c }}
                    onClick={() => patch(selected.id, { fill: c })}
                    title={c === 'transparent' ? 'No fill' : 'Box fill color'}
                  />
                )
              })}
            </>
          )}

          <button type="button" className="maped__tool maped__tool--danger" onClick={() => remove(selected.id)} title="Delete (Del)">
            <Icon name="trash" size={15} /> Delete
          </button>
        </span>
      )}
    </div>
  )
}
