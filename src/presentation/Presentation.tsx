import type { Proposal } from '../types'
import { LAD_BRAND } from '../theme/brand'
import { SERVICE_CATEGORIES, categoryLabel } from '../data/reference'
import { LAD_STORES, LAD_HOURS } from '../data/stores'
import { Icon } from '../ui/Icon'
import {
  computeTotals,
  lineGross,
  lineNet,
  projectLineTotal,
  projectSubtotal,
  projectTax,
  projectTotal,
  investmentTotal,
} from '../lib/pricing'
import { tdhAtPump, psiAtPump, hpRequired } from '../lib/hydraulics'
import { MapStage } from './MapStage'
import { formatCurrency, formatDate, formatNumber, cls } from '../lib/util'

const B = LAD_BRAND
const round0 = (n: number) => Math.round(n).toLocaleString()
/** Line rows per detailed project-quote page before continuing onto another. */
const LINES_PER_PAGE = 13

/** Split an array into chunks of n. */
function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}

/** Horizontal change bar for the Improvements Analysis (red loss / green gain). */
function ChangeBar({ value, max }: { value: string; max: number }) {
  const n = parseFloat(value)
  if (!value || isNaN(n) || max <= 0) return <span className="abar__empty" />
  const pct = Math.min(100, (Math.abs(n) / max) * 100)
  return (
    <span className="abar">
      <span className={`abar__fill ${n < 0 ? 'abar__fill--neg' : 'abar__fill--pos'}`} style={{ width: `${pct}%` }} />
      <span className="abar__num">{n > 0 ? `+${n}` : n}</span>
    </span>
  )
}

function Foot({ p, page, total }: { p: Proposal; page: number; total: number }) {
  return (
    <div className="sheet__foot">
      <span>
        <strong>{B.name}</strong> · {p.meta.number}
      </span>
      <span>{p.customer.company || 'Prepared proposal'}</span>
      <span>
        {String(page).padStart(2, '0')} / {String(total).padStart(2, '0')}
      </span>
    </div>
  )
}

