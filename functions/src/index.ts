/**
 * Cloud Functions for the Lad Proposal Builder.
 *
 * `draftScopeSummary` is a callable that turns a project's line items into the
 * one-sentence scope summary shown under the project title. It calls Claude
 * Fable 5 (Anthropic's most capable model) with an Opus 4.8 server-side
 * fallback, so a safety-classifier refusal is transparently re-served instead
 * of failing the request.
 *
 * The Anthropic API key never touches the browser — it lives in the
 * ANTHROPIC_API_KEY secret and is only readable inside this function.
 * Set it once with:  firebase functions:secrets:set ANTHROPIC_API_KEY
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import Anthropic from '@anthropic-ai/sdk'

const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY')

// Fable 5 is the primary model; Opus 4.8 catches the rare classifier refusal.
const MODEL = 'claude-fable-5'
const FALLBACK_MODEL = 'claude-opus-4-8'

interface LineInput {
  code?: string
  description?: string
  qty?: number
  unit?: string
  isNote?: boolean
}

interface ScopeInput {
  title?: string
  location?: string
  customer?: string
  lines?: LineInput[]
}

const SYSTEM_PROMPT =
  'You write the one-sentence scope-of-work summary that appears under a project ' +
  'title in a Lad Irrigation proposal. Lad Irrigation is an agricultural irrigation ' +
  'contractor — center pivots, custom pump stations, buried mainline, controls, and ' +
  'turn-key installation. Summarize what Lad will supply and install for THIS project, ' +
  'grounded in the line items provided. Voice: confident, plain, professional — no ' +
  'marketing fluff, no first person, no quotation marks. Output ONE sentence, 30 words ' +
  'or fewer. Return only the sentence, with no preamble or trailing commentary.'

export const draftScopeSummary = onCall(
  { secrets: [ANTHROPIC_API_KEY], region: 'us-central1', timeoutSeconds: 120 },
  async (request): Promise<{ text: string; model: string }> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in to use AI drafting.')
    }

    const data = (request.data ?? {}) as ScopeInput

    const lines = (data.lines ?? [])
      .filter((l) => (l.description ?? '').trim())
      .slice(0, 40)
      .map((l) => {
        const qty = l.isNote ? '' : `${l.qty ?? ''} ${l.unit ?? ''}`.trim()
        return `- ${(l.description ?? '').trim()}${qty ? ` (${qty})` : ''}`
      })
      .join('\n')

    if (!lines && !(data.title ?? '').trim()) {
      throw new HttpsError('invalid-argument', 'Add a project title or a few line items first.')
    }

    const context = [
      data.customer ? `Customer: ${data.customer}` : '',
      data.title ? `Project: ${data.title}` : '',
      data.location ? `Location: ${data.location}` : '',
      lines ? `Line items:\n${lines}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() })

    let response: any
    try {
      response = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 1024,
        // Opt into a server-side fallback so a classifier refusal is re-served
        // by Opus 4.8 inside the same call rather than failing.
        betas: ['server-side-fallback-2026-06-01'],
        fallbacks: [{ model: FALLBACK_MODEL }],
        // A one-sentence summary is a routine task — low effort is fast and cheap.
        output_config: { effort: 'low' },
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: context }],
      } as any)
    } catch (err: any) {
      throw new HttpsError('internal', `AI request failed: ${err?.message ?? 'unknown error'}`)
    }

    if (response?.stop_reason === 'refusal') {
      throw new HttpsError(
        'failed-precondition',
        'The model declined this request. Try adjusting the line items and retry.',
      )
    }

    const text = String(
      (response?.content ?? [])
        .filter((b: any) => b?.type === 'text')
        .map((b: any) => b.text)
        .join(''),
    )
      .trim()
      .replace(/^["']+|["']+$/g, '')
      .trim()

    if (!text) {
      throw new HttpsError('internal', 'The model returned an empty draft. Try again.')
    }

    return { text, model: response?.model ?? MODEL }
  },
)
