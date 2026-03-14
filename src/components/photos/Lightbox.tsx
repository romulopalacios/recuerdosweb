import { useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, Download, ExternalLink } from 'lucide-react'
import type { Photo } from '@/types'

interface LightboxProps {
  photos: Photo[]
  index: number
  onClose: () => void
  onNavigate: (index: number) => void
}

export function Lightbox({ photos, index, onClose, onNavigate }: LightboxProps) {
  const current = photos[index]
  const hasPrev = index > 0
  const hasNext = index < photos.length - 1

  const prev = useCallback(() => hasPrev && onNavigate(index - 1), [hasPrev, index, onNavigate])
  const next = useCallback(() => hasNext && onNavigate(index + 1), [hasNext, index, onNavigate])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose, prev, next])

  if (!current) return null

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        data-testid="lightbox"
        role="button"
        tabIndex={0}
        aria-label="Cerrar visor de fotos"
        className="fixed inset-0 z-[200] flex flex-col bg-black/95"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClose()
          }
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 flex-shrink-0"
          role="button"
          tabIndex={0}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              e.stopPropagation()
            }
          }}
        >
          <div className="text-white/60 text-sm">
            {index + 1} / {photos.length}
            {current.caption && <span className="ml-3 text-white/80">{current.caption}</span>}
          </div>
          <div className="flex items-center gap-2">
            <a
              href={current.public_url}
              download
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              title="Descargar"
            >
              <Download size={18} />
            </a>
            <a
              href={current.public_url}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              title="Abrir en nueva pestaña"
            >
              <ExternalLink size={18} />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Main image */}
        <div
          className="flex-1 flex items-center justify-center px-16 min-h-0"
          role="button"
          tabIndex={0}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              e.stopPropagation()
            }
          }}
        >
          <motion.img
            key={current.id}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.18 }}
            src={current.public_url}
            alt={current.caption ?? 'Foto'}
            className="max-h-full max-w-full object-contain rounded-xl select-none"
            draggable={false}
          />
        </div>

        {/* Prev / Next buttons */}
        {hasPrev && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); prev() }}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all cursor-pointer backdrop-blur-sm"
          >
            <ChevronLeft size={22} />
          </button>
        )}
        {hasNext && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); next() }}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all cursor-pointer backdrop-blur-sm"
          >
            <ChevronRight size={22} />
          </button>
        )}

        {/* Thumbnail strip */}
        {photos.length > 1 && (
          <div
            className="flex-shrink-0 flex items-center justify-center gap-2 p-4 overflow-x-auto"
            role="button"
            tabIndex={0}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                e.stopPropagation()
              }
            }}
          >
            {photos.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onNavigate(i)}
                className={`w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 transition-all cursor-pointer ${
                  i === index ? 'ring-2 ring-rose-400 scale-110' : 'opacity-50 hover:opacity-80'
                }`}
              >
                <img src={p.public_url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>,
    document.body,
  )
}
