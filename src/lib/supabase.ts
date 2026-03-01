import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️  Supabase env vars not found. Copy .env.example → .env.local and fill in your credentials.',
  )
}

export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  },
)

// ─── Storage helpers ─────────────────────────────────────────────────────────

export const PHOTOS_BUCKET = 'photos'

export function getPhotoUrl(path: string): string {
  const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Upload a photo with real per-file progress via XHR.
 * Supabase JS v2 does not expose upload progress; we hit the Storage REST API directly.
 * We MUST use the user's session access_token (not the anon key) so RLS auth.uid() resolves.
 */
export async function uploadPhoto(
  path: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  // Get the authenticated user's JWT — this is what Supabase RLS needs
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData?.session?.access_token
  if (!accessToken) throw new Error('No hay sesión activa. Inicia sesión de nuevo.')

  // Encode each path segment separately so slashes are preserved
  const encodedPath = path.split('/').map(encodeURIComponent).join('/')
  const url = `${supabaseUrl}/storage/v1/object/${PHOTOS_BUCKET}/${encodedPath}`

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`)
    xhr.setRequestHeader('x-upsert', 'false')
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100)
        resolve(getPhotoUrl(path))
      } else {
        try {
          const body = JSON.parse(xhr.responseText)
          reject(new Error(body?.error ?? body?.message ?? `Upload failed (${xhr.status})`))
        } catch {
          reject(new Error(`Upload failed (${xhr.status})`))
        }
      }
    }
    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.send(file)
  })
}
