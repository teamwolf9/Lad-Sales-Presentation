import { useEffect, useRef, useState } from 'react'
import { useProposal } from '../state/proposal'
import { LAD_BRAND } from '../theme/brand'
import { SERVICE_CATEGORIES } from '../data/reference'
import { LAD_TEAM, type RosterPerson } from '../data/team'
import type { Project } from '../types'
import { Icon } from '../ui/Icon'
import { uid, formatCurrency, cls } from '../lib/util'
import { uploadImageFile, uploadDataUrl } from '../lib/uploads'
import {
  mapsEnabled,
  imageAspectOf,
  parseKml,
  captureViewForBounds,
  buildStaticMapUrl,
  imageUrlToDataUrl,
  kmlToMapData,
  mapScaleLabel,
} from '../lib/maps'
import { MapStage } from '../presentation/MapStage'
import { GoogleMapPicker } from './GoogleMapPicker'
import { ErrorBoundary } from '../ui/ErrorBoundary'
import { parseJobQuoteXml } from '../lib/importQuote'
import { useAuth } from '../lib/auth'
import { investmentTotal } from '../lib/pricing'
import { segLossPsi } from '../lib/hydraulics'
import type { Hydraulics, PipeSegment, DesignToolkit } from '../types'
import { Text, Area, Num } from './controls'
import { ProjectEditor } from './ProjectEditor'
import { HydraulicsCalc } from './HydraulicsCalc'
import { CalculatorToolkit } from './CalculatorToolkit'
import { CadStep } from './CadStep'

/** Step order mirrors the document's page order: cover → map → CAD →
 *  services → team → analysis → quotes → summary/terms. */
const STEPS = ['Setup', 'Customer', 'Map', 'Fields', 'Cad', 'Services', 'Team', 'Design', 'Analysis', 'Projects', 'Summary'] as const

/** Which document section each step is editing — drives the live-preview scroll/highlight.
 *  (Design edits the calculators whose output lands on the Analysis page.) */
const STEP_SECTIONS: string[] = ['cover', 'cover', 'map', 'map', 'cad', 'services', 'team', 'analysis', 'analysis', 'projects', 'summary']

