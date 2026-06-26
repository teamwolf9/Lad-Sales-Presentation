/**
 * Proposal data model.
 *
 * The salesperson enters everything per-proposal. There is no fixed catalog —
 * reference data (categories + example templates in data/reference.ts) only
 * provides quick-add starting points that copy into editable line items.
 */

/** A single spec row shown on a product/service card (e.g. "Flow rate" → "1,200 GPM"). */
export interface Spec {
  id: string
  label: string
  value: string
}

/** One line item on the proposal — a product or a service the rep adds & edits. */
export interface LineItem {
  id: string
  kind: 'product' | 'service'
  /** Category id from reference data, or a free-typed category. */
  category: string
  name: string
  /** Short marketing sentence shown under the name. */
  summary: string
  /** Longer descriptive paragraph (optional). */
  description: string
  specs: Spec[]
  /** Optional image (data URL or web URL) for showcase pages. */
  imageUrl: string
  quantity: number
  unit: string // "ea", "ft", "acre", "system", "lot", "hrs"
  unitPrice: number
  /** Per-line discount as a percentage (0–100). */
  discountPct: number
  /** Feature bullet points shown on the showcase card. */
  highlights: string[]
}

/** One row in a project's quote table (No. / Description / Qty / Unit / Total). */
export interface ProjectLine {
  id: string
  /** "No." column — SKU / part code / category tag (optional). */
  code: string
  description: string
  qty: number
  unit: string
  unitPrice: number
  /** A $0 note/spec sub-line (shown indented, no price emphasis). */
  isNote: boolean
}

/**
 * A Project = one grouped scope of work (Lad's "Project Quote / Project No"),
 * e.g. "Snakeview River Lift Station" PR01966. It bundles line items into a
 * single final cost. A proposal can have many projects across farms/sites.
 */
export interface Project {
  id: string
  /** Project / quote number, e.g. "PR01966". */
  number: string
  /** Title, e.g. "Snakeview River Lift Station". */
  title: string
  /** Farm / site / location, e.g. "Snake View Farm · Burbank, WA". */
  location: string
  /** Short scope sentence shown under the title. */
  description: string
  /** Optional per-project image / map (data URL or web URL). */
  mapUrl: string
  lines: ProjectLine[]
  /** Sales-tax rate applied to this project's subtotal (percent). */
  taxRate: number
  /** Include a detailed line-item page for this project in the document. */
  showDetail: boolean
}

/** One feature row in the Improvements Analysis comparison. */
export interface AnalysisRow {
  id: string
  feature: string
  /** Existing system: pressure "At Point" and "Change between points". */
  exAt: string
  exChange: string
  /** New design: pressure "At Point" and "Change between points". */
  newAt: string
  newChange: string
}

/**
 * One pipe run in the friction-loss calculator — mirrors the Lad
 * "PIPE FRICTION LOSS CALCULATION SHEET" inputs (length, ID, GPM, fall).
 */
export interface PipeSegment {
  id: string
  label: string
  /** Length of pipeline (ft). */
  length: number
  /** Pipe inside diameter (in). */
  pipeId: number
  /** Gallons per minute. */
  gpm: number
  /** Hazen-Williams roughness C (PVC ≈ 150, steel ≈ 140). */
  hazenC: number
  /** Available fall (ft) — optional, for the safety-margin check. */
  availableFall: number
}

/**
 * The hydraulic worksheet — mirrors the Lad "HYDRAULIC WORKSHEET" (<LOSS):
 * static + losses + elevation + pivot ht → TDH, PSI, HP.
 */
export interface HydraulicWorksheet {
  staticReqd: number
  sysLoss: number
  mlLoss: number
  elevation: number
  pivotHt: number
  miscLosses: number
  designGpm: number
}

/** The salesperson's design-calculator inputs (Lad system-design sheet). */
export interface Hydraulics {
  segments: PipeSegment[]
  worksheet: HydraulicWorksheet
}

/** The generic design-calculator toolkit (acreage, EFLA, pump cost, etc.). */
export interface DesignToolkit {
  /** Calculator ids the rep has added to this proposal. */
  active: string[]
  /** Per-calculator input values, keyed by calculator id then field key. */
  values: Record<string, Record<string, number>>
}

/** The Improvements Analysis page (existing vs. new comparison). */
export interface Analysis {
  enabled: boolean
  heading: string
  subhead: string
  forLine: string
  byLine: string
  existingLabel: string
  newLabel: string
  unitLabel: string
  summary: string
  conclusion: string
  rows: AnalysisRow[]
}

