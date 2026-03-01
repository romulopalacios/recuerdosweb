import { supabase } from '@/lib/supabase'
import type { Category, CategoryColor, CategoryIcon } from '@/types'

// ─── Input types ─────────────────────────────────────────────────────────────

export interface CreateCategoryInput {
  name: string
  description?: string
  color: CategoryColor
  icon: CategoryIcon
}

export type UpdateCategoryInput = Partial<CreateCategoryInput>

// ─── Service functions ───────────────────────────────────────────────────────

/** Fetch all categories for the authenticated user, with memory count */
export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*, memories(count)')
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)

  // Map Supabase count aggregate to _count
  return (data ?? []).map((row: any) => ({
    ...row,
    _count: { memories: row.memories?.[0]?.count ?? 0 },
    memories: undefined,
  }))
}

/** Fetch a single category by id */
export async function getCategoryById(id: string): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data
}

/** Create a new category */
export async function createCategory(input: CreateCategoryInput): Promise<Category> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data, error } = await supabase
    .from('categories')
    .insert({ ...input, user_id: user.id })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

/** Update an existing category */
export async function updateCategory(id: string, input: UpdateCategoryInput): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

/** Delete a category (memories will have category_id set to NULL via DB cascade) */
export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
