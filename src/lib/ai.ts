/**
 * Client wrapper for the Claude-powered drafting Cloud Functions.
 *
 * The Anthropic key lives server-side (a function secret), so everything here
 * goes through callable functions — nothing calls Anthropic from the browser.
 * `aiEnabled` is false in standalone (no-Firebase) mode, so callers can hide
 * the AI affordances.
 */
import { httpsCallable } from 'firebase/functions'
import { functions } from './firebase'
import type { ProjectLine } from '../types'

export const aiEnabled = Boolean(functions)

export interface ScopeDraftInput {
  title: string
  location: string
  customer?: string
  lines: ProjectLine[]
}

/** Draft the one-sentence project scope summary from its line items. */
export async function draftScopeSummary(input: ScopeDraftInput): Promise<string> {
  if (!functions) {
    throw new Error('AI drafting needs cloud mode — sign in with a configured Firebase project.')
  }
  const call = httpsCallable<ScopeDraftInput, { text: string; model: string }>(
    functions,
    'draftScopeSummary',
  )
  const res = await call(input)
  return res.data.text
}
