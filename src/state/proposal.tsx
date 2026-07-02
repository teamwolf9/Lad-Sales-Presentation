import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Proposal } from '../types'
import { DEFAULT_TERMS, DEFAULT_ABOUT_HEADING, DEFAULT_ABOUT_BODY } from '../data/reference'
import { todayISO } from '../lib/util'
import { watchProposal, saveProposalData } from '../lib/proposals'

const STORAGE_KEY = 'lad-proposal-draft-v1'

export function createEmptyProposal(): Proposal {
  return {
    meta: {
      title: 'Irrigation System Proposal',
      date: todayISO(),
      number: 'LAD-' + new Date().getFullYear() + '-001',
      validForDays: 30,
    },
    customer: {
      company: '',
      contactName: '',
      contactTitle: '',
      email: '',
      phone: '',
      location: '',
      logoUrl: '',
    },
    preparedBy: {
      repName: '',
      repTitle: 'Irrigation Specialist',
      repPhone: '',
      repEmail: '',
    },
    services: ['design', 'install', 'pump', 'service'],
    coverMessage:
      'Thank you for the opportunity to design your irrigation system. The following proposal outlines a complete, engineered solution built to deliver reliable water to every acre — efficiently, and for years to come.',
    aboutHeading: DEFAULT_ABOUT_HEADING,
    aboutBody: [...DEFAULT_ABOUT_BODY],
    team: [],
    scopeNotes: [
      'Engineer a system matched to your water source, soil, and crop.',
      'Supply and install all equipment turn-key, ready to run.',
      'Commission the system and train your team on operation.',
    ],
    map: {
      enabled: false,
      imageUrl: '',
      imageAspect: 0,
      annotations: [],
      fields: [],
      showLegend: true,
      caption: '',
      scale: '1 inch : 600 feet',
      designer: '',
      drawnBy: '',
      date: todayISO(),
      quoteNumber: '',
    },
    cad: {
      enabled: false,
      drawings: [],
      designer: '',
      drawnBy: '',
    },
    analysis: {
      enabled: false,
      heading: 'Improvements Analysis',
      subhead: 'Trunk Mainline Analysis',
      forLine: '',
      byLine: 'By Lad Irrigation Co. Inc.',
      existingLabel: 'Existing system',
      newLabel: 'New design',
      unitLabel: 'Calculated Pressure (PSI)',
      summary:
        'Lad Irrigation proposes a full upgrade of the existing system. The summary below compares the current configuration with the proposed new design, point by point, so the gains in capacity and efficiency are clear.',
      conclusion:
        'Upsizing the mainlines and rebuilding the pump stations relieves friction losses, increases flow capacity, and reduces the pump horsepower needed downstream.',
      rows: [
        { id: 'ar1', feature: 'Dock Station', exAt: '40', exChange: '-20', newAt: '34', newChange: '-18' },
        { id: 'ar2', feature: 'River BP Suction', exAt: '20', exChange: '160', newAt: '16', newChange: '164' },
        { id: 'ar3', feature: 'River BP Discharge', exAt: '180', exChange: '-96', newAt: '180', newChange: '-94' },
        { id: 'ar4', feature: 'End Cluster', exAt: '48', exChange: '', newAt: '94', newChange: '' },
      ],
    },
    hydraulics: {
      segments: [],
      worksheet: {
        staticReqd: 0,
        sysLoss: 0,
        mlLoss: 0,
        elevation: 0,
        pivotHt: 0,
        miscLosses: 0,
        designGpm: 0,
      },
    },
    design: { active: [], values: {} },
    projects: [],
    payment: {
      enabled: false,
      downPayment: 0,
      progressPayments: 0,
      dueUponInvoicing: 0,
      note: 'Thank you for doing business with us!',
    },
    lineItems: [],
    terms: [...DEFAULT_TERMS],
    settings: {
      taxRate: 8.4,
      freight: 0,
      showPricing: true,
      showAbout: true,
      showStores: true,
      showServices: true,
      showSummary: true,
      summarySubtitle: 'Pump Station & Ancillary Infrastructure Upgrades',
    },
  }
}

type SaveState = 'saved' | 'dirty' | 'saving'

interface ProposalCtx {
  proposal: Proposal
  setProposal: React.Dispatch<React.SetStateAction<Proposal>>
  /** Patch the top-level proposal object. */
  patch: (p: Partial<Proposal>) => void
  reset: () => void
  /** True when the signed-in user only has view access. */
  readOnly: boolean
  /** Cloud save status (always 'saved' in standalone mode). */
  saveState: SaveState
  /** Force an immediate save (flushes the debounce). */
  saveNow: () => void
}

