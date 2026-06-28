/**
 * Lad Irrigation store network.
 *
 * City, state, and phone numbers are sourced from ladirrigation.com/locations.
 * Street addresses are NOT published per-branch on the site — only the Moses
 * Lake headquarters address is confirmed (1030 E Broadway Ave). The remaining
 * `address` fields are left blank on purpose; fill them in when supplied rather
 * than guessing. All branches share the same hours (see LAD_HOURS).
 */
export interface Store {
  /** Branch name — the city it serves. */
  city: string
  state: string
  phone: string
  /** Street address, if known. Blank = not yet confirmed. */
  address: string
  zip: string
  /** True for the Moses Lake headquarters. */
  hq?: boolean
}

/** Shared business hours across all branches (from ladirrigation.com). */
export const LAD_HOURS = {
  weekday: 'Mon – Fri · 7:30am – 5:00pm',
  saturday: 'Sat · 8:00am – 1:00pm',
}

export const LAD_STORES: Store[] = [
  { city: 'Moses Lake', state: 'WA', phone: '(509) 765-8864', address: '1030 E Broadway Ave', zip: '98837' },
  { city: 'Othello', state: 'WA', phone: '(509) 488-5264', address: '', zip: '' },
  { city: 'Basin City', state: 'WA', phone: '(509) 269-4725', address: '', zip: '' },
  { city: 'Royal City', state: 'WA', phone: '(509) 331-5032', address: '', zip: '' },
  { city: 'George', state: 'WA', phone: '(509) 785-8864', address: '', zip: '' },
  { city: 'Pasco', state: 'WA', phone: '(509) 547-1623', address: '', zip: '' },
  { city: 'Sunnyside', state: 'WA', phone: '(509) 837-9006', address: '', zip: '' },
  { city: 'Yakima', state: 'WA', phone: '(509) 966-0814', address: '', zip: '' },
  { city: 'Center', state: 'CO', phone: '(719) 754-3555', address: '', zip: '' },
]
