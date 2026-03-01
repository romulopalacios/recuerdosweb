import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Heart,
  Tag,
  Pencil,
  Trash2,
  Images,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { MemoryForm } from '@/components/memories/MemoryForm'
import { useMemory, useDeleteMemory, useToggleFavorite } from '@/hooks/useMemories'
import { useAuthStore } from '@/store/authStore'
import { PhotoUploader } from '@/components/photos/PhotoUploader'
import { formatDate } from '@/lib/utils'
import { getMoodEmoji, MOODS } from '@/lib/moodData'
import { getIconEmoji } from '@/lib/categoryData'
import type { CategoryColor } from '@/types'

// Static map — avoids dynamic Tailwind class interpolation that breaks in production
const categoryGradientMap: Record<CategoryColor, string> = {
  rose:   'from-rose-400   to-pink-500',
  pink:   'from-pink-400   to-fuchsia-400',
  purple: 'from-purple-400 to-violet-500',
  blue:   'from-blue-400   to-sky-500',
  green:  'from-green-400  to-emerald-500',
  amber:  'from-amber-400  to-yellow-500',
  orange: 'from-orange-400 to-red-400',
  teal:   'from-teal-400   to-cyan-500',
}

export default function MemoryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { data: memory, isLoading, error } = useMemory(id!)
  const deleteMemory = useDeleteMemory()
  const toggleFavorite = useToggleFavorite()

  async function handleDelete() {
    if (!id) return
    await deleteMemory.mutateAsync(id)
    navigate('/memories', { replace: true })
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    )
  }

  if (error || !memory) {
    return (
      <div className="flex flex-col items-center py-20 text-center gap-4">
        <span className="text-5xl">💔</span>
        <p className="text-gray-500">No se encontró el recuerdo.</p>
        <Button variant="ghost" leftIcon={<ArrowLeft size={16} />} onClick={() => navigate(-1)}>
          Volver
        </Button>
      </div>
    )
  }

  const moodData = MOODS.find((m) => m.value === memory.mood)

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto space-y-6">
      {/* Back + actions */}
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/memories"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-rose-500 transition-colors font-medium"
        >
          <ArrowLeft size={15} />
          Recuerdos
        </Link>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              toggleFavorite.mutate({ id: memory.id, current: memory.is_favorite })
            }
            leftIcon={
              <Heart
                size={15}
                className={memory.is_favorite ? 'fill-rose-500 text-rose-500' : 'text-gray-400'}
              />
            }
          >
            {memory.is_favorite ? 'Favorito' : 'Favorito'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Pencil size={13} />}
            onClick={() => setEditOpen(true)}
          >
            Editar
          </Button>
          <Button
            variant="danger"
            size="sm"
            leftIcon={<Trash2 size={13} />}
            onClick={() => setDeleteOpen(true)}
          >
            Eliminar
          </Button>
        </div>
      </div>

      {/* Cover / header card */}
      <Card className="overflow-hidden !p-0">
        {/* Gradient bar */}
        <div
          className={`h-2 w-full bg-gradient-to-r ${
            memory.category?.color
              ? categoryGradientMap[memory.category.color]
              : 'from-rose-400 to-pink-500'
          }`}
        />
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <h1 className="font-display text-2xl font-bold text-gray-900 leading-snug">
              {memory.title}
            </h1>
            {moodData && (
              <span className="text-3xl flex-shrink-0" title={moodData.label}>
                {moodData.emoji}
              </span>
            )}
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-3 mt-4 text-sm text-gray-500">
            <div className="flex items-center gap-1.5">
              <Calendar size={14} className="text-rose-400" />
              <span>{formatDate(memory.memory_date)}</span>
            </div>
            {memory.location && (
              <div className="flex items-center gap-1.5">
                <MapPin size={14} className="text-rose-400" />
                <span>{memory.location}</span>
              </div>
            )}
            {memory.category && (
              <div className="flex items-center gap-1.5">
                <span className="text-base leading-none">{getIconEmoji(memory.category.icon)}</span>
                <Badge color={memory.category.color}>{memory.category.name}</Badge>
              </div>
            )}
            {memory.is_favorite && (
              <div className="flex items-center gap-1 text-rose-500">
                <Heart size={13} className="fill-rose-500" />
                <span className="text-xs font-medium">Favorito</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Content / notes */}
      {memory.content && (
        <Card>
          <h2 className="font-display font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wide">
            Notas
          </h2>
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{memory.content}</p>
        </Card>
      )}

      {/* Tags */}
      {memory.tags && memory.tags.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Tag size={14} className="text-rose-400" />
            <h2 className="font-display font-semibold text-gray-800 text-sm uppercase tracking-wide">
              Etiquetas
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {memory.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 text-xs rounded-full bg-rose-50 text-rose-600 border border-rose-100 font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Photos — real uploader */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Images size={14} className="text-rose-400" />
          <h2 className="font-display font-semibold text-gray-800 text-sm uppercase tracking-wide">
            Fotos
          </h2>
        </div>
        {user && (
          <PhotoUploader
            memoryId={memory.id}
            userId={user.id}
            coverUrl={memory.cover_photo_url}
          />
        )}
      </Card>

      {/* Back link */}
      <Link
        to="/memories"
        className="flex items-center justify-center gap-1.5 text-sm text-gray-400 hover:text-rose-500 transition-colors py-2"
      >
        <ArrowLeft size={14} />
        Volver a todos los recuerdos
        <ChevronRight size={14} className="opacity-0" />
      </Link>

      {/* Modals */}
      <MemoryForm open={editOpen} onClose={() => setEditOpen(false)} editing={memory} />
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar recuerdo"
        description={`¿Seguro que quieres eliminar "${memory.title}"? Esta acción no se puede deshacer.`}
        confirmLabel="Sí, eliminar"
        loading={deleteMemory.isPending}
      />
    </motion.div>
  )
}
