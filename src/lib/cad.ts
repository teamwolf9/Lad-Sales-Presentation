/**
 * CAD file import for the Cad step.
 *
 * DXF (open text format) renders to vector SVG right in the browser via the
 * `dxf` package (lazy-loaded so it never weighs down the main bundle).
 *
 * DWG (AutoCAD's proprietary binary) can't be decoded by browsers, so cloud
 * mode sends it through the `convertDwg` Cloud Function — GNU LibreDWG in
 * WebAssembly — which writes a DXF back to Storage; the browser then renders
 * that DXF the same way. If conversion fails (or in standalone mode) the DWG
 * stays attached and the page shows a labeled attachment card instead.
 */
import { httpsCallable } from 'firebase/functions'
import { ref, getDownloadURL } from 'firebase/storage'
import type { CadDrawing } from '../types'
import { uid } from './util'
import { functions, storage } from './firebase'
import { uploadRawFile, uploadSvgText } from './uploads'

export function cadKind(name: string): 'dxf' | 'dwg' | null {
  const ext = name.toLowerCase().split('.').pop()
  return ext === 'dxf' || ext === 'dwg' ? ext : null
}

/** Render DXF text to an SVG document string. Throws on unparseable files. */
async function dxfToSvg(text: string): Promise<string> {
  const { Helper } = await import('dxf')
  const svg = new Helper(text).toSVG()
  if (!svg || !svg.includes('<svg')) throw new Error('empty render')
  return svg
}

/** Recover the Storage object path from a Firebase download URL ('' if not one). */
function storagePathFromUrl(url: string): string {
  try {
    const encoded = new URL(url).pathname.split('/o/')[1]
    return encoded ? decodeURIComponent(encoded) : ''
  } catch {
    return ''
  }
}

/** Convert a stored DWG to SVG via the convertDwg Cloud Function + local DXF
 *  render. Returns the uploaded SVG's URL. Throws when conversion fails. */
async function dwgToSvgUrl(dwgPath: string, ownerUid?: string | null): Promise<string> {
  if (!functions || !storage) throw new Error('DWG preview needs cloud mode.')
  const call = httpsCallable<{ path: string }, { dxfPath: string }>(functions, 'convertDwg')
  const { dxfPath } = (await call({ path: dwgPath })).data
  const dxfUrl = await getDownloadURL(ref(storage, dxfPath))
  const dxfText = await (await fetch(dxfUrl)).text()
  const svg = await dxfToSvg(dxfText)
  return uploadSvgText(svg, ownerUid, 'cad')
}

/** Import one .dxf/.dwg file: store it, render its SVG preview when possible,
 *  and return the drawing record for the proposal. */
export async function importCadFile(file: File, ownerUid?: string | null): Promise<CadDrawing> {
  const kind = cadKind(file.name)
  if (!kind) throw new Error(`"${file.name}" is not a .dxf or .dwg file.`)

  const { url: fileUrl, path } = await uploadRawFile(file, ownerUid, 'cad')
  let svgUrl = ''

  if (kind === 'dxf') {
    try {
      const svg = await dxfToSvg(await file.text())
      svgUrl = await uploadSvgText(svg, ownerUid, 'cad')
    } catch (err) {
      console.error('[cad] DXF render failed', err)
      throw new Error(
        `Could not read "${file.name}" as a DXF drawing. Re-export it as ASCII DXF (R12/R2000+) and try again.`,
      )
    }
  } else if (path) {
    // DWG in cloud mode: convert server-side. Non-fatal — the file stays
    // attached either way; the page falls back to the attachment card.
    try {
      svgUrl = await dwgToSvgUrl(path, ownerUid)
    } catch (err) {
      console.error('[cad] DWG convert failed', err)
    }
  }

  return { id: uid('cad'), name: file.name, kind, fileUrl, svgUrl, caption: '' }
}

/** Render a preview for an already-imported DWG that doesn't have one
 *  (e.g. uploaded before conversion existed). Throws with a readable message. */
export async function renderDwg(drawing: CadDrawing, ownerUid?: string | null): Promise<CadDrawing> {
  const path = storagePathFromUrl(drawing.fileUrl)
  if (!path) throw new Error('This DWG was stored without a cloud path — remove it and add the file again.')
  const svgUrl = await dwgToSvgUrl(path, ownerUid)
  return { ...drawing, svgUrl }
}
