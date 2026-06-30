/**
 * Google Maps Platform integration for the Map page.
 *
 * The interactive picker uses the Maps JavaScript API (+ Places for search).
 * "Use this view" then requests a Maps Static API image of the same
 * center/zoom/type and converts it to a data URL, so the captured map embeds
 * cleanly into the PDF / PowerPoint exports (no cross-origin taint).
 */
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

export interface StaticMapView {
  lat: number
  lng: number
  zoom: number
  /** 'roadmap' | 'satellite' | 'hybrid' | 'terrain' */
  mapType: string
  /** Optional pixel size (logical, before ×2 retina). Defaults to STATIC_W/H. */
  w?: number
  h?: number
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
