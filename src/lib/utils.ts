import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

// ─── Tailwind utility ─────────────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** "14 de febrero de 2025" */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, "d 'de' MMMM 'de' yyyy", { locale: es })
}

/** "Febrero 2025" */
export function formatMonthYear(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'MMMM yyyy', { locale: es })
}

/** "hace 3 días" */
export function formatRelative(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatDistanceToNow(d, { addSuffix: true, locale: es })
}

/** Group an array by a key */
export function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce<Record<string, T[]>>((acc, item) => {
    const k = key(item)
    if (!acc[k]) acc[k] = []
    acc[k].push(item)
    return acc
  }, {})
}

/** Human-readable file size */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

// SEC: allowlist of extensions that may appear in storage paths.
// Prevents storing files like "payload.html" via a renamed upload.
const SAFE_PHOTO_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif'])

/** Generate a unique storage path for a photo */
export function buildPhotoPath(userId: string, memoryId: string, filename: string): string {
  const parts = filename.split('.')
  const rawExt = (parts.length > 1 && parts[0] !== '' ? parts.pop()! : '').toLowerCase()
  // SEC: only allow safe image extensions; fall back to 'jpg' for anything else
  const ext = SAFE_PHOTO_EXTENSIONS.has(rawExt) ? rawExt : 'jpg'
  const ts = Date.now()
  return `${userId}/${memoryId}/${ts}.${ext}`
}
