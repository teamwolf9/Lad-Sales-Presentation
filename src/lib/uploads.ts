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

/** Upload a generated PDF blob and return its download URL. */
export async function uploadPdf(blob: Blob, uid: string, filename: string): Promise<string> {
  if (!firebaseEnabled || !storage) throw new Error('Storage is not configured')
  const safe = filename.replace(/[^\w.-]+/g, '_')
  const path = `users/${uid}/exports/${Date.now()}-${safe}`
  const r = ref(storage, path)
  await uploadBytes(r, blob, { contentType: 'application/pdf' })
  return getDownloadURL(r)
}
