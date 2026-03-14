import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { LazyMotion, domAnimation, m } from 'framer-motion'
import { Trash2, Star, Maximize2, Pencil } from 'lucide-react'
import { Lightbox } from './Lightbox'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ProgressiveImage } from '@/components/ui/ProgressiveImage'
import { CaptionEditorModal } from './CaptionEditorModal'
import { useDeletePhoto, useSetCoverPhoto, useUpdatePhoto } from '@/hooks/usePhotos'
import type { Photo } from '@/types'

interface PhotoGridProps {
  photos: Photo[]
  memoryId: string
  /** Current cover_photo_url of the memory */
  coverUrl?: string
  readonly?: boolean
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } }
const item = { hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1, transition: { duration: 0.2 } } }

export function PhotoGrid({ photos, memoryId, coverUrl, readonly }: PhotoGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Photo | null>(null)
  const [captionTarget, setCaptionTarget] = useState<Photo | null>(null)
  const [captionText, setCaptionText] = useState('')
  const captionInputRef = useRef<HTMLInputElement>(null)
  const deleteMutation  = useDeletePhoto(memoryId)
  const coverMutation   = useSetCoverPhoto(memoryId)
  const captionMutation = useUpdatePhoto()

  function openCaption(photo: Photo) {
    flushSync(() => { setCaptionTarget(photo); setCaptionText(photo.caption ?? '') })
    captionInputRef.current?.focus()
  }

  if (photos.length === 0) return null

  return (
    <>
      <LazyMotion features={domAnimation}>
        <m.div
          variants={container} initial="hidden" animate="show"
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2"
        >
          {photos.map((photo, idx) => {
          const isCover = photo.public_url === coverUrl
          return (
            <m.div
              key={photo.id}
              variants={item}
              className="group relative aspect-square rounded-xl overflow-hidden bg-rose-50 cursor-pointer"
            >
              <ProgressiveImage
                src={photo.public_url}
                alt={photo.caption ?? ''}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                onClick={() => setLightboxIndex(idx)}
              />

              {/* Cover badge */}
              {isCover && (
                <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-400 text-white text-[10px] font-bold">
                  <Star size={9} className="fill-white" /> Portada
                </div>
              )}

              {/* Hover actions */}
              {!readonly && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-end justify-between p-2">
                  <button
                    type="button"
                    onClick={() => setLightboxIndex(idx)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-all cursor-pointer backdrop-blur-sm"
                  >
                    <Maximize2 size={14} />
                  </button>

                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                    {/* Set cover */}
                    {!isCover && (
                      <button
                        type="button"
                        onClick={() => coverMutation.mutate({ photoId: photo.id, publicUrl: photo.public_url })}
                        title="Usar como portada"
                        className="p-1.5 rounded-lg bg-white/20 text-white hover:bg-amber-400 transition-all cursor-pointer backdrop-blur-sm"
                      >
                        <Star size={14} />
                      </button>
                    )}

                    {/* Caption edit */}
                    <button
                      type="button"
                      onClick={() => openCaption(photo)}
                      title="Editar descripción"
                      className="p-1.5 rounded-lg bg-white/20 text-white hover:bg-white/40 transition-all cursor-pointer backdrop-blur-sm"
                    >
                      <Pencil size={14} />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(photo)}
                      title="Eliminar"
                      className="p-1.5 rounded-lg bg-white/20 text-white hover:bg-red-500 transition-all cursor-pointer backdrop-blur-sm"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* Caption tooltip */}
              {photo.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <p className="text-white text-xs truncate">{photo.caption}</p>
                </div>
              )}
            </m.div>
          )
          })}
        </m.div>
      </LazyMotion>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return
          await deleteMutation.mutateAsync({ id: deleteTarget.id, storagePath: deleteTarget.storage_path })
          setDeleteTarget(null)
        }}
        title="Eliminar foto"
        description="¿Seguro que quieres eliminar esta foto? No se puede recuperar."
        confirmLabel="Sí, eliminar"
        danger
        loading={deleteMutation.isPending}
      />

      {captionTarget && (
        <CaptionEditorModal
          ref={captionInputRef}
          photo={captionTarget}
          captionText={captionText}
          isSaving={captionMutation.isPending}
          onChange={setCaptionText}
          onClose={() => setCaptionTarget(null)}
          onSave={async () => {
            await captionMutation.mutateAsync({ id: captionTarget.id, input: { caption: captionText.trim() || undefined } })
            setCaptionTarget(null)
          }}
        />
      )}
    </>
  )
}
