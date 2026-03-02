import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Calendar, Search, X, Download } from 'lucide-react'
import { usePhotoAlbumExport } from '@/hooks/usePhotoAlbumExport'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { Lightbox } from '@/components/photos/Lightbox'
import { useAllPhotos } from '@/hooks/usePhotos'
import { formatMonthYear, groupBy } from '@/lib/utils'
import type { Photo } from '@/types'

type GalleryPhoto = Photo & { memory_title?: string; memory_date?: string }

// ─── PDF export button ────────────────────────────────────────────────────────
function ExportButton({ photos }: { photos: GalleryPhoto[] }) {
  const { exportAlbum, isExporting, progress } = usePhotoAlbumExport()
  return (
    <button
      type="button"
      disabled={isExporting || photos.length === 0}
      onClick={() => exportAlbum(photos, { title: 'Nuestros Recuerdos' })}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
    >
      <Download size={14} />
      {isExporting ? `${progress}%` : 'Exportar PDF'}
    </button>
  )
}

export default function GalleryPage() {
  const { data: photos = [], isLoading } = useAllPhotos()
  const [search, setSearch] = useState('')
  const [lightboxPhotos, setLightboxPhotos] = useState<Photo[]>([])
  const [lightboxIndex, setLightboxIndex] = useState(0)

  const filtered = useMemo(() => {
    if (!search.trim()) return photos as GalleryPhoto[]
    const q = search.toLowerCase()
    return (photos as GalleryPhoto[]).filter(
      (p) =>
        (p.caption ?? '').toLowerCase().includes(q) ||
        (p.memory_title ?? '').toLowerCase().includes(q),
    )
  }, [photos, search])

  const groups = useMemo(() => {
    const byMonth = groupBy(filtered, (p) => {
      const raw = (p as GalleryPhoto).memory_date ?? p.created_at
      try { return formatMonthYear(raw) } catch { return 'Sin fecha' }
    })
    return Object.entries(byMonth).sort(([a], [b]) => (a > b ? -1 : 1))
  }, [filtered])

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-gray-900">Galería de Fotos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {photos.length > 0 ? `${photos.length} foto${photos.length !== 1 ? 's' : ''} en total` : 'Todas tus fotos en un solo lugar'}
          </p>
        </div>
        {photos.length > 0 && (
          <ExportButton photos={filtered} />
        )}
      </div>

      {photos.length > 0 && (
        <Input
          placeholder="Buscar por descripción o recuerdo…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search size={15} />}
          rightIcon={search ? (
            <button type="button" onClick={() => setSearch('')} className="cursor-pointer hover:text-rose-500"><X size={14} /></button>
          ) : undefined}
        />
      )}

      {isLoading && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && photos.length === 0 && (
        <EmptyState
          emoji="📷"
          title="Todavía sin fotos"
          description="Abre un recuerdo y sube fotografías. Aquí aparecerán todas organizadas por fecha."
          action={{ label: 'Ver recuerdos', onClick: () => window.location.assign('/memories') }}
        />
      )}

      {!isLoading && photos.length > 0 && filtered.length === 0 && (
        <EmptyState emoji="🔍" title="Sin resultados" description="Prueba con otras palabras."
          action={{ label: 'Limpiar búsqueda', onClick: () => setSearch('') }} />
      )}

      {!isLoading && groups.map(([month, monthPhotos]) => (
        <section key={month} className="space-y-2">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-rose-400" />
            <h2 className="font-display font-semibold text-gray-800 capitalize">{month}</h2>
            <span className="text-xs text-gray-400">({monthPhotos.length})</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {monthPhotos.map((photo, idx) => (
              <button
                key={photo.id} type="button"
                onClick={() => { setLightboxPhotos(monthPhotos); setLightboxIndex(idx) }}
                className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-300"
              >
                <img src={photo.public_url} alt={photo.caption ?? ''} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />
                {photo.memory_title && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <p className="text-white text-[10px] truncate">{photo.memory_title}</p>
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            {[...new Set(monthPhotos.map((p) => p.memory_title).filter(Boolean))].map((title) => {
              const sample = monthPhotos.find((p) => p.memory_title === title)!
              return (
                <Link key={title} to={`/memories/${sample.memory_id}`} className="text-xs text-rose-500 hover:underline">
                  📌 {title}
                </Link>
              )
            })}
          </div>
        </section>
      ))}

      {lightboxPhotos.length > 0 && (
        <Lightbox photos={lightboxPhotos} index={lightboxIndex}
          onClose={() => setLightboxPhotos([])} onNavigate={setLightboxIndex} />
      )}
    </motion.div>
  )
}
