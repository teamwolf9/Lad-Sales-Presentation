/**
 * Interactive Google Maps picker. The rep searches an address / pans + zooms to
 * the field, then "Use this view" captures a Maps Static image of that exact
 * center / zoom / type as a data URL for the Map page.
 */
import { useEffect, useRef, useState } from 'react'
import {
  loadGoogleMaps,
  buildStaticMapUrl,
  imageUrlToDataUrl,
  mapScaleLabel,
  parseKml,
  kmlToStaticOverlays,
  kmlToGeoJson,
  type KmlFeatures,
} from '../lib/maps'

export function GoogleMapPicker({
  initialQuery,
  onCapture,
  onCancel,
}: {
  initialQuery?: string
  onCapture: (dataUrl: string, aspect: number, scale: string) => void
  onCancel: () => void
}) {
  const mapDivRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const kmlInputRef = useRef<HTMLInputElement>(null)
  const mapRef = useRef<any>(null)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [kml, setKml] = useState<KmlFeatures | null>(null)

  useEffect(() => {
    let cancelled = false
    // Google calls this global on any auth problem (bad key, blocked referrer,
    // or an API that isn't enabled) — otherwise it just renders a blank map.
    ;(window as any).gm_authFailure = () => {
      if (!cancelled)
        setErr(
          'Google rejected the request. In Google Cloud Console, confirm the Maps JavaScript API and Places API are enabled, and that this site (or http://localhost:*) is allowed under the key’s HTTP-referrer restrictions.',
        )
    }
    // Safety net: if the map never initializes and no error fired, say so.
    const slow = window.setTimeout(() => {
      if (!cancelled) setErr((e) => e || 'The map is taking too long to load. Check your network and the API key restrictions, then try again.')
    }, 9000)
    loadGoogleMaps()
      .then((google) => {
        window.clearTimeout(slow)
        if (cancelled || !mapDivRef.current) return
        const map = new google.maps.Map(mapDivRef.current, {
          center: { lat: 46.6, lng: -119.3 }, // Central WA — Lad's home territory
          zoom: 13,
          mapTypeId: 'satellite',
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: 'greedy',
          clickableIcons: false,
          // Clean imagery — no place/POI markers or labels.
          styles: [
            { featureType: 'poi', stylers: [{ visibility: 'off' }] },
            { featureType: 'transit', stylers: [{ visibility: 'off' }] },
            { elementType: 'labels', stylers: [{ visibility: 'off' }] },
          ],
        })
        mapRef.current = map

        if (inputRef.current && google.maps.places) {
          const ac = new google.maps.places.Autocomplete(inputRef.current, { fields: ['geometry'] })
          ac.bindTo('bounds', map)
          ac.addListener('place_changed', () => {
            const place = ac.getPlace()
            if (!place.geometry) return
            if (place.geometry.viewport) map.fitBounds(place.geometry.viewport)
            else {
              map.setCenter(place.geometry.location)
              map.setZoom(17)
            }
          })
        }

        if (initialQuery) {
          new google.maps.Geocoder().geocode({ address: initialQuery }, (res: any, status: string) => {
            if (status === 'OK' && res?.[0]?.geometry) {
              const g = res[0].geometry
              if (g.viewport) map.fitBounds(g.viewport)
              else map.setCenter(g.location)
            }
          })
        }
        setReady(true)
      })
      .catch((e) => {
        window.clearTimeout(slow)
        setErr(e?.message || 'Failed to load Google Maps')
      })
    return () => {
      cancelled = true
      window.clearTimeout(slow)
    }
  }, [initialQuery])

  // Draw an imported KML on the interactive map and frame it.
  const drawKml = (features: KmlFeatures) => {
    const map = mapRef.current
    const google = (window as any).google
    if (!map || !google) return
    map.data.forEach((f: any) => map.data.remove(f))
    map.data.addGeoJson(kmlToGeoJson(features))
    map.data.setStyle({
      strokeColor: '#ffdd00',
      strokeWeight: 3,
      fillColor: '#ff3b30',
      fillOpacity: 0.12,
      clickable: false,
    })
    if (features.bounds) {
      const b = features.bounds
      map.fitBounds(new google.maps.LatLngBounds({ lat: b.s, lng: b.w }, { lat: b.n, lng: b.e }))
    }
  }

  const onPickKml = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setErr('')
    try {
      if (/\.kmz$/i.test(file.name)) throw new Error('KMZ isn’t supported — unzip it and import the .kml inside.')
      const features = parseKml(await file.text())
      setKml(features)
      drawKml(features)
    } catch (err) {
      setErr(err instanceof Error ? err.message : 'Could not read that KML file.')
    }
  }

  const clearKml = () => {
    const map = mapRef.current
    if (map) map.data.forEach((f: any) => map.data.remove(f))
    setKml(null)
  }

  const capture = async () => {
    const map = mapRef.current
    if (!map) return
    setBusy(true)
    setErr('')
    try {
      const c = map.getCenter()
      const lat = c.lat()
      const zf = map.getZoom() || 15
      // Capture the SAME ground area the user framed: render the still at the
      // viewport's pixel size, scaled by 2^(fracZoom) so an integer static zoom
      // still covers exactly what's on screen (no wider/older shot).
      const el = mapDivRef.current
      const cw = el?.clientWidth || 580
      const ch = el?.clientHeight || 640
      const zi = Math.round(zf)
      const factor = Math.pow(2, zf - zi)
      let w = cw * factor
      let h = ch * factor
      const cap = Math.min(1, 640 / w, 640 / h)
      w = Math.round(w * cap)
      h = Math.round(h * cap)
      const base = { lat, lng: c.lng(), zoom: zi, mapType: map.getMapTypeId() || 'satellite', w, h }
      // Bake KML overlays in; if the URL is too long for the Static Maps API,
      // progressively down-sample the paths until it fits.
      const buildUrl = (maxPts: number) => {
        const o = kml ? kmlToStaticOverlays(kml, maxPts) : { paths: [], markers: [] }
        return buildStaticMapUrl({ ...base, paths: o.paths, markers: o.markers })
      }
      let url = buildUrl(350)
      for (let mp = 350; url.length > 7800 && mp > 25; mp = Math.floor(mp / 2)) url = buildUrl(mp)
      const dataUrl = await imageUrlToDataUrl(url)
      onCapture(dataUrl, w / h, mapScaleLabel(lat, zi, w))
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not capture the map view.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="gmap">
      {err && <div className="share__err">{err}</div>}
      <input ref={inputRef} className="gmap__search" placeholder="Search an address, farm or place…" />
      <div className="gmap__canvas">
        {/* Google Maps owns this node's children — React must never render into it,
            or reconciliation throws "removeChild ... not a child of this node". */}
        <div className="gmap__map" ref={mapDivRef} />
        {!ready && !err && <div className="gmap__loading">Loading map…</div>}
      </div>
      <input
        ref={kmlInputRef}
        type="file"
        accept=".kml,application/vnd.google-earth.kml+xml,text/xml"
        onChange={onPickKml}
        style={{ display: 'none' }}
      />
      <div className="gmap__actions">
        <button className="btn btn--ghost btn--sm" type="button" onClick={onCancel}>
          Cancel
        </button>
        {kml ? (
          <span className="gmap__kml">
            KML: {kml.paths.length} shape{kml.paths.length === 1 ? '' : 's'}
            {kml.points.length ? ` · ${kml.points.length} pt` : ''}
            <button type="button" className="gmap__kmlx" onClick={clearKml} title="Remove KML">
              ✕
            </button>
          </span>
        ) : (
          <button className="btn btn--ghost btn--sm" type="button" onClick={() => kmlInputRef.current?.click()} disabled={!ready}>
            Import KML
          </button>
        )}
        <button className="btn btn--primary btn--sm" type="button" onClick={capture} disabled={!ready || busy}>
          {busy ? 'Capturing…' : 'Use this view'}
        </button>
      </div>
    </div>
  )
}
