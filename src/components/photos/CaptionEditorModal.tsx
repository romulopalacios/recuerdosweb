import { forwardRef } from 'react'
import { LazyMotion, domAnimation, m } from 'framer-motion'
import type { Photo } from '@/types'

interface CaptionEditorModalProps {
  photo: Photo
  captionText: string
  isSaving: boolean
  onChange: (text: string) => void
  onClose: () => void
  onSave: () => void
}

export const CaptionEditorModal = forwardRef<HTMLInputElement, CaptionEditorModalProps>(
  function CaptionEditorModal({ photo, captionText, isSaving, onChange, onClose, onSave }, ref) {
    return (
      <LazyMotion features={domAnimation}>
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
          role="button"
          tabIndex={0}
          aria-label="Cerrar editor de descripción"
          onClick={onClose}
          onKeyDown={(e) => {
            if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onClose()
            }
          }}
        >
          <m.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display font-bold text-gray-900 mb-3">Descripción de la foto</h3>
            <img src={photo.public_url} alt="" className="w-full h-40 object-cover rounded-xl mb-3" />
            <input
              ref={ref}
              type="text"
              value={captionText}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !isSaving) onSave() }}
              placeholder="Añade una descripción…"
              maxLength={120}
              className="w-full px-3 py-2 border border-rose-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
            />
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={isSaving}
                className="flex-1 px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-medium cursor-pointer hover:bg-rose-700 transition-colors disabled:opacity-60"
              >
                {isSaving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </m.div>
        </div>
      </LazyMotion>
    )
  },
)
