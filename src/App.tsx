import { useState } from 'react'
import { Builder } from './builder/Builder'
import { Presentation } from './presentation/Presentation'
import { SlideDeck } from './presentation/SlideDeck'
import { ProposalProvider, useProposal } from './state/proposal'
import { AuthProvider, useAuth } from './lib/auth'
import { SignIn } from './auth/SignIn'
import { Icon } from './ui/Icon'
import { cls } from './lib/util'

type View = 'document' | 'slides'

function AccountChip() {
  const { enabled, user, signOut } = useAuth()
  if (!enabled || !user) return null
  return (
    <div className="account">
      <span className="account__name">{user.email || user.displayName || 'Signed in'}</span>
      <button className="btn btn--ghost btn--sm" onClick={() => signOut()}>
        Sign out
      </button>
    </div>
  )
}

function Preview() {
  const { proposal } = useProposal()
  const [view, setView] = useState<View>('document')
  const [zoom, setZoom] = useState(0.62)
  const [exporting, setExporting] = useState(false)

  const handlePptx = async () => {
    setExporting(true)
    try {
      const { exportProposalPptx } = await import('./lib/pptx')
      await exportProposalPptx(proposal)
    } catch (err) {
      console.error('PowerPoint export failed', err)
      alert('Sorry — the PowerPoint export failed. Check the console for details.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <main className="preview">
      <div className="preview__bar no-print">
        <div className="preview__title">
          <span className="preview__tag">Live preview</span>
          <span>{proposal.customer.company || 'Untitled proposal'}</span>
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
          <AccountChip />
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
            <button className="btn btn--primary btn--sm" onClick={() => window.print()}>
              <Icon name="print" size={15} /> Print / Save PDF
            </button>
          )}
        </div>
      </div>

      <div className="preview__scroll">
        {/* Document — always mounted so Print / Save PDF works from either view;
            hidden on screen when slides are showing, always shown when printing. */}
        <div className={cls('zoomwrap', view === 'slides' && 'is-hidden-screen')} style={{ transform: `scale(${zoom})` }}>
          <Presentation proposal={proposal} />
        </div>

        {/* Slides — on-screen deck only; never printed (use Export PowerPoint). */}
        {view === 'slides' && (
          <div className="zoomwrap no-print" style={{ transform: `scale(${zoom})` }}>
            <SlideDeck proposal={proposal} />
          </div>
        )}
      </div>
    </main>
  )
}

/** Decides between the sign-in gate and the app (only gates when Firebase is on). */
function Gate() {
  const { enabled, ready, user } = useAuth()
  if (enabled && !ready) return <div className="app-loading">Loading…</div>
  if (enabled && !user) return <SignIn />
  return (
    <ProposalProvider>
      <div className="app">
        <Builder />
        <Preview />
      </div>
    </ProposalProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
