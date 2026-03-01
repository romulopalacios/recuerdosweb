import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from '@/services/categoriesService'

// ─── Query keys ──────────────────────────────────────────────────────────────
export const categoryKeys = {
  all:    () => ['categories']              as const,
  list:   () => ['categories', 'list']      as const,
  detail: (id: string) => ['categories', id] as const,
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export function useCategories() {
  return useQuery({
    queryKey: categoryKeys.list(),
    queryFn:  getCategories,
  })
}

export function useCategory(id: string) {
  return useQuery({
    queryKey: categoryKeys.detail(id),
    queryFn:  () => getCategoryById(id),
    enabled:  Boolean(id),
  })
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCategoryInput) => createCategory(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: categoryKeys.list() })
      toast.success('Categoría creada 🏷️')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCategoryInput }) =>
      updateCategory(id, input),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: categoryKeys.list()   })
      qc.invalidateQueries({ queryKey: categoryKeys.detail(id) })
      toast.success('Categoría actualizada ✅')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: categoryKeys.list() })
      // Also refetch memories as their category might be cleared
      qc.invalidateQueries({ queryKey: ['memories'] })
      toast.success('Categoría eliminada')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
