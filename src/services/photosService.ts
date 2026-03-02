import { supabase } from '@/lib/supabase'
import { uploadPhoto, PHOTOS_BUCKET, getThumbUrl } from '@/lib/supabase'
import { buildPhotoPath } from '@/lib/utils'
import type { Photo } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UploadPhotoInput {
  memoryId: string
  userId: string
  file: File
  onProgress?: (pct: number) => void
}

export interface UpdatePhotoInput {
  caption?: string
  order_index?: number
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getPhotosByMemory(memoryId: string): Promise<Photo[]> {
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('memory_id', memoryId)
    .order('order_index', { ascending: true })
  if (error) throw error
  return data as Photo[]
}

/** Fetch all photos for the authenticated user, newest first (for Gallery). */
export async function getAllPhotos(): Promise<(Photo & { memory_title?: string; memory_date?: string })[]> {
  const { data, error } = await supabase
    .from('photos')
    .select('*, memory:memories(title, memory_date)')
    .order('created_at', { ascending: false })
  if (error) throw error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((p: any) => ({
    ...p,
    memory_title: p.memory?.title,
    memory_date:  p.memory?.memory_date,
  }))
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function addPhoto({ memoryId, userId, file, onProgress }: UploadPhotoInput): Promise<Photo> {
  const path = buildPhotoPath(userId, memoryId, file.name)
  const publicUrl = await uploadPhoto(path, file, onProgress)

  const { data, error } = await supabase
    .from('photos')
    .insert({
      memory_id:    memoryId,
      user_id:      userId,
      storage_path: path,
      public_url:   publicUrl,
      // Thumb URL via Supabase Storage Image Transformations CDN (resize-on-demand)
      thumb_url:    getThumbUrl(path, 200, 200, 'cover'),
      size_bytes:   file.size,
    })
    .select()
    .single()

  if (error) {
    // Roll back: remove orphaned file from storage so it doesn't accumulate
    await supabase.storage.from(PHOTOS_BUCKET).remove([path]).catch(() => null)
    throw error
  }

  // Auto-set as cover image when this is the first photo added to a memory
  const { count } = await supabase
    .from('photos')
    .select('*', { count: 'exact', head: true })
    .eq('memory_id', memoryId)
  if (count === 1) {
    await setCoverPhoto((data as Photo).id, memoryId, publicUrl).catch(() => null)
  }

  return data as Photo
}

export async function updatePhoto(id: string, input: UpdatePhotoInput): Promise<Photo> {
  const { data, error } = await supabase
    .from('photos')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Photo
}

export async function deletePhoto(id: string, storagePath: string): Promise<void> {
  const { error: storageError } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .remove([storagePath])
  if (storageError) console.warn('Storage delete failed:', storageError.message)

  const { error } = await supabase.from('photos').delete().eq('id', id)
  if (error) throw error
}

/**
 * Batch-update order_index for a set of photos.
 * Used by drag-&-drop reordering in PhotoCarousel.
 */
export async function reorderPhotos(
  updates: { id: string; order_index: number }[],
): Promise<void> {
  await Promise.all(
    updates.map(({ id, order_index }) =>
      supabase.from('photos').update({ order_index }).eq('id', id),
    ),
  )
}

/** Set a photo as the cover image for its memory. */
export async function setCoverPhoto(_photoId: string, memoryId: string, publicUrl: string): Promise<void> {
  const { error } = await supabase
    .from('memories')
    .update({ cover_photo_url: publicUrl })
    .eq('id', memoryId)
  if (error) throw error
}