export function Builder({ onSection }: { onSection?: (key: string) => void }) {
  const { proposal, setProposal, reset } = useProposal()
  const { user } = useAuth()
  const [step, setStep] = useState(0)
  const [mapPicker, setMapPicker] = useState(false)
  const [kmlBusy, setKmlBusy] = useState(false)
  const mapFileRef = useRef<HTMLInputElement>(null)
  const kmlFileRef = useRef<HTMLInputElement>(null)
  const p = proposal

  // Tell the preview which section this step corresponds to, so it scrolls/highlights it.
  useEffect(() => {
    onSection?.(STEP_SECTIONS[step] ?? 'cover')
  }, [step, onSection])

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

  // ---- import a Business Central job-quote XML as a project ----
  const quoteFileRef = useRef<HTMLInputElement>(null)
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; lines: string[] } | null>(null)
  // Auto-dismiss the import banner after a few seconds.
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 6000)
    return () => clearTimeout(t)
  }, [notice])

  const importQuoteFile = async (file: File) => {
    try {
      const text = await file.text()
      const { meta, customer, projects, notes } = parseJobQuoteXml(text, p.settings.taxRate)
      setProposal((prev) => ({
        ...prev,
        projects: [...prev.projects, ...projects],
        // Pre-fill empty header + customer fields from the quote.
        meta: {
          ...prev.meta,
          number: prev.meta.number || meta.number,
        },
        customer: {
          ...prev.customer,
          company: prev.customer.company || customer.company,
          location: prev.customer.location || customer.location,
          contactName: prev.customer.contactName || customer.contactName,
        },
        settings: { ...prev.settings, showSummary: true },
      }))
      setNotice({ kind: 'ok', lines: [`Imported ${projects.length} project${projects.length === 1 ? '' : 's'}`, ...notes] })
      setStep(7) // jump to Projects so the new project is visible
    } catch (err) {
      console.error('Quote import failed', err)
      setNotice({ kind: 'err', lines: [`Couldn't import that file.`, err instanceof Error ? err.message : 'Unknown error.'] })
    }
  }
  const onQuotePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void importQuoteFile(file)
    e.target.value = '' // allow re-importing the same filename
  }

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
      const url = await uploadImageFile(file, user?.uid, 'maps')
      const aspect = await imageAspectOf(url)
      mapPatch({ imageUrl: url, imageAspect: aspect, enabled: true })
    } catch {
      alert('Could not read that image. Try a JPG or PNG.')
    }
    e.target.value = ''
  }

  const onMapCapture = async (
    dataUrl: string,
    aspect: number,
    scale: string,
    annotations?: import('../types').MapAnnotation[],
    fields?: import('../types').PivotField[],
  ) => {
    try {
      const url = await uploadDataUrl(dataUrl, user?.uid, 'maps')
      // KML import returns editable annotations + pivot fields projected onto this capture.
      mapPatch({
        imageUrl: url,
        imageAspect: aspect,
        scale,
        enabled: true,
        ...(annotations ? { annotations } : {}),
        ...(fields ? { fields } : {}),
      })
    } catch {
      alert('Could not save the captured map. Please try again.')
    }
    setMapPicker(false)
  }

  // ---- standalone KML import (no interactive map) ----
  // Parse a Valmont KML, auto-frame its bounds, capture a satellite still of that
  // exact view, and project the shapes + pivot fields onto it — one button.
  const onImportKmlFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-importing the same filename
    if (!file) return
    setKmlBusy(true)
    try {
      if (/\.kmz$/i.test(file.name)) throw new Error('KMZ isn’t supported — unzip it and import the .kml inside.')
      const features = parseKml(await file.text())
      if (!features.bounds) throw new Error('That KML has no map shapes to place.')
      const view = captureViewForBounds(features.bounds)
      const url = buildStaticMapUrl({ lat: view.lat, lng: view.lng, zoom: view.zoom, mapType: 'satellite', w: view.w, h: view.h })
      const dataUrl = await imageUrlToDataUrl(url)
      const saved = await uploadDataUrl(dataUrl, user?.uid, 'maps')
      const { annotations, fields } = kmlToMapData(features, view)
      mapPatch({
        imageUrl: saved,
        imageAspect: view.w / view.h,
        scale: mapScaleLabel(view.lat, view.zoom, view.w),
        enabled: true,
        annotations,
        fields,
      })
      setNotice({
        kind: 'ok',
        lines: [
          `Imported ${fields.filter((f) => !f.excluded).length} field${fields.filter((f) => !f.excluded).length === 1 ? '' : 's'} from KML`,
          'Edit names & acres on the Fields step.',
        ],
      })
    } catch (err) {
      console.error('KML import failed', err)
      setNotice({ kind: 'err', lines: ['Could not import that KML.', err instanceof Error ? err.message : 'Unknown error.'] })
    } finally {
      setKmlBusy(false)
    }
  }

  // ---- imported pivot fields (KML) ----
  const updateField = (id: string, patch: Partial<import('../types').PivotField>) =>
    mapPatch({ fields: p.map.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)) })
  const removeField = (id: string) =>
    mapPatch({ fields: p.map.fields.filter((f) => f.id !== id) })
  const addField = () =>
    mapPatch({ fields: [...p.map.fields, { id: uid('fld'), name: '', legendNo: p.map.fields.length + 1 }] })
  const totalIrrigated = p.map.fields.filter((f) => !f.excluded).reduce((s, f) => s + (f.acres || 0), 0)
  const totalExcluded = p.map.fields.filter((f) => f.excluded).reduce((s, f) => s + (f.acres || 0), 0)

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
            // Fire onSection directly too, so re-clicking the current step
            // re-scrolls the preview to its page (the effect only fires on change).
            onClick={() => {
              setStep(i)
              onSection?.(STEP_SECTIONS[i] ?? 'cover')
            }}
          >
            <span className="step__num">{i < step ? <Icon name="check" size={11} /> : i + 1}</span>
            {s}
          </button>
        ))}
      </nav>

      <div className="builder__body">
        {/* Shared hidden picker for Business Central quote import (used from Setup & Projects). */}
        <input ref={quoteFileRef} type="file" accept=".xml,text/xml,application/xml" onChange={onQuotePick} style={{ display: 'none' }} />

        {notice && (
          <div className={cls('import-notice', notice.kind === 'err' && 'import-notice--err')} role="status">
            <Icon name={notice.kind === 'ok' ? 'check' : 'trash'} size={15} />
            <div className="import-notice__body">
              {notice.lines.map((l, i) => (
                <div key={i} className={i === 0 ? 'import-notice__title' : undefined}>{l}</div>
              ))}
            </div>
            <button className="icon-btn" onClick={() => setNotice(null)} title="Dismiss">
              <Icon name="plus" size={14} className="import-notice__close" />
            </button>
          </div>
        )}

        {/* ---------------------------- STEP 0 · SETUP ---------------------------- */}
        {step === 0 && (
          <div>
            <h2 className="section-title">Proposal setup</h2>
            <p className="section-hint">The basics that appear on the cover and footer.</p>

            <div className="import-card">
              <div className="import-card__head">
                <Icon name="box" size={16} />
                <span>Start from a Business Central quote</span>
              </div>
              <p className="import-card__hint">
                Import a WSI Job Quote (.xml) to load its products &amp; services as a project — bill-to, line items, and
                tax come in automatically. You can keep adding items afterward.
              </p>
              <button className="btn btn--primary btn--sm" onClick={() => quoteFileRef.current?.click()}>
                <Icon name="plus" size={14} /> Import quote (.xml)
              </button>
            </div>

            <Text label="Proposal title" maxLength={70} value={p.meta.title} onChange={(v) => meta({ title: v })} />
            <div className="field-row">
              <Text label="Proposal #" maxLength={30} value={p.meta.number} onChange={(v) => meta({ number: v })} />
              <div className="field">
                <label>Date</label>
                <input type="date" value={p.meta.date} onChange={(e) => meta({ date: e.target.value })} />
              </div>
            </div>
            <Num label="Valid for" suffix="days" value={p.meta.validForDays} onChange={(v) => meta({ validForDays: v })} />
            <div className="mini-label" style={{ color: 'rgba(233,241,246,.65)' }}>
              Prepared by
            </div>
            <Text label="Your name" maxLength={50} value={p.preparedBy.repName} onChange={(v) => rep({ repName: v })} />
            <Text label="Title" maxLength={50} value={p.preparedBy.repTitle} onChange={(v) => rep({ repTitle: v })} />
            <div className="field-row">
              <Text label="Phone" maxLength={24} value={p.preparedBy.repPhone} onChange={(v) => rep({ repPhone: v })} />
              <Text label="Email" maxLength={80} value={p.preparedBy.repEmail} onChange={(v) => rep({ repEmail: v })} />
            </div>
          </div>
        )}

        {/* ---------------------------- STEP 1 · CUSTOMER ---------------------------- */}
        {step === 1 && (
          <div>
            <h2 className="section-title">Customer</h2>
            <p className="section-hint">Who this proposal is for — shown on the cover.</p>
            <Text label="Company / operation" maxLength={60} value={p.customer.company} onChange={(v) => cust({ company: v })} placeholder="e.g. Columbia Basin Farms" />
            <Text label="Location" maxLength={70} value={p.customer.location} onChange={(v) => cust({ location: v })} placeholder="e.g. Quincy, WA" />
            <div className="field-row">
              <Text label="Contact name" maxLength={50} value={p.customer.contactName} onChange={(v) => cust({ contactName: v })} />
              <Text label="Contact title" maxLength={50} value={p.customer.contactTitle} onChange={(v) => cust({ contactTitle: v })} />
            </div>
            <div className="field-row">
              <Text label="Email" maxLength={80} value={p.customer.email} onChange={(v) => cust({ email: v })} />
              <Text label="Phone" maxLength={24} value={p.customer.phone} onChange={(v) => cust({ phone: v })} />
            </div>
          </div>
        )}

        {/* ---------------------------- STEP 5 · SERVICES ---------------------------- */}
        {step === 5 && (
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
            <Area label="Cover message" rows={4} maxLength={420} value={p.coverMessage} onChange={(v) => setProposal({ ...p, coverMessage: v })} />

            <div className="mini-label" style={{ color: 'rgba(233,241,246,.65)' }}>
              Our approach (one line each)
            </div>
            {p.scopeNotes.map((n, i) => (
              <div className="spec-row" key={i} style={{ gridTemplateColumns: '1fr 32px' }}>
                <input value={n} maxLength={140} onChange={(e) => arrEdit('scopeNotes', i, e.target.value)} />
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

        {/* ---------------------------- STEP 6 · TEAM ---------------------------- */}
        {step === 6 && (
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

            <Text label="About heading" maxLength={70} value={p.aboutHeading} onChange={(v) => setProposal({ ...p, aboutHeading: v })} />
            <div className="mini-label" style={{ color: 'rgba(233,241,246,.65)' }}>
              Our story (one paragraph each)
            </div>
            {p.aboutBody.map((para, i) => (
              <div className="spec-row" key={i} style={{ gridTemplateColumns: '1fr 32px', alignItems: 'start' }}>
                <textarea rows={3} maxLength={500} value={para} onChange={(e) => arrEdit('aboutBody', i, e.target.value)} />
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
                    <Text label="Name" maxLength={50} value={m.name} onChange={(v) => updateMember(m.id, { name: v })} />
                    <Text label="Title" maxLength={50} value={m.title} onChange={(v) => updateMember(m.id, { title: v })} />
                  </div>
                  <Text label="Credential / focus (optional)" maxLength={50} value={m.credential} onChange={(v) => updateMember(m.id, { credential: v })} placeholder="e.g. 20 yrs · Pump systems" />
                  <Area label="Short bio (optional)" rows={2} maxLength={240} value={m.bio} onChange={(v) => updateMember(m.id, { bio: v })} placeholder="1–2 sentences about this person." />
                  <Text label="Headshot URL (optional)" maxLength={400} value={m.photoUrl} onChange={(v) => updateMember(m.id, { photoUrl: v })} placeholder="https://…" />
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

        {/* ---------------------------- STEP 2 · MAP ---------------------------- */}
        {step === 2 && (
          <div>
            <h2 className="section-title">Field map</h2>
            <p className="section-hint">
              Pull a satellite view from Google Maps (or upload your own image), then add callout boxes, arrows and
              shapes. It appears as its own page with an engineering title block.
            </p>

            <label className="chip" style={{ marginBottom: 16 }}>
              <input
                type="checkbox"
                checked={p.map.enabled}
                onChange={(e) => mapPatch({ enabled: e.target.checked })}
                style={{ width: 'auto' }}
              />
              Include the field-map page
            </label>

            <ErrorBoundary label="Map tools failed to load" onReset={() => setMapPicker(false)}>
            {mapPicker ? (
              <GoogleMapPicker
                initialQuery={p.customer.location || p.customer.company}
                onCapture={onMapCapture}
                onCancel={() => setMapPicker(false)}
              />
            ) : p.map.imageUrl ? (
              <>
                <div className="map-thumb">
                  <MapStage map={p.map} />
                </div>
                <p className="section-hint" style={{ marginTop: 8 }}>
                  Add callout boxes, arrows and shapes directly on the large map in the live preview →
                </p>
                <div className="field-row" style={{ marginTop: 6 }}>
                  {mapsEnabled && (
                    <button className="btn btn--ghost btn--sm" onClick={() => setMapPicker(true)}>
                      <Icon name="map" size={15} /> Recapture from Google
                    </button>
                  )}
                  <button className="btn btn--ghost btn--sm" onClick={() => mapFileRef.current?.click()}>
                    <Icon name="plus" size={15} /> Replace image
                  </button>
                  {mapsEnabled && (
                    <button className="btn btn--ghost btn--sm" onClick={() => kmlFileRef.current?.click()} disabled={kmlBusy}>
                      <Icon name="map" size={15} /> {kmlBusy ? 'Importing…' : 'Import KML'}
                    </button>
                  )}
                  <button className="btn btn--ghost btn--sm" onClick={() => mapPatch({ imageUrl: '', annotations: [], fields: [] })}>
                    <Icon name="trash" size={15} /> Remove
                  </button>
                </div>
              </>
            ) : (
              <div className="map-source">
                {mapsEnabled && (
                  <button className="btn btn--primary btn--block" onClick={() => kmlFileRef.current?.click()} disabled={kmlBusy}>
                    <Icon name="map" size={15} /> {kmlBusy ? 'Importing KML…' : 'Import Valmont KML'}
                  </button>
                )}
                {mapsEnabled && (
                  <button className="btn btn--ghost btn--block" onClick={() => setMapPicker(true)}>
                    <Icon name="map" size={15} /> Pick a view from Google Maps
                  </button>
                )}
                <button className="btn btn--ghost btn--block" onClick={() => mapFileRef.current?.click()}>
                  <Icon name="plus" size={15} /> Upload map image (JPG / PNG)
                </button>
              </div>
            )}
            </ErrorBoundary>
            <input ref={mapFileRef} type="file" accept="image/png,image/jpeg" onChange={onPickMapImage} style={{ display: 'none' }} />
            <input ref={kmlFileRef} type="file" accept=".kml,application/vnd.google-earth.kml+xml,text/xml" onChange={onImportKmlFile} style={{ display: 'none' }} />

            <Text label="Caption" maxLength={70} value={p.map.caption} onChange={(v) => mapPatch({ caption: v })} placeholder="e.g. Snake View Pipeline & Pump Replacement" />
            <div className="field-row">
              <Text label="Scale" maxLength={30} value={p.map.scale} onChange={(v) => mapPatch({ scale: v })} placeholder="1 inch : 600 feet" />
              <Text label="Quotation / order #" maxLength={30} value={p.map.quoteNumber} onChange={(v) => mapPatch({ quoteNumber: v })} />
            </div>
            <div className="field-row">
              <Text label="Designer" maxLength={40} value={p.map.designer} onChange={(v) => mapPatch({ designer: v })} />
              <Text label="Drawn by" maxLength={40} value={p.map.drawnBy} onChange={(v) => mapPatch({ drawnBy: v })} />
            </div>
          </div>
        )}

        {/* ---------------------------- STEP 3 · FIELDS ---------------------------- */}
        {step === 3 && (
          <div>
            <h2 className="section-title">Fields &amp; pivots</h2>
            <p className="section-hint">
              Import a Valmont KML from the Map step and each pivot lands here — name, irrigated acres, radius and
              center. Edit freely; these feed the numbered markers and legend on the field-map page.
            </p>

            {p.map.fields.length === 0 ? (
              <div className="help-empty">
                No fields yet. On the <strong>Map</strong> step, choose <em>Import KML</em> in the Google picker to pull
                pivots from a Valmont design — or add one manually below.
              </div>
            ) : (
              <>
                <div className="fields-totals">
                  <div className="fields-totals__item">
                    <span className="k">Pivots</span>
                    <span className="v">{p.map.fields.filter((f) => !f.excluded).length}</span>
                  </div>
                  <div className="fields-totals__item">
                    <span className="k">Irrigated</span>
                    <span className="v">{totalIrrigated.toFixed(1)} ac</span>
                  </div>
                  {totalExcluded > 0 && (
                    <div className="fields-totals__item">
                      <span className="k">Excluded</span>
                      <span className="v">{totalExcluded.toFixed(1)} ac</span>
                    </div>
                  )}
                </div>

                <label className="chip" style={{ margin: '4px 0 14px' }}>
                  <input
                    type="checkbox"
                    checked={p.map.showLegend !== false}
                    onChange={(e) => mapPatch({ showLegend: e.target.checked })}
                    style={{ width: 'auto' }}
                  />
                  Show the numbered legend on the map page
                </label>

                {p.map.fields.map((f) => (
                  <div className="li-card" key={f.id}>
                    <div className="li-card__head">
                      <span className="li-card__kind" data-kind={f.excluded ? 'service' : 'product'}>
                        {f.excluded ? 'excluded' : `field · ${String(f.legendNo ?? '—').padStart(2, '0')}`}
                      </span>
                      <button className="icon-btn" onClick={() => removeField(f.id)} title="Remove">
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                    <Text label="Name" maxLength={60} value={f.name} onChange={(v) => updateField(f.id, { name: v })} />
                    <div className="field-row">
                      <Num label="Irrigated acres" suffix="ac" value={f.acres ?? 0} onChange={(v) => updateField(f.id, { acres: v })} />
                      <Num label="Radius" suffix="ft" value={f.radiusFeet ?? 0} onChange={(v) => updateField(f.id, { radiusFeet: v })} />
                    </div>
                    <label className="chip">
                      <input
                        type="checkbox"
                        checked={!!f.excluded}
                        onChange={(e) => updateField(f.id, { excluded: e.target.checked })}
                        style={{ width: 'auto' }}
                      />
                      Excluded / keep-out (not irrigated)
                    </label>
                  </div>
                ))}
              </>
            )}
            <button className="btn btn--ghost btn--sm" style={{ marginTop: 8 }} onClick={addField}>
              <Icon name="plus" size={14} /> Add field
            </button>
          </div>
        )}

        {/* ---------------------------- STEP 7 · DESIGN ---------------------------- */}
        {step === 7 && (
          <div>
            <h2 className="section-title">Design calculators</h2>
            <p className="section-hint">Lad's system-design sheet, built in. Add the calculators this proposal needs — they compute live and can feed the analysis.</p>

            <HydraulicsCalc hydraulics={p.hydraulics} onChange={hydraulicsChange} onPushSegment={pushSegmentToAnalysis} />
            <CalculatorToolkit design={p.design} onChange={designChange} />
          </div>
        )}

        {/* ---------------------------- STEP 4 · CAD ---------------------------- */}
        {step === 4 && (
          <CadStep cad={p.cad} uid={user?.uid} onChange={(next) => setProposal({ ...p, cad: next })} />
        )}

        {/* ---------------------------- STEP 9 · PROJECTS ---------------------------- */}
        {step === 9 && (
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
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn btn--primary btn--block" onClick={addProject}>
                <Icon name="plus" size={15} /> Add project
              </button>
              <button className="btn btn--ghost btn--block" onClick={() => quoteFileRef.current?.click()}>
                <Icon name="box" size={15} /> Import quote (.xml)
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------- STEP 8 · ANALYSIS ---------------------------- */}
        {step === 8 && (
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

            <Text label="Heading" maxLength={50} value={p.analysis.heading} onChange={(v) => analysisPatch({ heading: v })} />
            <div className="field-row">
              <Text label="Sub-head" maxLength={50} value={p.analysis.subhead} onChange={(v) => analysisPatch({ subhead: v })} />
              <Text label="By" maxLength={60} value={p.analysis.byLine} onChange={(v) => analysisPatch({ byLine: v })} />
            </div>
            <Text label="For (customer line)" maxLength={60} value={p.analysis.forLine} onChange={(v) => analysisPatch({ forLine: v })} placeholder="For Frank Tiegs, LLC" />
            <div className="field-row">
              <Text label="Existing column" maxLength={45} value={p.analysis.existingLabel} onChange={(v) => analysisPatch({ existingLabel: v })} placeholder="EXISTING @ 26,800 GPM" />
              <Text label="New column" maxLength={45} value={p.analysis.newLabel} onChange={(v) => analysisPatch({ newLabel: v })} placeholder="NEW @ 32,000 GPM" />
            </div>
            <Area label="Summary" rows={3} maxLength={600} value={p.analysis.summary} onChange={(v) => analysisPatch({ summary: v })} />
            <Area label="Conclusion" rows={3} maxLength={600} value={p.analysis.conclusion} onChange={(v) => analysisPatch({ conclusion: v })} />

            <div className="mini-label" style={{ color: 'rgba(233,241,246,.65)' }}>
              Feature rows — pressure at point &amp; change to next point
            </div>
            {p.analysis.rows.map((r) => (
              <div className="li-card" key={r.id}>
                <div className="li-card__head">
                  <input style={{ fontWeight: 600 }} maxLength={50} placeholder="Feature (e.g. River BP Suction)" value={r.feature} onChange={(e) => updateRow(r.id, { feature: e.target.value })} />
                  <button className="icon-btn" onClick={() => removeRow(r.id)} title="Remove">
                    <Icon name="trash" size={14} />
                  </button>
                </div>
                <div className="field-row">
                  <Text label="Existing — at point" maxLength={12} value={r.exAt} onChange={(v) => updateRow(r.id, { exAt: v })} />
                  <Text label="Existing — change" maxLength={12} value={r.exChange} onChange={(v) => updateRow(r.id, { exChange: v })} />
                </div>
                <div className="field-row">
                  <Text label="New — at point" maxLength={12} value={r.newAt} onChange={(v) => updateRow(r.id, { newAt: v })} />
                  <Text label="New — change" maxLength={12} value={r.newChange} onChange={(v) => updateRow(r.id, { newChange: v })} />
                </div>
              </div>
            ))}
            <button className="btn btn--ghost btn--sm" onClick={addRow}>
              <Icon name="plus" size={14} /> Add feature row
            </button>
          </div>
        )}

        {/* ---------------------------- STEP 10 · SUMMARY ---------------------------- */}
        {step === 10 && (
          <div>
            <h2 className="section-title">Summary &amp; terms</h2>
            <p className="section-hint">The investment rollup, payment schedule, page toggles, and acceptance terms.</p>

            <div className="pmini-totals" style={{ marginTop: 0 }}>
              <div className="pmini-totals__grand">
                <span>Total investment</span>
                <span>{formatCurrency(investmentTotal(p))}</span>
              </div>
            </div>

            <Text label="Summary subtitle" maxLength={90} value={p.settings.summarySubtitle} onChange={(v) => settings({ summarySubtitle: v })} placeholder="Pump Station & Ancillary Infrastructure Upgrades" />

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
                <textarea rows={2} maxLength={500} value={t} onChange={(e) => arrEdit('terms', i, e.target.value)} />
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
