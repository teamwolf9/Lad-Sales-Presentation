/**
 * Read an image File (JPG/PNG) into a downscaled data URL.
 *
 * Drafts are persisted to localStorage, so we cap dimensions and re-encode to
 * keep a map photo from blowing the storage quota. Returns a data: URL string.
 */
export async function readImageFile(file: File, maxDim = 1800, quality = 0.85): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(String(fr.result))
    fr.onerror = () => reject(fr.error)
    fr.readAsDataURL(file)
  })

  // Load into an <img> so we can downscale via canvas.
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = () => reject(new Error('Could not read image'))
    i.src = dataUrl
  })

  const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
  if (scale >= 1 && dataUrl.length < 1_500_000) return dataUrl // already small enough

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) return dataUrl
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  // Keep PNG (transparency) as PNG; otherwise JPEG for size.
  const isPng = file.type === 'image/png'
  return canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', quality)
}
