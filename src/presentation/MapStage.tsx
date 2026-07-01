/**
 * Shared, read-only renderer for the field-map image + its annotation overlay.
 *
 * The image is fitted (contain) inside whatever box it's given, and the overlay
 * is sized to the *rendered image* so annotations — stored as percentages — line
 * up exactly on screen, in the PDF and in PowerPoint. Used by both the document
 * (Presentation) and the slide deck; the builder's editor reuses useContainBox.
 */
import { useLayoutEffect, useRef, useState } from 'react'
import type { MapAnnotation, MapPage, PivotField } from '../types'
import { cls, escapeHtml } from '../lib/util'
import { useMapEdit } from './mapEdit'
import { MapInteractiveLayer } from './MapInteractiveLayer'

const DEFAULT_ASPECT = 640 / 512

/** Measure `ref`'s box and return the largest w/h with `aspect` that fits inside. */
export function useContainBox(
  ref: React.RefObject<HTMLElement>,
  aspect: number,
): { w: number; h: number } | null {
  const [box, setBox] = useState<{ w: number; h: number } | null>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      // Use layout pixels (clientWidth/Height), NOT getBoundingClientRect — the
      // live preview scales the whole sheet with a CSS transform, and a bounding
      // rect would report the scaled size, shrinking the map within the page.
      const cw = el.clientWidth
      const ch = el.clientHeight
      if (!cw || !ch) return
      let w = cw
      let h = w / aspect
      if (h > ch) {
        h = ch
        w = h * aspect
      }
      setBox({ w, h })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref, aspect])
  return box
}

/** Shared inline style for a text/rect/ellipse annotation box — used by both the
 *  read-only renderer and the interactive editor so they look identical. */
export function annoBoxStyle(a: MapAnnotation): React.CSSProperties {
  const s: React.CSSProperties = {
    left: `${a.x}%`,
    top: `${a.y}%`,
    width: `${a.w}%`,
    ['--accent' as any]: a.color,
    ['--fill' as any]: a.fill ?? (a.kind === 'text' ? '#ffffff' : 'transparent'),
  }
  if (a.kind === 'text') {
    // Height grows with the content so multi-line labels aren't clipped; the
    // stored h acts as a minimum so the box stays grabbable when nearly empty.
    s.minHeight = `${a.h}%`
    s.fontSize = `${a.fontPct || 3.4}cqw`
    s.color = a.color
    s.fontWeight = a.bold === false ? 500 : 700
    if (a.underline) s.textDecoration = 'underline'
  } else {
    s.height = `${a.h}%`
  }
  return s
}

/** Render one text/rect/ellipse annotation (arrows are drawn in the SVG layer). */
export function AnnotationShape({ a }: { a: MapAnnotation }) {
  if (a.kind === 'text') {
    return (
      <div className="map-anno map-anno--text" style={annoBoxStyle(a)}>
        <span className="map-anno__txt" dangerouslySetInnerHTML={{ __html: a.html || escapeHtml(a.text || ' ') }} />
      </div>
    )
  }
  return (
    <div
      className={cls('map-anno', a.kind === 'ellipse' ? 'map-anno--ellipse' : 'map-anno--rect')}
      style={annoBoxStyle(a)}
    />
  )
}

