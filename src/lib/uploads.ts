/**
 * Image upload helper.
 *
 * When Firebase Storage is configured and the user is signed in, uploads the
 * (downscaled) image and returns its download URL. Otherwise falls back to an
 * inline data URL — so uploads keep working in standalone mode.
 */
import { ref, uploadString, getDownloadURL } from 'firebase/storage'
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
