/**
 * On-screen slide deck — a 16:9 live preview that mirrors the PowerPoint export
 * (src/lib/pptx.ts) and the printed document (Presentation.tsx) section for
 * section. Each .slide is 1280×720px (13.333"×7.5" @96dpi), matching the .pptx
 * geometry, so what you see here is what the exported deck looks like.
 */
import type { Proposal, ProjectLine } from '../types'
import { LAD_BRAND } from '../theme/brand'
import { SERVICE_CATEGORIES, categoryLabel } from '../data/reference'
import { LAD_STORES, LAD_HOURS } from '../data/stores'
import { MapStage } from './MapStage'
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
import { formatCurrency, formatDate, formatNumber } from '../lib/util'

const B = LAD_BRAND
const round0 = (n: number) => Math.round(n).toLocaleString()
const LINES_PER_SLIDE = 12

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}

function Slide({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`slide ${className}`}>{children}</section>
}

function Head({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="slide__head">
      <p className="slide__eyebrow">{eyebrow}</p>
      <h2 className="slide__title">{title}</h2>
      {sub && <div className="slide__sub">{sub}</div>}
      <span className="slide__rule" />
    </div>
  )
}

function Foot({ p }: { p: Proposal }) {
  return (
    <div className="slide__foot">
      <span>
        <strong>{B.name}</strong> · {p.meta.number}
      </span>
      <span>{p.customer.company || 'Prepared proposal'}</span>
    </div>
  )
}

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

