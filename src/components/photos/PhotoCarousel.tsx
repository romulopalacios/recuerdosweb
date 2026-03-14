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
import { useState, useReducer, useCallback, useRef, useEffect } from 'react'
import { flushSync } from 'react-dom'
import { AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion'
import { ChevronLeft, ChevronRight, Maximize2, Star, Pencil, Trash2 } from 'lucide-react'
import { CaptionEditorModal } from './CaptionEditorModal'
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

// ─── Dialog state reducer ─────────────────────────────────────────────────────

type DialogState = {
  lightboxOpen: boolean
  deleteTarget: Photo | null
  captionTarget: Photo | null
  captionText: string
}
type DialogAction =
  | { type: 'OPEN_LIGHTBOX' }
  | { type: 'CLOSE_LIGHTBOX' }
  | { type: 'OPEN_DELETE'; photo: Photo }
  | { type: 'CLOSE_DELETE' }
  | { type: 'OPEN_CAPTION'; photo: Photo; text: string }
  | { type: 'UPDATE_CAPTION_TEXT'; text: string }
  | { type: 'CLOSE_CAPTION' }

function dialogReducer(state: DialogState, action: DialogAction): DialogState {
  switch (action.type) {
    case 'OPEN_LIGHTBOX':       return { ...state, lightboxOpen: true }
    case 'CLOSE_LIGHTBOX':      return { ...state, lightboxOpen: false }
    case 'OPEN_DELETE':         return { ...state, deleteTarget: action.photo }
    case 'CLOSE_DELETE':        return { ...state, deleteTarget: null }
    case 'OPEN_CAPTION':        return { ...state, captionTarget: action.photo, captionText: action.text }
    case 'UPDATE_CAPTION_TEXT': return { ...state, captionText: action.text }
    case 'CLOSE_CAPTION':       return { ...state, captionTarget: null, captionText: '' }
    default:                    return state
  }
}

const initialDialog: DialogState = { lightboxOpen: false, deleteTarget: null, captionTarget: null, captionText: '' }

// ─── ThumbnailStrip ───────────────────────────────────────────────────────────

interface ThumbnailStripProps {
  photos: Photo[]
  activeIndex: number
  dragOverIdx: number | null
  dragFromRef: React.RefObject<number | null>
  readonly?: boolean
  thumbsRef: React.RefObject<HTMLDivElement>
  onSelect: (i: number) => void
  onDragStart: (i: number) => void
  onDragOver: (e: React.DragEvent, i: number) => void
  onDrop: (i: number) => void
  onDragEnd: () => void
}

function ThumbnailStrip({ photos, activeIndex, dragOverIdx, dragFromRef, readonly, thumbsRef, onSelect, onDragStart, onDragOver, onDrop, onDragEnd }: ThumbnailStripProps) {
  return (
    <div ref={thumbsRef} className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
      {photos.map((p, i) => (
        <button
          key={p.id}
          type="button"
          draggable={!readonly}
          onDragStart={() => onDragStart(i)}
          onDragOver={(e) => onDragOver(e, i)}
          onDrop={() => onDrop(i)}
          onDragEnd={onDragEnd}
          onClick={() => onSelect(i)}
          title={!readonly ? 'Arrastra para reordenar' : undefined}
          className={cn(
            'flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all duration-200 cursor-pointer select-none',
            i === activeIndex
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
  )
}

export function PhotoCarousel({ photos, memoryId, coverUrl, readonly }: PhotoCarouselProps) {
  const [index,         setIndex]         = useState(0)
  const [direction,     setDirection]     = useState(0)       // -1 prev / 1 next
  const [dialog, dispatch] = useReducer(dialogReducer, initialDialog)
  const captionInputRef = useRef<HTMLInputElement>(null)
  const thumbsRef    = useRef<HTMLDivElement>(null)
  const touchStartX   = useRef<number | null>(null)
  const dragFromRef   = useRef<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  const deleteMutation  = useDeletePhoto(memoryId)
  const coverMutation   = useSetCoverPhoto(memoryId)
  const captionMutation = useUpdatePhoto()
  const reorderMutation = useReorderPhotos(memoryId)

  const openCaption = useCallback((photo: Photo) => {
    flushSync(() => dispatch({ type: 'OPEN_CAPTION', photo, text: photo.caption ?? '' }))
    captionInputRef.current?.focus()
  }, [])

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
    if (dialog.lightboxOpen) return
    function handler(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft')  go(index - 1)
      if (e.key === 'ArrowRight') go(index + 1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [go, index, dialog.lightboxOpen])

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
      <LazyMotion features={domAnimation}>
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
            <m.div
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
                onClick={() => dispatch({ type: 'OPEN_LIGHTBOX' })}
              />
            </m.div>
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
              onClick={() => dispatch({ type: 'OPEN_LIGHTBOX' })}
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
                  onClick={() => openCaption(photo)}
                  className="w-8 h-8 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors cursor-pointer"
                >
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  title="Eliminar foto"
                  onClick={() => dispatch({ type: 'OPEN_DELETE', photo })}
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
              {photos.map((p, i) => (
                <span
                  key={`dot-${p.id}`}
                  style={{
                    transition: 'width 300ms ease, opacity 300ms ease',
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
          <ThumbnailStrip
            photos={photos}
            activeIndex={index}
            dragOverIdx={dragOverIdx}
            dragFromRef={dragFromRef}
            readonly={readonly}
            thumbsRef={thumbsRef}
            onSelect={(i) => { setDirection(i > index ? 1 : -1); setIndex(i) }}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
          />
        )}
        </div>
      </LazyMotion>

      {/* ── Lightbox ──────────────────────────────────────────────────── */}
      {dialog.lightboxOpen && (
        <Lightbox
          photos={photos}
          index={index}
          onClose={() => dispatch({ type: 'CLOSE_LIGHTBOX' })}
          onNavigate={(i) => { setDirection(i > index ? 1 : -1); setIndex(i) }}
        />
      )}

      {/* ── Delete confirm ─────────────────────────────────────────────── */}
      <ConfirmDialog
        open={Boolean(dialog.deleteTarget)}
        onClose={() => dispatch({ type: 'CLOSE_DELETE' })}
        onConfirm={async () => {
          if (!dialog.deleteTarget) return
          await deleteMutation.mutateAsync({
            id: dialog.deleteTarget.id,
            storagePath: dialog.deleteTarget.storage_path,
          })
          dispatch({ type: 'CLOSE_DELETE' })
        }}
        title="Eliminar foto"
        description="¿Seguro que quieres eliminar esta foto? No se puede recuperar."
        confirmLabel="Sí, eliminar"
        danger
        loading={deleteMutation.isPending}
      />

      {/* ── Caption editor ─────────────────────────────────────────────── */}
      {dialog.captionTarget && (
        <CaptionEditorModal
          ref={captionInputRef}
          photo={dialog.captionTarget}
          captionText={dialog.captionText}
          isSaving={captionMutation.isPending}
          onChange={(text) => dispatch({ type: 'UPDATE_CAPTION_TEXT', text })}
          onClose={() => dispatch({ type: 'CLOSE_CAPTION' })}
          onSave={async () => {
            if (!dialog.captionTarget) return
            await captionMutation.mutateAsync({
              id: dialog.captionTarget.id,
              input: { caption: dialog.captionText.trim() || undefined },
            })
            dispatch({ type: 'CLOSE_CAPTION' })
          }}
        />
      )}
    </>
  )
}
