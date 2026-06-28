/**
 * Lad Irrigation brand data — assets, contact, and voice.
 *
 * Visual tokens (color, type, spacing, elevation) live in
 * `src/styles/tokens.css`, faithfully consolidated from the delivered
 * Lad Design System. This module carries the things components reference in
 * JSX: logo/photo paths, contact details, and brand copy.
 *
 * Assets are served from /public/brand (see vite base './').
 */
export interface Brand {
  name: string
  tagline: string
  since: number
  employeeOwned: boolean
  contact: {
    phone: string
    website: string
    region: string
    storesNote: string
  }
  logos: {
    /** CANONICAL Lad mark — the green box with the brush-script "Lad".
     *  Use this anywhere a logo appears unless there's a specific reason not to. */
    primary: string
    /** Reversed (white) wordmark — for dark surfaces. */
    white: string
    /** Horizontal lockup — for light surfaces. */
    horizontal: string
    /** Green badge mark (same asset as `primary`). */
    badgeGreen: string
    /** Employee-owned badge. */
    employeeOwned: string
  }
  photos: {
    coverHero: string
    pivotSunset: string
    orchard: string
    pumpStation: string
    pumpInstall: string
    riverPump: string
  }
}

export const LAD_BRAND: Brand = {
  name: 'Lad Irrigation',
  tagline: 'We Keep Water Flowing',
  since: 1957,
  employeeOwned: true,
  contact: {
    phone: '(509) 547-1623',
    website: 'ladirrigation.com',
    region: 'Columbia Basin · Eastern Washington',
    storesNote: '9 locations · WA & CO',
  },
  logos: {
    primary: 'brand/logos/lad-badge-green.png',
    white: 'brand/logos/lad-logo-white.png',
    horizontal: 'brand/logos/lad-logo-horizontal.png',
    badgeGreen: 'brand/logos/lad-badge-green.png',
    employeeOwned: 'brand/logos/employee-owned.png',
  },
  photos: {
    coverHero: 'brand/photos/cover-hero.jpg',
    pivotSunset: 'brand/photos/photo-pivot-sunset.jpg',
    orchard: 'brand/photos/photo-orchard.jpg',
    pumpStation: 'brand/photos/photo-pump-station.jpg',
    pumpInstall: 'brand/photos/photo-pump-install.jpg',
    riverPump: 'brand/photos/photo-river-pump.jpg',
  },
}
