/**
 * PhotoCarousel
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-featured carousel for the MemoryDetail photos section.
 *
 * Features:
 *  • Animated slide transitions (framer-motion)
 *  • Prev / Next arrow buttons
 *  • Touch swipe on mobile
 *  • Keyboard ← → navigation (when lightbox is closed)
 *  • Counter badge  "3 / 8"
 *  • Thumbnail strip (scrollable, active thumb highlighted)
 *  • Caption overlay on the main photo
 *  • Click main photo → full-screen Lightbox
 *  • Owner actions: expand, set-as-cover, edit caption, delete
 */
import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Maximize2, Star, Pencil, Trash2 } from 'lucide-react'
import { Lightbox } from './Lightbox'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ProgressiveImage } from '@/components/ui/ProgressiveImage'
import { useDeletePhoto, useSetCoverPhoto, useUpdatePhoto, useReorderPhotos } from '@/hooks/usePhotos'
import { cn } from '@/lib/utils'
import type { Photo } from '@/types'

interface PhotoCarouselProps {
  photos: Photo[]
  memoryId: string
  coverUrl?: string
  readonly?: boolean
}

// Slide variants: enter from right (+1) or from left (-1)
const variants = {
  enter:  (dir: number) => ({ x: dir > 0 ?  48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:   (dir: number) => ({ x: dir > 0 ? -48 :  48, opacity: 0 }),
}

export function PhotoCarousel({ photos, memoryId, coverUrl, readonly }: PhotoCarouselProps) {
  const [index,         setIndex]         = useState(0)
  const [direction,     setDirection]     = useState(0)       // -1 prev / 1 next
  const [lightboxOpen,  setLightboxOpen]  = useState(false)
  const [deleteTarget,  setDeleteTarget]  = useState<Photo | null>(null)
  const [captionTarget, setCaptionTarget] = useState<Photo | null>(null)
  const [captionText,   setCaptionText]   = useState('')
  const captionInputRef = useRef<HTMLInputElement>(null)
  const thumbsRef    = useRef<HTMLDivElement>(null)
  const touchStartX   = useRef<number | null>(null)
  const dragFromRef   = useRef<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  const deleteMutation  = useDeletePhoto(memoryId)
  const coverMutation   = useSetCoverPhoto(memoryId)
  const captionMutation = useUpdatePhoto()
  const reorderMutation = useReorderPhotos(memoryId)

  useEffect(() => {
    if (captionTarget) captionInputRef.current?.focus()
  }, [captionTarget])

  // Clamp index after a deletion
  useEffect(() => {
    if (photos.length > 0 && index >= photos.length) {
      setIndex(photos.length - 1)
    }
  }, [photos.length, index])

  // Scroll active thumbnail into view
  useEffect(() => {
    const el = thumbsRef.current?.children[index] as HTMLElement | undefined
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [index])

  const go = useCallback((next: number) => {
    if (photos.length === 0) return
    const clamped = ((next % photos.length) + photos.length) % photos.length
    setDirection(next > index ? 1 : -1)
    setIndex(clamped)
  }, [index, photos.length])

  // Keyboard ← → (disabled while lightbox is open)
  useEffect(() => {
    if (lightboxOpen) return
    function handler(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft')  go(index - 1)
      if (e.key === 'ArrowRight') go(index + 1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [go, index, lightboxOpen])

  // ── Drag & drop handlers (thumbnail strip reorder) ─────────────────────
  function handleDragStart(i: number) {
    dragFromRef.current = i
  }
  function handleDragOver(e: React.DragEvent, i: number) {
    e.preventDefault()
    if (dragFromRef.current !== null) setDragOverIdx(i)
  }
  function handleDrop(dropIdx: number) {
    const from = dragFromRef.current
    dragFromRef.current = null
    setDragOverIdx(null)
    if (from === null || from === dropIdx) return
    const reordered = [...photos]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(dropIdx, 0, moved)
    reorderMutation.mutate(reordered.map((p, idx) => ({ id: p.id, order_index: idx })))
    setDirection(dropIdx > from ? 1 : -1)
    setIndex(dropIdx)
  }
  function handleDragEnd() {
    dragFromRef.current = null
    setDragOverIdx(null)
  }

  if (photos.length === 0) return null

  const photo   = photos[index]
  const isCover = photo.public_url === coverUrl

  return (
    <>
      <div className="space-y-3">
        {/* ── Main image ─────────────────────────────────────────────── */}
        <div
          className="relative rounded-2xl overflow-hidden bg-gray-100 select-none"
          style={{ aspectRatio: '16 / 10' }}
          onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX }}
          onTouchEnd={(e) => {
            if (touchStartX.current === null) return
            const dx = e.changedTouches[0].clientX - touchStartX.current
            if (dx >  40) go(index - 1)
            else if (dx < -40) go(index + 1)
            touchStartX.current = null
          }}
        >
          {/* Animated photo */}
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={photo.id}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="absolute inset-0"
            >
              <ProgressiveImage
                src={photo.public_url}
                thumbSrc={photo.thumb_url}
                alt={photo.caption ?? ''}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => setLightboxOpen(true)}
              />
            </motion.div>
          </AnimatePresence>

          {/* Counter pill */}
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-sm text-white text-xs font-semibold tabular-nums pointer-events-none">
            {index + 1} / {photos.length}
          </div>

          {/* Cover badge */}
          {isCover && (
            <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400 text-white text-xs font-bold pointer-events-none">
              <Star size={9} className="fill-white" /> Portada
            </div>
          )}

          {/* Gradient + caption */}
          {photo.caption && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent px-4 pb-12 pt-8 pointer-events-none">
              <p className="text-white text-sm leading-snug drop-shadow-sm">{photo.caption}</p>
            </div>
          )}

          {/* Prev arrow */}
          {photos.length > 1 && (
            <button
              type="button"
              onClick={() => go(index - 1)}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/55 transition-colors cursor-pointer z-10"
              aria-label="Foto anterior"
            >
              <ChevronLeft size={18} />
            </button>
          )}

          {/* Next arrow */}
          {photos.length > 1 && (
            <button
              type="button"
              onClick={() => go(index + 1)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/55 transition-colors cursor-pointer z-10"
              aria-label="Siguiente foto"
            >
              <ChevronRight size={18} />
            </button>
          )}

          {/* Bottom-right action buttons */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              title="Ver en pantalla completa"
              className="w-8 h-8 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/55 transition-colors cursor-pointer"
            >
              <Maximize2 size={13} />
            </button>
            {!readonly && (
              <>
                {!isCover && (
                  <button
                    type="button"
                    title="Usar como portada"
                    onClick={() => coverMutation.mutate({ photoId: photo.id, publicUrl: photo.public_url })}
                    className="w-8 h-8 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center text-white hover:bg-amber-400 transition-colors cursor-pointer"
                  >
                    <Star size={13} />
                  </button>
                )}
                <button
                  type="button"
                  title="Editar descripción"
                  onClick={() => { setCaptionTarget(photo); setCaptionText(photo.caption ?? '') }}
                  className="w-8 h-8 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors cursor-pointer"
                >
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  title="Eliminar foto"
                  onClick={() => setDeleteTarget(photo)}
                  className="w-8 h-8 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center text-white hover:bg-red-500 transition-colors cursor-pointer"
                >
                  <Trash2 size={13} />
                </button>
              </>
            )}
          </div>

          {/* Dot indicators (when ≤8 photos and no thumbnail strip shown) */}
          {photos.length > 1 && photos.length <= 8 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 pointer-events-none">
              {photos.map((_, i) => (
                <span
                  key={i}
                  style={{
                    transition: 'all 300ms ease',
                    width: i === index ? '18px' : '5px',
                    opacity: i === index ? 1 : 0.45,
                  }}
                  className="h-[3.5px] rounded-full bg-white inline-block"
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Thumbnail strip (shown when 2+ photos) ──────────────────── */}
        {photos.length > 1 && (
          <div
            ref={thumbsRef}
            className="flex gap-2 overflow-x-auto pb-1"
            style={{ scrollbarWidth: 'none' }}
          >
            {photos.map((p, i) => (
              <button
                key={p.id}
                type="button"
                draggable={!readonly}
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDrop={() => handleDrop(i)}
                onDragEnd={handleDragEnd}
                onClick={() => { setDirection(i > index ? 1 : -1); setIndex(i) }}
                title={!readonly ? 'Arrastra para reordenar' : undefined}
                className={cn(
                  'flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all duration-200 cursor-pointer select-none',
                  i === index
                    ? 'border-rose-500 shadow-md scale-105'
                    : 'border-transparent opacity-55 hover:opacity-85 hover:border-gray-300',
                  dragOverIdx === i && dragFromRef.current !== i
                    ? 'border-blue-400 opacity-100 ring-2 ring-blue-300 ring-offset-1'
                    : '',
                )}
              >
                <img
                  src={p.thumb_url ?? p.public_url}
                  alt={p.caption ?? ''}
                  className="w-full h-full object-cover pointer-events-none"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Lightbox ──────────────────────────────────────────────────── */}
      {lightboxOpen && (
        <Lightbox
          photos={photos}
          index={index}
          onClose={() => setLightboxOpen(false)}
          onNavigate={(i) => { setDirection(i > index ? 1 : -1); setIndex(i) }}
        />
      )}

      {/* ── Delete confirm ─────────────────────────────────────────────── */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return
          await deleteMutation.mutateAsync({
            id: deleteTarget.id,
            storagePath: deleteTarget.storage_path,
          })
          setDeleteTarget(null)
        }}
        title="Eliminar foto"
        description="¿Seguro que quieres eliminar esta foto? No se puede recuperar."
        confirmLabel="Sí, eliminar"
        danger
        loading={deleteMutation.isPending}
      />

      {/* ── Caption editor ─────────────────────────────────────────────── */}
      {captionTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
          role="button"
          tabIndex={0}
          aria-label="Cerrar editor de descripción"
          onClick={() => setCaptionTarget(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setCaptionTarget(null)
            }
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display font-bold text-gray-900 mb-3">Descripción de la foto</h3>
            <img
              src={captionTarget.public_url}
              alt=""
              className="w-full h-40 object-cover rounded-xl mb-3"
            />
            <input
              ref={captionInputRef}
              type="text"
              value={captionText}
              onChange={(e) => setCaptionText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !captionMutation.isPending && (
                captionMutation.mutateAsync({
                  id: captionTarget.id,
                  input: { caption: captionText.trim() || undefined },
                }).then(() => setCaptionTarget(null))
              )}
              placeholder="Añade una descripción…"
              maxLength={120}
              className="w-full px-3 py-2 border border-rose-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
            />
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => setCaptionTarget(null)}
                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={captionMutation.isPending}
                onClick={async () => {
                  await captionMutation.mutateAsync({
                    id: captionTarget.id,
                    input: { caption: captionText.trim() || undefined },
                  })
                  setCaptionTarget(null)
                }}
                className="flex-1 px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-medium cursor-pointer hover:bg-rose-700 transition-colors disabled:opacity-60"
              >
                {captionMutation.isPending ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  )
}
