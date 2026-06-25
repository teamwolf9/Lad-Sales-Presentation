import type { LineItem } from '../types'

/**
 * Reference data — NOT a catalog. These are categories and a few example
 * "quick-add" templates. Picking a template copies an editable line item into
 * the proposal; the rep then adjusts every field. Edit this file freely to
 * change the categories or starter products your team sees.
 */

export interface Category {
  id: string
  label: string
  /** One-line description used on the Services page of the proposal. */
  blurb: string
  /** Lucide-style inline icon key (see ui/Icon.tsx). */
  icon: string
}

/** Service categories — Lad's real turn-key capabilities, in the brand voice. */
export const SERVICE_CATEGORIES: Category[] = [
  {
    id: 'design',
    label: 'In-house design',
    blurb: 'Certified engineers turn your land and crop into a custom plan with detailed drawings.',
    icon: 'drafting',
  },
  {
    id: 'pivots',
    label: 'Valley pivots',
    blurb: 'Custom-engineered center pivots and corner machines for any field shape.',
    icon: 'pivot',
  },
  {
    id: 'pump',
    label: 'Pump stations',
    blurb: 'Designed, fabricated, and installed in-house — the heart of your system.',
    icon: 'pump',
  },
  {
    id: 'install',
    label: 'Turn-key installation',
    blurb: 'One crew from trenching to first rotation, with the project managed end to end.',
    icon: 'wrench',
  },
  {
    id: 'telemetry',
    label: 'Technology',
    blurb: 'Valley 365, AgSense, and soil monitoring for full control from anywhere.',
    icon: 'signal',
  },
  {
    id: 'service',
    label: 'Service',
    blurb: 'Certified technicians who build and repair all pivot brands — fast when it counts.',
    icon: 'gear',
  },
]

/** Product categories used to group line items and seed quick-add templates. */
export const PRODUCT_CATEGORIES: Category[] = [
  { id: 'pivot', label: 'Center Pivots', blurb: 'Mechanized pivot and lateral-move irrigation machines.', icon: 'pivot' },
  { id: 'pumpsta', label: 'Pump Stations', blurb: 'Skid- and station-mounted pumping plants.', icon: 'pump' },
  { id: 'mainline', label: 'Mainline & Pipe', blurb: 'Buried and surface delivery pipe and fittings.', icon: 'pipe' },
  { id: 'filtration', label: 'Filtration', blurb: 'Screen, sand-media, and disc filtration.', icon: 'filter' },
  { id: 'controls', label: 'Controls & Telemetry', blurb: 'Panels, VFDs, and remote management hardware.', icon: 'signal' },
  { id: 'sprinkler', label: 'Sprinkler Packages', blurb: 'Engineered sprinkler and nozzle packages.', icon: 'drop' },
  { id: 'accessory', label: 'Accessories', blurb: 'Valves, sensors, and field hardware.', icon: 'gear' },
]

export function categoryLabel(id: string): string {
  return (
    [...SERVICE_CATEGORIES, ...PRODUCT_CATEGORIES].find((c) => c.id === id)?.label ?? id
  )
}

/** Example quick-add templates. Copied into editable line items — not fixed. */
export type Template = Omit<LineItem, 'id'>

