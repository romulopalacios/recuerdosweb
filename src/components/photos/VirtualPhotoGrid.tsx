/**
 * VirtualPhotoGrid
 * ─────────────────────────────────────────────────────────────────────────────
 * High-performance photo grid that can handle 1 000 – 100 000 photos without
 * saturating the DOM.
 *
 * Architecture:
 *  • useVirtualizer virtualises ROWS (each row = N photo cells side-by-side).
 *  • A ResizeObserver measures the container width so the column count is
 *    recalculated automatically when the viewport or sidebar changes.
 *  • Only the visible rows + an overscan buffer are mounted in the DOM.
 *  • Each photo cell is a ProgressiveImage (shimmer → fade-in on load).
 *  • Action buttons, Lightbox, delete/caption dialogs are preserved from the
 *    original PhotoGrid so existing call-sites only need to swap the component.
 */
import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { motion } from 'framer-motion'
import { Trash2, Star, Maximize2, Pencil } from 'lucide-react'
import { Lightbox } from './Lightbox'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ProgressiveImage } from '@/components/ui/ProgressiveImage'
import { useDeletePhoto, useSetCoverPhoto, useUpdatePhoto } from '@/hooks/usePhotos'
import type { Photo } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface VirtualPhotoGridProps {
  photos: Photo[]
  memoryId: string
  coverUrl?: string
  readonly?: boolean
  /** Height of each photo cell in px. Width is computed from column count. */
  cellHeight?: number
  /** Gap between cells in px */
  gap?: number
}

// ─── Column breakpoints (mirrors Tailwind sm/md/lg) ──────────────────────────

function getColumnCount(width: number): number {
  if (width >= 1024) return 4
  if (width >= 640)  return 3
  return 2
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VirtualPhotoGrid({
  photos,
  memoryId,
  coverUrl,
  readonly,
  cellHeight = 220,
  gap = 8,
}: VirtualPhotoGridProps) {
  const containerRef   = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(800)

  // ── Measure container width with ResizeObserver ───────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    setWidth(el.clientWidth)
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ── Derive grid dimensions ────────────────────────────────────────────────
  const columns = getColumnCount(width)
  const rowCount = Math.ceil(photos.length / columns)
  const rowHeight = cellHeight + gap

  // ── Virtualizer (rows only) ───────────────────────────────────────────────
  const virtualizer = useVirtualizer({
    count:        rowCount,
    getScrollElement: () => containerRef.current,
    estimateSize: () => rowHeight,
    overscan:     3,          // extra rows above/below viewport
  })

  // ── Dialog / lightbox state ───────────────────────────────────────────────
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [deleteTarget,  setDeleteTarget]  = useState<Photo | null>(null)
  const [captionTarget, setCaptionTarget] = useState<Photo | null>(null)
  const [captionText,   setCaptionText]   = useState('')

  const deleteMutation  = useDeletePhoto(memoryId)
  const coverMutation   = useSetCoverPhoto(memoryId)
  const captionMutation = useUpdatePhoto()

  // ── Stable open-lightbox callback so cell renders don't thrash ───────────
  const openLightbox = useCallback((idx: number) => setLightboxIndex(idx), [])

  // ── Build flat index → photo lookup for lightbox navigation ──────────────
  const flatPhotos = useMemo(() => photos, [photos])

  if (photos.length === 0) return null

  return (
    <>
      {/*
        The outer div is the SCROLL CONTAINER.
        react-virtual requires a fixed/constrained height so it knows the
        visible window. We cap at 80 vh so large galleries don't push content.
      */}
      <div
        ref={containerRef}
        className="overflow-auto rounded-xl"
        style={{ maxHeight: '80vh' }}
      >
        {/* Inner div whose height = total virtual height so the scroll-bar is correct */}
        <div
          className="relative w-full"
          style={{ height: virtualizer.getTotalSize() }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const rowStart  = virtualRow.index * columns
            const rowPhotos = flatPhotos.slice(rowStart, rowStart + columns)

            return (
              <div
                key={virtualRow.key}
                className="absolute top-0 left-0 w-full flex"
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                  height:    cellHeight,
                  gap:       gap,
                }}
              >
                {rowPhotos.map((photo, colIdx) => {
                  const flatIdx = rowStart + colIdx
                  const isCover = photo.public_url === coverUrl

                  return (
                    <div
                      key={photo.id}
                      className="group relative rounded-xl overflow-hidden bg-rose-50 flex-1"
                      style={{ height: cellHeight }}
                    >
                      <ProgressiveImage
                        src={photo.public_url}
                        alt={photo.caption ?? ''}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onClick={() => openLightbox(flatIdx)}
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
                            onClick={() => openLightbox(flatIdx)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-all cursor-pointer backdrop-blur-sm"
                          >
                            <Maximize2 size={14} />
                          </button>

                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
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
                            <button
                              type="button"
                              onClick={() => { setCaptionTarget(photo); setCaptionText(photo.caption ?? '') }}
                              title="Editar descripción"
                              className="p-1.5 rounded-lg bg-white/20 text-white hover:bg-white/40 transition-all cursor-pointer backdrop-blur-sm"
                            >
                              <Pencil size={14} />
                            </button>
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

                      {/* Caption overlay */}
                      {photo.caption && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <p className="text-white text-xs truncate">{photo.caption}</p>
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Empty flex cells to keep last row aligned */}
                {Array.from({ length: columns - rowPhotos.length }).map((_, i) => (
                  <div key={`empty-${i}`} className="flex-1" />
                ))}
              </div>
            )
          })}
        </div>
      </div>

      {/* Photo count hint */}
      <p className="mt-1 text-xs text-gray-400 text-right">
        {photos.length} foto{photos.length !== 1 ? 's' : ''}
        {photos.length > 50 && ' · vista virtualizada'}
      </p>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          photos={flatPhotos}
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

      {/* Caption editor */}
      {captionTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setCaptionTarget(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display font-bold text-gray-900 mb-3">Descripción de la foto</h3>
            <img src={captionTarget.public_url} alt="" className="w-full h-40 object-cover rounded-xl mb-3" />
            <input
              autoFocus
              type="text"
              value={captionText}
              onChange={(e) => setCaptionText(e.target.value)}
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
                onClick={async () => {
                  await captionMutation.mutateAsync({ id: captionTarget.id, input: { caption: captionText.trim() || undefined } })
                  setCaptionTarget(null)
                }}
                disabled={captionMutation.isPending}
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
