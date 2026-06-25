import type { Proposal } from '../types'
import { LAD_BRAND } from '../theme/brand'
import { SERVICE_CATEGORIES, categoryLabel } from '../data/reference'
import { Icon } from '../ui/Icon'
import { computeTotals, lineGross, lineNet } from '../lib/pricing'
import { formatCurrency, formatDate, formatNumber } from '../lib/util'

const B = LAD_BRAND

/** Split an array into chunks of n. */
function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
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

export function Presentation({ proposal }: { proposal: Proposal }) {
  const p = proposal
  const totals = computeTotals(p)
  const activeServices = SERVICE_CATEGORIES.filter((s) => p.services.includes(s.id))
  const itemPages = chunk(p.lineItems, 2)

  const showAbout = p.settings.showAbout && (p.aboutBody.filter(Boolean).length > 0 || p.team.length > 0)
  const contentPages =
    1 /* services */ +
    (showAbout ? 1 : 0) +
    itemPages.length +
    (p.settings.showPricing && p.lineItems.length ? 1 : 0) +
    1 /* terms */
  const totalSheets = 1 /* cover */ + contentPages + 1 /* closing */
  let pageNo = 1

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
      <section className="sheet cover">
        <img className="cover__photo" src={B.photos.pivotSunset} alt="" />
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
              {p.lineItems.length > 0 && (
                <div className="cover__metaitem">
                  <div className="k">Investment</div>
                  <div className="v">{formatCurrency(totals.grandTotal)}</div>
                </div>
              )}
            </div>
            <img className="cover__badge" src={B.logos.employeeOwned} alt="Employee Owned" />
          </div>
        </div>
      </section>

      {/* --------------------------- SERVICES + PROOF + SCOPE --------------------------- */}
      <section className="sheet page-subtle">
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
              <div className="proof__big">8</div>
              <div className="proof__lbl">Stores across eastern Washington, close to your field.</div>
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

      {/* --------------------------- ABOUT US & TEAM --------------------------- */}
      {showAbout && (
        <section className="sheet page-subtle">
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
                <img className="about__badge" src={B.logos.employeeOwned} alt="Employee Owned" />
              </div>
            </div>

            {p.team.length > 0 && (
              <>
                <p className="eyebrow" style={{ marginTop: 36, marginBottom: 14 }}>
                  The team on your project
                </p>
                <div className={`team team--${Math.min(p.team.length, 4)}`}>
                  {p.team.map((m) => (
                    <div className="member" key={m.id}>
                      <div className="member__avatar">
                        {m.photoUrl ? <img src={m.photoUrl} alt={m.name} /> : <span>{initials(m.name) || '—'}</span>}
                      </div>
                      <div className="member__name">{m.name || 'Team member'}</div>
                      {m.title && <div className="member__title">{m.title}</div>}
                      {m.credential && <div className="member__cred">{m.credential}</div>}
                    </div>
                  ))}
                </div>
              </>
            )}

            <Foot p={p} page={++pageNo} total={totalSheets} />
          </div>
        </section>
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
