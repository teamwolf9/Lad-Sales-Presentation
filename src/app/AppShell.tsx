import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { LAD_BRAND } from '../theme/brand'
import { cls } from '../lib/util'
import { Dashboard } from './Dashboard'
import { AdminUsers } from './AdminUsers'
import { ExecutiveView } from './ExecutiveView'
import { EditorView } from './EditorView'
import { AccountInfo } from './AccountInfo'

type OpenProposal = { id: string; title: string; readOnly: boolean }

export function AppShell() {
  const { profile } = useAuth()
  const [view, setView] = useState<'dashboard' | 'exec' | 'admin'>('dashboard')
  const [open, setOpen] = useState<OpenProposal | null>(null)

  // Editing/viewing a proposal takes over the whole screen (with its own bar).
  if (open) {
    return (
      <EditorView
        proposalId={open.id}
        title={open.title}
        readOnly={open.readOnly}
        onBack={() => setOpen(null)}
      />
    )
  }

  const isAdmin = profile?.role === 'admin'
  const canSeeExec = isAdmin || profile?.role === 'executive'
  const open_ = (id: string, title: string, readOnly: boolean) => setOpen({ id, title, readOnly })

  return (
    <div className="shell">
      <header className="appnav">
        <div className="appnav__brand">
          <img src={LAD_BRAND.logos.primary} alt={LAD_BRAND.name} />
          <span>Proposal Builder</span>
        </div>
        <nav className="appnav__nav">
          <button className={cls('appnav__link', view === 'dashboard' && 'is-on')} onClick={() => setView('dashboard')}>
            Proposals
          </button>
          {canSeeExec && (
            <button className={cls('appnav__link', view === 'exec' && 'is-on')} onClick={() => setView('exec')}>
              Overview
            </button>
          )}
          {isAdmin && (
            <button className={cls('appnav__link', view === 'admin' && 'is-on')} onClick={() => setView('admin')}>
              Users
            </button>
          )}
        </nav>
        <AccountInfo />
      </header>

      <main className="shell__body">
        {view === 'dashboard' && <Dashboard onOpen={open_} />}
        {view === 'exec' && canSeeExec && <ExecutiveView onOpen={open_} />}
        {view === 'admin' && isAdmin && <AdminUsers />}
      </main>
    </div>
  )
}
