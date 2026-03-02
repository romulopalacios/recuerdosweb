/**
 * pushNotify — client-side helper
 * ─────────────────────────────────────────────────────────────────────────────
 * Fire-and-forget wrapper around the `send-push` Edge Function.
 *
 * Typical usage (after a guest mutation):
 *   notifyOwner({ owner_id, title, body, url })
 *
 * Errors are silently swallowed — if the owner hasn't subscribed or the
 * function isn't deployed yet, the UX is unaffected.
 */

import { supabase } from '@/lib/supabase'

export interface PushPayload {
  /** The user_id of the person who should receive the notification */
  owner_id: string
  title:    string
  body:     string
  url?:     string
  icon?:    string
}

/**
 * Invoke the `send-push` Edge Function in a fire-and-forget manner.
 * Errors are logged to console but never thrown — a push failure must
 * never break the user's action.
 */
export function notifyOwner(payload: PushPayload): void {
  // Force a token refresh before invoking — prevents silent 401 from stale tokens.
  supabase.auth.refreshSession().then(({ data: { session } }) => {
    if (!session?.access_token) return Promise.reject(new Error('no session'))
    return supabase.functions.invoke('send-push', {
      body: payload,
      headers: { 'Authorization': `Bearer ${session.access_token}` },
    })
  }).then(({ data, error }) => {
    if (error) {
      console.warn('[notifyOwner] Edge Function error:', error.message)
      return
    }
    const result = data as { ok: boolean; sent?: boolean; reason?: string }
    if (result?.sent) {
      console.info('[notifyOwner] push sent ✅ to owner', payload.owner_id.slice(0, 8))
    } else {
      console.info('[notifyOwner] push skipped — reason:', result?.reason ?? 'unknown', '| owner:', payload.owner_id.slice(0, 8))
    }
  }).catch((err: unknown) => {
    console.warn('[notifyOwner] invoke failed:', err)
  })
}
