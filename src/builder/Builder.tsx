import { useState } from 'react'
import { useProposal } from '../state/proposal'
import { LAD_BRAND } from '../theme/brand'
import { SERVICE_CATEGORIES, QUICK_ADD_TEMPLATES, categoryLabel } from '../data/reference'
import { LAD_TEAM, type RosterPerson } from '../data/team'
import type { LineItem } from '../types'
import { Icon } from '../ui/Icon'
import { uid, formatCurrency, cls } from '../lib/util'
import { Text, Area, Num } from './controls'
import { LineItemEditor } from './LineItemEditor'

const STEPS = ['Setup', 'Customer', 'Services', 'Team', 'Items', 'Pricing'] as const

export function Builder() {
  const { proposal, setProposal, reset } = useProposal()
  const [step, setStep] = useState(0)
  const p = proposal

  // ---- field helpers bound to nested proposal objects ----
  const meta = (patch: Partial<typeof p.meta>) => setProposal({ ...p, meta: { ...p.meta, ...patch } })
  const cust = (patch: Partial<typeof p.customer>) => setProposal({ ...p, customer: { ...p.customer, ...patch } })
  const rep = (patch: Partial<typeof p.preparedBy>) => setProposal({ ...p, preparedBy: { ...p.preparedBy, ...patch } })
  const settings = (patch: Partial<typeof p.settings>) => setProposal({ ...p, settings: { ...p.settings, ...patch } })

  const toggleService = (id: string) =>
    setProposal({
      ...p,
      services: p.services.includes(id) ? p.services.filter((s) => s !== id) : [...p.services, id],
    })

  // ---- line items ----
  const addBlank = (kind: LineItem['kind']) =>
    setProposal({
      ...p,
      lineItems: [
        ...p.lineItems,
        {
          id: uid('li'),
          kind,
          category: kind === 'service' ? 'install' : 'pivot',
          name: '',
          summary: '',
          description: '',
          specs: [{ id: uid('sp'), label: '', value: '' }],
          imageUrl: '',
          quantity: 1,
          unit: kind === 'service' ? 'lot' : 'ea',
          unitPrice: 0,
          discountPct: 0,
          highlights: [''],
        },
      ],
    })
  const addTemplate = (ti: number) => {
    const t = QUICK_ADD_TEMPLATES[ti]
    setProposal({
      ...p,
      lineItems: [
        ...p.lineItems,
        { ...t, id: uid('li'), specs: t.specs.map((s) => ({ ...s, id: uid('sp') })), highlights: [...t.highlights] },
      ],
    })
  }
  const updateItem = (id: string, next: LineItem) =>
    setProposal({ ...p, lineItems: p.lineItems.map((i) => (i.id === id ? next : i)) })
  const removeItem = (id: string) => setProposal({ ...p, lineItems: p.lineItems.filter((i) => i.id !== id) })

  // ---- editable string-array helpers (about body, scope notes, terms) ----
  type StrArrKey = 'scopeNotes' | 'terms' | 'aboutBody'
  const arrEdit = (key: StrArrKey, i: number, v: string) =>
    setProposal({ ...p, [key]: p[key].map((t, ti) => (ti === i ? v : t)) })
  const arrAdd = (key: StrArrKey) => setProposal({ ...p, [key]: [...p[key], ''] })
  const arrRemove = (key: StrArrKey, i: number) =>
    setProposal({ ...p, [key]: p[key].filter((_, ti) => ti !== i) })

  // ---- team member helpers ----
  const addMember = (seed?: Partial<import('../types').TeamMember>) =>
    setProposal({
      ...p,
      team: [
        ...p.team,
        { id: uid('tm'), name: '', title: '', photoUrl: '', credential: '', bio: '', ...seed },
      ],
    })
  const updateMember = (id: string, patch: Partial<import('../types').TeamMember>) =>
    setProposal({ ...p, team: p.team.map((m) => (m.id === id ? { ...m, ...patch } : m)) })
  const removeMember = (id: string) => setProposal({ ...p, team: p.team.filter((m) => m.id !== id) })
  const inTeam = (name: string) => p.team.some((m) => m.name === name)
  const toggleRoster = (person: RosterPerson) =>
    inTeam(person.name)
      ? setProposal({ ...p, team: p.team.filter((m) => m.name !== person.name) })
      : addMember({ name: person.name, title: person.title, credential: person.credential, bio: person.bio, photoUrl: person.photo })

  return (
    <aside className="builder">
      <div className="builder__brand">
        <img className="builder__logo" src={LAD_BRAND.logos.primary} alt="Lad Irrigation" />
        <div className="builder__brandsub">
          Proposal
          <br />
          Builder
        </div>
      </div>

      <nav className="steps">
        {STEPS.map((s, i) => (
          <button
            key={s}
            className={cls('step', i === step && 'step--active', i < step && 'step--done')}
            onClick={() => setStep(i)}
          >
            <span className="step__num">{i < step ? <Icon name="check" size={11} /> : i + 1}</span>
            {s}
          </button>
        ))}
      </nav>

      <div className="builder__body">
        {/* ---------------------------- STEP 0 · SETUP ---------------------------- */}
        {step === 0 && (
          <div>
            <h2 className="section-title">Proposal setup</h2>
            <p className="section-hint">The basics that appear on the cover and footer.</p>
            <Text label="Proposal title" value={p.meta.title} onChange={(v) => meta({ title: v })} />
            <div className="field-row">
              <Text label="Proposal #" value={p.meta.number} onChange={(v) => meta({ number: v })} />
              <div className="field">
                <label>Date</label>
                <input type="date" value={p.meta.date} onChange={(e) => meta({ date: e.target.value })} />
              </div>
            </div>
            <Num label="Valid for" suffix="days" value={p.meta.validForDays} onChange={(v) => meta({ validForDays: v })} />
            <div className="mini-label" style={{ color: 'rgba(233,241,246,.65)' }}>
              Prepared by
            </div>
            <Text label="Your name" value={p.preparedBy.repName} onChange={(v) => rep({ repName: v })} />
            <Text label="Title" value={p.preparedBy.repTitle} onChange={(v) => rep({ repTitle: v })} />
            <div className="field-row">
              <Text label="Phone" value={p.preparedBy.repPhone} onChange={(v) => rep({ repPhone: v })} />
              <Text label="Email" value={p.preparedBy.repEmail} onChange={(v) => rep({ repEmail: v })} />
            </div>
          </div>
        )}

        {/* ---------------------------- STEP 1 · CUSTOMER ---------------------------- */}
        {step === 1 && (
          <div>
            <h2 className="section-title">Customer</h2>
            <p className="section-hint">Who this proposal is for — shown on the cover.</p>
            <Text label="Company / operation" value={p.customer.company} onChange={(v) => cust({ company: v })} placeholder="e.g. Columbia Basin Farms" />
            <Text label="Location" value={p.customer.location} onChange={(v) => cust({ location: v })} placeholder="e.g. Quincy, WA" />
            <div className="field-row">
              <Text label="Contact name" value={p.customer.contactName} onChange={(v) => cust({ contactName: v })} />
              <Text label="Contact title" value={p.customer.contactTitle} onChange={(v) => cust({ contactTitle: v })} />
            </div>
            <div className="field-row">
              <Text label="Email" value={p.customer.email} onChange={(v) => cust({ email: v })} />
              <Text label="Phone" value={p.customer.phone} onChange={(v) => cust({ phone: v })} />
            </div>
          </div>
        )}

        {/* ---------------------------- STEP 2 · SERVICES ---------------------------- */}
        {step === 2 && (
          <div>
            <h2 className="section-title">Services &amp; message</h2>
            <p className="section-hint">Pick what you'll deliver. These render as the cards on the services page.</p>
            <div className="chips">
              {SERVICE_CATEGORIES.map((s) => (
                <button
                  key={s.id}
                  className={cls('chip', p.services.includes(s.id) && 'chip--on')}
                  onClick={() => toggleService(s.id)}
                >
                  <span className="chip__dot" />
                  {s.label}
                </button>
              ))}
            </div>

            <div style={{ height: 18 }} />
            <Area label="Cover message" rows={4} value={p.coverMessage} onChange={(v) => setProposal({ ...p, coverMessage: v })} />

            <div className="mini-label" style={{ color: 'rgba(233,241,246,.65)' }}>
              Our approach (one line each)
            </div>
            {p.scopeNotes.map((n, i) => (
              <div className="spec-row" key={i} style={{ gridTemplateColumns: '1fr 32px' }}>
                <input value={n} onChange={(e) => arrEdit('scopeNotes', i, e.target.value)} />
                <button className="icon-btn" onClick={() => arrRemove('scopeNotes', i)}>
                  <Icon name="trash" size={14} />
                </button>
              </div>
            ))}
            <button className="btn btn--ghost btn--sm" onClick={() => arrAdd('scopeNotes')}>
              <Icon name="plus" size={14} /> Add line
            </button>
          </div>
        )}

        {/* ---------------------------- STEP 3 · TEAM ---------------------------- */}
        {step === 3 && (
          <div>
            <h2 className="section-title">About us &amp; team</h2>
            <p className="section-hint">Your company story and the people on this project. Pre-filled in Lad's voice — edit freely.</p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              <label className="chip">
                <input
                  type="checkbox"
                  checked={p.settings.showAbout}
                  onChange={(e) => settings({ showAbout: e.target.checked })}
                  style={{ width: 'auto' }}
                />
                Include the About Us &amp; Team page
              </label>
              <label className="chip">
                <input
                  type="checkbox"
                  checked={p.settings.showStores}
                  onChange={(e) => settings({ showStores: e.target.checked })}
                  style={{ width: 'auto' }}
                />
                Include the Locations page
              </label>
            </div>

            <Text label="About heading" value={p.aboutHeading} onChange={(v) => setProposal({ ...p, aboutHeading: v })} />
            <div className="mini-label" style={{ color: 'rgba(233,241,246,.65)' }}>
              Our story (one paragraph each)
            </div>
            {p.aboutBody.map((para, i) => (
              <div className="spec-row" key={i} style={{ gridTemplateColumns: '1fr 32px', alignItems: 'start' }}>
                <textarea rows={3} value={para} onChange={(e) => arrEdit('aboutBody', i, e.target.value)} />
                <button className="icon-btn" onClick={() => arrRemove('aboutBody', i)}>
                  <Icon name="trash" size={14} />
                </button>
              </div>
            ))}
            <button className="btn btn--ghost btn--sm" onClick={() => arrAdd('aboutBody')}>
              <Icon name="plus" size={14} /> Add paragraph
            </button>

            <div className="mini-label" style={{ color: 'rgba(233,241,246,.65)' }}>
              Add from the Lad roster
            </div>
            <div className="roster">
              {LAD_TEAM.map((person) => {
                const on = inTeam(person.name)
                return (
                  <button
                    key={person.name}
                    className={cls('roster__item', on && 'roster__item--on')}
                    onClick={() => toggleRoster(person)}
                    title={on ? 'Remove from proposal' : 'Add to proposal'}
                  >
                    <img src={person.photo} alt={person.name} loading="lazy" />
                    <span className="roster__name">{person.name}</span>
                    {on && (
                      <span className="roster__check">
                        <Icon name="check" size={12} />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="mini-label" style={{ color: 'rgba(233,241,246,.65)' }}>
              The team on this project
            </div>
            {p.team.length === 0 ? (
              <div className="help-empty">No team members yet. Add people below — headshots are optional (initials show otherwise).</div>
            ) : (
              p.team.map((m, i) => (
                <div className="li-card" key={m.id}>
                  <div className="li-card__head">
                    <span className="li-card__kind" data-kind="service">
                      person · {String(i + 1).padStart(2, '0')}
                    </span>
                    <button className="icon-btn" onClick={() => removeMember(m.id)} title="Remove">
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                  <div className="field-row">
                    <Text label="Name" value={m.name} onChange={(v) => updateMember(m.id, { name: v })} />
                    <Text label="Title" value={m.title} onChange={(v) => updateMember(m.id, { title: v })} />
                  </div>
                  <Text label="Credential / focus (optional)" value={m.credential} onChange={(v) => updateMember(m.id, { credential: v })} placeholder="e.g. 20 yrs · Pump systems" />
                  <Area label="Short bio (optional)" rows={2} value={m.bio} onChange={(v) => updateMember(m.id, { bio: v })} placeholder="1–2 sentences about this person." />
                  <Text label="Headshot URL (optional)" value={m.photoUrl} onChange={(v) => updateMember(m.id, { photoUrl: v })} placeholder="https://…" />
                </div>
              ))
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button className="btn btn--ghost btn--sm" onClick={() => addMember()}>
                <Icon name="plus" size={14} /> Add member
              </button>
              {(p.preparedBy.repName || p.preparedBy.repTitle) && (
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => addMember({ name: p.preparedBy.repName, title: p.preparedBy.repTitle })}
                >
                  <Icon name="plus" size={14} /> Add me
                </button>
              )}
            </div>
          </div>
        )}

        {/* ---------------------------- STEP 4 · ITEMS ---------------------------- */}
        {step === 4 && (
          <div>
            <h2 className="section-title">Products &amp; services</h2>
            <p className="section-hint">Add line items. Start from a quick-add template, then edit everything.</p>

            <div className="mini-label" style={{ color: 'rgba(233,241,246,.65)', marginTop: 0 }}>
              Quick add
            </div>
            <div className="template-grid">
              {QUICK_ADD_TEMPLATES.map((t, i) => (
                <button className="template" key={i} onClick={() => addTemplate(i)}>
                  <span className="template__name">{t.name}</span>
                  <span className="template__meta">
                    {categoryLabel(t.category)} · {formatCurrency(t.unitPrice)}/{t.unit}
                  </span>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
              <button className="btn btn--ghost btn--sm" onClick={() => addBlank('product')}>
                <Icon name="plus" size={14} /> Blank product
              </button>
              <button className="btn btn--ghost btn--sm" onClick={() => addBlank('service')}>
                <Icon name="plus" size={14} /> Blank service
              </button>
            </div>

            {p.lineItems.length === 0 ? (
              <div className="help-empty">No items yet. Add one above — it appears instantly in the preview.</div>
            ) : (
              p.lineItems.map((item, i) => (
                <LineItemEditor
                  key={item.id}
                  item={item}
                  index={i}
                  onChange={(next) => updateItem(item.id, next)}
                  onRemove={() => removeItem(item.id)}
                />
              ))
            )}
          </div>
        )}

        {/* ---------------------------- STEP 5 · PRICING ---------------------------- */}
        {step === 5 && (
          <div>
            <h2 className="section-title">Pricing &amp; terms</h2>
            <p className="section-hint">Tax, freight, and the terms shown on the acceptance page.</p>
            <div className="field-row">
              <Num label="Tax rate" suffix="%" value={p.settings.taxRate} step={0.1} onChange={(v) => settings({ taxRate: v })} />
              <Num label="Freight / mobilization" prefix="$" value={p.settings.freight} step={50} onChange={(v) => settings({ freight: v })} />
            </div>
            <label className="chip" style={{ marginBottom: 18 }}>
              <input
                type="checkbox"
                checked={p.settings.showPricing}
                onChange={(e) => settings({ showPricing: e.target.checked })}
                style={{ width: 'auto' }}
              />
              Include itemized pricing page
            </label>

            <div className="mini-label" style={{ color: 'rgba(233,241,246,.65)' }}>
              Terms &amp; conditions
            </div>
            {p.terms.map((t, i) => (
              <div className="spec-row" key={i} style={{ gridTemplateColumns: '1fr 32px', alignItems: 'start' }}>
                <textarea rows={2} value={t} onChange={(e) => arrEdit('terms', i, e.target.value)} />
                <button className="icon-btn" onClick={() => arrRemove('terms', i)}>
                  <Icon name="trash" size={14} />
                </button>
              </div>
            ))}
            <button className="btn btn--ghost btn--sm" onClick={() => arrAdd('terms')}>
              <Icon name="plus" size={14} /> Add term
            </button>

            <div style={{ height: 24 }} />
            <button className="btn btn--ghost btn--sm" onClick={() => confirm('Start a new blank proposal? This clears the current draft.') && reset()}>
              <Icon name="reset" size={14} /> Reset proposal
            </button>
          </div>
        )}
      </div>

      <div className="builder__footer">
        <button className="btn btn--ghost" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
          Back
        </button>
        <button
          className="btn btn--primary btn--block"
          disabled={step === STEPS.length - 1}
          onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
        >
          {step === STEPS.length - 1 ? 'Done' : `Next · ${STEPS[step + 1]}`}
        </button>
      </div>
    </aside>
  )
}
