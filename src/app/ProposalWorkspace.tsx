import { useEffect, useMemo, useRef, useState } from 'react'
import { Builder } from '../builder/Builder'
import { Presentation } from '../presentation/Presentation'
import { SlideDeck } from '../presentation/SlideDeck'
import { useProposal } from '../state/proposal'
import { useAuth } from '../lib/auth'
import { Icon } from '../ui/Icon'
import { cls } from '../lib/util'
import { MapEditContext, type MapTool } from '../presentation/mapEdit'
import { MapAnnotateToolbar } from '../presentation/MapAnnotateToolbar'
import type { MapAnnotation } from '../types'

/** Email-the-PDF dialog (To / CC / note → Postmark via the mail extension). */
function EmailDialog({ onClose }: { onClose: () => void }) {
  const { proposal } = useProposal()
  const { user, profile } = useAuth()
  const [to, setTo] = useState(proposal.customer.email || '')
  const [cc, setCc] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState('')

  const send = async () => {
    setBusy(true)
    setErr('')
    try {
      const { emailProposalPdf } = await import('../lib/email')
      const res = await emailProposalPdf(
        proposal,
        { to, cc, note },
        { uid: user!.uid, email: profile?.email || user?.email || '', name: profile?.displayName || profile?.email || '' },
      )
      setDone(`Sent to ${to}${res.adminsNotified ? ` · ${res.adminsNotified} admin${res.adminsNotified === 1 ? '' : 's'} notified` : ''}.`)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not send the email.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal no-print" onClick={() => !busy && onClose()}>
      <div className="modal__card" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h3>Email this proposal</h3>
          <button className="modal__x" onClick={() => !busy && onClose()} aria-label="Close">✕</button>
        </div>
        {done ? (
          <div>
            <div className="invite-sent" style={{ marginBottom: 14 }}>{done}</div>
            <button className="btn btn--primary btn--block" onClick={onClose}>Done</button>
          </div>
        ) : (
          <div className="emailform">
            <label>To</label>
            <input type="email" placeholder="customer@example.com" value={to} onChange={(e) => setTo(e.target.value)} />
            <label>CC <span className="emailform__opt">(optional, comma-separated)</span></label>
            <input type="text" placeholder="manager@example.com, ops@example.com" value={cc} onChange={(e) => setCc(e.target.value)} />
            <label>Message <span className="emailform__opt">(optional)</span></label>
            <textarea rows={3} placeholder="A short note to include in the email…" value={note} onChange={(e) => setNote(e.target.value)} />
            <p className="share__hint" style={{ marginTop: 4 }}>
              A PDF of this proposal is attached. All admins are notified that it was sent.
            </p>
            {err && <div className="share__err">{err}</div>}
            <button className="btn btn--primary btn--block" disabled={busy || !to} onClick={send}>
              <Icon name="mail" size={15} /> {busy ? 'Building & sending…' : 'Send PDF'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

type View = 'document' | 'slides'

function Preview({ activeSection }: { activeSection: string }) {
  const { proposal, setProposal, readOnly } = useProposal()
  const { enabled, profile } = useAuth()
  const [view, setView] = useState<View>('document')
  const [zoom, setZoom] = useState(0.62)
  const [exporting, setExporting] = useState(false)
  const [showEmail, setShowEmail] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Map annotation editing — happens on the big live document map.
  const [tool, setTool] = useState<MapTool>('select')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const mapEditing =
    !readOnly && view === 'document' && activeSection === 'map' && proposal.map.enabled && !!proposal.map.imageUrl

  const setAnnotations = (next: MapAnnotation[]) =>
    setProposal({ ...proposal, map: { ...proposal.map, annotations: next } })
  const mapEditValue = useMemo(
    () => ({ annotations: proposal.map.annotations ?? [], onChange: setAnnotations, tool, setTool, selectedId, setSelectedId, editingId, setEditingId }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [proposal, tool, selectedId, editingId],
  )

  const canEmail = enabled && !readOnly && (profile?.role === 'admin' || profile?.role === 'creator')

  // Signature of which optional sections are currently visible. Changes only when
  // a page is toggled/added (e.g. a map is uploaded) — NOT on ordinary typing —
  // so we can re-scroll to a section the moment it appears without yanking on edits.
  const sectionSig = [
    proposal.map.enabled && !!proposal.map.imageUrl,
    proposal.settings.showServices,
    proposal.analysis.enabled,
    proposal.settings.showAbout,
    proposal.settings.showStores,
    proposal.settings.showSummary && proposal.projects.length > 0,
    proposal.projects.length,
  ].join('|')

  // Scroll the live document to the section the current builder step is editing
  // (and re-run when that section first becomes visible).
  useEffect(() => {
    if (view !== 'document') return
    const container = scrollRef.current
    const target = container?.querySelector<HTMLElement>(`[data-doc-section="${activeSection}"]`)
    if (!container || !target) return
    const top = target.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - 24
    container.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  }, [activeSection, view, zoom, sectionSig])

  const handlePptx = async () => {
    setExporting(true)
    try {
      const { exportProposalPptx } = await import('../lib/pptx')
      await exportProposalPptx(proposal)
    } catch (err) {
      console.error('PowerPoint export failed', err)
      alert('Sorry — the PowerPoint export failed. Check the console for details.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <MapEditContext.Provider value={mapEditValue}>
    <main className="preview">
      <div className="preview__bar no-print">
        <div className="preview__title">
          <span className="preview__tag">Live preview</span>
          <span>{proposal.meta.title || 'Untitled proposal'}</span>
        </div>

        <div className="viewtoggle" role="tablist" aria-label="Preview format">
          <button
            role="tab"
            aria-selected={view === 'document'}
            className={cls('viewtoggle__btn', view === 'document' && 'viewtoggle__btn--on')}
            onClick={() => setView('document')}
          >
            <Icon name="print" size={14} /> Document
          </button>
          <button
            role="tab"
            aria-selected={view === 'slides'}
            className={cls('viewtoggle__btn', view === 'slides' && 'viewtoggle__btn--on')}
            onClick={() => setView('slides')}
          >
            <Icon name="slides" size={14} /> Slides
          </button>
        </div>

        <div className="preview__actions">
          <input
            type="range"
            min={0.4}
            max={1}
            step={0.02}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            style={{ width: 110 }}
            title="Zoom"
            aria-label="Zoom"
          />
          <button className="btn btn--ghost btn--sm" onClick={() => setZoom(view === 'slides' ? 0.5 : 0.62)}>
            {Math.round(zoom * 100)}%
          </button>
          {view === 'slides' ? (
            <button className="btn btn--primary btn--sm" onClick={handlePptx} disabled={exporting}>
              <Icon name="slides" size={15} /> {exporting ? 'Building…' : 'Export PowerPoint'}
            </button>
          ) : (
            <>
              {canEmail && (
                <button className="btn btn--ghost btn--sm" onClick={() => setShowEmail(true)}>
                  <Icon name="mail" size={15} /> Email PDF
                </button>
              )}
              <button className="btn btn--primary btn--sm" onClick={() => window.print()}>
                <Icon name="print" size={15} /> Print / Save PDF
              </button>
            </>
          )}
        </div>
      </div>

      {showEmail && <EmailDialog onClose={() => setShowEmail(false)} />}

      {mapEditing && <MapAnnotateToolbar />}

      <div className="preview__scroll" ref={scrollRef}>
        <div className={cls('zoomwrap', view === 'slides' && 'is-hidden-screen')} style={{ transform: `scale(${zoom})` }}>
          <Presentation proposal={proposal} activeSection={activeSection} mapEditable={mapEditing} />
        </div>
        {view === 'slides' && (
          <div className="zoomwrap no-print" style={{ transform: `scale(${zoom})` }}>
            <SlideDeck proposal={proposal} />
          </div>
        )}
      </div>
    </main>
    </MapEditContext.Provider>
  )
}

/** The two-pane editor. Viewers (readOnly) see the preview only. */
export function ProposalWorkspace() {
  const { readOnly } = useProposal()
  const [activeSection, setActiveSection] = useState('cover')
  return (
    <div className={cls('app', readOnly && 'app--solo')}>
      {!readOnly && <Builder onSection={setActiveSection} />}
      <Preview activeSection={activeSection} />
    </div>
  )
}