/** The annotation overlay (absolute, fills its positioned parent = the image). */
export function AnnotationLayer({ annotations, aspect }: { annotations: MapAnnotation[]; aspect: number }) {
  const arrows = annotations.filter((a) => a.kind === 'arrow')
  const lines = annotations.filter((a) => a.kind === 'line')
  const shapes = annotations.filter((a) => a.kind !== 'arrow' && a.kind !== 'line')
  const vh = 1000 / aspect
  const stroke = (a: MapAnnotation) => a.weight ?? (a.kind === 'line' ? 8 : 6)
  const ptStr = (pts: { x: number; y: number }[]) => pts.map((p) => `${(p.x / 100) * 1000},${(p.y / 100) * vh}`).join(' ')
  return (
    <>
      {(arrows.length > 0 || lines.length > 0) && (
        <svg className="map-anno-svg" viewBox={`0 0 1000 ${vh}`} preserveAspectRatio="xMidYMid meet">
          <defs>
            {arrows.map((a) => (
              <marker key={`m-${a.id}`} id={`ah-${a.id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill={a.color} />
              </marker>
            ))}
          </defs>
          {arrows.map((a) => (
            <line
              key={a.id}
              x1={(a.x / 100) * 1000}
              y1={(a.y / 100) * vh}
              x2={((a.x2 ?? a.x) / 100) * 1000}
              y2={((a.y2 ?? a.y) / 100) * vh}
              stroke={a.color}
              strokeWidth={stroke(a)}
              strokeLinecap="round"
              markerEnd={`url(#ah-${a.id})`}
            />
          ))}
          {lines.map((a) =>
            a.points && a.points.length > 1 ? (
              <polyline key={a.id} points={ptStr(a.points)} fill="none" stroke={a.color} strokeWidth={stroke(a)} strokeLinecap="round" strokeLinejoin="round" />
            ) : null,
          )}
        </svg>
      )}
      {shapes.map((a) => (
        <AnnotationShape key={a.id} a={a} />
      ))}
    </>
  )
}

/** Non-editable pin markers for imported pivot fields, drawn from map.fields.
 *  A colored dot sits exactly on each pivot; a compact label reads out the name
 *  + acreage. pointer-events are off so it never blocks annotation editing.
 *
 *  Labels flip to the left of their dot in the right half of the map (so long
 *  names don't run off the page), then a measure pass pushes any that still
 *  overlap vertically apart. Measurement is ratio-based, so it's correct at any
 *  preview zoom (the document is scaled by a CSS transform). */
export function FieldMarkers({ fields }: { fields: PivotField[] }) {
  const marks = fields.filter((f) => f.mx != null && f.my != null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [offsets, setOffsets] = useState<Record<string, number>>({})
  // Re-run the de-overlap only when the marker set / labels actually change.
  const key = marks.map((f) => `${f.id}:${f.mx},${f.my}:${f.name}:${f.acres}`).join('|')

  useLayoutEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const wr = wrap.getBoundingClientRect()
    if (!wr.height || !wrap.clientHeight) return
    const scale = wr.height / wrap.clientHeight // scaled px per layout px
    // Boxes are measured independent of any applied vertical offset: horizontal
    // extent + intrinsic height come from the label; the baseline top is centered
    // on the (fixed) dot. So re-running never drifts.
    type Box = { id: string; left: number; right: number; top: number; height: number }
    const items: Box[] = []
    for (const el of Array.from(wrap.querySelectorAll<HTMLElement>('.field-marker'))) {
      const id = el.dataset.mid
      const label = el.querySelector<HTMLElement>('.field-marker__label')
      const dot = el.querySelector<HTMLElement>('.field-marker__dot')
      if (!id || !label || !dot) continue
      const lr = label.getBoundingClientRect()
      const dr = dot.getBoundingClientRect()
      items.push({
        id,
        left: lr.left - wr.left,
        right: lr.right - wr.left,
        top: (dr.top + dr.bottom) / 2 - wr.top - lr.height / 2,
        height: lr.height,
      })
    }
    items.sort((a, b) => a.top - b.top)
    const placed: Box[] = []
    const next: Record<string, number> = {}
    const GAP = 2 // scaled px
    for (const it of items) {
      let top = it.top
      let moved = true
      let guard = 0
      while (moved && guard++ < 300) {
        moved = false
        for (const p of placed) {
          const hit = it.left < p.right + GAP && it.right > p.left - GAP && top < p.top + p.height + GAP && top + it.height > p.top - GAP
          if (hit) { top = p.top + p.height + GAP; moved = true }
        }
      }
      next[it.id] = (top - it.top) / scale // → layout px for translateY
      placed.push({ ...it, top })
    }
    setOffsets((prev) => {
      const changed = items.some((it) => Math.abs((prev[it.id] || 0) - (next[it.id] || 0)) > 0.5)
      return changed ? next : prev
    })
  }, [key])

  if (!marks.length) return null
  return (
    <div className="field-markers" ref={wrapRef}>
      {marks.map((f) => (
        <div
          className={cls('field-marker', (f.mx ?? 0) > 58 && 'field-marker--flip')}
          key={f.id}
          data-mid={f.id}
          style={{ left: `${f.mx}%`, top: `${f.my}%` }}
        >
          <span className="field-marker__dot" style={{ background: f.excluded ? '#6b7280' : f.color || '#f97316' }} />
          <span className="field-marker__label" style={{ transform: `translateY(calc(-50% + ${offsets[f.id] || 0}px))` }}>
            {f.name || 'Field'}
            {f.acres != null && <span className="field-marker__ac"> · {f.acres.toFixed(f.acres < 100 ? 2 : 1)} ac</span>}
          </span>
        </div>
      ))}
    </div>
  )
}

/** Image + annotations, fitted (contain) inside the given box.
 *  When `editable` and a MapEditContext is present, the annotations become
 *  interactive (used by the live document preview). */
export function MapStage({ map, className, editable }: { map: MapPage; className?: string; editable?: boolean }) {
  const aspect = map.imageAspect || DEFAULT_ASPECT
  const fitRef = useRef<HTMLDivElement>(null)
  const box = useContainBox(fitRef, aspect)
  const edit = useMapEdit()
  const interactive = !!editable && !!edit
  return (
    <div className={cls('map-fit', className)} ref={fitRef}>
      <div
        className={cls('map-stage', interactive && 'map-stage--edit')}
        style={box ? { width: box.w, height: box.h } : { visibility: 'hidden', aspectRatio: String(aspect) }}
      >
        <img className="map-stage__img" src={map.imageUrl} alt={map.caption || 'Field map'} draggable={false} />
        {interactive ? (
          <MapInteractiveLayer aspect={aspect} />
        ) : (
          <AnnotationLayer annotations={map.annotations ?? []} aspect={aspect} />
        )}
        <FieldMarkers fields={map.fields ?? []} />
      </div>
    </div>
  )
}
