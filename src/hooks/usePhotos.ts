import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getPhotosByMemory,
  getAllPhotos,
  addPhoto,
  updatePhoto,
  deletePhoto,
  setCoverPhoto,
  reorderPhotos,
  type UploadPhotoInput,
} from '@/services/photosService'

// ─── Query keys ──────────────────────────────────────────────────────────────

export const photoKeys = {
  all:       () => ['photos']                        as const,
  byMemory:  (id: string) => ['photos', 'memory', id] as const,
  gallery:   () => ['photos', 'gallery']              as const,
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export function usePhotosByMemory(memoryId: string) {
  return useQuery({
    queryKey: photoKeys.byMemory(memoryId),
    queryFn:  () => getPhotosByMemory(memoryId),
    enabled:  Boolean(memoryId),
  })
}

export function useAllPhotos() {
  return useQuery({
    queryKey: photoKeys.gallery(),
    queryFn:  getAllPhotos,
    staleTime: 1000 * 60 * 2,
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useAddPhoto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UploadPhotoInput) => addPhoto(input),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: photoKeys.byMemory(vars.memoryId) })
      qc.invalidateQueries({ queryKey: photoKeys.gallery() })
      qc.invalidateQueries({ queryKey: ['stats'] })
    },
    onError: (err: Error) => toast.error(`Error al subir: ${err.message}`),
  })
}

export function useUpdatePhoto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: { caption?: string } }) =>
      updatePhoto(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: photoKeys.all() })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeletePhoto(memoryId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, storagePath }: { id: string; storagePath: string }) =>
      deletePhoto(id, storagePath),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: photoKeys.byMemory(memoryId) })
      qc.invalidateQueries({ queryKey: photoKeys.gallery() })
      qc.invalidateQueries({ queryKey: ['stats'] })
      toast.success('Foto eliminada')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useSetCoverPhoto(memoryId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ photoId, publicUrl }: { photoId: string; publicUrl: string }) =>
      setCoverPhoto(photoId, memoryId, publicUrl),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['memories', memoryId] })
      qc.invalidateQueries({ queryKey: photoKeys.byMemory(memoryId) })
      toast.success('Portada actualizada ✅')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useReorderPhotos(memoryId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: reorderPhotos,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: photoKeys.byMemory(memoryId) })
    },
  })
}
