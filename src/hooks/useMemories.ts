import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { notifyOwner } from '@/lib/pushNotify'
import {
  getMemories,
  getMemoryById,
  createMemory,
  updateMemory,
  deleteMemory,
  toggleFavorite,
  type CreateMemoryInput,
  type UpdateMemoryInput,
  type GetMemoriesOptions,
} from '@/services/memoriesService'

// ─── Query keys ──────────────────────────────────────────────────────────────
export const memoryKeys = {
  all:    () => ['memories']                         as const,
  list:   (opts: GetMemoriesOptions) => ['memories', 'list', opts] as const,
  detail: (id: string) => ['memories', id]           as const,
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export function useMemories(opts: GetMemoriesOptions = {}) {
  return useQuery({
    queryKey: memoryKeys.list(opts),
    queryFn:  () => getMemories(opts),
  })
}

export function useMemory(id: string) {
  return useQuery({
    queryKey: memoryKeys.detail(id),
    queryFn:  () => getMemoryById(id),
    enabled:  Boolean(id),
  })
}

// ─── Mutations ───────────────────────────────────────────────────────────────

/**
 * @param asUserId  Pass owner's id when a write-permission guest is creating
 *                  memories so they land in the owner's collection.
 */
export function useCreateMemory(asUserId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateMemoryInput) => createMemory(input, asUserId),
    onSuccess: async () => {
      // If asUserId is set and differs from the signed-in user → guest mode
      if (asUserId) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user && asUserId !== user.id) {
          notifyOwner({
            owner_id: asUserId,
            title:    '¡Nuevo recuerdo creado! 💕',
            body:     'Tu pareja ha añadido un nuevo recuerdo.',
            url:      '/memories',
          })
        }
      }
      qc.invalidateQueries({ queryKey: memoryKeys.all() })
      qc.invalidateQueries({ queryKey: ['stats'] })
      qc.invalidateQueries({ queryKey: ['timeline'] })
      toast.success('¡Recuerdo guardado! 💕')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateMemory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateMemoryInput }) =>
      updateMemory(id, input),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: memoryKeys.all()      })
      qc.invalidateQueries({ queryKey: memoryKeys.detail(id) })
      qc.invalidateQueries({ queryKey: ['timeline'] })
      toast.success('Recuerdo actualizado ✅')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteMemory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteMemory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: memoryKeys.all() })
      qc.invalidateQueries({ queryKey: ['stats'] })
      qc.invalidateQueries({ queryKey: ['timeline'] })
      toast.success('Recuerdo eliminado')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useToggleFavorite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, current }: { id: string; current: boolean }) =>
      toggleFavorite(id, current),

    // ── Optimistic update ────────────────────────────────────────────────────
    // Flip the heart icon instantly; roll back if the server rejects.
    onMutate: async ({ id, current }) => {
      // Cancel any in-flight refetches so they don't overwrite our optimistic data
      await qc.cancelQueries({ queryKey: memoryKeys.all() })

      // Snapshot all cached list/detail queries that contain this memory
      const snapshots = qc.getQueriesData<import('@/types').Memory[]>({ queryKey: memoryKeys.all() })

      snapshots.forEach(([key, data]) => {
        if (!Array.isArray(data)) return
        qc.setQueryData<import('@/types').Memory[]>(
          key,
          data.map((m) => (m.id === id ? { ...m, is_favorite: !current } : m)),
        )
      })

      return { snapshots }
    },

    onError: (_err, _vars, ctx) => {
      // Roll back every cache we touched
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data))
      toast.error('No se pudo actualizar el favorito')
    },

    onSettled: () => {
      // Always sync with the server after optimistic update settles
      qc.invalidateQueries({ queryKey: memoryKeys.all() })
      qc.invalidateQueries({ queryKey: ['timeline'] })
    },
  })
}
