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
  lineItems: LineItem[]
  /** Closing terms & conditions paragraphs. */
  terms: string[]
  settings: ProposalSettings
}
