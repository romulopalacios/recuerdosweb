// @ts-nocheck — Deno runtime; compiled & deployed by Supabase CLI, not tsc
/**
 * Supabase Edge Function — send-push
 * ─────────────────────────────────────────────────────────────────────────────
 * Sends a Web Push notification to the device subscribed by `owner_id`.
 * Called client-side after guest actions (photo upload, memory creation,
 * invite acceptance) so the owner gets a real-time alert.
 *
 * Deploy:
 *   supabase functions deploy send-push
 *
 * Required secrets (set once):
 *   supabase secrets set VAPID_PUBLIC_KEY=<your-public-key>
 *   supabase secrets set VAPID_PRIVATE_KEY=<your-private-key>
 *   supabase secrets set VAPID_SUBJECT=mailto:recuerdos@app.com
 *
 * Request body:
 *   { owner_id: string, title: string, body: string, url?: string, icon?: string }
 *
 * Response:
 *   { ok: true, sent: boolean }   — 200
 *   { ok: false, error: string }  — 500
 */

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush         from 'npm:web-push@3'

// ─── VAPID config ─────────────────────────────────────────────────────────────

const VAPID_SUBJECT     = Deno.env.get('VAPID_SUBJECT')     ?? 'mailto:recuerdos@app.com'
const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')  ?? ''
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

// ─── CORS headers ─────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS })
  }

  // Require an authenticated caller (anon key + valid JWT)
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401, headers: CORS_HEADERS })
  }

  // Parse request body
  let body: {
    owner_id: string
    title:    string
    body:     string
    url?:     string
    icon?:    string
  }
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON body', { status: 400, headers: CORS_HEADERS })
  }

  const { owner_id, title, body: pushBody, url = '/', icon } = body

  if (!owner_id || !title || !pushBody) {
    return new Response('Missing required fields: owner_id, title, body', {
      status: 400,
      headers: CORS_HEADERS,
    })
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('[send-push] VAPID keys not configured — skipping')
    return new Response(
      JSON.stringify({ ok: true, sent: false, reason: 'vapid_not_configured' }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  }

  // Use service-role client so we can read push_subscriptions (RLS bypassed)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Look up the owner's push subscription
  const { data: sub, error: subError } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', owner_id)
    .maybeSingle()

  if (subError) {
    console.error('[send-push] DB error:', subError.message)
    return new Response(
      JSON.stringify({ ok: false, error: subError.message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  }

  // Owner hasn't subscribed — not an error, just a no-op
  if (!sub) {
    return new Response(
      JSON.stringify({ ok: true, sent: false, reason: 'no_subscription' }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  }

  // Build the push payload (same shape the SW expects)
  const payload = JSON.stringify({
    type:  'guest_activity',
    title,
    body:  pushBody,
    url,
    icon:  icon ?? '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
  })

  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys:     { p256dh: sub.p256dh, auth: sub.auth },
      },
      payload,
    )

    return new Response(
      JSON.stringify({ ok: true, sent: true }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[send-push] webpush.sendNotification error:', message)

    // 410 Gone / 404 → subscription expired, clean it up
    if (typeof message === 'string' && (message.includes('410') || message.includes('404'))) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', owner_id)
        .catch(console.warn)

      return new Response(
        JSON.stringify({ ok: true, sent: false, reason: 'subscription_expired' }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  }
})
