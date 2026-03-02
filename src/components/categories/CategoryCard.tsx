import { useState } from 'react'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { getIconEmoji } from '@/lib/categoryData'
import { useDeleteCategory } from '@/hooks/useCategories'
import type { Category, CategoryColor } from '@/types'

const gradientMap: Record<CategoryColor, string> = {
  rose:   'from-rose-500 to-pink-500',
  pink:   'from-pink-500 to-fuchsia-500',
  purple: 'from-purple-500 to-violet-500',
  blue:   'from-blue-500 to-sky-500',
  green:  'from-green-500 to-emerald-500',
  amber:  'from-amber-500 to-yellow-500',
  orange: 'from-orange-500 to-red-400',
  teal:   'from-teal-500 to-cyan-500',
}

interface CategoryCardProps {
  category: Category
  onEdit: (cat: Category) => void
}

export function CategoryCard({ category, onEdit }: CategoryCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const deleteMutation = useDeleteCategory()

  const gradient = gradientMap[category.color] ?? gradientMap.rose
  const emoji    = getIconEmoji(category.icon)
  const count    = category._count?.memories ?? 0

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        layout
      >
        <Card className="relative group overflow-hidden" hover>
          {/* Color bar */}
          <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient}`} />

          <div className="pt-2 flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-xl flex-shrink-0 shadow-sm`}>
                {emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{category.name}</p>
                {category.description && (
                  <p className="text-xs text-gray-400 truncate mt-0.5">{category.description}</p>
                )}
                <Badge color={category.color} dot className="mt-1.5">
                  {count} {count === 1 ? 'recuerdo' : 'recuerdos'}
                </Badge>
              </div>
            </div>

            {/* Actions menu */}
            <div className="relative flex-shrink-0 ml-2">
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <MoreHorizontal size={16} />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-8 z-20 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[140px]">
                    <button
                      type="button"
                      onClick={() => { setMenuOpen(false); onEdit(category) }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      <Pencil size={14} /> Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMenuOpen(false); setConfirmOpen(true) }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} /> Eliminar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={async () => {
          await deleteMutation.mutateAsync(category.id)
          setConfirmOpen(false)
        }}
        loading={deleteMutation.isPending}
        title={`¿Eliminar "${category.name}"?`}
        description={
          count > 0
            ? `Esta categoría tiene ${count} ${count === 1 ? 'recuerdo' : 'recuerdos'}. Los recuerdos no se eliminarán pero quedarán sin categoría.`
            : 'Esta categoría será eliminada permanentemente.'
        }
        confirmLabel="Sí, eliminar"
      />
    </>
  )
}
