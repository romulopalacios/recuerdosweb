import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Tag } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { CategoryCard } from '@/components/categories/CategoryCard'
import { CategoryForm } from '@/components/categories/CategoryForm'
import { useCategories } from '@/hooks/useCategories'
import type { Category } from '@/types'

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }

export default function CategoriesPage() {
  const { data: categories = [], isLoading, error } = useCategories()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)

  function openCreate() { setEditing(null); setFormOpen(true) }
  function openEdit(cat: Category) { setEditing(cat); setFormOpen(true) }
  function closeForm() { setFormOpen(false); setEditing(null) }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-gray-900">Categorías</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {categories.length > 0 ? `${categories.length} categorías` : 'Organiza tus recuerdos por tipo'}
          </p>
        </div>
        <Button leftIcon={<Plus size={16} />} onClick={openCreate}>Nueva categoría</Button>
      </div>

      {isLoading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-600">
          Error al cargar: {(error as Error).message}
        </div>
      )}

      {!isLoading && !error && categories.length === 0 && (
        <EmptyState
          emoji="🏷️"
          title="Aún no hay categorías"
          description="Crea categorías para organizar tus recuerdos: Viajes, Cenas, Fechas especiales, Aventuras…"
          action={{ label: 'Crear primera categoría', onClick: openCreate, icon: <Plus size={16} /> }}
        />
      )}

      {!isLoading && categories.length > 0 && (
        <motion.div variants={container} initial="hidden" animate="show"
          className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <CategoryCard key={cat.id} category={cat} onEdit={openEdit} />
          ))}
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center justify-center rounded-2xl border-2 border-dashed border-rose-200 hover:border-rose-400 hover:bg-rose-50/50 cursor-pointer transition-all group min-h-[80px] text-gray-400 hover:text-rose-500"
          >
            <div className="flex items-center gap-2"><Plus size={18} /><span className="text-sm font-medium">Nueva categoría</span></div>
          </button>
        </motion.div>
      )}

      {!isLoading && categories.length >= 1 && (
        <div className="flex items-start gap-2 p-4 bg-rose-50 border border-rose-100 rounded-2xl">
          <Tag size={15} className="text-rose-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-500">
            Tip: Al crear un recuerdo puedes asignarle una categoría. Los colores e íconos aparecen en el timeline.
          </p>
        </div>
      )}

      <CategoryForm open={formOpen} onClose={closeForm} editing={editing} />
    </motion.div>
  )
}
