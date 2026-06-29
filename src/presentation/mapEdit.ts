/**
 * Shared state for editing map annotations directly on the live document map.
 *
 * The toolbar (rendered unscaled, above the preview) and the interactive overlay
 * (rendered inside the scaled document, over the map image) both read/write this
 * context, so editing happens on the big preview instead of a tiny builder box.
 */
import { createContext, useContext } from 'react'
import type { MapAnnotation, MapAnnotationKind } from '../types'

export type MapTool = 'select' | MapAnnotationKind

export const MAP_COLORS = ['#e11d2a', '#f59e0b', '#16a34a', '#2563eb', '#0f172a', '#ffffff']

export interface MapEditValue {
  annotations: MapAnnotation[]
  onChange: (next: MapAnnotation[]) => void
  tool: MapTool
  setTool: (t: MapTool) => void
  selectedId: string | null
  setSelectedId: (id: string | null) => void
  editingId: string | null
  setEditingId: (id: string | null) => void
}

export const MapEditContext = createContext<MapEditValue | null>(null)
export const useMapEdit = () => useContext(MapEditContext)
