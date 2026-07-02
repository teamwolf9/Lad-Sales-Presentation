/**
 * Image upload helper.
 *
 * When Firebase Storage is configured and the user is signed in, uploads the
 * (downscaled) image and returns its download URL. Otherwise falls back to an
 * inline data URL — so uploads keep working in standalone mode.
 */
import { ref, uploadString, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage, firebaseEnabled } from './firebase'
import { readImageFile } from './image'

export async function uploadImageFile(file: File, uid?: string | null, folder = 'images'): Promise<string> {
  const dataUrl = await readImageFile(file)
  if (!firebaseEnabled || !storage || !uid) return dataUrl
  const safeName = file.name.replace(/[^\w.-]+/g, '_')
  const path = `users/${uid}/${folder}/${Date.now()}-${safeName}`
  const r = ref(storage, path)
  await uploadString(r, dataUrl, 'data_url')
  return getDownloadURL(r)
}

/** Upload a data-URL image (e.g. a Google Maps capture) and return its URL.
 *  Falls back to the data URL itself in standalone mode. */
export async function uploadDataUrl(dataUrl: string, uid?: string | null, folder = 'maps'): Promise<string> {
  if (!firebaseEnabled || !storage || !uid) return dataUrl
  const path = `users/${uid}/${folder}/${Date.now()}.png`
  const r = ref(storage, path)
  await uploadString(r, dataUrl, 'data_url')
  return getDownloadURL(r)
}

/** Read a File as a data URL (standalone-mode fallback for raw uploads). */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
}

/** Upload a raw file (e.g. a .dxf/.dwg CAD file) unchanged and return its URL.
 *  Falls back to a data URL in standalone mode. */
export async function uploadRawFile(file: File, uid?: string | null, folder = 'files'): Promise<string> {
  if (!firebaseEnabled || !storage || !uid) return fileToDataUrl(file)
  const safeName = file.name.replace(/[^\w.-]+/g, '_')
  const path = `users/${uid}/${folder}/${Date.now()}-${safeName}`
  const r = ref(storage, path)
  await uploadBytes(r, file, { contentType: file.type || 'application/octet-stream' })
  return getDownloadURL(r)
}

/** Upload an SVG document (as text) and return its URL.
 *  Falls back to a data URL in standalone mode. */
export async function uploadSvgText(svg: string, uid?: string | null, folder = 'cad'): Promise<string> {
  if (!firebaseEnabled || !storage || !uid) {
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
  }
  const path = `users/${uid}/${folder}/${Date.now()}.svg`
  const r = ref(storage, path)
  await uploadBytes(r, new Blob([svg], { type: 'image/svg+xml' }), { contentType: 'image/svg+xml' })
  return getDownloadURL(r)
}

/** Upload a generated PDF blob and return its download URL. */
export async function uploadPdf(blob: Blob, uid: string, filename: string): Promise<string> {
  if (!firebaseEnabled || !storage) throw new Error('Storage is not configured')
  const safe = filename.replace(/[^\w.-]+/g, '_')
  const path = `users/${uid}/exports/${Date.now()}-${safe}`
  const r = ref(storage, path)
  await uploadBytes(r, blob, { contentType: 'application/pdf' })
  return getDownloadURL(r)
}