export function Presentation({
  proposal,
  activeSection,
  mapEditable,
}: {
  proposal: Proposal
  activeSection?: string
  mapEditable?: boolean
}) {
  const p = proposal
  /** className + anchor for a top-level sheet, flagging the one the builder step targets. */
  const sec = (key: string, base = 'sheet') => ({
    className: cls(base, activeSection === key && 'sheet--active'),
    'data-doc-section': key,
  })
  const totals = computeTotals(p)
  const activeServices = SERVICE_CATEGORIES.filter((s) => p.services.includes(s.id))
  const itemPages = chunk(p.lineItems, 2)

  // Page visibility
  const showMap = p.map.enabled && !!p.map.imageUrl
  const cadDrawings = p.cad.enabled ? p.cad.drawings : []
  const showServices = p.settings.showServices
  const showAnalysis =
    p.analysis.enabled && (p.analysis.rows.length > 0 || !!p.analysis.summary || !!p.analysis.conclusion)
  const showAbout = p.settings.showAbout && (p.aboutBody.filter(Boolean).length > 0 || p.team.length > 0)
  const showStores = p.settings.showStores
  const showSummary = p.settings.showSummary && p.projects.length > 0
  const detailProjects = p.projects.filter((pr) => pr.showDetail && pr.lines.length > 0)
  const projectPageGroups = detailProjects.map((pr) => ({ pr, pages: chunk(pr.lines, LINES_PER_PAGE) }))
  const projectPageCount = projectPageGroups.reduce((s, g) => s + g.pages.length, 0)
  const grandInvestment = investmentTotal(p)

  const contentPages =
    cadDrawings.length +
    (showMap ? 1 : 0) +
    (showServices ? 1 : 0) +
    (showAnalysis ? 1 : 0) +
    (showAbout ? 1 : 0) +
    (showStores ? 1 : 0) +
    (showSummary ? 1 : 0) +
    projectPageCount +
    itemPages.length +
    (p.settings.showPricing && p.lineItems.length ? 1 : 0) +
    1 /* terms */
  const totalSheets = 1 /* cover */ + contentPages + 1 /* closing */
  let pageNo = 1

  // Improvements-analysis bar scale (max absolute change across both columns).
  const analysisMax = p.analysis.rows.reduce((m, r) => {
    const a = Math.abs(parseFloat(r.exChange) || 0)
    const b = Math.abs(parseFloat(r.newChange) || 0)
    return Math.max(m, a, b)
  }, 0)

  const initials = (name: string) =>
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('')

  return (
    <>
      {/* ----------------------------- COVER ----------------------------- */}
      <section {...sec('cover', 'sheet cover')}>
        <img className="cover__photo" src={B.photos.coverHero} alt="" />
        <div className="cover__scrim" />
        <div className="cover__inner">
          <div className="cover__top">
            <img className="cover__logo" src={B.logos.primary} alt={B.name} />
            <div className="cover__date">
              {formatDate(p.meta.date)}
              <br />
              {p.meta.number}
            </div>
          </div>

          <div className="cover__center">
            <div className="cover__eyebrow">{B.tagline}</div>
            <h1 className="cover__title">{p.meta.title || 'Irrigation System Proposal'}</h1>
            <div className="cover__for">Prepared for</div>
            <div className="cover__company">{p.customer.company || 'Your Operation'}</div>
            {p.customer.location && <div className="cover__loc">{p.customer.location}</div>}
          </div>

          <div className="cover__bottom">
            <div className="cover__meta">
              <div className="cover__metaitem">
                <div className="k">Prepared by</div>
                <div className="v">{p.preparedBy.repName || B.name}</div>
              </div>
              <div className="cover__metaitem">
                <div className="k">Valid for</div>
                <div className="v">{p.meta.validForDays} days</div>
              </div>
              {(p.projects.length > 0 || p.lineItems.length > 0) && (
                <div className="cover__metaitem">
                  <div className="k">Investment</div>
                  <div className="v">{formatCurrency(grandInvestment)}</div>
                </div>
              )}
            </div>
            <img className="cover__badge" src={B.logos.employeeOwned} alt="Employee Owned" />
          </div>
        </div>
      </section>

      {/* ----------------------------- FIELD MAP ----------------------------- */}
      {showMap && (
        <section {...sec('map', 'sheet mapsheet')}>
          <div className="mapsheet__imgwrap">
            <MapStage map={p.map} editable={mapEditable} />
            {p.map.showLegend !== false && p.map.fields.length > 0 && (
              <div className="map-legend">
                <div className="map-legend__title">Fields</div>
                <ul className="map-legend__list">
                  {p.map.fields.map((f) => (
                    <li className="map-legend__row" key={f.id}>
                      <span
                        className="map-legend__dot"
                        style={{ background: f.excluded ? '#6b7280' : f.color || '#f97316' }}
                      />
                      <span className="map-legend__name">{f.name || 'Field'}</span>
                      {f.acres != null && <span className="map-legend__ac">{f.acres.toFixed(f.acres < 100 ? 2 : 1)} ac</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="mapsheet__block">
            <img className="mapsheet__logo" src={B.logos.primary} alt={B.name} />
            <div className="mapsheet__fields">
              <div className="mapsheet__f">
                <span className="k">Customer</span>
                <span className="v">{p.customer.company || '—'}</span>
              </div>
              <div className="mapsheet__f">
                <span className="k">Location</span>
                <span className="v">{p.map.caption || p.customer.location || '—'}</span>
              </div>
              <div className="mapsheet__f">
                <span className="k">Scale</span>
                <span className="v">{p.map.scale || '—'}</span>
              </div>
              <div className="mapsheet__f">
                <span className="k">Quotation / Order #</span>
                <span className="v">{p.map.quoteNumber || p.meta.number}</span>
              </div>
              <div className="mapsheet__f">
                <span className="k">Date</span>
                <span className="v">{formatDate(p.map.date) || formatDate(p.meta.date)}</span>
              </div>
              <div className="mapsheet__f">
                <span className="k">Designer</span>
                <span className="v">{p.map.designer || '—'}</span>
              </div>
              <div className="mapsheet__f">
                <span className="k">Drawn by</span>
                <span className="v">{p.map.drawnBy || p.map.designer || '—'}</span>
              </div>
            </div>
          </div>
          <Foot p={p} page={++pageNo} total={totalSheets} />
        </section>
      )}

      {/* ----------------------------- CAD DRAWINGS ----------------------------- */}
      {cadDrawings.map((d, di) => (
        <section key={d.id} {...sec('cad', 'sheet mapsheet cadsheet')}>
          <div className="mapsheet__imgwrap cadsheet__stage">
            {d.kind === 'dxf' && d.svgUrl ? (
              <img className="cadsheet__img" src={d.svgUrl} alt={d.caption || d.name} />
            ) : (
              <div className="cadsheet__dwg">
                <span className="cadsheet__dwg-badge">DWG</span>
                <span className="cadsheet__dwg-name">{d.name}</span>
                <p className="cadsheet__dwg-note">
                  AutoCAD drawing file — attached to this proposal. Ask your Lad rep for the
                  original, or view it in any CAD package.
                </p>
              </div>
            )}
          </div>
          <div className="mapsheet__block">
            <img className="mapsheet__logo" src={B.logos.primary} alt={B.name} />
            <div className="mapsheet__fields">
              <div className="mapsheet__f">
                <span className="k">Customer</span>
                <span className="v">{p.customer.company || '—'}</span>
              </div>
              <div className="mapsheet__f">
                <span className="k">Drawing</span>
                <span className="v">{d.caption || d.name}</span>
              </div>
              <div className="mapsheet__f">
                <span className="k">File</span>
                <span className="v">{d.name}</span>
              </div>
              <div className="mapsheet__f">
                <span className="k">Sheet</span>
                <span className="v">
                  {di + 1} of {cadDrawings.length}
                </span>
              </div>
              <div className="mapsheet__f">
                <span className="k">Date</span>
                <span className="v">{formatDate(p.meta.date)}</span>
              </div>
              <div className="mapsheet__f">
                <span className="k">Designer</span>
                <span className="v">{p.cad.designer || '—'}</span>
              </div>
              <div className="mapsheet__f">
                <span className="k">Drawn by</span>
                <span className="v">{p.cad.drawnBy || p.cad.designer || '—'}</span>
              </div>
            </div>
          </div>
          <Foot p={p} page={++pageNo} total={totalSheets} />
        </section>
      ))}

      {/* --------------------------- SERVICES + PROOF + SCOPE --------------------------- */}
      {showServices && (
      <section {...sec('services', 'sheet page-subtle')}>
        <div className="sheet__inner">
          <p className="eyebrow">Turn-key solutions</p>
          <h2 className="sec-head">One team, end to end.</h2>
          <div className="sec-rule" />
          {p.coverMessage && <p className="lede">{p.coverMessage}</p>}

          <div className="svc-grid" style={{ marginTop: 26 }}>
            {(activeServices.length ? activeServices : SERVICE_CATEGORIES.slice(0, 6)).map((s) => (
              <div className="svc" key={s.id}>
                <div className="svc__icon">
                  <Icon name={s.icon} size={26} />
                </div>
                <h3 className="svc__name">{s.label}</h3>
                <p className="svc__blurb">{s.blurb}</p>
              </div>
            ))}
          </div>

          <div className="proof">
            <div className="proof__item">
              <div className="proof__big">{B.since}</div>
              <div className="proof__lbl">Family-founded in Moses Lake. Employee-owned today.</div>
            </div>
            <div className="proof__item">
              <div className="proof__big">{LAD_STORES.length}</div>
              <div className="proof__lbl">Locations across Washington &amp; Colorado, close to your field.</div>
            </div>
            <div className="proof__item">
              <div className="proof__big">#1</div>
              <div className="proof__lbl">Largest pivot-building team and Valley inventory in the NW.</div>
            </div>
            <div className="proof__item">
              <div className="proof__big">All</div>
              <div className="proof__lbl">Brands built and repaired by certified technicians.</div>
            </div>
          </div>

          {p.scopeNotes.filter(Boolean).length > 0 && (
            <div className="scope">
              <p className="eyebrow" style={{ marginBottom: 12 }}>
                Our approach
              </p>
              {p.scopeNotes.filter(Boolean).map((n, i) => (
                <div className="scope__item" key={i}>
                  <span className="scope__n">{String(i + 1).padStart(2, '0')}</span>
                  <span className="scope__t">{n}</span>
                </div>
              ))}
            </div>
          )}

          <Foot p={p} page={++pageNo} total={totalSheets} />
        </div>
      </section>
      )}

      {/* --------------------------- ABOUT US & TEAM --------------------------- */}
      {showAbout && (
        <section {...sec('team', 'sheet page-subtle')}>
          <div className="sheet__inner">
            <p className="eyebrow">Who we are</p>
            <h2 className="sec-head">{p.aboutHeading || 'About Lad Irrigation'}</h2>
            <div className="sec-rule" />

            <div className="about">
              <div className="about__text">
                {p.aboutBody.filter(Boolean).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
              <div className="about__photo">
                <img src={B.photos.pumpInstall} alt="Lad Irrigation crew on site" />
              </div>
            </div>

            {p.team.length > 0 && (
              <>
                <p className="eyebrow" style={{ marginTop: 36, marginBottom: 14 }}>
                  The team on your project
                </p>
                <div className={`team ${p.team.length === 1 ? 'team--single' : ''}`}>
                  {p.team.map((m) => (
                    <div className="member" key={m.id}>
                      <div className="member__avatar">
                        {m.photoUrl ? <img src={m.photoUrl} alt={m.name} /> : <span>{initials(m.name) || '—'}</span>}
                      </div>
                      <div className="member__info">
                        <div className="member__name">{m.name || 'Team member'}</div>
                        {m.title && <div className="member__title">{m.title}</div>}
                        {m.credential && <div className="member__cred">{m.credential}</div>}
                        {m.bio && <p className="member__bio">{m.bio}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <Foot p={p} page={++pageNo} total={totalSheets} />
          </div>
        </section>
      )}

      {/* --------------------------- STORE NETWORK --------------------------- */}
      {showStores && (
        <section {...sec('stores', 'sheet page-subtle')}>
          <div className="sheet__inner">
            <p className="eyebrow">Always close by</p>
            <h2 className="sec-head">{LAD_STORES.length} locations, near your field.</h2>
            <div className="sec-rule" />
            <p className="lede">
              Parts, service, and support are never far away. With stores across Washington and Colorado, a Lad crew is
              close when you need one — in season or out.
            </p>

            <div className="stores">
              {LAD_STORES.map((s) => (
                <div className={`store ${s.hq ? 'store--hq' : ''}`} key={s.city + s.state}>
                  <div className="store__head">
                    <h3 className="store__city">{s.city}</h3>
                    {s.hq && <span className="store__tag">Headquarters</span>}
                  </div>
                  {s.address ? (
                    <div className="store__addr">
                      {s.address}
                      <br />
                      {s.city}, {s.state} {s.zip}
                    </div>
                  ) : (
                    <div className="store__addr">{s.city}, {s.state}</div>
                  )}
                  <a className="store__phone" href={`tel:${s.phone.replace(/[^\d]/g, '')}`}>
                    <Icon name="phone" size={13} /> {s.phone}
                  </a>
                </div>
              ))}
            </div>

            <div className="stores__hours">
              <Icon name="check" size={14} />
              <span>
                <strong>Store hours</strong> · {LAD_HOURS.weekday} · {LAD_HOURS.saturday}
              </span>
            </div>

            <Foot p={p} page={++pageNo} total={totalSheets} />
          </div>
        </section>
      )}

      {/* --------------------------- IMPROVEMENTS ANALYSIS --------------------------- */}
      {showAnalysis && (
        <section {...sec('analysis', 'sheet page-subtle')}>
          <div className="sheet__inner">
            <p className="eyebrow">Why upgrade</p>
            <h2 className="sec-head">{p.analysis.heading || 'Improvements Analysis'}</h2>
            <div className="ana__meta">
              {p.analysis.subhead && <span className="ana__sub">{p.analysis.subhead}</span>}
              {p.analysis.forLine && <span>{p.analysis.forLine}</span>}
              {p.analysis.byLine && <span>{p.analysis.byLine}</span>}
            </div>
            <div className="sec-rule" />
            {p.analysis.summary && (
              <p className="lede" style={{ marginBottom: 20 }}>
                <strong>Summary — </strong>
                {p.analysis.summary}
              </p>
            )}

            <div className="ana__tables">
              {([
                { label: p.analysis.existingLabel, isEx: true },
                { label: p.analysis.newLabel, isEx: false },
              ] as const).map((col, ci) => (
                <div className={`ana__col ${col.isEx ? '' : 'ana__col--new'}`} key={ci}>
                  <div className="ana__coltitle">{col.label}</div>
                  <div className="ana__unit">{p.analysis.unitLabel}</div>
                  <table className="ana__table">
                    <thead>
                      <tr>
                        <th>Feature</th>
                        <th className="num">At point</th>
                        <th>Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.analysis.rows.map((r) => (
                        <tr key={r.id}>
                          <td>{r.feature}</td>
                          <td className="num">{col.isEx ? r.exAt : r.newAt}</td>
                          <td>
                            <ChangeBar value={col.isEx ? r.exChange : r.newChange} max={analysisMax} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>

            {p.hydraulics.worksheet.designGpm > 0 && (
              <div className="ana__basis">
                <div className="ana__basis-item">
                  <div className="k">Design GPM</div>
                  <div className="v">{formatNumber(p.hydraulics.worksheet.designGpm)}</div>
                </div>
                <div className="ana__basis-item">
                  <div className="k">Total dynamic head</div>
                  <div className="v">{round0(tdhAtPump(p.hydraulics.worksheet))} ft</div>
                </div>
                <div className="ana__basis-item">
                  <div className="k">Pressure @ pump</div>
                  <div className="v">{round0(psiAtPump(p.hydraulics.worksheet))} psi</div>
                </div>
                <div className="ana__basis-item">
                  <div className="k">HP required</div>
                  <div className="v">{round0(hpRequired(p.hydraulics.worksheet))} hp</div>
                </div>
              </div>
            )}

            {p.analysis.conclusion && (
              <p className="lede" style={{ marginTop: 20 }}>
                <strong>Conclusion — </strong>
                {p.analysis.conclusion}
              </p>
            )}
            <Foot p={p} page={++pageNo} total={totalSheets} />
          </div>
        </section>
      )}

      {/* --------------------------- INVESTMENT SUMMARY --------------------------- */}
      {showSummary && (
        <section {...sec('summary')}>
          <div className="sheet__inner">
            <div className="sum__head">
              <div>
                <p className="eyebrow">Investment summary</p>
                <h2 className="sec-head">{p.customer.company || 'Your Operation'}</h2>
                {p.customer.location && <div className="sum__loc">{p.customer.location}</div>}
                {p.settings.summarySubtitle && <div className="sum__sub">{p.settings.summarySubtitle}</div>}
              </div>
              <img className="sum__logo" src={B.logos.primary} alt={B.name} />
            </div>
            <div className="sec-rule" />

            <table className="sumtable">
              <tbody>
                {p.projects.map((pr) => (
                  <tr key={pr.id}>
                    <td className="sumtable__name">
                      {pr.title || 'Untitled project'}
                      {pr.location && <span className="sumtable__loc">{pr.location}</span>}
                    </td>
                    <td className="sumtable__no">{pr.number}</td>
                    <td className="num sumtable__amt">{formatCurrency(projectTotal(pr))}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="sum__total">
              <span className="lbl">
                Total <em>(includes est. tax)</em>
              </span>
              <span className="val">{formatCurrency(grandInvestment)}</span>
            </div>

            {p.payment.enabled && (
              <div className="payment">
                <h3 className="payment__title">Payment Schedule</h3>
                <div className="payment__row">
                  <span>Down payment due upon approval</span>
                  <span>{formatCurrency(p.payment.downPayment)}</span>
                </div>
                <div className="payment__row">
                  <span>Progress payments</span>
                  <span>{formatCurrency(p.payment.progressPayments)}</span>
                </div>
                <div className="payment__row">
                  <span>Estimated due upon invoicing</span>
                  <span>{formatCurrency(p.payment.dueUponInvoicing)}</span>
                </div>
                <div className="payment__row payment__row--total">
                  <span>Total</span>
                  <span>
                    {formatCurrency(p.payment.downPayment + p.payment.progressPayments + p.payment.dueUponInvoicing)}
                  </span>
                </div>
              </div>
            )}

            <div className="sum__sign">
              <div className="sum__thanks">{p.payment.note || 'Thank you for doing business with us!'}</div>
              <div className="sum__signline">
                <span>Accepted</span> <span className="sum__x">✕</span>
              </div>
            </div>
            <Foot p={p} page={++pageNo} total={totalSheets} />
          </div>
        </section>
      )}

      {/* --------------------------- PROJECT DETAIL QUOTES --------------------------- */}
      {projectPageGroups.map(({ pr, pages }) =>
        pages.map((lines, pi) => (
          <section className={cls('sheet', activeSection === 'projects' && 'sheet--active')} data-doc-section="projects" key={`${pr.id}-${pi}`}>
            <div className="sheet__inner">
              <div className="pq__head">
                <div>
                  <p className="eyebrow">Project Quote{pr.number ? ` · ${pr.number}` : ''}</p>
                  <h2 className="sec-head">
                    {pr.title || 'Project'}
                    {pages.length > 1 && (
                      <span className="pq__cont">
                        {' '}
                        (cont. {pi + 1}/{pages.length})
                      </span>
                    )}
                  </h2>
                  {pr.location && <div className="pq__loc">{pr.location}</div>}
                </div>
                <img className="pq__logo" src={B.logos.primary} alt={B.name} />
              </div>
              <div className="sec-rule" />
              {pi === 0 && pr.description && (
                <p className="lede" style={{ marginBottom: 14 }}>
                  {pr.description}
                </p>
              )}
              {pi === 0 && pr.mapUrl && (
                <div className="pq__map">
                  <img src={pr.mapUrl} alt={pr.title} />
                </div>
              )}

              <table className="pqtable">
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>Description</th>
                    <th className="num">Qty</th>
                    <th className="num">Unit price</th>
                    <th className="num">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.id} className={cls(l.isNote && 'pqtable__noterow', l.excludeFromTotal && 'pqtable__exclrow')}>
                      <td className="pqtable__code">{l.code}</td>
                      <td>
                        {l.description}
                        {l.excludeFromTotal && <span className="pqtable__excltag">comparison — not included</span>}
                      </td>
                      <td className="num">{l.isNote ? '' : `${formatNumber(l.qty)} ${l.unit}`}</td>
                      <td className="num">{l.isNote ? '' : formatCurrency(l.unitPrice)}</td>
                      <td className="num">
                        {l.isNote ? '' : l.excludeFromTotal ? <s>{formatCurrency(projectLineTotal(l))}</s> : formatCurrency(projectLineTotal(l))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {pi === pages.length - 1 && (
                <div className="totals">
                  <div className="totals__row">
                    <span className="lbl">Subtotal</span>
                    <span className="val">{formatCurrency(projectSubtotal(pr))}</span>
                  </div>
                  <div className="totals__row">
                    <span className="lbl">Sales tax ({pr.taxRate || 0}%)</span>
                    <span className="val">{formatCurrency(projectTax(pr))}</span>
                  </div>
                  <div className="totals__grand">
                    <span className="lbl">Project total</span>
                    <span className="val">{formatCurrency(projectTotal(pr))}</span>
                  </div>
                </div>
              )}
              <Foot p={p} page={++pageNo} total={totalSheets} />
            </div>
          </section>
        )),
      )}

      {/* ------------------------- LINE ITEM SHOWCASE ------------------------- */}
      {itemPages.map((group, gi) => (
        <section className="sheet" key={gi}>
          <div className="sheet__inner">
            {gi === 0 && (
              <>
                <p className="eyebrow">The system</p>
                <h2 className="sec-head">Equipment &amp; services</h2>
                <div className="sec-rule" />
              </>
            )}
            <div className="showcase">
              {group.map((item) => {
                const hasImg = !!item.imageUrl
                const discounted = item.discountPct > 0
                return (
                  <article className={`item ${hasImg ? '' : 'item--noimg'}`} key={item.id}>
                    {hasImg && (
                      <div className="item__media">
                        <img src={item.imageUrl} alt={item.name} />
                      </div>
                    )}
                    {!hasImg && group.length === 1 && (
                      <div className="item__media">
                        <div className="item__media-ph">
                          <Icon name={item.kind === 'service' ? 'wrench' : 'box'} size={48} />
                          <div>{categoryLabel(item.category)}</div>
                        </div>
                      </div>
                    )}
                    <div className="item__body">
                      <div className="item__cat">{categoryLabel(item.category)}</div>
                      <h3 className="item__name">{item.name || 'Untitled item'}</h3>
                      {item.summary && <p className="item__summary">{item.summary}</p>}
                      {item.description && <p className="item__desc">{item.description}</p>}

                      {item.specs.filter((s) => s.label || s.value).length > 0 && (
                        <div className="item__specs">
                          {item.specs
                            .filter((s) => s.label || s.value)
                            .map((s) => (
                              <div className="item__spec" key={s.id}>
                                <div className="k">{s.label}</div>
                                <div className="v">{s.value}</div>
                              </div>
                            ))}
                        </div>
                      )}

                      {item.highlights.filter(Boolean).length > 0 && (
                        <ul className="item__hl">
                          {item.highlights.filter(Boolean).map((h, i) => (
                            <li key={i}>{h}</li>
                          ))}
                        </ul>
                      )}

                      <div className="item__price">
                        <span className="qty">
                          {formatNumber(item.quantity)} {item.unit} × {formatCurrency(item.unitPrice)}
                          {discounted && ` · −${item.discountPct}%`}
                        </span>
                        <span className="amt">
                          {discounted && <s>{formatCurrency(lineGross(item))}</s>}
                          {formatCurrency(lineNet(item))}
                        </span>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
            <Foot p={p} page={++pageNo} total={totalSheets} />
          </div>
        </section>
      ))}

      {/* ----------------------------- PRICING ----------------------------- */}
      {p.settings.showPricing && p.lineItems.length > 0 && (
        <section className="sheet">
          <div className="sheet__inner">
            <p className="eyebrow">Investment</p>
            <h2 className="sec-head">Pricing summary</h2>
            <div className="sec-rule" />

            <table className="ptable">
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="num">Qty</th>
                  <th className="num">Unit price</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {p.lineItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="pname">{item.name || 'Untitled item'}</div>
                      <div className="pcat">{categoryLabel(item.category)}</div>
                    </td>
                    <td className="num">
                      {formatNumber(item.quantity)} {item.unit}
                    </td>
                    <td className="num">{formatCurrency(item.unitPrice)}</td>
                    <td className="num">{formatCurrency(lineNet(item))}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="totals">
              <div className="totals__row">
                <span className="lbl">Subtotal</span>
                <span className="val">{formatCurrency(totals.gross)}</span>
              </div>
              {totals.discount > 0 && (
                <div className="totals__row totals__row--disc">
                  <span className="lbl">Discount</span>
                  <span className="val">−{formatCurrency(totals.discount)}</span>
                </div>
              )}
              {totals.freight > 0 && (
                <div className="totals__row">
                  <span className="lbl">Freight / mobilization</span>
                  <span className="val">{formatCurrency(totals.freight)}</span>
                </div>
              )}
              <div className="totals__row">
                <span className="lbl">Tax ({p.settings.taxRate}%)</span>
                <span className="val">{formatCurrency(totals.tax)}</span>
              </div>
              <div className="totals__grand">
                <span className="lbl">Total investment</span>
                <span className="val">{formatCurrency(totals.grandTotal)}</span>
              </div>
              <div className="valid-note">
                Valid {p.meta.validForDays} days from {formatDate(p.meta.date)}.
              </div>
            </div>

            <Foot p={p} page={++pageNo} total={totalSheets} />
          </div>
        </section>
      )}

      {/* ----------------------------- TERMS ----------------------------- */}
      <section className="sheet">
        <div className="sheet__inner">
          <p className="eyebrow">The agreement</p>
          <h2 className="sec-head">Terms &amp; acceptance</h2>
          <div className="sec-rule" />
          <div className="terms">
            {p.terms.filter(Boolean).map((t, i) => (
              <div className="terms__item" key={i}>
                <p>{t}</p>
              </div>
            ))}
          </div>
          <div className="sign">
            <div className="sign__line">Accepted by (customer signature &amp; date)</div>
            <div className="sign__line">
              {B.name} — {p.preparedBy.repName || 'Authorized representative'}
            </div>
          </div>
          <Foot p={p} page={++pageNo} total={totalSheets} />
        </div>
      </section>

      {/* ----------------------------- CLOSING ----------------------------- */}
      <section className="sheet closing">
        <div className="closing__inner">
          <img className="closing__logo" src={B.logos.primary} alt={B.name} />
          <p className="closing__eyebrow">Let's get water where it's needed</p>
          <h2>Put Lad to the test.</h2>
          <p>
            Meet with our design team to turn your operation's needs into a custom irrigation plan. We build systems
            meant to run for decades — and we're close by when you need us.
          </p>
          <div className="closing__contact">
            <div>
              <div className="k">Call</div>
              <div className="v">{p.preparedBy.repPhone || B.contact.phone}</div>
            </div>
            <div>
              <div className="k">Online</div>
              <div className="v">{B.contact.website}</div>
            </div>
            <div>
              <div className="k">Stores</div>
              <div className="v">{B.contact.storesNote}</div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
