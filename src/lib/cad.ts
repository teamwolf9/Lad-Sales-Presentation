/**
 * CAD file import for the Cad step.
 *
 * DXF (open text format) is rendered to a vector SVG in the browser via the
 * `dxf` package (lazy-loaded so it never weighs down the main bundle) and both
 * the original file and the SVG are stored. DWG is AutoCAD's proprietary
 * binary format — browsers can't decode it without a paid conversion service —
 * so the original is stored and the page shows a labeled attachment instead
 * of a preview.
 */
import type { CadDrawing } from '../types'
import { uid } from './util'
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

/** Import one .dxf/.dwg file: store it (and its SVG render, when possible)
 *  and return the drawing record for the proposal. */
export async function importCadFile(file: File, ownerUid?: string | null): Promise<CadDrawing> {
  const kind = cadKind(file.name)
  if (!kind) throw new Error(`"${file.name}" is not a .dxf or .dwg file.`)

  let svgUrl = ''
  if (kind === 'dxf') {
    const text = await file.text()
    try {
      const svg = await dxfToSvg(text)
      svgUrl = await uploadSvgText(svg, ownerUid, 'cad')
    } catch (err) {
      console.error('[cad] DXF render failed', err)
      throw new Error(
        `Could not read "${file.name}" as a DXF drawing. Re-export it as ASCII DXF (R12/R2000+) and try again.`,
      )
    }
  }

  const fileUrl = await uploadRawFile(file, ownerUid, 'cad')
  return {
    id: uid('cad'),
    name: file.name,
    kind,
    fileUrl,
    svgUrl,
    caption: '',
  }
}
