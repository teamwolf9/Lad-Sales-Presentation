import { useRef, useState } from 'react'
import type { CadPage } from '../types'
import { Icon } from '../ui/Icon'
import { importCadFile, renderDwg } from '../lib/cad'
import { Text } from './controls'

/** Cad step — upload DXF/DWG drawings; each becomes its own document page. */
export function CadStep({
  cad,
  uid: ownerUid,
  onChange,
}: {
  cad: CadPage
  uid?: string | null
  onChange: (next: CadPage) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [renderingId, setRenderingId] = useState<string | null>(null)
  const patch = (p: Partial<CadPage>) => onChange({ ...cad, ...p })

  // Convert an already-attached DWG (e.g. added before conversion existed).
  const onRenderDwg = async (id: string) => {
    const drawing = cad.drawings.find((d) => d.id === id)
    if (!drawing) return
    setRenderingId(id)
    try {
      const next = await renderDwg(drawing, ownerUid)
      onChange({ ...cad, drawings: cad.drawings.map((d) => (d.id === id ? next : d)) })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not render this DWG.')
    } finally {
      setRenderingId(null)
    }
  }

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return
    setBusy(true)
    const added = [...cad.drawings]
    const errors: string[] = []
    for (const f of files) {
      try {
        added.push(await importCadFile(f, ownerUid))
      } catch (err) {
        errors.push(err instanceof Error ? err.message : `Could not import "${f.name}".`)
      }
    }
    // Adding the first drawing implies the page is wanted.
    onChange({ ...cad, drawings: added, enabled: cad.enabled || added.length > 0 })
    setBusy(false)
    if (errors.length) alert(errors.join('\n'))
  }

  const setCaption = (id: string, caption: string) =>
    patch({ drawings: cad.drawings.map((d) => (d.id === id ? { ...d, caption } : d)) })
  const remove = (id: string) => patch({ drawings: cad.drawings.filter((d) => d.id !== id) })

  return (
    <div>
      <h2 className="section-title">CAD drawings</h2>
      <p className="section-hint">
        Attach system drawings from CAD. DXF files render on their own drawing page with a title
        block; DWG files are stored with the proposal and listed as attachments — export DXF from
        your CAD software for an on-page preview.
      </p>

      <label className="chip" style={{ marginBottom: 14 }}>
        <input
          type="checkbox"
          checked={cad.enabled}
          onChange={(e) => patch({ enabled: e.target.checked })}
          style={{ width: 'auto' }}
        />
        Include the CAD drawing pages
      </label>

      <div style={{ marginBottom: 14 }}>
        <button className="btn btn--ghost btn--block" onClick={() => fileRef.current?.click()} disabled={busy}>
          <Icon name="drafting" size={15} /> {busy ? 'Importing…' : 'Add CAD files (.dxf / .dwg)'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".dxf,.dwg"
          multiple
          onChange={onPick}
          style={{ display: 'none' }}
        />
      </div>

      {cad.drawings.length === 0 ? (
        <div className="help-empty">
          No drawings yet. Add a .dxf to see it rendered in the document — pivots, mainline, the
          whole sheet, as crisp vector linework.
        </div>
      ) : (
        cad.drawings.map((d) => (
          <div className="li-card" key={d.id}>
            <div className="li-card__head">
              <span className="li-card__kind" data-kind={d.kind === 'dwg' ? 'service' : undefined}>
                {d.kind}
              </span>
              <span className="cadfile__name" title={d.name}>
                {d.name}
              </span>
              <button className="icon-btn" onClick={() => remove(d.id)} title="Remove drawing">
                <Icon name="trash" size={14} />
              </button>
            </div>
            {d.svgUrl ? (
              <div className="upload-thumb upload-thumb--wide cadfile__thumb">
                <img src={d.svgUrl} alt={d.name} />
              </div>
            ) : (
              <>
                <p className="cadfile__note">
                  No drawing preview yet — render it to show the linework on the CAD page instead
                  of an attachment card.
                </p>
                <button
                  className="btn btn--ghost btn--sm"
                  style={{ marginBottom: 10 }}
                  onClick={() => onRenderDwg(d.id)}
                  disabled={renderingId === d.id}
                >
                  <Icon name="drafting" size={14} />
                  {renderingId === d.id ? 'Rendering…' : 'Render preview'}
                </button>
              </>
            )}
            <Text
              label="Caption"
              maxLength={80}
              value={d.caption}
              onChange={(v) => setCaption(d.id, v)}
              placeholder="e.g. Pivot layout — Snake View Farm, sheet 1 of 2"
            />
          </div>
        ))
      )}

      <div className="mini-label">Title block</div>
      <div className="field-row">
        <Text label="Designer" maxLength={40} value={cad.designer} onChange={(v) => patch({ designer: v })} />
        <Text label="Drawn by" maxLength={40} value={cad.drawnBy} onChange={(v) => patch({ drawnBy: v })} />
      </div>
    </div>
  )
}
