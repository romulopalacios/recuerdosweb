import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, MapPin, MoreHorizontal, Pencil, Trash2, Tag, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/Badge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { getIconEmoji } from '@/lib/categoryData'
import { getMoodEmoji } from '@/lib/moodData'
import { useDeleteMemory, useToggleFavorite } from '@/hooks/useMemories'
import { formatDate } from '@/lib/utils'
import type { Memory } from '@/types'
import { cn } from '@/lib/utils'

interface MemoryCardProps {
  memory: Memory
  onEdit: (m: Memory) => void
  layout?: 'grid' | 'list'
}

export function MemoryCard({ memory, onEdit, layout = 'grid' }: MemoryCardProps) {
  const [menuOpen,    setMenuOpen]    = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const deleteMutation   = useDeleteMemory()
  const favoriteMutation = useToggleFavorite()

  const moodEmoji = getMoodEmoji(memory.mood)
  const catEmoji  = memory.category ? getIconEmoji(memory.category.icon) : null

  /* ── List layout ── */
  if (layout === 'list') {
    return (
      <>
        <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} layout>
          <div className="group flex items-center gap-4 bg-white rounded-2xl border border-gray-100 shadow-card p-4 transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5">
            {/* cover / placeholder */}
            <div className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden bg-gray-100 flex items-center justify-center text-xl">
              {memory.cover_photo_url ? (
                <img src={memory.cover_photo_url} alt={memory.title} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl opacity-60">{catEmoji ?? moodEmoji ?? '💕'}</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  to={`/memories/${memory.id}`}
                  className="font-semibold text-gray-900 hover:text-rose-600 transition-colors truncate text-sm"
                >
                  {memory.title}
                </Link>
                {memory.is_favorite && <Heart size={12} className="text-rose-500 fill-rose-500 flex-shrink-0" />}
                {moodEmoji && <span className="text-sm">{moodEmoji}</span>}
              </div>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="text-xs text-gray-400">{formatDate(memory.memory_date)}</span>
                {memory.category && <Badge color={memory.category.color} dot size="sm">{catEmoji} {memory.category.name}</Badge>}
                {memory.location && (
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <MapPin size={10} />{memory.location}
                  </span>
                )}
              </div>
              {memory.content && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-1">{memory.content}</p>
              )}
            </div>

            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => favoriteMutation.mutate({ id: memory.id, current: memory.is_favorite })}
                className={cn(
                  'p-1.5 rounded-lg transition-all cursor-pointer',
                  memory.is_favorite
                    ? 'text-rose-500 bg-rose-50 hover:bg-rose-100'
                    : 'text-gray-300 hover:text-rose-400 hover:bg-rose-50',
                )}
              >
                <Heart size={14} className={memory.is_favorite ? 'fill-rose-500' : ''} />
              </button>
              <MemoryMenu
                memoryId={memory.id}
                onEdit={() => onEdit(memory)}
                onDelete={() => setConfirmOpen(true)}
                open={menuOpen}
                setOpen={setMenuOpen}
              />
            </div>
          </div>
        </motion.div>
        <ConfirmDialog
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={async () => { await deleteMutation.mutateAsync(memory.id); setConfirmOpen(false) }}
          loading={deleteMutation.isPending}
          title={`¿Eliminar "${memory.title}"?`}
          description="Este recuerdo se eliminará permanentemente junto con sus fotos."
          confirmLabel="Sí, eliminar"
        />
      </>
    )
  }

  /* ── Grid layout ── */
  return (
    <>
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} layout>
        <div className="group flex flex-col overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-card transition-all duration-250 hover:shadow-card-hover hover:-translate-y-1">
          {/* Cover image / placeholder */}
          <div className="relative h-44 bg-gray-100 overflow-hidden flex-shrink-0">
            {memory.cover_photo_url ? (
              <img
                src={memory.cover_photo_url}
                alt={memory.title}
                className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-400"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-6xl opacity-25 select-none">{catEmoji ?? '💕'}</span>
              </div>
            )}

            {/* top-right: favorite */}
            <button
              type="button"
              onClick={() => favoriteMutation.mutate({ id: memory.id, current: memory.is_favorite })}
              className={cn(
                'absolute top-3 right-3 w-8 h-8 rounded-full glass flex items-center justify-center',
                'transition-all cursor-pointer hover:scale-110',
                memory.is_favorite ? 'text-rose-500' : 'text-white/70 hover:text-rose-300',
              )}
            >
              <Heart size={14} className={memory.is_favorite ? 'fill-rose-500' : ''} />
            </button>

            {/* top-left: mood */}
            {moodEmoji && (
              <span className="absolute top-3 left-3 text-xl leading-none">{moodEmoji}</span>
            )}

            {/* bottom gradient overlay */}
            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/15 to-transparent pointer-events-none" />
          </div>

          {/* Body */}
          <div className="flex flex-col gap-2 p-4 flex-1">
            <div className="flex items-start justify-between gap-2">
              <Link
                to={`/memories/${memory.id}`}
                className="font-display font-semibold text-gray-900 hover:text-rose-600 transition-colors line-clamp-2 flex-1 leading-snug text-[15px]"
              >
                {memory.title}
              </Link>
              <MemoryMenu
                memoryId={memory.id}
                onEdit={() => onEdit(memory)}
                onDelete={() => setConfirmOpen(true)}
                open={menuOpen}
                setOpen={setMenuOpen}
              />
            </div>

            <p className="text-xs text-gray-400 font-medium">{formatDate(memory.memory_date)}</p>

            {memory.content && (
              <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{memory.content}</p>
            )}

            <div className="flex items-center gap-2 flex-wrap mt-auto pt-2 border-t border-gray-100">
              {memory.category && (
                <Badge color={memory.category.color} dot size="sm">
                  {memory.category.name}
                </Badge>
              )}
              {memory.location && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <MapPin size={10} />{memory.location}
                </span>
              )}
              {(memory.tags?.length ?? 0) > 0 && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Tag size={10} />{memory.tags!.slice(0, 2).join(', ')}{memory.tags!.length > 2 && '…'}
                </span>
              )}
              <Link
                to={`/memories/${memory.id}`}
                className="ml-auto text-gray-300 hover:text-rose-400 transition-colors"
              >
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      </motion.div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={async () => { await deleteMutation.mutateAsync(memory.id); setConfirmOpen(false) }}
        loading={deleteMutation.isPending}
        title={`¿Eliminar "${memory.title}"?`}
        description="Este recuerdo se eliminará permanentemente junto con sus fotos."
        confirmLabel="Sí, eliminar"
      />
    </>
  )
}

/* ── Context menu ─────────────────────────────────────────────────────────── */

function MemoryMenu({
  onEdit,
  onDelete,
  open,
  setOpen,
}: {
  memoryId: string
  onEdit: () => void
  onDelete: () => void
  open: boolean
  setOpen: (v: boolean) => void
}) {
  return (
    <div className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-lg hover:bg-rose-50 text-gray-400 hover:text-rose-500 transition-colors cursor-pointer"
      >
        <MoreHorizontal size={15} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 bg-white rounded-2xl shadow-card-hover border border-gray-100 py-1.5 min-w-[140px] overflow-hidden">
            <button
              type="button"
              onClick={() => { setOpen(false); onEdit() }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
            >
              <Pencil size={13} /> Editar
            </button>
            <div className="mx-3 border-t border-gray-100" />
            <button
              type="button"
              onClick={() => { setOpen(false); onDelete() }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
            >
              <Trash2 size={13} /> Eliminar
            </button>
          </div>
        </>
      )}
    </div>
  )
}