export function SlideDeck({ proposal }: { proposal: Proposal }) {
  const p = proposal
  const totals = computeTotals(p)
  const grandInvestment = investmentTotal(p)
  const activeServices = SERVICE_CATEGORIES.filter((s) => p.services.includes(s.id))
  const services = (activeServices.length ? activeServices : SERVICE_CATEGORIES.slice(0, 6)).slice(0, 6)

  const showMap = p.map.enabled && !!p.map.imageUrl
  const showServices = p.settings.showServices
  const showAnalysis =
    p.analysis.enabled && (p.analysis.rows.length > 0 || !!p.analysis.summary || !!p.analysis.conclusion)
  const showAbout = p.settings.showAbout && (p.aboutBody.filter(Boolean).length > 0 || p.team.length > 0)
  const showStores = p.settings.showStores
  const showSummary = p.settings.showSummary && p.projects.length > 0
  const detailProjects = p.projects.filter((pr) => pr.showDetail && pr.lines.length > 0)
  const itemPages = chunk(p.lineItems, 2)

  const proof = [
    { big: String(B.since), lbl: 'Family-founded. Employee-owned today.' },
    { big: String(LAD_STORES.length), lbl: 'Locations across WA & Colorado.' },
    { big: '#1', lbl: 'Largest pivot team & Valley inventory in the NW.' },
    { big: 'All', lbl: 'Brands built & repaired by certified techs.' },
  ]

  return (
    <>
      {/* ----------------------------- COVER ----------------------------- */}
      <Slide className="slide--cover">
        <img className="slide-cover__photo" src={B.photos.coverHero} alt="" />
        <div className="slide-cover__scrim" />
        <div className="slide-cover__top">
          <img className="slide-cover__logo" src={B.logos.primary} alt={B.name} />
          <div className="slide-cover__date">
            {formatDate(p.meta.date)}
            <br />
            {p.meta.number}
          </div>
        </div>
        <div className="slide-cover__center">
          <div className="slide-cover__eyebrow">{B.tagline}</div>
          <h1 className="slide-cover__title">{p.meta.title || 'Irrigation System Proposal'}</h1>
          <div className="slide-cover__for">Prepared for</div>
          <div className="slide-cover__company">{p.customer.company || 'Your Operation'}</div>
          {p.customer.location && <div className="slide-cover__loc">{p.customer.location}</div>}
        </div>
        <div className="slide-cover__bottom">
          <div className="slide-cover__meta">
            <div className="slide-cover__metaitem">
              <div className="k">Prepared by</div>
              <div className="v">{p.preparedBy.repName || B.name}</div>
            </div>
            <div className="slide-cover__metaitem">
              <div className="k">Valid for</div>
              <div className="v">{p.meta.validForDays} days</div>
            </div>
            {(p.projects.length > 0 || p.lineItems.length > 0) && (
              <div className="slide-cover__metaitem">
                <div className="k">Investment</div>
                <div className="v">{formatCurrency(grandInvestment)}</div>
              </div>
            )}
          </div>
          <img className="slide-cover__badge" src={B.logos.employeeOwned} alt="Employee Owned" />
        </div>
      </Slide>

      {/* ----------------------------- FIELD MAP ----------------------------- */}
      {showMap && (
        <Slide>
          <div className="slide-map">
            <div className="slide-map__imgwrap">
              <MapStage map={p.map} />
            </div>
            <div className="slide-map__block">
              <img className="slide-map__logo" src={B.logos.primary} alt={B.name} />
              {([
                ['Customer', p.customer.company || '—'],
                ['Location', p.map.caption || p.customer.location || '—'],
                ['Scale', p.map.scale || '—'],
                ['Quotation / Order #', p.map.quoteNumber || p.meta.number],
                ['Date', formatDate(p.map.date) || formatDate(p.meta.date)],
                ['Designer', p.map.designer || '—'],
                ['Drawn by', p.map.drawnBy || p.map.designer || '—'],
              ] as [string, string][]).map(([k, v]) => (
                <div className="slide-map__f" key={k}>
                  <span className="k">{k}</span>
                  <span className="v">{v}</span>
                </div>
              ))}
            </div>
          </div>
          <Foot p={p} />
        </Slide>
      )}

      {/* ---------------------------- SERVICES ---------------------------- */}
      {showServices && (
        <Slide>
          <Head eyebrow="Turn-key solutions" title="One team, end to end." />
          {p.coverMessage && <p className="slide-lede">{p.coverMessage}</p>}
          <div className="slide-svc">
            {services.map((s) => (
              <div className="slide-svc__card" key={s.id}>
                <h3>{s.label}</h3>
                <p>{s.blurb}</p>
              </div>
            ))}
          </div>
          <div className="slide-proof">
            {proof.map((pr, i) => (
              <div className="slide-proof__item" key={i}>
                <div className="big">{pr.big}</div>
                <div className="lbl">{pr.lbl}</div>
              </div>
            ))}
          </div>
          {p.scopeNotes.filter(Boolean).length > 0 && (
            <div className="slide-scope">
              <p className="slide-subeyebrow" style={{ marginTop: 0 }}>Our approach</p>
              {p.scopeNotes.filter(Boolean).map((n, i) => (
                <div className="slide-scope__item" key={i}>
                  <span className="n">{String(i + 1).padStart(2, '0')}</span>
                  <span>{n}</span>
                </div>
              ))}
            </div>
          )}
          <Foot p={p} />
        </Slide>
      )}

      {/* ------------------------- ABOUT US & TEAM ------------------------- */}
      {showAbout && (
        <Slide>
          <Head eyebrow="Who we are" title={p.aboutHeading || 'About Lad Irrigation'} />
          <div className="slide-about">
            <div className="slide-about__text">
              {p.aboutBody.filter(Boolean).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
            <div className="slide-about__photo">
              <img src={B.photos.pumpInstall} alt="Lad Irrigation crew on site" />
            </div>
          </div>
          {p.team.length > 0 && (
            <>
              <p className="slide-subeyebrow">The team on your project</p>
              <div className="slide-team">
                {p.team.slice(0, 4).map((m) => (
                  <div className="slide-member" key={m.id}>
                    <div className="slide-member__avatar">
                      {m.photoUrl ? <img src={m.photoUrl} alt={m.name} /> : <span>{initials(m.name) || '—'}</span>}
                    </div>
                    <div className="slide-member__name">{m.name || 'Team member'}</div>
                    {m.title && <div className="slide-member__title">{m.title}</div>}
                    {m.credential && <div className="slide-member__cred">{m.credential}</div>}
                  </div>
                ))}
              </div>
            </>
          )}
          <Foot p={p} />
        </Slide>
      )}

      {/* --------------------------- LOCATIONS --------------------------- */}
      {showStores && (
        <Slide>
          <Head eyebrow="Always close by" title={`${LAD_STORES.length} locations, near your field.`} />
          <p className="slide-lede">
            Parts, service, and support are never far away. With stores across Washington and Colorado, a Lad crew is
            close when you need one.
          </p>
          <div className="slide-stores">
            {LAD_STORES.map((s) => (
              <div className={`slide-store ${s.hq ? 'slide-store--hq' : ''}`} key={s.city + s.state}>
                <div className="slide-store__head">
                  <span className="slide-store__city">{s.city}</span>
                  {s.hq && <span className="slide-store__tag">HQ</span>}
                </div>
                <div className="slide-store__addr">
                  {s.address ? `${s.address}, ${s.city}, ${s.state} ${s.zip}` : `${s.city}, ${s.state}`}
                </div>
                <div className="slide-store__phone">{s.phone}</div>
              </div>
            ))}
          </div>
          <div className="slide-hours">
            <strong>Store hours</strong> · {LAD_HOURS.weekday} · {LAD_HOURS.saturday}
          </div>
          <Foot p={p} />
        </Slide>
      )}

      {/* ---------------------- IMPROVEMENTS ANALYSIS ---------------------- */}
      {showAnalysis && (
        <Slide>
          <Head
            eyebrow="Why upgrade"
            title={p.analysis.heading || 'Improvements Analysis'}
            sub={[p.analysis.subhead, p.analysis.forLine, p.analysis.byLine].filter(Boolean).join('  ·  ') || undefined}
          />
          {p.analysis.summary && (
            <p className="slide-ana__note">
              <strong>Summary — </strong>
              {p.analysis.summary}
            </p>
          )}
          <div className="slide-ana__tables">
            {([
              { label: p.analysis.existingLabel || 'Existing', atKey: 'exAt', chKey: 'exChange', isNew: false },
              { label: p.analysis.newLabel || 'New', atKey: 'newAt', chKey: 'newChange', isNew: true },
            ] as const).map((col) => (
              <div className={`slide-ana__col ${col.isNew ? 'slide-ana__col--new' : ''}`} key={col.label}>
                <div className="slide-ana__coltitle">{col.label}</div>
                <div className="slide-ana__unit">{p.analysis.unitLabel}</div>
                <table className="slide-ana__table">
                  <thead>
                    <tr>
                      <th>Feature</th>
                      <th className="num">At point</th>
                      <th className="num">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.analysis.rows.map((r) => (
                      <tr key={r.id}>
                        <td>{r.feature}</td>
                        <td className="num">{r[col.atKey]}</td>
                        <td className="num">{r[col.chKey]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
          {p.hydraulics.worksheet.designGpm > 0 && (
            <div className="slide-ana__basis">
              {[
                ['Design GPM', formatNumber(p.hydraulics.worksheet.designGpm)],
                ['Total dynamic head', `${round0(tdhAtPump(p.hydraulics.worksheet))} ft`],
                ['Pressure @ pump', `${round0(psiAtPump(p.hydraulics.worksheet))} psi`],
                ['HP required', `${round0(hpRequired(p.hydraulics.worksheet))} hp`],
              ].map(([k, v]) => (
                <div className="slide-ana__basis-item" key={k}>
                  <div className="k">{k}</div>
                  <div className="v">{v}</div>
                </div>
              ))}
            </div>
          )}
          {p.analysis.conclusion && (
            <p className="slide-ana__note">
              <strong>Conclusion — </strong>
              {p.analysis.conclusion}
            </p>
          )}
          <Foot p={p} />
        </Slide>
      )}

      {/* -------------------------- INVESTMENT SUMMARY -------------------------- */}
      {showSummary && (
        <Slide>
          <Head
            eyebrow="Investment summary"
            title={p.customer.company || 'Your Operation'}
            sub={[p.customer.location, p.settings.summarySubtitle].filter(Boolean).join('  ·  ') || undefined}
          />
          <table className="slide-sumtable">
            <tbody>
              {p.projects.map((pr) => (
                <tr key={pr.id}>
                  <td className="name">
                    {pr.title || 'Untitled project'}
                    {pr.location && <span className="loc">{pr.location}</span>}
                  </td>
                  <td className="no">{pr.number}</td>
                  <td className="num amt">{formatCurrency(projectTotal(pr))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="slide-sumtotal">
            <span>Total <em>(includes est. tax)</em></span>
            <span>{formatCurrency(grandInvestment)}</span>
          </div>
          {p.payment.enabled && (
            <div className="slide-pay">
              <p className="slide-subeyebrow" style={{ marginTop: 0 }}>Payment schedule</p>
              {([
                ['Down payment due upon approval', p.payment.downPayment],
                ['Progress payments', p.payment.progressPayments],
                ['Estimated due upon invoicing', p.payment.dueUponInvoicing],
              ] as [string, number][]).map(([k, v]) => (
                <div className="slide-pay__row" key={k}>
                  <span>{k}</span>
                  <span>{formatCurrency(v)}</span>
                </div>
              ))}
              <div className="slide-pay__row slide-pay__row--total">
                <span>Total</span>
                <span>{formatCurrency(p.payment.downPayment + p.payment.progressPayments + p.payment.dueUponInvoicing)}</span>
              </div>
            </div>
          )}
          <Foot p={p} />
        </Slide>
      )}

      {/* ------------------------- PROJECT DETAIL QUOTES ------------------------- */}
      {detailProjects.map((pr) => {
        const pages = chunk(pr.lines, LINES_PER_SLIDE)
        return pages.map((lines: ProjectLine[], pi) => (
          <Slide key={`${pr.id}-${pi}`}>
            <Head
              eyebrow={`Project Quote${pr.number ? ` · ${pr.number}` : ''}`}
              title={`${pr.title || 'Project'}${pages.length > 1 ? ` (cont. ${pi + 1}/${pages.length})` : ''}`}
              sub={pr.location || undefined}
            />
            {pi === 0 && pr.description && <p className="slide-lede">{pr.description}</p>}
            <table className="slide-pqtable">
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
                  <tr key={l.id} className={`${l.isNote ? 'noterow' : ''} ${l.excludeFromTotal ? 'exclrow' : ''}`}>
                    <td className="code">{l.code}</td>
                    <td>
                      {l.description}
                      {l.excludeFromTotal && <span className="excltag">comparison — not included</span>}
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
              <div className="slide-totals">
                <div className="row">
                  <span>Subtotal</span>
                  <span>{formatCurrency(projectSubtotal(pr))}</span>
                </div>
                <div className="row">
                  <span>Sales tax ({pr.taxRate || 0}%)</span>
                  <span>{formatCurrency(projectTax(pr))}</span>
                </div>
                <div className="row grand">
                  <span>Project total</span>
                  <span>{formatCurrency(projectTotal(pr))}</span>
                </div>
              </div>
            )}
            <Foot p={p} />
          </Slide>
        ))
      })}

      {/* ------------------------- EQUIPMENT (legacy items) ------------------------- */}
      {itemPages.map((group, gi) => (
        <Slide key={`items-${gi}`}>
          {gi === 0 && <Head eyebrow="The system" title="Equipment & services" />}
          {group.map((item) => {
            const hasImg = !!item.imageUrl
            const specs = item.specs.filter((s) => s.label || s.value)
            const hl = item.highlights.filter(Boolean)
            const discounted = item.discountPct > 0
            return (
              <div className={`slide-item ${hasImg ? '' : 'slide-item--noimg'}`} key={item.id}>
                {hasImg && (
                  <div className="slide-item__media">
                    <img src={item.imageUrl} alt={item.name} />
                  </div>
                )}
                <div className="slide-item__body">
                  <div className="slide-item__cat">{categoryLabel(item.category)}</div>
                  <h3 className="slide-item__name">{item.name || 'Untitled item'}</h3>
                  {item.summary && <p className="slide-item__summary">{item.summary}</p>}
                  {item.description && <p className="slide-item__desc">{item.description}</p>}
                  {specs.length > 0 && (
                    <div className="slide-item__specs">
                      {specs.map((s) => (
                        <div className="slide-item__spec" key={s.id}>
                          <span className="k">{s.label}</span>
                          <span className="v">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {hl.length > 0 && (
                    <ul className="slide-item__hl">
                      {hl.map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  )}
                  <div className="slide-item__price">
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
              </div>
            )
          })}
          <Foot p={p} />
        </Slide>
      ))}

      {/* ----------------------------- PRICING (legacy) ----------------------------- */}
      {p.settings.showPricing && p.lineItems.length > 0 && (
        <Slide>
          <Head eyebrow="Investment" title="Pricing summary" />
          <table className="slide-ptable">
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
                  <td>{item.name || 'Untitled item'}</td>
                  <td className="num">
                    {formatNumber(item.quantity)} {item.unit}
                  </td>
                  <td className="num">{formatCurrency(item.unitPrice)}</td>
                  <td className="num">{formatCurrency(lineNet(item))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="slide-totals">
            <div className="row">
              <span>Subtotal</span>
              <span>{formatCurrency(totals.gross)}</span>
            </div>
            {totals.discount > 0 && (
              <div className="row disc">
                <span>Discount</span>
                <span>−{formatCurrency(totals.discount)}</span>
              </div>
            )}
            {totals.freight > 0 && (
              <div className="row">
                <span>Freight / mobilization</span>
                <span>{formatCurrency(totals.freight)}</span>
              </div>
            )}
            <div className="row">
              <span>Tax ({p.settings.taxRate}%)</span>
              <span>{formatCurrency(totals.tax)}</span>
            </div>
            <div className="row grand">
              <span>Total investment</span>
              <span>{formatCurrency(totals.grandTotal)}</span>
            </div>
          </div>
          <Foot p={p} />
        </Slide>
      )}

      {/* ----------------------------- TERMS ----------------------------- */}
      <Slide>
        <Head eyebrow="The agreement" title="Terms & acceptance" />
        <ul className="slide-terms">
          {p.terms.filter(Boolean).map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
        <div className="slide-sign">
          <div className="slide-sign__line">Accepted by (customer signature &amp; date)</div>
          <div className="slide-sign__line">
            {B.name} — {p.preparedBy.repName || 'Authorized representative'}
          </div>
        </div>
        <Foot p={p} />
      </Slide>

      {/* ----------------------------- CLOSING ----------------------------- */}
      <Slide className="slide--closing">
        <img className="slide-closing__logo" src={B.logos.white} alt={B.name} />
        <div className="slide-closing__eyebrow">Let's get water where it's needed</div>
        <h2 className="slide-closing__title">Put Lad to the test.</h2>
        <p className="slide-closing__body">
          Meet with our design team to turn your operation's needs into a custom irrigation plan. We build systems meant
          to run for decades — and we're close by when you need us.
        </p>
        <div className="slide-closing__contact">
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
      </Slide>
    </>
  )
}
