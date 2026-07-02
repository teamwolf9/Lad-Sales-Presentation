/** Minimal typings for the `dxf` package (no bundled types). */
declare module 'dxf' {
  export class Helper {
    constructor(contents: string)
    /** Render the drawing to a standalone SVG document string. */
    toSVG(): string
    parsed: unknown
    denormalised: unknown[]
  }
}