export const QUICK_ADD_TEMPLATES: Template[] = [
  {
    kind: 'product',
    category: 'pivot',
    name: 'Center Pivot — 7-Tower System',
    summary: 'Galvanized 7-tower pivot engineered for a quarter-section circle.',
    description:
      'A complete mechanized center pivot sized for roughly 130 irrigated acres, with corrosion-resistant galvanized spans, GPS positioning, and an engineered sprinkler package matched to your soil intake rate.',
    specs: [
      { id: 's1', label: 'Towers', value: '7' },
      { id: 's2', label: 'System length', value: '1,320 ft' },
      { id: 's3', label: 'Irrigated area', value: '~130 ac' },
      { id: 's4', label: 'Pipe diameter', value: '6 5/8 in' },
    ],
    imageUrl: '',
    quantity: 1,
    unit: 'system',
    unitPrice: 92500,
    discountPct: 0,
    highlights: [
      'GPS guidance & end-gun control',
      'Engineered low-pressure sprinkler package',
      'Galvanized spans for long service life',
    ],
  },
  {
    kind: 'product',
    category: 'pumpsta',
    name: 'Vertical Turbine Pump Station',
    summary: 'Skid-mounted vertical turbine plant with VFD control.',
    description:
      'Factory-assembled pump station delivering steady pressure across varying demand, complete with variable-frequency drive, protective controls, and a weather-rated enclosure.',
    specs: [
      { id: 's1', label: 'Flow', value: '1,200 GPM' },
      { id: 's2', label: 'Total head', value: '180 ft' },
      { id: 's3', label: 'Motor', value: '75 HP' },
      { id: 's4', label: 'Control', value: 'VFD' },
    ],
    imageUrl: '',
    quantity: 1,
    unit: 'ea',
    unitPrice: 48750,
    discountPct: 0,
    highlights: ['Variable-frequency drive for energy savings', 'Pre-wired & factory-tested', 'NEMA-rated enclosure'],
  },
  {
    kind: 'product',
    category: 'mainline',
    name: 'PVC Mainline — 10"',
    summary: 'Gasketed PVC delivery mainline, buried.',
    description: 'Class 160 gasketed PVC mainline supplied and installed below frost depth, including fittings, thrust blocks, and tracer wire.',
    specs: [
      { id: 's1', label: 'Diameter', value: '10 in' },
      { id: 's2', label: 'Pressure class', value: '160 psi' },
      { id: 's3', label: 'Bury depth', value: '36 in' },
    ],
    imageUrl: '',
    quantity: 2400,
    unit: 'ft',
    unitPrice: 14.5,
    discountPct: 0,
    highlights: ['Gasketed joints', 'Includes fittings & thrust blocks', 'Tracer wire for future locating'],
  },
  {
    kind: 'product',
    category: 'controls',
    name: 'Remote Telemetry & Control Package',
    summary: 'Cellular pivot monitoring and control.',
    description: 'Per-pivot telemetry unit with cellular connectivity, giving start/stop, position, pressure, and fault alerts from any device, plus a first-year data subscription.',
    specs: [
      { id: 's1', label: 'Connectivity', value: 'Cellular LTE' },
      { id: 's2', label: 'Subscription', value: '1 yr incl.' },
    ],
    imageUrl: '',
    quantity: 1,
    unit: 'ea',
    unitPrice: 3200,
    discountPct: 0,
    highlights: ['Phone & web control', 'Pressure & position alerts', 'First year of service included'],
  },
  {
    kind: 'service',
    category: 'install',
    name: 'Turn-Key Installation',
    summary: 'Complete field installation and commissioning.',
    description: 'Labor, equipment, and project management to install the system end to end — trenching, assembly, electrical tie-in, and start-up commissioning with the grower on site.',
    specs: [{ id: 's1', label: 'Scope', value: 'Full system' }],
    imageUrl: '',
    quantity: 1,
    unit: 'lot',
    unitPrice: 21500,
    discountPct: 0,
    highlights: ['Dedicated project manager', 'Trenching through start-up', 'On-site commissioning & training'],
  },
  {
    kind: 'service',
    category: 'design',
    name: 'System Design & Engineering',
    summary: 'Hydraulic design and field layout.',
    description: 'Full hydraulic design package: water-source analysis, pipe sizing, pivot layout, sprinkler package selection, and stamped drawings as required.',
    specs: [{ id: 's1', label: 'Deliverable', value: 'Design package' }],
    imageUrl: '',
    quantity: 1,
    unit: 'lot',
    unitPrice: 4800,
    discountPct: 0,
    highlights: ['Water-source & soil analysis', 'CAD layout & pipe sizing', 'Engineered sprinkler chart'],
  },
]

/** Default About Us story — Lad voice, fully editable in the builder. */
export const DEFAULT_ABOUT_HEADING = 'Built in the Basin. Owned by our people.'
export const DEFAULT_ABOUT_BODY: string[] = [
  'Lad Irrigation has been delivering superior water solutions since 1957, when we started as a family business in Moses Lake. Today we are employee-owned, with eight stores across eastern Washington — close to your field when you need us.',
  'We handle every part of your system under one roof: in-house design and engineering, Valley center pivots and corner machines, custom pump stations, technology and monitoring, and a service team that builds and repairs all pivot brands. One team, accountable from the first drawing to the last rotation.',
]

/** Default terms shown on a new proposal — fully editable in the builder. */
export const DEFAULT_TERMS: string[] = [
  'Pricing is valid for 30 days from the proposal date and is subject to material availability at the time of order.',
  'A 30% deposit is required to schedule; balance is due on substantial completion and start-up.',
  'Proposal assumes a single, accessible work site with utilities available at the point of connection. Rock excavation, dewatering, and permitting fees are not included unless itemized above.',
  'All equipment carries the manufacturer warranty; Lad Irrigation warrants installation workmanship for 12 months from start-up.',
]
