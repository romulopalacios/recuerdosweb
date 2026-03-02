import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Heart, MapPin, Tag, Image } from 'lucide-react'
import { parseISO, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { getMoodEmoji } from '@/lib/moodData'
import { CATEGORY_COLORS, getIconEmoji } from '@/lib/categoryData'
import type { Memory } from '@/types'

// ─── Framer-motion variant (consumed by TimelineMonth stagger parent) ─────────
// eslint-disable-next-line react-refresh/only-export-components
export const cardVariants = {
  hidden: { opacity: 0, x: -16 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TimelineMemoryCardProps {
  memory: Memory
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TimelineMemoryCard({ memory }: TimelineMemoryCardProps) {
  const navigate = useNavigate()
  const date = parseISO(memory.memory_date)
  const day   = format(date, 'd')
  const mon   = format(date, 'MMM', { locale: es }).replace('.', '').slice(0, 3)

  const categoryColor = CATEGORY_COLORS.find((c) => c.value === memory.category?.color)

  return (
    <motion.div
      variants={cardVariants}
      className="relative flex gap-4 mb-3 group/card"
    >
      {/* ── Date bubble ──────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 relative z-10">
        <div className="w-12 h-12 rounded-full gradient-hero shadow-soft flex flex-col items-center justify-center text-white select-none">
          <span className="text-sm font-bold leading-none">{day}</span>
          <span className="text-[9px] uppercase font-medium opacity-80 mt-0.5">{mon}</span>
        </div>
      </div>

      {/* ── Card ─────────────────────────────────────────────────────────── */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => navigate(`/memories/${memory.id}`)}
        onKeyDown={(e) => e.key === 'Enter' && navigate(`/memories/${memory.id}`)}
        className={cn(
          'flex-1 mb-1 rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden',
          'cursor-pointer transition-all duration-200',
          'hover:shadow-md hover:-translate-y-0.5 hover:border-rose-100',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400'
        )}
      >
        <div className="flex gap-3 p-4">
          {/* Cover photo */}
          {memory.cover_photo_url ? (
            <div className="flex-shrink-0 w-[72px] h-[72px] rounded-xl overflow-hidden bg-gray-100">
              <img
                src={memory.cover_photo_url}
                alt={memory.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover/card:scale-105"
              />
            </div>
          ) : (
            <div className="flex-shrink-0 w-[72px] h-[72px] rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center">
              <Image size={20} className="text-rose-200" />
            </div>
          )}

          {/* Text content */}
          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-1">
                {memory.title}
              </h3>
              {memory.is_favorite && (
                <Heart size={13} className="flex-shrink-0 mt-0.5 text-rose-400 fill-current" />
              )}
            </div>

            {/* Meta pills */}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1.5">
              {memory.mood && (
                <span className="text-xs leading-none" title={memory.mood}>
                  {getMoodEmoji(memory.mood)}
                </span>
              )}

              {memory.location && (
                <span className="inline-flex items-center gap-0.5 text-[11px] text-gray-400">
                  <MapPin size={10} />
                  <span className="truncate max-w-[110px]">{memory.location}</span>
                </span>
              )}

              {memory.category && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full text-white',
                    categoryColor?.bg ?? 'bg-gray-400'
                  )}
                >
                  <span className="leading-none">{getIconEmoji(memory.category.icon)}</span>
                  {memory.category.name}
                </span>
              )}
            </div>

            {/* Tags */}
            {memory.tags && memory.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {memory.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-0.5 text-[10px] font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full"
                  >
                    <Tag size={8} />
                    {tag}
                  </span>
                ))}
                {memory.tags.length > 3 && (
                  <span className="text-[10px] text-gray-400">
                    +{memory.tags.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Excerpt (only if present) */}
        {memory.content && (
          <div className="px-4 pb-3">
            <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
              {memory.content}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  )
}
