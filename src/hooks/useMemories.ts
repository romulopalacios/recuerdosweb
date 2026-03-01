import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
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

export function useCreateMemory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateMemoryInput) => createMemory(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: memoryKeys.all() })
      qc.invalidateQueries({ queryKey: ['stats'] })
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: memoryKeys.all() })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
