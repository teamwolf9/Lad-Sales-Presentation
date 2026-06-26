import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Proposal } from '../types'
import { DEFAULT_TERMS, DEFAULT_ABOUT_HEADING, DEFAULT_ABOUT_BODY } from '../data/reference'
import { todayISO } from '../lib/util'
import { useAuth } from '../lib/auth'
import { loadCloudProposal, saveCloudProposal } from '../lib/cloud'

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
      caption: '',
      scale: '1 inch : 600 feet',
      designer: '',
      drawnBy: '',
      date: todayISO(),
      quoteNumber: '',
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

interface ProposalCtx {
  proposal: Proposal
  setProposal: React.Dispatch<React.SetStateAction<Proposal>>
  /** Patch the top-level proposal object. */
  patch: (p: Partial<Proposal>) => void
  reset: () => void
}

const Ctx = createContext<ProposalCtx | null>(null)

function load(): Proposal {
  const base = createEmptyProposal()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const saved = JSON.parse(raw) as Partial<Proposal>
      // Top-level shallow merge, then deep-merge nested objects so drafts saved
      // before newer fields existed still get sensible defaults for them.
      return {
        ...base,
        ...saved,
        meta: { ...base.meta, ...saved.meta },
        customer: { ...base.customer, ...saved.customer },
        preparedBy: { ...base.preparedBy, ...saved.preparedBy },
        map: { ...base.map, ...saved.map },
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
  } catch {
    /* ignore corrupt drafts */
  }
  return base
}

export function ProposalProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [proposal, setProposal] = useState<Proposal>(load)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Skip the cloud write that immediately follows a cloud load. */
  const justLoaded = useRef(false)

  // Always cache locally (offline + standalone).
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(proposal))
    } catch {
      /* storage full / unavailable — non-fatal */
    }
  }, [proposal])

  // On sign-in, pull this user's cloud draft (if any).
  useEffect(() => {
    if (!user) return
    let cancelled = false
    loadCloudProposal(user.uid)
      .then((cloud) => {
        if (!cancelled && cloud) {
          justLoaded.current = true
          setProposal({ ...createEmptyProposal(), ...cloud })
        }
      })
      .catch((e) => console.error('[cloud] load failed', e))
    return () => {
      cancelled = true
    }
  }, [user])

  // Debounced cloud save while signed in.
  useEffect(() => {
    if (!user) return
    if (justLoaded.current) {
      justLoaded.current = false
      return
    }
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveCloudProposal(user.uid, proposal).catch((e) => console.error('[cloud] save failed', e))
    }, 900)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [proposal, user])

  const patch = (p: Partial<Proposal>) => setProposal((prev) => ({ ...prev, ...p }))
  const reset = () => setProposal(createEmptyProposal())

  return <Ctx.Provider value={{ proposal, setProposal, patch, reset }}>{children}</Ctx.Provider>
}

export function useProposal(): ProposalCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useProposal must be used within ProposalProvider')
  return ctx
}
