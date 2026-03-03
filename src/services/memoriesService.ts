import { supabase } from '@/lib/supabase'
import type { Memory } from '@/types'

// ─── Input types ─────────────────────────────────────────────────────────────

export interface CreateMemoryInput {
  title: string
  content?: string
  memory_date: string           // 'YYYY-MM-DD'
  category_id?: string | null
  location?: string
  mood?: Memory['mood']
  is_favorite?: boolean
  cover_photo_url?: string
  tags?: string[]
}

export type UpdateMemoryInput = Partial<CreateMemoryInput>

export interface GetMemoriesOptions {
  search?: string
  category_id?: string
  mood?: Memory['mood']
  is_favorite?: boolean
  from_date?: string
  to_date?: string
  sort?: 'date_desc' | 'date_asc' | 'created_desc' | 'alpha'
  limit?: number
  offset?: number
}

// ─── Service functions ───────────────────────────────────────────────────────

/** Fetch memories with optional filters */
export async function getMemories(opts: GetMemoriesOptions = {}): Promise<Memory[]> {
  const {
    search,
    category_id,
    mood,
    is_favorite,
    from_date,
    to_date,
    sort = 'date_desc',
    limit = 100,
    offset = 0,
  } = opts

  let query = supabase
    .from('memories')
    .select('*, category:categories(*)')

  // Filters
  if (search) {
    // BUG-06 fix: escape SQL LIKE wildcard characters so a literal '%' or '_'
    // in the search box doesn't match everything.
    const safe = search.replace(/[%_\\]/g, '\\$&')
    query = query.or(`title.ilike.%${safe}%,content.ilike.%${safe}%,location.ilike.%${safe}%`)
  }
  if (category_id) query = query.eq('category_id', category_id)
  if (mood) query = query.eq('mood', mood)
  if (is_favorite !== undefined) query = query.eq('is_favorite', is_favorite)
  if (from_date) query = query.gte('memory_date', from_date)
  if (to_date) query = query.lte('memory_date', to_date)

  // Sort
  switch (sort) {
    case 'date_asc':    query = query.order('memory_date', { ascending: true });  break
    case 'created_desc':query = query.order('created_at',  { ascending: false }); break
    case 'alpha':       query = query.order('title',        { ascending: true });  break
    default:            query = query.order('memory_date', { ascending: false }); break
  }

  query = query.range(offset, offset + limit - 1)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as Memory[]
}

/** Fetch a single memory with photos */
export async function getMemoryById(id: string): Promise<Memory> {
  const { data, error } = await supabase
    .from('memories')
    .select('*, category:categories(*), photos(*)')
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  // Sort photos by order_index
  if (data.photos) {
    data.photos = data.photos.sort(
      (a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index
    )
  }
  return data as Memory
}

/** Create a new memory.
 * @param asUserId  Optional user_id override. Write-permission guests pass
 *                  the owner's id so records land in the owner's collection.
 */
export async function createMemory(
  input: CreateMemoryInput,
  asUserId?: string,
): Promise<Memory> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const payload = {
    ...input,
    user_id: asUserId ?? user.id,
    is_favorite: input.is_favorite ?? false,
    tags: input.tags ?? [],
    category_id: input.category_id || null,
  }

  const { data, error } = await supabase
    .from('memories')
    .insert(payload)
    .select('*, category:categories(*)')
    .single()

  if (error) throw new Error(error.message)
  return data as Memory
}

/** Update a memory */
export async function updateMemory(id: string, input: UpdateMemoryInput): Promise<Memory> {
  const payload = {
    ...input,
    category_id: input.category_id || null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('memories')
    .update(payload)
    .eq('id', id)
    .select('*, category:categories(*)')
    .single()

  if (error) throw new Error(error.message)
  return data as Memory
}

/** Delete a memory (photos cascade in DB) */
export async function deleteMemory(id: string): Promise<void> {
  const { error } = await supabase.from('memories').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/** Toggle favorite status */
export async function toggleFavorite(id: string, current: boolean): Promise<void> {
  const { error } = await supabase
    .from('memories')
    .update({ is_favorite: !current, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

/** Get stats for the dashboard */
export async function getStats(): Promise<{
  total_memories: number
  total_photos: number
  total_categories: number
  favorites: number
}> {
  const [memoriesRes, photosRes, categoriesRes, favRes] = await Promise.all([
    supabase.from('memories').select('id', { count: 'exact', head: true }),
    supabase.from('photos').select('id', { count: 'exact', head: true }),
    supabase.from('categories').select('id', { count: 'exact', head: true }),
    supabase.from('memories').select('id', { count: 'exact', head: true }).eq('is_favorite', true),
  ])

  return {
    total_memories:   memoriesRes.count   ?? 0,
    total_photos:     photosRes.count     ?? 0,
    total_categories: categoriesRes.count ?? 0,
    favorites:        favRes.count        ?? 0,
  }
}

/** Get the earliest memory date (to calculate how long together) */
export async function getFirstMemoryDate(): Promise<string | null> {
  const { data } = await supabase
    .from('memories')
    .select('memory_date')
    .order('memory_date', { ascending: true })
    .limit(1)
    .single()
  return data?.memory_date ?? null
}
