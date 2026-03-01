// ─── Database types (mirroring Supabase schema) ─────────────────────────────

export interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  created_at: string
}

export type CategoryColor =
  | 'rose'
  | 'pink'
  | 'purple'
  | 'blue'
  | 'green'
  | 'amber'
  | 'orange'
  | 'teal'

export type CategoryIcon =
  | 'heart'
  | 'star'
  | 'camera'
  | 'map-pin'
  | 'music'
  | 'coffee'
  | 'gift'
  | 'sun'
  | 'moon'
  | 'plane'
  | 'home'
  | 'sparkles'

export interface Category {
  id: string
  user_id: string
  name: string
  description?: string
  color: CategoryColor
  icon: CategoryIcon
  created_at: string
  _count?: { memories: number }
}

export type MemoryType = 'text' | 'photo' | 'mixed'

export interface Memory {
  id: string
  user_id: string
  title: string
  content?: string
  memory_date: string          // ISO string – the date this memory happened
  category_id?: string
  category?: Category
  location?: string
  mood?: 'happy' | 'romantic' | 'nostalgic' | 'excited' | 'peaceful'
  is_favorite: boolean
  cover_photo_url?: string
  photos?: Photo[]
  tags?: string[]
  created_at: string
  updated_at: string
}

export interface Photo {
  id: string
  memory_id: string
  user_id: string
  storage_path: string         // path inside Supabase Storage bucket
  public_url: string
  caption?: string
  taken_at?: string
  width?: number
  height?: number
  size_bytes?: number
  order_index: number
  created_at: string
}

// ─── UI / App types ───────────────────────────────────────────────────────────

export interface TimelineGroup {
  label: string                // e.g. "Febrero 2026"
  year: number
  month: number
  memories: Memory[]
}

export interface UploadProgress {
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

export type ViewMode = 'grid' | 'list' | 'masonry'
export type SortOrder = 'date_desc' | 'date_asc' | 'created_desc' | 'alpha'
