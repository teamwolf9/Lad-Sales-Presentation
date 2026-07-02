import { ProposalProvider, useProposal } from '../state/proposal'
import { ProposalWorkspace } from './ProposalWorkspace'
import { AccountInfo } from './AccountInfo'
import { Icon } from '../ui/Icon'

/** Editor header — back, title, one save control, compact account. */
function EditorHeader({ title, readOnly, onBack }: { title: string; readOnly: boolean; onBack: () => void }) {
  const { saveState, saveNow } = useProposal()
  return (
    <div className="editor__bar no-print">
      <button className="editor__back" onClick={onBack} title="Back to My Proposals">
        <Icon name="back" size={17} />
      </button>
      <span className="editor__title" title={title || 'Proposal'}>
        {title || 'Proposal'}
      </span>
      <div className="editor__right">
        {readOnly ? (
          <span className="editor__ro">View only</span>
        ) : saveState === 'dirty' ? (
          <button className="btn btn--primary btn--sm" onClick={saveNow}>
            <Icon name="check" size={14} /> Save
          </button>
        ) : (
          <span className={`savestate savestate--${saveState}`}>
            {saveState === 'saving' ? (
              'Saving…'
            ) : (
              <>
                <Icon name="check" size={12} /> Saved
              </>
            )}
          </span>
        )}
        <AccountInfo />
      </div>
    </div>
  )
}

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
        <EditorHeader title={title} readOnly={readOnly} onBack={onBack} />
        <ProposalWorkspace />
      </div>
    </ProposalProvider>
  )
}
