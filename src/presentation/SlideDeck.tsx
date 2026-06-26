/**
 * On-screen slide deck — a 16:9 live preview that mirrors the PowerPoint
 * export (src/lib/pptx.ts). Each .slide is 1280×720px (13.333"×7.5" @96dpi),
 * the same geometry as the exported .pptx, so what you see here is what the
 * deck looks like in PowerPoint.
 */
import type { Proposal } from '../types'
import { LAD_BRAND } from '../theme/brand'
import { SERVICE_CATEGORIES, categoryLabel } from '../data/reference'
import { LAD_STORES, LAD_HOURS } from '../data/stores'
import { computeTotals, lineNet } from '../lib/pricing'
import { formatCurrency, formatDate, formatNumber } from '../lib/util'

const B = LAD_BRAND

function Slide({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`slide ${className}`}>{children}</section>
}

function Head({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="slide__head">
      <p className="slide__eyebrow">{eyebrow}</p>
      <h2 className="slide__title">{title}</h2>
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
  const activeServices = SERVICE_CATEGORIES.filter((s) => p.services.includes(s.id))
  const services = (activeServices.length ? activeServices : SERVICE_CATEGORIES.slice(0, 6)).slice(0, 6)
  const showAbout = p.settings.showAbout && (p.aboutBody.filter(Boolean).length > 0 || p.team.length > 0)

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
        <img className="slide-cover__photo" src={B.photos.pivotSunset} alt="" />
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
            {p.lineItems.length > 0 && (
              <div className="slide-cover__metaitem">
                <div className="k">Investment</div>
                <div className="v">{formatCurrency(totals.grandTotal)}</div>
              </div>
            )}
          </div>
          <img className="slide-cover__badge" src={B.logos.employeeOwned} alt="Employee Owned" />
        </div>
      </Slide>

      {/* ---------------------------- SERVICES ---------------------------- */}
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
        <Foot p={p} />
      </Slide>

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
      {p.settings.showStores && (
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

      {/* ------------------------- EQUIPMENT (one per item) ------------------------- */}
      {p.lineItems.map((item, idx) => {
        const hasImg = !!item.imageUrl
        const specs = item.specs.filter((s) => s.label || s.value)
        const hl = item.highlights.filter(Boolean)
        return (
          <Slide key={item.id}>
            {idx === 0 && <Head eyebrow="The system" title="Equipment & services" />}
            <div className={`slide-item ${hasImg ? '' : 'slide-item--noimg'} ${idx === 0 ? 'slide-item--withhead' : ''}`}>
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
                  </span>
                  <span className="amt">{formatCurrency(lineNet(item))}</span>
                </div>
              </div>
            </div>
            <Foot p={p} />
          </Slide>
        )
      })}

      {/* ----------------------------- PRICING ----------------------------- */}
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
            <div className="valid">
              Valid {p.meta.validForDays} days from {formatDate(p.meta.date)}.
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