const Ctx = createContext<ProposalCtx | null>(null)

/**
 * Merge a stored/partial proposal onto fresh defaults. Top-level shallow merge,
 * then deep-merge nested objects so proposals saved before newer fields existed
 * (e.g. map.annotations) still get sensible defaults — preventing crashes when
 * the editor reads those fields.
 */
function hydrate(saved: Partial<Proposal>): Proposal {
  const base = createEmptyProposal()
  return {
    ...base,
    ...saved,
    meta: { ...base.meta, ...saved.meta },
    customer: { ...base.customer, ...saved.customer },
    preparedBy: { ...base.preparedBy, ...saved.preparedBy },
    map: { ...base.map, ...saved.map },
    cad: { ...base.cad, ...saved.cad },
    analysis: { ...base.analysis, ...saved.analysis },
    hydraulics: {
      ...base.hydraulics,
      ...saved.hydraulics,
      worksheet: { ...base.hydraulics.worksheet, ...saved.hydraulics?.worksheet },
    },
    design: { ...base.design, ...saved.design },
    payment: { ...base.payment, ...saved.payment },
    settings: { ...base.settings, ...saved.settings },
  }
}

function load(): Proposal {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return hydrate(JSON.parse(raw) as Partial<Proposal>)
  } catch {
    /* ignore corrupt drafts */
  }
  return createEmptyProposal()
}

/**
 * Provides the active proposal.
 * - Standalone (no `proposalId`): a single draft cached in localStorage.
 * - Cloud (`proposalId` set): bound to proposals/{id}, live-synced; saves are
 *   debounced and skipped when `readOnly` (viewer access).
 */
export function ProposalProvider({
  proposalId,
  readOnly = false,
  children,
}: {
  proposalId?: string
  readOnly?: boolean
  children: ReactNode
}) {
  const [proposal, setProposal] = useState<Proposal>(() => (proposalId ? createEmptyProposal() : load()))
  const [loaded, setLoaded] = useState(!proposalId)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const lastSynced = useRef<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const proposalRef = useRef(proposal)
  proposalRef.current = proposal

  // Persist the latest proposal to the cloud immediately.
  const doSave = useCallback(async () => {
    if (!proposalId) return
    const cur = JSON.stringify(proposalRef.current)
    if (cur === lastSynced.current) {
      setSaveState('saved')
      return
    }
    setSaveState('saving')
    try {
      await saveProposalData(proposalId, proposalRef.current)
      lastSynced.current = cur
      setSaveState('saved')
    } catch (e) {
      console.error('[cloud] save failed', e)
      setSaveState('dirty')
    }
  }, [proposalId])

  const saveNow = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    void doSave()
  }, [doSave])

  // Standalone: cache to localStorage.
  useEffect(() => {
    if (proposalId) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(proposal))
    } catch {
      /* storage full / unavailable — non-fatal */
    }
  }, [proposal, proposalId])

  // Cloud: live-subscribe to the proposal document.
  useEffect(() => {
    if (!proposalId) return
    setLoaded(false)
    const unsub = watchProposal(proposalId, (rec) => {
      if (rec) {
        // Base the sync signature on the *merged* shape we actually hold, so
        // opening a proposal (or our own save echoing back) never looks like a
        // local edit — autosave then only fires on real add/delete/change.
        // Deep-merge (hydrate) so older docs missing newer fields don't crash.
        const merged = hydrate(rec.data)
        const incoming = JSON.stringify(merged)
        if (incoming !== lastSynced.current) {
          lastSynced.current = incoming
          setProposal(merged)
        }
      }
      setLoaded(true)
    })
    return () => unsub()
  }, [proposalId])

  // Cloud: debounced save of local edits (skips our own echo + read-only).
  useEffect(() => {
    if (!proposalId || !loaded || readOnly) return
    const cur = JSON.stringify(proposal)
    if (cur === lastSynced.current) return
    setSaveState('dirty')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => void doSave(), 1200)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [proposal, proposalId, loaded, readOnly, doSave])

  const patch = (p: Partial<Proposal>) => setProposal((prev) => ({ ...prev, ...p }))
  const reset = () => setProposal(createEmptyProposal())

  if (proposalId && !loaded) return <div className="app-loading">Loading proposal…</div>

  return (
    <Ctx.Provider value={{ proposal, setProposal, patch, reset, readOnly, saveState, saveNow }}>
      {children}
    </Ctx.Provider>
  )
}

export function useProposal(): ProposalCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useProposal must be used within ProposalProvider')
  return ctx
}
