import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Proposal } from '../types'
import { DEFAULT_TERMS, DEFAULT_ABOUT_HEADING, DEFAULT_ABOUT_BODY } from '../data/reference'
import { todayISO } from '../lib/util'

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
    lineItems: [],
    terms: [...DEFAULT_TERMS],
    settings: { taxRate: 8.4, freight: 0, showPricing: true, showAbout: true, showStores: true },
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
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...createEmptyProposal(), ...JSON.parse(raw) }
  } catch {
    /* ignore corrupt drafts */
  }
  return createEmptyProposal()
}

export function ProposalProvider({ children }: { children: ReactNode }) {
  const [proposal, setProposal] = useState<Proposal>(load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(proposal))
    } catch {
      /* storage full / unavailable — non-fatal */
    }
  }, [proposal])

  const patch = (p: Partial<Proposal>) => setProposal((prev) => ({ ...prev, ...p }))
  const reset = () => setProposal(createEmptyProposal())

  return <Ctx.Provider value={{ proposal, setProposal, patch, reset }}>{children}</Ctx.Provider>
}

export function useProposal(): ProposalCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useProposal must be used within ProposalProvider')
  return ctx
}
