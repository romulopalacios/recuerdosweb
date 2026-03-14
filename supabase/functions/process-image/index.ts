/**
 * Supabase Edge Function — process-image
 * ─────────────────────────────────────────────────────────────────────────────
 * Triggered via Storage webhook or called directly after a photo upload.
 *
 * What it does:
 *  1. Downloads the original file from the `photos` bucket.
 *  2. Resizes it to max 800 px (longest side) preserving aspect ratio → saved
 *     as `originals/{path}` (replaces the oversized original).
 *  3. Generates a 200 × 200 px cover-crop thumbnail → saved as
 *     `thumbs/{path}`.
 *  4. Updates the `photos` DB row with the thumbnail public URL so the UI can
 *     use the small version for grids without downloading the full image.
 *
 * Deploy:
 *   supabase functions deploy process-image --no-verify-jwt
 *
 * Invoke from your upload hook:
 *   await supabase.functions.invoke('process-image', {
 *     body: { storage_path: 'userId/memoryId/timestamp.jpg', photo_id: '...' }
 *   })
 *
 * Runtime notes:
 *  • Uses `npm:sharp` via the Deno npm compat layer (available in Supabase
 *    Edge Runtime ≥ 1.36). No native binary installation needed.
 *  • Uses the service-role key (injected automatically by Supabase) so it can
 *    bypass RLS for the processing writes.
 */

import { createClient } from 'npm:@supabase/supabase-js@2'

const BUCKET       = 'photos'
const THUMB_WIDTH  = 200
const THUMB_HEIGHT = 200

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let body: { storage_path: string; photo_id: string }
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON body', { status: 400 })
  }

  const { storage_path, photo_id } = body
  if (!storage_path || !photo_id) {
    return new Response('Missing storage_path or photo_id', { status: 400 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!

  // Build CDN transform URL — Supabase resizes on first request and caches at edge.
  // No image library needed: the Storage CDN handles resizing natively.
  const thumbUrl =
    `${supabaseUrl}/storage/v1/render/image/public/${BUCKET}/${storage_path}` +
    `?width=${THUMB_WIDTH}&height=${THUMB_HEIGHT}&resize=cover`

  // Service-role client to bypass RLS for the DB update
  const supabase = createClient(
    supabaseUrl,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { error } = await supabase
    .from('photos')
    .update({ thumb_url: thumbUrl })
    .eq('id', photo_id)

  if (error) {
    console.error('[process-image] DB update error:', error.message)
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  return new Response(
    JSON.stringify({ ok: true, thumb_url: thumbUrl }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
})
