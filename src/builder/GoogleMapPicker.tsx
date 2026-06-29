/**
 * Interactive Google Maps picker. The rep searches an address / pans + zooms to
 * the field, then "Use this view" captures a Maps Static image of that exact
 * center / zoom / type as a data URL for the Map page.
 */
import { useEffect, useRef, useState } from 'react'
import { loadGoogleMaps, buildStaticMapUrl, imageUrlToDataUrl, STATIC_ASPECT, mapScaleLabel } from '../lib/maps'

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
  const mapRef = useRef<any>(null)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

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

  const capture = async () => {
    const map = mapRef.current
    if (!map) return
    setBusy(true)
    setErr('')
    try {
      const c = map.getCenter()
      const lat = c.lat()
      const zoom = map.getZoom() || 15
      const url = buildStaticMapUrl({ lat, lng: c.lng(), zoom, mapType: map.getMapTypeId() || 'hybrid' })
      const dataUrl = await imageUrlToDataUrl(url)
      onCapture(dataUrl, STATIC_ASPECT, mapScaleLabel(lat, zoom))
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
      <div className="gmap__actions">
        <button className="btn btn--ghost btn--sm" type="button" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn btn--primary btn--sm" type="button" onClick={capture} disabled={!ready || busy}>
          {busy ? 'Capturing…' : 'Use this view'}
        </button>
      </div>
    </div>
  )
}
