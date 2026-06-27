import { ProposalProvider, useProposal } from '../state/proposal'
import { ProposalWorkspace } from './ProposalWorkspace'
import { AccountInfo } from './AccountInfo'
import { Icon } from '../ui/Icon'

const SAVE_LABEL: Record<string, string> = {
  saved: 'All changes saved',
  dirty: 'Unsaved changes',
  saving: 'Saving…',
}

/** Editor header — back to dashboard, title, and the save control. */
function EditorHeader({ title, readOnly, onBack }: { title: string; readOnly: boolean; onBack: () => void }) {
  const { saveState, saveNow } = useProposal()
  return (
    <div className="editor__bar no-print">
      <button className="btn btn--ghost btn--sm" onClick={onBack}>
        <Icon name="reset" size={14} /> My Proposals
      </button>
      <span className="editor__title">{title || 'Proposal'}</span>
      <div className="editor__right">
        {readOnly ? (
          <span className="editor__ro">View only</span>
        ) : (
          <div className="editor__save">
            <span className={`savestate savestate--${saveState}`}>{SAVE_LABEL[saveState]}</span>
            <button className="btn btn--primary btn--sm" onClick={saveNow} disabled={saveState !== 'dirty'}>
              <Icon name="check" size={14} /> Save
            </button>
          </div>
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
