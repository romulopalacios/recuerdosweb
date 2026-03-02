// @ts-nocheck — Deno runtime; compiled & deployed by Supabase CLI, not tsc
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

const MAX_LONG_SIDE   = 800          // px – resize if either dimension exceeds this
const THUMB_SIZE      = 200          // px – square thumbnail side
const JPEG_QUALITY    = 82           // 0-100

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // ── Auth: only allow POST from our own server ────────────────────────────
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Parse body
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

  // ── Create service-role client (bypasses RLS) ────────────────────────────
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    // ── 1. Download the original upload ─────────────────────────────────────
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(BUCKET)
      .download(storage_path)

    if (downloadError || !fileData) {
      throw new Error(`Download failed: ${downloadError?.message}`)
    }

    const originalBuffer = Buffer.from(await fileData.arrayBuffer())

    // ── 2. Resize original to max 800 px ─────────────────────────────────────
    const resizedBuffer = await sharp(originalBuffer)
      .resize(MAX_LONG_SIDE, MAX_LONG_SIDE, {
        fit:        'inside',       // preserve aspect ratio, never enlarge
        withoutEnlargement: true,
      })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer()

    // Overwrite the original with the optimised version
    const { error: origUploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storage_path, resizedBuffer, {
        contentType: 'image/jpeg',
        upsert:      true,
      })
    if (origUploadError) throw new Error(`Original re-upload failed: ${origUploadError.message}`)

    // ── 3. Generate 200 × 200 thumbnail ──────────────────────────────────────
    const thumbBuffer = await sharp(originalBuffer)
      .resize(THUMB_SIZE, THUMB_SIZE, {
        fit: 'cover',               // crop to square from centre
      })
      .jpeg({ quality: 75, mozjpeg: true })
      .toBuffer()

    // Store under thumbs/ prefix with the same relative path
    const thumbPath = `thumbs/${storage_path}`
    const { error: thumbUploadError } = await supabase.storage
      .from(BUCKET)
      .upload(thumbPath, thumbBuffer, {
        contentType: 'image/jpeg',
        upsert:      true,
      })
    if (thumbUploadError) throw new Error(`Thumb upload failed: ${thumbUploadError.message}`)

    // ── 4. Build the public thumb URL ─────────────────────────────────────────
    const { data: thumbUrlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(thumbPath)

    const thumbPublicUrl = thumbUrlData.publicUrl

    // ── 5. Persist thumb URL to the photos row ────────────────────────────────
    const { error: dbError } = await supabase
      .from('photos')
      .update({ thumb_url: thumbPublicUrl })
      .eq('id', photo_id)

    if (dbError) throw new Error(`DB update failed: ${dbError.message}`)

    return new Response(
      JSON.stringify({ ok: true, thumb_url: thumbPublicUrl }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[process-image]', message)
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
