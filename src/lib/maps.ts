/**
 * Google Maps Platform integration for the Map page.
 *
 * The interactive picker uses the Maps JavaScript API (+ Places for search).
 * "Use this view" then requests a Maps Static API image of the same
 * center/zoom/type and converts it to a data URL, so the captured map embeds
 * cleanly into the PDF / PowerPoint exports (no cross-origin taint).
 */
import type { MapAnnotation } from '../types'
import { uid } from './util'

export const MAPS_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim()
export const mapsEnabled = !!MAPS_KEY

let loader: Promise<any> | null = null

/** Lazily load the Maps JS API (with Places). Resolves the global `google`. */
export function loadGoogleMaps(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'))
  if ((window as any).google?.maps) return Promise.resolve((window as any).google)
  if (!mapsEnabled) return Promise.reject(new Error('Google Maps API key not configured'))
  if (loader) return loader

  loader = new Promise<any>((resolve, reject) => {
    const cbName = '__ladMapsReady'
    ;(window as any)[cbName] = () => resolve((window as any).google)
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      MAPS_KEY,
    )}&libraries=places&loading=async&callback=${cbName}`
    s.async = true
    s.onerror = () => {
      loader = null
      reject(new Error('Failed to load Google Maps'))
    }
    document.head.appendChild(s)
  })
  return loader
}

/** An encoded-polyline overlay drawn onto the static map. */
export interface StaticPath {
  /** Google-encoded polyline of [lat,lng] points. */
  enc: string
  /** Stroke color as 0xRRGGBBAA. */
  color: string
  weight: number
  /** Optional polygon fill (0xRRGGBBAA); presence implies a closed shape. */
  fill?: string
}

export interface StaticMapView {
  lat: number
  lng: number
  zoom: number
  /** 'roadmap' | 'satellite' | 'hybrid' | 'terrain' */
  mapType: string
  /** Optional pixel size (logical, before ×2 retina). Defaults to STATIC_W/H. */
  w?: number
  h?: number
  /** Optional KML-derived line/polygon overlays baked into the still. */
  paths?: StaticPath[]
  /** Optional point markers (lat,lng) baked into the still. */
  markers?: { lat: number; lng: number }[]
}

/* --------------------------------- KML --------------------------------- */

export interface KmlFeatures {
  /** Line + polygon rings as [lat,lng][] with a closed flag (polygon). */
  paths: { coords: [number, number][]; closed: boolean }[]
  points: { lat: number; lng: number; name?: string }[]
  /** Geographic bounds of everything, or null if empty. */
  bounds: { n: number; s: number; e: number; w: number } | null
}

const nsEls = (root: Element | Document, name: string) =>
  Array.from(root.getElementsByTagNameNS('*', name))

/** Parse a KML `<coordinates>` string ("lng,lat,alt lng,lat …") → [lat,lng][]. */
function parseCoords(text: string | null | undefined): [number, number][] {
  if (!text) return []
  const out: [number, number][] = []
  for (const tuple of text.trim().split(/\s+/)) {
    const [lng, lat] = tuple.split(',').map(Number)
    if (isFinite(lat) && isFinite(lng)) out.push([lat, lng])
  }
  return out
}

/** Parse a KML document string into line/polygon/point features + bounds. */
export function parseKml(text: string): KmlFeatures {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  if (doc.querySelector('parsererror')) throw new Error('That file isn’t valid KML/XML.')

  const paths: KmlFeatures['paths'] = []
  const points: KmlFeatures['points'] = []

  for (const ls of nsEls(doc, 'LineString')) {
    const coords = parseCoords(nsEls(ls, 'coordinates')[0]?.textContent)
    if (coords.length >= 2) paths.push({ coords, closed: false })
  }
  for (const poly of nsEls(doc, 'Polygon')) {
    const ring = nsEls(poly, 'LinearRing')[0]
    const coords = parseCoords(nsEls(ring, 'coordinates')[0]?.textContent)
    if (coords.length >= 3) paths.push({ coords, closed: true })
  }
  for (const pt of nsEls(doc, 'Point')) {
    const [c] = parseCoords(nsEls(pt, 'coordinates')[0]?.textContent)
    if (!c) continue
    // Nearest ancestor Placemark's <name>, if any.
    let node: Element | null = pt
    let name: string | undefined
    while (node && node.localName !== 'Placemark') node = node.parentElement
    if (node) name = nsEls(node, 'name')[0]?.textContent?.trim() || undefined
    points.push({ lat: c[0], lng: c[1], name })
  }

  if (!paths.length && !points.length) throw new Error('No map shapes found in that KML.')

  let n = -90, s = 90, e = -180, w = 180
  const bump = (lat: number, lng: number) => {
    n = Math.max(n, lat); s = Math.min(s, lat); e = Math.max(e, lng); w = Math.min(w, lng)
  }
  paths.forEach((p) => p.coords.forEach(([lat, lng]) => bump(lat, lng)))
  points.forEach((p) => bump(p.lat, p.lng))

  return { paths, points, bounds: { n, s, e, w } }
}

/** Down-sample a coordinate list so a single path never blows the URL budget. */
function sample(coords: [number, number][], max = 350): [number, number][] {
  if (coords.length <= max) return coords
  const step = Math.ceil(coords.length / max)
  const out = coords.filter((_, i) => i % step === 0)
  const last = coords[coords.length - 1]
  if (out[out.length - 1] !== last) out.push(last)
  return out
}

/** Encode [lat,lng][] as a Google polyline (compact for Static Maps `enc:`). */
export function encodePolyline(coords: [number, number][]): string {
  const enc = (v: number) => {
    let sgn = v < 0 ? ~(v << 1) : v << 1
    let out = ''
    while (sgn >= 0x20) {
      out += String.fromCharCode((0x20 | (sgn & 0x1f)) + 63)
      sgn >>= 5
    }
    return out + String.fromCharCode(sgn + 63)
  }
  let lastLat = 0, lastLng = 0, out = ''
  for (const [lat, lng] of coords) {
    const la = Math.round(lat * 1e5), ln = Math.round(lng * 1e5)
    out += enc(la - lastLat) + enc(ln - lastLng)
    lastLat = la; lastLng = ln
  }
  return out
}

/** Turn parsed KML into Static-Maps overlays (encoded paths + point markers).
 *  `maxPtsPerPath` down-samples dense paths to keep the request URL under the
 *  ~8k Static-Maps limit — the caller lowers it and retries if needed. */
export function kmlToStaticOverlays(
  f: KmlFeatures,
  maxPtsPerPath = 350,
): { paths: StaticPath[]; markers: { lat: number; lng: number }[] } {
  const paths = f.paths.map((p) => ({
    enc: encodePolyline(sample(p.coords, maxPtsPerPath)),
    color: p.closed ? '0xff3b30ff' : '0xffdd00ff', // polygons red, lines yellow
    weight: p.closed ? 3 : 4,
    fill: p.closed ? '0xff3b3022' : undefined,
  }))
  return { paths, markers: f.points.slice(0, 20).map(({ lat, lng }) => ({ lat, lng })) }
}

/** Web-Mercator world pixel (256-tile space, zoom 0) for a lat/lng. */
function project(lat: number, lng: number): { x: number; y: number } {
  const siny = Math.min(Math.max(Math.sin((lat * Math.PI) / 180), -0.9999), 0.9999)
  return {
    x: 256 * (0.5 + lng / 360),
    y: 256 * (0.5 - Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI)),
  }
}

export interface CaptureView { lat: number; lng: number; zoom: number; w: number; h: number }

/**
 * Project parsed KML into EDITABLE map annotations positioned as percentages of
 * the captured still — lines/polygons become `line` annotations, points become
 * `text` markers. `view` is the exact center/zoom/pixel-size that was captured.
 */
export function kmlToAnnotations(f: KmlFeatures, view: CaptureView): MapAnnotation[] {
  const scale = Math.pow(2, view.zoom)
  const c = project(view.lat, view.lng)
  const cwx = c.x * scale
  const cwy = c.y * scale
  const toPct = (lat: number, lng: number) => {
    const pr = project(lat, lng)
    const px = pr.x * scale - cwx + view.w / 2
    const py = pr.y * scale - cwy + view.h / 2
    return { x: +((px / view.w) * 100).toFixed(2), y: +((py / view.h) * 100).toFixed(2) }
  }
  const out: MapAnnotation[] = []
  for (const p of f.paths) {
    const points = sample(p.coords, 150).map(([lat, lng]) => toPct(lat, lng))
    if (p.closed && points.length) points.push({ ...points[0] }) // close the ring
    out.push({
      id: uid('an'),
      kind: 'line',
      x: 0, y: 0, w: 0, h: 0,
      color: p.closed ? '#2563eb' : '#f59e0b', // rings/polygons blue, lines amber
      weight: 3,
      points,
    })
  }
  // Points → small round marker dots (not big text boxes). Diameter is in % of
  // width; height uses the image aspect so the dot renders circular.
  const aspectWH = view.w / view.h
  const d = 1.6
  for (const pt of f.points) {
    const { x, y } = toPct(pt.lat, pt.lng)
    const dh = +(d * aspectWH).toFixed(2)
    out.push({
      id: uid('an'),
      kind: 'ellipse',
      x: +(x - d / 2).toFixed(2),
      y: +(y - dh / 2).toFixed(2),
      w: d,
      h: dh,
      color: '#e11d2a',
      fill: '#e11d2a',
    })
  }
  return out
}

/** Turn parsed KML into GeoJSON for the interactive map's Data layer preview. */
export function kmlToGeoJson(f: KmlFeatures): any {
  const features: any[] = []
  for (const p of f.paths) {
    const ring = p.coords.map(([lat, lng]) => [lng, lat])
    features.push(
      p.closed
        ? { type: 'Feature', geometry: { type: 'Polygon', coordinates: [ring] }, properties: {} }
        : { type: 'Feature', geometry: { type: 'LineString', coordinates: ring }, properties: {} },
    )
  }
  for (const pt of f.points)
    features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [pt.lng, pt.lat] }, properties: { name: pt.name } })
  return { type: 'FeatureCollection', features }
}

/** Pixel size of the captured still (before the ×2 retina scale).
 *  Portrait ~0.9 to match the field-map page's image area, so the capture fills
 *  the page with no letterboxing. (Static Maps caps each side at 640.) */
const STATIC_W = 580
const STATIC_H = 640
/** Aspect ratio (w/h) of captured Google stills. */
export const STATIC_ASPECT = STATIC_W / STATIC_H

/** Ground meters per (scale-1) pixel at a latitude + zoom. */
export function metersPerPixel(lat: number, zoom: number): number {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom)
}

/** Printed width the map occupies on the page (full Letter width, no padding). */
const PRINT_MAP_WIDTH_IN = 8.5

const niceRound = (n: number): number => {
  if (n >= 2000) return Math.round(n / 100) * 100
  if (n >= 500) return Math.round(n / 50) * 50
  if (n >= 100) return Math.round(n / 10) * 10
  return Math.max(5, Math.round(n / 5) * 5)
}

/** A "1 inch : N feet" scale label for a captured view, given the still's pixel
 *  width and the (integer) zoom it was rendered at. */
export function mapScaleLabel(lat: number, zoom: number, widthPx = STATIC_W): string {
  const groundFt = widthPx * metersPerPixel(lat, Math.round(zoom)) * 3.280839895
  return `1 inch : ${niceRound(groundFt / PRINT_MAP_WIDTH_IN).toLocaleString()} feet`
}

/** Build a Maps Static API URL for the given view. Hides POI / transit / labels
 *  so the capture is clean imagery with no place markers. */
export function buildStaticMapUrl(v: StaticMapView): string {
  const params = new URLSearchParams({
    center: `${v.lat},${v.lng}`,
    zoom: String(Math.round(v.zoom)),
    size: `${Math.min(640, Math.round(v.w || STATIC_W))}x${Math.min(640, Math.round(v.h || STATIC_H))}`,
    scale: '2',
    maptype: v.mapType === 'roadmap' ? 'roadmap' : v.mapType,
    format: 'png',
    key: MAPS_KEY,
  })
  params.append('style', 'feature:poi|visibility:off')
  params.append('style', 'feature:transit|visibility:off')
  params.append('style', 'element:labels|visibility:off')
  // KML overlays: encoded-polyline paths + point markers, baked into the still.
  for (const p of v.paths || []) {
    const parts = [`color:${p.color}`, `weight:${p.weight}`]
    if (p.fill) parts.push(`fillcolor:${p.fill}`)
    parts.push(`enc:${p.enc}`)
    params.append('path', parts.join('|'))
  }
  // NB: marker color is 24-bit only (no alpha) — a 32-bit value 400s the request.
  for (const m of v.markers || []) params.append('markers', `size:tiny|color:0xff3b30|${m.lat},${m.lng}`)
  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`
}

/** Resolve an image's intrinsic aspect ratio (width / height). */
export function imageAspectOf(src: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img.naturalHeight ? img.naturalWidth / img.naturalHeight : STATIC_ASPECT)
    img.onerror = () => resolve(STATIC_ASPECT)
    img.src = src
  })
}

/** Fetch an image URL and return it as a data URL (for taint-free export). */
export async function imageUrlToDataUrl(url: string): Promise<string> {
  // Preferred: fetch → blob → FileReader (works when the response is CORS-open).
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await res.blob()
    return await new Promise<string>((resolve, reject) => {
      const fr = new FileReader()
      fr.onload = () => resolve(fr.result as string)
      fr.onerror = () => reject(fr.error)
      fr.readAsDataURL(blob)
    })
  } catch {
    // Fallback: load cross-origin into a canvas.
    return await new Promise<string>((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        try {
          const c = document.createElement('canvas')
          c.width = img.naturalWidth
          c.height = img.naturalHeight
          c.getContext('2d')!.drawImage(img, 0, 0)
          resolve(c.toDataURL('image/png'))
        } catch (e) {
          reject(e)
        }
      }
      img.onerror = () => reject(new Error('Could not load map image'))
      img.src = url
    })
  }
}
