import { ProposalProvider } from '../state/proposal'
import { ProposalWorkspace } from './ProposalWorkspace'
import { Icon } from '../ui/Icon'

export function EditorView({
  proposalId,
  title,
  readOnly,
  onBack,
}: {
  proposalId: string
  title: string
  readOnly: boolean
  onBack: () => void
}) {
  return (
    <ProposalProvider proposalId={proposalId} readOnly={readOnly}>
      <div className="editor">
        <div className="editor__bar no-print">
          <button className="btn btn--ghost btn--sm" onClick={onBack}>
            <Icon name="reset" size={14} /> Proposals
          </button>
          <span className="editor__title">{title || 'Proposal'}</span>
          {readOnly && <span className="editor__ro">View only</span>}
        </div>
        <ProposalWorkspace />
      </div>
    </ProposalProvider>
  )
}