/** The field-map page (imported JPG/PNG + engineering title block). */
export interface MapPage {
  enabled: boolean
  /** Imported image as a data URL. */
  imageUrl: string
  caption: string
  scale: string
  designer: string
  drawnBy: string
  date: string
  quoteNumber: string
}

/** Payment schedule shown under the investment summary. */
export interface PaymentSchedule {
  enabled: boolean
  downPayment: number
  progressPayments: number
  dueUponInvoicing: number
  note: string
}

/** A person shown on the About Us & Team page. */
export interface TeamMember {
  id: string
  name: string
  title: string
  /** Optional headshot (data URL or web URL); falls back to initials. */
  photoUrl: string
  /** Optional one-line credential / focus (e.g. "20 yrs · Pump systems"). */
  credential: string
  /** Optional short bio (1–2 sentences) shown on the team page. */
  bio: string
}

export interface CustomerInfo {
  company: string
  contactName: string
  contactTitle: string
  email: string
  phone: string
  /** Project / ranch / farm location. */
  location: string
  /** Customer logo (data URL) — optional, shown on the cover. */
  logoUrl: string
}

export interface PreparedBy {
  repName: string
  repTitle: string
  repPhone: string
  repEmail: string
}

export interface ProposalMeta {
  title: string
  /** ISO date string (yyyy-mm-dd). */
  date: string
  /** Human proposal/quote number. */
  number: string
  /** How long the quote is valid (days). */
  validForDays: number
}

export interface ProposalSettings {
  taxRate: number // percent
  /** Optional flat freight/mobilization charge. */
  freight: number
  /** Show the itemized pricing page. */
  showPricing: boolean
  /** Show the About Us & Team page. */
  showAbout: boolean
  /** Show the store-network / locations page. */
  showStores: boolean
  /** Show the services / capabilities page. */
  showServices: boolean
  /** Show the investment summary (project rollup) page. */
  showSummary: boolean
  /** Subtitle under the customer name on the investment summary page. */
  summarySubtitle: string
}

/* ----------------------------- Multi-user ----------------------------- */

/** Organisation-wide role controlling what a user can do across the app. */
export type OrgRole = 'admin' | 'creator' | 'viewer'

/** A user in the directory (users/{uid}). */
export interface UserProfile {
  uid: string
  email: string
  displayName: string
  role: OrgRole
  disabled: boolean
  createdAt: number
  updatedAt: number
}

/** Per-proposal access granted to an invited user. */
export type ShareRole = 'editor' | 'viewer'

/**
 * A stored proposal (proposals/{id}). Holds metadata, the membership map, and
 * the full proposal payload under `data`.
 */
export interface ProposalRecord {
  id: string
  ownerUid: string
  ownerEmail: string
  /** Denormalised for the dashboard list. */
  title: string
  customerCompany: string
  number: string
  createdAt: number
  updatedAt: number
  /** Invited members: uid → access. Owner is implicit (full control). */
  roles: Record<string, ShareRole>
  /** [ownerUid, ...invited uids] — enables array-contains queries + rules. */
  memberUids: string[]
  /** The full proposal payload. */
  data: Proposal
}

export interface Proposal {
  meta: ProposalMeta
  customer: CustomerInfo
  preparedBy: PreparedBy
  /** Selected service category ids the rep is committing to (the "what we'll do"). */
  services: string[]
  /** Free cover message / executive summary. */
  coverMessage: string
  /** About Us — heading + story paragraphs for the team page. */
  aboutHeading: string
  aboutBody: string[]
  /** People featured on the About Us & Team page. */
  team: TeamMember[]
  /** Scope / approach paragraphs (one per bullet). */
  scopeNotes: string[]
  /** Field-map page. */
  map: MapPage
  /** Improvements Analysis page. */
  analysis: Analysis
  /** Design-calculator inputs (friction loss + hydraulic worksheet). */
  hydraulics: Hydraulics
  /** Generic design-calculator toolkit. */
  design: DesignToolkit
  /** Grouped project quotes — the core of the costed scope. */
  projects: Project[]
  /** Payment schedule shown under the investment summary. */
  payment: PaymentSchedule
  /** Legacy flat line items (glossy showcase) — optional / older drafts. */
  lineItems: LineItem[]
  /** Closing terms & conditions paragraphs. */
  terms: string[]
  settings: ProposalSettings
}
