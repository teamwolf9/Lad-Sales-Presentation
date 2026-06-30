/**
 * Shared, read-only renderer for the field-map image + its annotation overlay.
 *
 * The image is fitted (contain) inside whatever box it's given, and the overlay
 * is sized to the *rendered image* so annotations — stored as percentages — line
 * up exactly on screen, in the PDF and in PowerPoint. Used by both the document
 * (Presentation) and the slide deck; the builder's editor reuses useContainBox.
 */
import { useLayoutEffect, useRef, useState } from 'react'
import type { MapAnnotation, MapPage } from '../types'
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
      </div>
    </div>
  )
}
