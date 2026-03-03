import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, Loader2, X } from 'lucide-react'
import { DropZone } from './DropZone'
import { PhotoCarousel } from './PhotoCarousel'
import { usePhotosByMemory } from '@/hooks/usePhotos'
import { addPhoto } from '@/services/photosService'
import { useQueryClient } from '@tanstack/react-query'
import { photoKeys } from '@/hooks/usePhotos'
import { toast } from 'sonner'
import { formatBytes } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { notifyOwner } from '@/lib/pushNotify'
import type { UploadProgress } from '@/types'

interface PhotoUploaderProps {
  memoryId: string
  userId: string
  coverUrl?: string
  /** When true, photos are shown but uploading is disabled (for read-only guests). */
  readonly?: boolean
}

export function PhotoUploader({ memoryId, userId, coverUrl, readonly }: PhotoUploaderProps) {
  const { data: photos = [], isLoading } = usePhotosByMemory(memoryId)
  const [queue, setQueue] = useState<UploadProgress[]>([])
  const [uploading, setUploading] = useState(false)
  const qc = useQueryClient()

  const updateQueue = useCallback(
    (file: File, patch: Partial<UploadProgress>) => {
      setQueue((prev) =>
        prev.map((q) => (q.file === file ? { ...q, ...patch } : q)),
      )
    },
    [],
  )

  function enqueue(files: File[]) {
    if (files.length === 0) return
    const newItems: UploadProgress[] = files.map((f) => ({
      file: f,
      progress: 0,
      status: 'pending',
    }))
    setQueue((prev) => [...prev, ...newItems])
    startUpload(newItems)
  }

  async function startUpload(items: UploadProgress[]) {
    setUploading(true)
    let successCount = 0

    for (const item of items) {
      updateQueue(item.file, { status: 'uploading', progress: 0 })
      try {
        const photo = await addPhoto({
          memoryId,
          userId,
          file: item.file,
          onProgress: (pct) => updateQueue(item.file, { progress: pct }),
        })
        updateQueue(item.file, { status: 'done', progress: 100 })
        successCount++

        // BUG-01 fix: PhotoUploader calls addPhoto directly (bypassing useAddPhoto
        // hook), so we must replicate the push-notification logic here.
        // If the uploaded photo's owner differs from the signed-in user we're in
        // guest (write-permission) mode — notify the owner.
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        if (currentUser && photo.user_id !== currentUser.id) {
          notifyOwner({
            owner_id: photo.user_id,
            title:    '¡Nueva foto añadida! 📸',
            body:     'Tu pareja ha añadido una foto a tus recuerdos.',
            url:      `/memories/${memoryId}`,
          })
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido'
        updateQueue(item.file, { status: 'error', error: msg, progress: 0 })
      }
    }

    // Refresh photos + stats after all uploads
    qc.invalidateQueries({ queryKey: photoKeys.byMemory(memoryId) })
    qc.invalidateQueries({ queryKey: photoKeys.gallery() })
    qc.invalidateQueries({ queryKey: ['stats'] })

    if (successCount > 0) {
      toast.success(`${successCount} foto${successCount !== 1 ? 's' : ''} subida${successCount !== 1 ? 's' : ''} 📸`)
    }
    setUploading(false)
  }

  function removeFromQueue(file: File) {
    setQueue((prev) => prev.filter((q) => q.file !== file))
  }

  function clearDone() {
    setQueue((prev) => prev.filter((q) => q.status === 'pending' || q.status === 'uploading'))
  }

  const hasDone  = queue.some((q) => q.status === 'done' || q.status === 'error')

  return (
    <div className="space-y-4">
      {/* Existing photos */}
      {isLoading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-rose-50 animate-pulse" />
          ))}
        </div>
      ) : photos.length > 0 ? (
        <PhotoCarousel photos={photos} memoryId={memoryId} coverUrl={coverUrl} readonly={readonly} />
      ) : readonly ? (
        <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
          <span className="text-4xl">📷</span>
          <p className="text-sm">Este recuerdo aún no tiene fotos</p>
        </div>
      ) : null}

      {/* Drop zone — hidden for read-only guests */}
      {!readonly && (
        <DropZone
          onFiles={enqueue}
          disabled={uploading}
          className={photos.length > 0 ? 'py-5' : undefined}
        />
      )}

      {/* Upload queue — hidden in readonly mode */}
      <AnimatePresence>
        {!readonly && queue.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Cola de subida ({queue.length})
              </p>
              {hasDone && (
                <button
                  type="button"
                  onClick={clearDone}
                  className="text-xs text-gray-400 hover:text-rose-500 transition-colors cursor-pointer"
                >
                  Limpiar completadas
                </button>
              )}
            </div>

            {queue.map((item, i) => (
              <QueueItem key={i} item={item} onRemove={() => removeFromQueue(item.file)} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Queue row ────────────────────────────────────────────────────────────────

function QueueItem({ item, onRemove }: { item: UploadProgress; onRemove: () => void }) {
  const { file, progress, status, error } = item

  // SEC/MEM: create the object URL once and revoke it on unmount to avoid
  // keeping sensitive image data in memory after the upload is dismissed.
  const [previewUrl, setPreviewUrl] = useState('')
  useEffect(() => {
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 6 }}
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl border text-sm',
        status === 'done'     ? 'bg-green-50  border-green-100' :
        status === 'error'    ? 'bg-red-50    border-red-100'   :
        status === 'uploading'? 'bg-rose-50   border-rose-100'  :
                                'bg-gray-50   border-gray-100',
      )}
    >
      {/* Thumbnail */}
      <img src={previewUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-800 truncate text-xs">{file.name}</p>
        <p className="text-gray-400 text-xs">{formatBytes(file.size)}</p>

        {status === 'uploading' && (
          <div className="mt-1.5 h-1.5 rounded-full bg-rose-100 overflow-hidden">
            <motion.div
              className="h-full bg-rose-500 rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.2 }}
            />
          </div>
        )}
        {status === 'error' && (
          <p className="text-red-500 text-xs mt-0.5">{error}</p>
        )}
      </div>

      {/* Status icon */}
      <div className="flex-shrink-0">
        {status === 'uploading' && <Loader2 size={16} className="text-rose-400 animate-spin" />}
        {status === 'done'      && <CheckCircle2 size={16} className="text-green-500" />}
        {status === 'error'     && <XCircle size={16} className="text-red-400" />}
        {status === 'pending'   && (
          <button type="button" onClick={onRemove} className="text-gray-300 hover:text-red-400 transition-colors cursor-pointer">
            <X size={16} />
          </button>
        )}
      </div>
    </motion.div>
  )
}
