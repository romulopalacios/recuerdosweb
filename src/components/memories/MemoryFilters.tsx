import { Search, Filter, X, LayoutGrid, List, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { useCategories } from '@/hooks/useCategories'
import { MOODS } from '@/lib/moodData'
import type { Memory, ViewMode, SortOrder } from '@/types'

export interface MemoryFilterState {
  search:       string
  category_id?: string
  mood?:        Memory['mood']
  is_favorite?: boolean
  sort:         SortOrder
}

interface MemoryFiltersProps {
  filters:   MemoryFilterState
  onChange:  (f: Partial<MemoryFilterState>) => void
  onReset:   () => void
  viewMode:  ViewMode
  onViewMode:(v: ViewMode) => void
  total:     number
}

export function MemoryFilters({ filters, onChange, onReset, viewMode, onViewMode, total }: MemoryFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const { data: categories = [] } = useCategories()

  const activeCount = [
    filters.category_id,
    filters.mood,
    filters.is_favorite,
  ].filter(Boolean).length

  return (
    <div className="space-y-3">
      {/* Search + view toggle row */}
      <div className="flex gap-3 items-center">
        <div className="flex-1">
          <Input
            placeholder="Buscar por título, notas, lugar…"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            leftIcon={<Search size={15} />}
            rightIcon={
              filters.search ? (
                <button type="button" onClick={() => onChange({ search: '' })} className="cursor-pointer hover:text-rose-500 transition-colors">
                  <X size={14} />
                </button>
              ) : undefined
            }
          />
        </div>

        {/* Advanced filters toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all cursor-pointer',
            showAdvanced || activeCount > 0
              ? 'bg-rose-50 border-rose-200 text-rose-600'
              : 'bg-white border-pink-200 text-gray-600 hover:border-rose-200 hover:text-rose-500',
          )}
        >
          <SlidersHorizontal size={15} />
          Filtros
          {activeCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-xs flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </button>

        {/* View mode */}
        <div className="flex rounded-xl border border-pink-200 overflow-hidden">
          <button
            type="button"
            onClick={() => onViewMode('grid')}
            className={cn('p-2.5 transition-colors cursor-pointer', viewMode === 'grid' ? 'bg-rose-500 text-white' : 'bg-white text-gray-400 hover:bg-pink-50')}
          >
            <LayoutGrid size={15} />
          </button>
          <button
            type="button"
            onClick={() => onViewMode('list')}
            className={cn('p-2.5 transition-colors cursor-pointer', viewMode === 'list' ? 'bg-rose-500 text-white' : 'bg-white text-gray-400 hover:bg-pink-50')}
          >
            <List size={15} />
          </button>
        </div>
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4 shadow-card">
          {/* Sort */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Ordenar</p>
            <div className="flex flex-wrap gap-2">
              {([
                { value: 'date_desc',    label: 'Más recientes' },
                { value: 'date_asc',     label: 'Más antiguos'  },
                { value: 'created_desc', label: 'Agregados último' },
                { value: 'alpha',        label: 'A–Z'           },
              ] as { value: SortOrder; label: string }[]).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChange({ sort: opt.value })}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer',
                    filters.sort === opt.value
                      ? 'bg-rose-500 text-white border-rose-500'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-rose-200',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Categories */}
          {categories.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Categoría</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onChange({ category_id: undefined })}
                  className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer', !filters.category_id ? 'bg-rose-500 text-white border-rose-500' : 'bg-white border-gray-200 text-gray-600 hover:border-rose-200')}
                >
                  Todas
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => onChange({ category_id: filters.category_id === cat.id ? undefined : cat.id })}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer',
                      filters.category_id === cat.id
                        ? 'bg-rose-500 text-white border-rose-500'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-rose-200',
                    )}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mood */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Estado de ánimo</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onChange({ mood: undefined })}
                className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer', !filters.mood ? 'bg-rose-500 text-white border-rose-500' : 'bg-white border-gray-200 text-gray-600 hover:border-rose-200')}
              >
                Todos
              </button>
              {MOODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => onChange({ mood: filters.mood === m.value ? undefined : m.value })}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer',
                    filters.mood === m.value
                      ? 'bg-rose-500 text-white border-rose-500'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-rose-200',
                  )}
                >
                  {m.emoji} {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Favorites only */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.is_favorite === true}
                onChange={(e) => onChange({ is_favorite: e.target.checked ? true : undefined })}
                className="w-4 h-4 rounded accent-rose-500 cursor-pointer"
              />
              Solo favoritos ❤️
            </label>

            {activeCount > 0 && (
              <button
                type="button"
                onClick={onReset}
                className="text-xs text-rose-500 hover:underline cursor-pointer flex items-center gap-1"
              >
                <X size={12} /> Limpiar filtros
              </button>
            )}
          </div>
        </div>
      )}

      {/* Results count */}
      <p className="text-xs text-gray-400">
        {total === 0 ? 'Sin resultados' : `${total} ${total === 1 ? 'recuerdo' : 'recuerdos'}`}
        {activeCount > 0 && ' (filtrado)'}
      </p>
    </div>
  )
}
