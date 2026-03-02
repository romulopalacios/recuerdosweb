import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Plus, Heart } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { MemoryCard } from '@/components/memories/MemoryCard'
import { MemoryForm } from '@/components/memories/MemoryForm'
import { MemoryFilters } from '@/components/memories/MemoryFilters'
import { useMemories } from '@/hooks/useMemories'
import { useGuestMode } from '@/hooks/useGuestMode'
import type { Memory, ViewMode, SortOrder } from '@/types'

const DEFAULT_FILTERS = { search: '', sort: 'date_desc' as SortOrder }

export default function MemoriesPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Memory | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [filters, setFilters] = useState(DEFAULT_FILTERS as {
    search: string
    category_id?: string
    mood?: Memory['mood']
    is_favorite?: boolean
    sort: SortOrder
  })

  const { data: allMemories = [], isLoading, error } = useMemories({
    sort: filters.sort,
    category_id: filters.category_id,
    mood: filters.mood,
    is_favorite: filters.is_favorite,
  })

  // Client-side search (fast, avoids re-fetching on every keystroke)
  const memories = useMemo(() => {
    if (!filters.search.trim()) return allMemories
    const q = filters.search.toLowerCase()
    return allMemories.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        (m.content ?? '').toLowerCase().includes(q) ||
        (m.location ?? '').toLowerCase().includes(q) ||
        (m.tags ?? []).some((t) => t.includes(q)),
    )
  }, [allMemories, filters.search])

  function openCreate() { setEditing(null); setFormOpen(true) }
  function openEdit(m: Memory) { setEditing(m); setFormOpen(true) }
  function closeForm() { setFormOpen(false); setEditing(null) }
  function resetFilters() { setFilters(DEFAULT_FILTERS as typeof filters) }
  const { isGuest } = useGuestMode()

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-gray-900">Recuerdos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Todos tus momentos especiales</p>
        </div>
        {!isGuest && (
          <Button leftIcon={<Plus size={16} />} onClick={openCreate}>Nuevo recuerdo</Button>
        )}
      </div>

      {/* Filters */}
      {!isLoading && (
        <MemoryFilters
          filters={filters}
          onChange={(partial) => setFilters((prev) => ({ ...prev, ...partial }))}
          onReset={resetFilters}
          viewMode={viewMode}
          onViewMode={setViewMode}
          total={memories.length}
        />
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-600">
          Error al cargar recuerdos: {(error as Error).message}
        </div>
      )}

      {/* Empty state — no data at all */}
      {!isLoading && !error && allMemories.length === 0 && (
        <EmptyState
          emoji="💕"
          title={isGuest ? 'No hay recuerdos compartidos' : 'Aún no hay recuerdos'}
          description={isGuest ? 'Tu pareja aún no ha creado ninguno.' : 'Crea tu primer recuerdo con título, fecha, notas, categoría y más. Cada momento importa.'}
          action={isGuest ? undefined : { label: 'Crear primer recuerdo', onClick: openCreate, icon: <Plus size={16} /> }}
        />
      )}

      {/* Empty search result */}
      {!isLoading && allMemories.length > 0 && memories.length === 0 && (
        <EmptyState
          emoji="🔍"
          title="Sin resultados"
          description="Intenta con otros términos de búsqueda o cambia los filtros."
          action={{ label: 'Limpiar filtros', onClick: resetFilters }}
        />
      )}

      {/* Grid view */}
      {!isLoading && memories.length > 0 && viewMode === 'grid' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {memories.map((m) => (
            <MemoryCard key={m.id} memory={m} onEdit={isGuest ? undefined : openEdit} layout="grid" />
          ))}
        </div>
      )}

      {/* List view */}
      {!isLoading && memories.length > 0 && viewMode === 'list' && (
        <div className="flex flex-col gap-3">
          {memories.map((m) => (
            <MemoryCard key={m.id} memory={m} onEdit={isGuest ? undefined : openEdit} layout="list" />
          ))}
        </div>
      )}

      {/* Favorites shortcut */}
      {!isLoading && allMemories.length > 0 && !filters.is_favorite && (
        <button
          type="button"
          onClick={() => setFilters((f) => ({ ...f, is_favorite: true }))}
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-rose-500 transition-colors cursor-pointer mx-auto"
        >
          <Heart size={12} className="fill-rose-300 text-rose-300" />
          Ver solo favoritos
        </button>
      )}

      <MemoryForm open={formOpen} onClose={closeForm} editing={editing} />
    </motion.div>
  )
}
