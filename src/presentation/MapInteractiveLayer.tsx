/**
 * Interactive annotation overlay laid over the map image (inside the scaled
 * document). All editor state lives in MapEditContext; the toolbar lives outside
 * the scaled tree. Pointer math is ratio-based, so it's correct at any preview
 * zoom. Geometry is stored as percentages of the image box (see MapAnnotation).
 *
 * The Line tool draws a multi-point pipe run: click to add each vertex, then
 * double-click / Enter to finish (Esc cancels). Vertices drag individually.
 */
import { useEffect, useRef, useState } from 'react'
import type { MapAnnotation } from '../types'
import { uid, cls, escapeHtml } from '../lib/util'
import { useMapEdit } from './mapEdit'
import { annoBoxStyle } from './MapStage'

const MIN = 4
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const strokeOf = (a: MapAnnotation) => a.weight ?? (a.kind === 'line' ? 8 : 6)

type DragMode = 'move' | 'resize' | 'p1' | 'p2' | 'vertex'
interface DragState {
  id: string
  mode: DragMode
  startX: number
  startY: number
  orig: MapAnnotation
  index?: number
}

export function MapInteractiveLayer({ aspect }: { aspect: number }) {
  const ctx = useMapEdit()!
  const { annotations, tool, setTool, selectedId, setSelectedId, editingId, setEditingId } = ctx
  const overlayRef = useRef<HTMLDivElement>(null)
  const editRef = useRef<HTMLSpanElement | null>(null)
  const annosRef = useRef(annotations)
  annosRef.current = annotations
  const onChangeRef = useRef(ctx.onChange)
  onChangeRef.current = ctx.onChange
  const drag = useRef<DragState | null>(null)
  const [drawingId, setDrawingId] = useState<string | null>(null)
  const drawingRef = useRef<string | null>(null)
  drawingRef.current = drawingId
  const [preview, setPreview] = useState<{ x: number; y: number } | null>(null)
  const selected = annotations.find((a) => a.id === selectedId) || null

  const vh = 1000 / aspect
  const rectOf = () => overlayRef.current?.getBoundingClientRect()
  const toPct = (clientX: number, clientY: number) => {
    const r = rectOf()
    if (!r) return { x: 0, y: 0 }
    return { x: clamp(((clientX - r.left) / r.width) * 100, 0, 100), y: clamp(((clientY - r.top) / r.height) * 100, 0, 100) }
  }
  const patch = (id: string, p: Partial<MapAnnotation>) =>
    onChangeRef.current(annosRef.current.map((a) => (a.id === id ? { ...a, ...p } : a)))
  const remove = (id: string) => {
    onChangeRef.current(annosRef.current.filter((a) => a.id !== id))
    if (selectedId === id) setSelectedId(null)
    if (editingId === id) setEditingId(null)
  }

  const finishDrawing = (commit = true) => {
    const id = drawingRef.current
    drawingRef.current = null
    setDrawingId(null)
    setPreview(null)
    if (id) {
      const cur = annosRef.current.find((a) => a.id === id)
      let pts = cur?.points ? [...cur.points] : []
      // Drop a trailing near-duplicate vertex (from the finishing double-click).
      while (pts.length >= 2) {
        const a = pts[pts.length - 1], b = pts[pts.length - 2]
        if (Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1) pts.pop()
        else break
      }
      if (!commit || pts.length < 2) onChangeRef.current(annosRef.current.filter((a) => a.id !== id))
      else patch(id, { points: pts })
    }
    setTool('select')
  }

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = drag.current
      if (!d) {
        if (drawingRef.current) setPreview(toPct(e.clientX, e.clientY))
        return
      }
      const pos = toPct(e.clientX, e.clientY)
      const dx = pos.x - d.startX
      const dy = pos.y - d.startY
      const o = d.orig
      if (d.mode === 'p1') patch(d.id, { x: pos.x, y: pos.y })
      else if (d.mode === 'p2') patch(d.id, { x2: pos.x, y2: pos.y })
      else if (d.mode === 'vertex' && o.points && d.index != null) {
        const pts = o.points.map((p, i) => (i === d.index ? { x: pos.x, y: pos.y } : p))
        patch(d.id, { points: pts })
      } else if (d.mode === 'move') {
        if (o.kind === 'line' && o.points) patch(d.id, { points: o.points.map((p) => ({ x: clamp(p.x + dx, 0, 100), y: clamp(p.y + dy, 0, 100) })) })
        else if (o.kind === 'arrow') patch(d.id, { x: o.x + dx, y: o.y + dy, x2: (o.x2 ?? o.x) + dx, y2: (o.y2 ?? o.y) + dy })
        else patch(d.id, { x: clamp(o.x + dx, 0, 100 - o.w), y: clamp(o.y + dy, 0, 100 - o.h) })
      } else if (d.mode === 'resize') {
        patch(d.id, { w: clamp(o.w + dx, MIN, 100 - o.x), h: clamp(o.h + dy, MIN, 100 - o.y) })
      }
    }
    const onUp = () => {
      drag.current = null
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [])

  // Seed the rich-text box from its stored HTML, then focus + select all, when it
  // enters edit mode (Edit button / double-click). DOM owns the content while editing.
  useEffect(() => {
    if (!editingId || !editRef.current) return
    const el = editRef.current
    const a = annosRef.current.find((x) => x.id === editingId)
    el.innerHTML = a?.html || escapeHtml(a?.text || '')
    el.focus()
    const sel = window.getSelection()
    const range = document.createRange()
    range.selectNodeContents(el)
    sel?.removeAllRanges()
    sel?.addRange(range)
  }, [editingId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editingId) return
      if (drawingRef.current) {
        if (e.key === 'Enter') {
          e.preventDefault()
          finishDrawing(true)
        } else if (e.key === 'Escape') {
          e.preventDefault()
          finishDrawing(false)
        }
        return
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault()
        remove(selectedId)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId, editingId])

  // Switching away from the Line tool finishes an in-progress pipe.
  useEffect(() => {
    if (tool !== 'line' && drawingRef.current) finishDrawing(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool])

  const startDrag = (e: React.PointerEvent, id: string, mode: DragMode, index?: number) => {
    e.preventDefault()
    e.stopPropagation()
    const orig = annosRef.current.find((a) => a.id === id)
    if (!orig) return
    const pos = toPct(e.clientX, e.clientY)
    drag.current = { id, mode, startX: pos.x, startY: pos.y, orig, index }
    setSelectedId(id)
  }

  const addAt = (px: number, py: number) => {
    const id = uid('anno')
    let a: MapAnnotation
    if (tool === 'text') a = { id, kind: 'text', x: clamp(px - 13, 0, 74), y: clamp(py - 5, 0, 88), w: 26, h: 12, color: '#0f172a', fill: '#ffffff', text: 'New label', fontPct: 3.4, bold: true }
    else if (tool === 'arrow') a = { id, kind: 'arrow', x: px, y: py, w: 0, h: 0, x2: clamp(px + 16, 0, 100), y2: clamp(py + 10, 0, 100), color: '#e11d2a', weight: 6 }
    else if (tool === 'ellipse') a = { id, kind: 'ellipse', x: clamp(px - 9, 0, 82), y: clamp(py - 9, 0, 82), w: 18, h: 18, color: '#e11d2a', fill: 'transparent' }
    else a = { id, kind: 'rect', x: clamp(px - 11, 0, 78), y: clamp(py - 8, 0, 84), w: 22, h: 16, color: '#e11d2a', fill: 'transparent' }
    onChangeRef.current([...annosRef.current, a])
    setSelectedId(id)
    setTool('select')
    if (a.kind === 'text') setEditingId(id)
  }

  const lineClick = (pos: { x: number; y: number }) => {
    const id = drawingRef.current
    if (!id) {
      const newId = uid('anno')
      const a: MapAnnotation = { id: newId, kind: 'line', x: 0, y: 0, w: 0, h: 0, color: '#2563eb', weight: 8, points: [pos] }
      onChangeRef.current([...annosRef.current, a])
      drawingRef.current = newId
      setDrawingId(newId)
      setSelectedId(newId)
    } else {
      const cur = annosRef.current.find((a) => a.id === id)
      patch(id, { points: [...(cur?.points || []), pos] })
    }
    setPreview(null)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    // Only react to clicks on the empty map — not clicks bubbling up from an
    // annotation (which would otherwise deselect / exit text editing).
    if (e.target !== e.currentTarget) return
    if (tool === 'select') {
      setSelectedId(null)
      setEditingId(null)
      return
    }
    const pos = toPct(e.clientX, e.clientY)
    if (tool === 'line') lineClick(pos)
    else addAt(pos.x, pos.y)
  }

  const onDoubleClick = () => {
    if (drawingRef.current) finishDrawing(true)
  }

  const ptStr = (pts: { x: number; y: number }[]) => pts.map((p) => `${(p.x / 100) * 1000},${(p.y / 100) * vh}`).join(' ')

  return (
    <div className={cls('map-anno-edit', tool !== 'select' && 'is-placing')} ref={overlayRef} onPointerDown={onPointerDown} onDoubleClick={onDoubleClick}>
      <svg className="map-anno-svg" viewBox={`0 0 1000 ${vh}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          {annotations.filter((a) => a.kind === 'arrow').map((a) => (
            <marker key={`m-${a.id}`} id={`ahe-${a.id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill={a.color} />
            </marker>
          ))}
        </defs>

        {/* Arrows (2-point) */}
        {annotations.filter((a) => a.kind === 'arrow').map((a) => {
          const x1 = (a.x / 100) * 1000, y1 = (a.y / 100) * vh, x2 = ((a.x2 ?? a.x) / 100) * 1000, y2 = ((a.y2 ?? a.y) / 100) * vh
          return (
            <g key={a.id}>
              {selectedId === a.id && <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(37,99,235,0.4)" strokeWidth={strokeOf(a) + 10} strokeLinecap="round" />}
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={a.color} strokeWidth={strokeOf(a)} strokeLinecap="round" markerEnd={`url(#ahe-${a.id})`} />
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={24} strokeLinecap="round" style={{ pointerEvents: 'stroke', cursor: 'move' }} onPointerDown={(e) => startDrag(e, a.id, 'move')} />
            </g>
          )
        })}

        {/* Lines / pipes (multi-point) */}
        {annotations.filter((a) => a.kind === 'line').map((a) => {
          const pts = a.points || []
          const isDraw = drawingId === a.id
          return (
            <g key={a.id}>
              {selectedId === a.id && pts.length > 1 && <polyline points={ptStr(pts)} fill="none" stroke="rgba(37,99,235,0.4)" strokeWidth={strokeOf(a) + 10} strokeLinecap="round" strokeLinejoin="round" />}
              {pts.length > 0 && <polyline points={ptStr(pts)} fill="none" stroke={a.color} strokeWidth={strokeOf(a)} strokeLinecap="round" strokeLinejoin="round" />}
              {isDraw && preview && pts.length > 0 && (
                <line x1={(pts[pts.length - 1].x / 100) * 1000} y1={(pts[pts.length - 1].y / 100) * vh} x2={(preview.x / 100) * 1000} y2={(preview.y / 100) * vh} stroke={a.color} strokeWidth={strokeOf(a)} strokeDasharray="10 8" strokeLinecap="round" opacity={0.6} />
              )}
              {!isDraw && pts.length > 1 && (
                <polyline points={ptStr(pts)} fill="none" stroke="transparent" strokeWidth={24} strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: 'stroke', cursor: 'move' }} onPointerDown={(e) => startDrag(e, a.id, 'move')} />
              )}
            </g>
          )
        })}
      </svg>

      {/* Text / shapes */}
      {annotations.filter((a) => a.kind !== 'arrow' && a.kind !== 'line').map((a) => {
        const isSel = a.id === selectedId
        return (
          <div
            key={a.id}
            className={cls('map-anno', a.kind === 'text' && 'map-anno--text', a.kind === 'rect' && 'map-anno--rect', a.kind === 'ellipse' && 'map-anno--ellipse', isSel && 'is-selected')}
            style={annoBoxStyle(a)}
            onPointerDown={(e) => {
              if (editingId === a.id) return
              startDrag(e, a.id, 'move')
            }}
            onDoubleClick={(e) => {
              if (a.kind === 'text') {
                e.stopPropagation()
                setSelectedId(a.id)
                setEditingId(a.id)
              }
            }}
          >
            {a.kind === 'text' &&
              (editingId === a.id ? (
                <span
                  className="map-anno__txt"
                  ref={editRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => patch(a.id, { html: e.currentTarget.innerHTML, text: e.currentTarget.textContent || '' })}
                  onBlur={(e) => {
                    patch(a.id, { html: e.currentTarget.innerHTML, text: e.currentTarget.textContent || '' })
                    setEditingId(null)
                  }}
                />
              ) : (
                <span className="map-anno__txt" dangerouslySetInnerHTML={{ __html: a.html || escapeHtml(a.text || '') }} />
              ))}
            {isSel && <span className="maped__handle maped__handle--se" onPointerDown={(e) => startDrag(e, a.id, 'resize')} />}
          </div>
        )
      })}

      {/* Arrow endpoint handles */}
      {selected?.kind === 'arrow' && (
        <>
          <span className="maped__dot" style={{ left: `${selected.x}%`, top: `${selected.y}%` }} onPointerDown={(e) => startDrag(e, selected.id, 'p1')} />
          <span className="maped__dot" style={{ left: `${selected.x2 ?? selected.x}%`, top: `${selected.y2 ?? selected.y}%` }} onPointerDown={(e) => startDrag(e, selected.id, 'p2')} />
        </>
      )}

      {/* Line vertex handles (when selected, not mid-draw) */}
      {selected?.kind === 'line' && drawingId !== selected.id && (selected.points || []).map((p, i) => (
        <span key={i} className="maped__dot" style={{ left: `${p.x}%`, top: `${p.y}%` }} onPointerDown={(e) => startDrag(e, selected.id, 'vertex', i)} />
      ))}
    </div>
  )
}
