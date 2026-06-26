import { useRef, useState } from 'react'
import { useProposal } from '../state/proposal'
import { LAD_BRAND } from '../theme/brand'
import { SERVICE_CATEGORIES } from '../data/reference'
import { LAD_TEAM, type RosterPerson } from '../data/team'
import type { Project } from '../types'
import { Icon } from '../ui/Icon'
import { uid, formatCurrency, cls } from '../lib/util'
import { uploadImageFile } from '../lib/uploads'
import { useAuth } from '../lib/auth'
import { investmentTotal } from '../lib/pricing'
import { segLossPsi } from '../lib/hydraulics'
import type { Hydraulics, PipeSegment, DesignToolkit } from '../types'
import { Text, Area, Num } from './controls'
import { ProjectEditor } from './ProjectEditor'
import { HydraulicsCalc } from './HydraulicsCalc'
import { CalculatorToolkit } from './CalculatorToolkit'

const STEPS = ['Setup', 'Customer', 'Services', 'Team', 'Map', 'Design', 'Projects', 'Analysis', 'Summary'] as const

export function Builder() {
  const { proposal, setProposal, reset } = useProposal()
  const { user } = useAuth()
  const [step, setStep] = useState(0)
  const mapFileRef = useRef<HTMLInputElement>(null)
  const p = proposal

  // ---- field helpers bound to nested proposal objects ----
  const meta = (patch: Partial<typeof p.meta>) => setProposal({ ...p, meta: { ...p.meta, ...patch } })
  const cust = (patch: Partial<typeof p.customer>) => setProposal({ ...p, customer: { ...p.customer, ...patch } })
  const rep = (patch: Partial<typeof p.preparedBy>) => setProposal({ ...p, preparedBy: { ...p.preparedBy, ...patch } })
  const settings = (patch: Partial<typeof p.settings>) => setProposal({ ...p, settings: { ...p.settings, ...patch } })
  const mapPatch = (patch: Partial<typeof p.map>) => setProposal({ ...p, map: { ...p.map, ...patch } })
  const analysisPatch = (patch: Partial<typeof p.analysis>) =>
    setProposal({ ...p, analysis: { ...p.analysis, ...patch } })
  const paymentPatch = (patch: Partial<typeof p.payment>) => setProposal({ ...p, payment: { ...p.payment, ...patch } })

  const toggleService = (id: string) =>
    setProposal({
      ...p,
      services: p.services.includes(id) ? p.services.filter((s) => s !== id) : [...p.services, id],
    })

  // ---- projects ----
  const addProject = () =>
    setProposal({
      ...p,
      projects: [
        ...p.projects,
        {
          id: uid('pr'),
          number: '',
          title: '',
          location: p.customer.location || '',
          description: '',
          mapUrl: '',
          lines: [{ id: uid('pl'), code: '', description: '', qty: 1, unit: 'ea', unitPrice: 0, isNote: false }],
          taxRate: p.settings.taxRate,
          showDetail: true,
        },
      ],
    })
  const updateProject = (id: string, next: Project) =>
    setProposal({ ...p, projects: p.projects.map((pr) => (pr.id === id ? next : pr)) })
  const removeProject = (id: string) => setProposal({ ...p, projects: p.projects.filter((pr) => pr.id !== id) })

  // ---- analysis rows ----
  const addRow = () =>
    analysisPatch({
      rows: [...p.analysis.rows, { id: uid('ar'), feature: '', exAt: '', exChange: '', newAt: '', newChange: '' }],
    })
  const updateRow = (id: string, patch: Partial<(typeof p.analysis.rows)[number]>) =>
    analysisPatch({ rows: p.analysis.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)) })
  const removeRow = (id: string) => analysisPatch({ rows: p.analysis.rows.filter((r) => r.id !== id) })

  // ---- hydraulic calculator ----
  const hydraulicsChange = (next: Hydraulics) => setProposal({ ...p, hydraulics: next })
  const designChange = (next: DesignToolkit) => setProposal({ ...p, design: next })
  const pushSegmentToAnalysis = (seg: PipeSegment) =>
    analysisPatch({
      rows: [
        ...p.analysis.rows,
        {
          id: uid('ar'),
          feature: seg.label || 'Pipe run',
          exAt: '',
          exChange: '',
          newAt: '',
          newChange: String(Math.round(segLossPsi(seg) * 10) / 10),
        },
      ],
    })

  const onPickMapImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      mapPatch({ imageUrl: await uploadImageFile(file, user?.uid, 'maps'), enabled: true })
    } catch {
      alert('Could not read that image. Try a JPG or PNG.')
    }
    e.target.value = ''
  }

  const autoSplitPayment = () => {
    const total = investmentTotal(p)
    paymentPatch({
      enabled: true,
      downPayment: Math.round(total * 0.3 * 100) / 100,
      progressPayments: Math.round(total * 0.5 * 100) / 100,
      dueUponInvoicing: Math.round(total * 0.2 * 100) / 100,
    })
  }

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

        {/* ---------------------------- STEP 4 · MAP ---------------------------- */}
        {step === 4 && (
          <div>
            <h2 className="section-title">Field map</h2>
            <p className="section-hint">Import a JPG/PNG site map. It appears as the second page with an engineering title block.</p>

            <label className="chip" style={{ marginBottom: 16 }}>
              <input
                type="checkbox"
                checked={p.map.enabled}
                onChange={(e) => mapPatch({ enabled: e.target.checked })}
                style={{ width: 'auto' }}
              />
              Include the field-map page
            </label>

            {p.map.imageUrl ? (
              <div className="upload-thumb upload-thumb--wide">
                <img src={p.map.imageUrl} alt="field map" />
                <button className="icon-btn" onClick={() => mapPatch({ imageUrl: '' })} title="Remove">
                  <Icon name="trash" size={14} />
                </button>
              </div>
            ) : (
              <button className="btn btn--ghost btn--block" onClick={() => mapFileRef.current?.click()}>
                <Icon name="map" size={15} /> Upload map image (JPG / PNG)
              </button>
            )}
            <input ref={mapFileRef} type="file" accept="image/png,image/jpeg" onChange={onPickMapImage} style={{ display: 'none' }} />

            <Text label="Caption" value={p.map.caption} onChange={(v) => mapPatch({ caption: v })} placeholder="e.g. Snake View Pipeline & Pump Replacement" />
            <div className="field-row">
              <Text label="Scale" value={p.map.scale} onChange={(v) => mapPatch({ scale: v })} placeholder="1 inch : 600 feet" />
              <Text label="Quotation / order #" value={p.map.quoteNumber} onChange={(v) => mapPatch({ quoteNumber: v })} />
            </div>
            <div className="field-row">
              <Text label="Designer" value={p.map.designer} onChange={(v) => mapPatch({ designer: v })} />
              <Text label="Drawn by" value={p.map.drawnBy} onChange={(v) => mapPatch({ drawnBy: v })} />
            </div>
          </div>
        )}

        {/* ---------------------------- STEP 5 · DESIGN ---------------------------- */}
        {step === 5 && (
          <div>
            <h2 className="section-title">Design calculators</h2>
            <p className="section-hint">Lad's system-design sheet, built in. Add the calculators this proposal needs — they compute live and can feed the analysis.</p>

            <HydraulicsCalc hydraulics={p.hydraulics} onChange={hydraulicsChange} onPushSegment={pushSegmentToAnalysis} />
            <CalculatorToolkit design={p.design} onChange={designChange} />
          </div>
        )}

        {/* ---------------------------- STEP 6 · PROJECTS ---------------------------- */}
        {step === 6 && (
          <div>
            <h2 className="section-title">Projects</h2>
            <p className="section-hint">Each project is a group of line items with one final cost. Add a project per pump station, mainline, farm, or scope.</p>

            {p.projects.length === 0 ? (
              <div className="help-empty">No projects yet. Add one below — it shows on the Investment Summary and gets its own detailed quote page.</div>
            ) : (
              p.projects.map((pr, i) => (
                <ProjectEditor
                  key={pr.id}
                  project={pr}
                  index={i}
                  uid={user?.uid}
                  onChange={(next) => updateProject(pr.id, next)}
                  onRemove={() => removeProject(pr.id)}
                />
              ))
            )}
            <button className="btn btn--primary btn--block" style={{ marginTop: 8 }} onClick={addProject}>
              <Icon name="plus" size={15} /> Add project
            </button>
          </div>
        )}

        {/* ---------------------------- STEP 7 · ANALYSIS ---------------------------- */}
        {step === 7 && (
          <div>
            <h2 className="section-title">Improvements analysis</h2>
            <p className="section-hint">The before / after comparison page. Enter each feature with its existing and new pressures, or push runs from the Design step.</p>

            <label className="chip" style={{ marginBottom: 16 }}>
              <input
                type="checkbox"
                checked={p.analysis.enabled}
                onChange={(e) => analysisPatch({ enabled: e.target.checked })}
                style={{ width: 'auto' }}
              />
              Include the Improvements Analysis page
            </label>

            <Text label="Heading" value={p.analysis.heading} onChange={(v) => analysisPatch({ heading: v })} />
            <div className="field-row">
              <Text label="Sub-head" value={p.analysis.subhead} onChange={(v) => analysisPatch({ subhead: v })} />
              <Text label="By" value={p.analysis.byLine} onChange={(v) => analysisPatch({ byLine: v })} />
            </div>
            <Text label="For (customer line)" value={p.analysis.forLine} onChange={(v) => analysisPatch({ forLine: v })} placeholder="For Frank Tiegs, LLC" />
            <div className="field-row">
              <Text label="Existing column" value={p.analysis.existingLabel} onChange={(v) => analysisPatch({ existingLabel: v })} placeholder="EXISTING @ 26,800 GPM" />
              <Text label="New column" value={p.analysis.newLabel} onChange={(v) => analysisPatch({ newLabel: v })} placeholder="NEW @ 32,000 GPM" />
            </div>
            <Area label="Summary" rows={3} value={p.analysis.summary} onChange={(v) => analysisPatch({ summary: v })} />
            <Area label="Conclusion" rows={3} value={p.analysis.conclusion} onChange={(v) => analysisPatch({ conclusion: v })} />

            <div className="mini-label" style={{ color: 'rgba(233,241,246,.65)' }}>
              Feature rows — pressure at point &amp; change to next point
            </div>
            {p.analysis.rows.map((r) => (
              <div className="li-card" key={r.id}>
                <div className="li-card__head">
                  <input style={{ fontWeight: 600 }} placeholder="Feature (e.g. River BP Suction)" value={r.feature} onChange={(e) => updateRow(r.id, { feature: e.target.value })} />
                  <button className="icon-btn" onClick={() => removeRow(r.id)} title="Remove">
                    <Icon name="trash" size={14} />
                  </button>
                </div>
                <div className="field-row">
                  <Text label="Existing — at point" value={r.exAt} onChange={(v) => updateRow(r.id, { exAt: v })} />
                  <Text label="Existing — change" value={r.exChange} onChange={(v) => updateRow(r.id, { exChange: v })} />
                </div>
                <div className="field-row">
                  <Text label="New — at point" value={r.newAt} onChange={(v) => updateRow(r.id, { newAt: v })} />
                  <Text label="New — change" value={r.newChange} onChange={(v) => updateRow(r.id, { newChange: v })} />
                </div>
              </div>
            ))}
            <button className="btn btn--ghost btn--sm" onClick={addRow}>
              <Icon name="plus" size={14} /> Add feature row
            </button>
          </div>
        )}

        {/* ---------------------------- STEP 8 · SUMMARY ---------------------------- */}
        {step === 8 && (
          <div>
            <h2 className="section-title">Summary &amp; terms</h2>
            <p className="section-hint">The investment rollup, payment schedule, page toggles, and acceptance terms.</p>

            <div className="pmini-totals" style={{ marginTop: 0 }}>
              <div className="pmini-totals__grand">
                <span>Total investment</span>
                <span>{formatCurrency(investmentTotal(p))}</span>
              </div>
            </div>

            <Text label="Summary subtitle" value={p.settings.summarySubtitle} onChange={(v) => settings({ summarySubtitle: v })} placeholder="Pump Station & Ancillary Infrastructure Upgrades" />

            <div className="mini-label" style={{ color: 'rgba(233,241,246,.65)' }}>
              Payment schedule
            </div>
            <label className="chip" style={{ marginBottom: 12 }}>
              <input type="checkbox" checked={p.payment.enabled} onChange={(e) => paymentPatch({ enabled: e.target.checked })} style={{ width: 'auto' }} />
              Include payment schedule
            </label>
            <div className="field-row">
              <Num label="Down payment" prefix="$" step={1000} value={p.payment.downPayment} onChange={(v) => paymentPatch({ downPayment: v })} />
              <Num label="Progress payments" prefix="$" step={1000} value={p.payment.progressPayments} onChange={(v) => paymentPatch({ progressPayments: v })} />
            </div>
            <Num label="Due upon invoicing" prefix="$" step={1000} value={p.payment.dueUponInvoicing} onChange={(v) => paymentPatch({ dueUponInvoicing: v })} />
            <button className="btn btn--ghost btn--sm" onClick={autoSplitPayment}>
              <Icon name="reset" size={14} /> Auto-split 30 / 50 / 20
            </button>

            <div className="mini-label" style={{ color: 'rgba(233,241,246,.65)' }}>
              Pages to include
            </div>
            <div className="chips">
              {([
                ['showServices', 'Services'],
                ['showAbout', 'About & team'],
                ['showStores', 'Locations'],
                ['showSummary', 'Investment summary'],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  className={cls('chip', p.settings[key] && 'chip--on')}
                  onClick={() => settings({ [key]: !p.settings[key] } as Partial<typeof p.settings>)}
                >
                  <span className="chip__dot" />
                  {label}
                </button>
              ))}
            </div>

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
