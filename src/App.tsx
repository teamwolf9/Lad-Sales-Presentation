import { useState } from 'react'
import { Builder } from './builder/Builder'
import { Presentation } from './presentation/Presentation'
import { ProposalProvider, useProposal } from './state/proposal'
import { Icon } from './ui/Icon'

function Preview() {
  const { proposal } = useProposal()
  const [zoom, setZoom] = useState(0.62)

  return (
    <main className="preview">
      <div className="preview__bar no-print">
        <div className="preview__title">
          <span className="preview__tag">Live preview</span>
          <span>{proposal.customer.company || 'Untitled proposal'}</span>
        </div>
        <div className="preview__actions">
          <input
            type="range"
            min={0.4}
            max={1}
            step={0.02}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            style={{ width: 120 }}
            title="Zoom"
            aria-label="Zoom"
          />
          <button className="btn btn--ghost btn--sm" onClick={() => setZoom(0.62)}>
            {Math.round(zoom * 100)}%
          </button>
          <button className="btn btn--primary btn--sm" onClick={() => window.print()}>
            <Icon name="print" size={15} /> Print / Save PDF
          </button>
        </div>
      </div>
      <div className="preview__scroll">
        <div className="zoomwrap" style={{ transform: `scale(${zoom})` }}>
          <Presentation proposal={proposal} />
        </div>
      </div>
    </main>
  )
}

export default function App() {
  return (
    <ProposalProvider>
      <div className="app">
        <Builder />
        <Preview />
      </div>
    </ProposalProvider>
  )
}
