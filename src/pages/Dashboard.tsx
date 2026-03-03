import { motion } from 'framer-motion'
import { Heart, Images, Tag, Plus, Star, ArrowRight, Sparkles, CalendarDays } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useAuthStore } from '@/store/authStore'
import { useStats, useMonthsTogether } from '@/hooks/useStats'
import { useMemories } from '@/hooks/useMemories'
import { useGuestMode } from '@/hooks/useGuestMode'
import { formatDate } from '@/lib/utils'
import { getMoodEmoji } from '@/lib/moodData'
import { getIconEmoji } from '@/lib/categoryData'
import { useState } from 'react'
import { MemoryForm } from '@/components/memories/MemoryForm'
import { parseISO, differenceInCalendarDays, addYears, format } from 'date-fns'
import { es } from 'date-fns/locale'

const container = { hidden: {}, show: { transition: { staggerChildren: 0.09 } } }
const item      = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } } }

// ─── Days Counter Card ────────────────────────────────────────────────────────

interface DaysCounterProps {
  days: number
  months: number
  date: string   // ISO date of first memory
}

function DaysCounter({ days, months, date }: DaysCounterProps) {
  const firstDate     = parseISO(date)
  const now           = new Date()
  const years         = Math.floor(months / 12)
  const remMonths     = months % 12

  // Progress toward next anniversary
  const lastAnniv     = addYears(firstDate, years)
  const nextAnniv     = addYears(firstDate, years + 1)
  const totalDaysInYear = differenceInCalendarDays(nextAnniv, lastAnniv)
  const daysSinceAnniv  = differenceInCalendarDays(now, lastAnniv)
  const toNext          = differenceInCalendarDays(nextAnniv, now)
  const progress        = Math.min(100, Math.round((daysSinceAnniv / totalDaysInYear) * 100))

  const units = [
    { value: years,     label: years     === 1 ? 'año'  : 'años'  },
    { value: remMonths, label: remMonths === 1 ? 'mes'  : 'meses' },
  ].filter((u) => u.value > 0)

  return (
    <div className="relative overflow-hidden rounded-3xl bg-white border border-rose-100 shadow-card px-6 py-5">
      {/* decorative background heart */}
      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[7rem] leading-none select-none pointer-events-none text-rose-50 font-bold">
        ♥
      </span>

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-5">
        {/* Big days number */}
        <div className="flex items-end gap-3 shrink-0">
          <motion.span
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1,   opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.1 }}
            className="font-display text-6xl sm:text-7xl font-extrabold text-rose-500 leading-none tabular-nums"
          >
            {days.toLocaleString('es')}
          </motion.span>
          <span className="text-gray-400 text-lg font-medium mb-2 leading-none">
            días juntos 💕
          </span>
        </div>

        {/* Right side: breakdown + progress */}
        <div className="flex-1 space-y-3">
          {/* Year / month breakdown pills */}
          {units.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {units.map((u) => (
                <span
                  key={u.label}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-600 text-sm font-semibold"
                >
                  <span className="font-extrabold">{u.value}</span>
                  <span className="font-normal text-rose-400">{u.label}</span>
                </span>
              ))}
            </div>
          )}

          {/* First memory date */}
          <p className="text-xs text-gray-400">
            Desde el&nbsp;
            <span className="font-medium text-gray-600">
              {format(firstDate, "d 'de' MMMM 'de' yyyy", { locale: es })}
            </span>
          </p>

          {/* Progress bar toward next anniversary */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>{years === 0 ? 'Primer aniversario' : `Aniversario #${years + 1}`}</span>
              <span>{toNext === 0 ? '🎉 ¡Hoy!' : `${toNext} día${toNext !== 1 ? 's' : ''} para el próximo`}</span>
            </div>
            <div className="h-1.5 w-full bg-rose-50 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                className="h-full bg-gradient-to-r from-rose-400 to-rose-600 rounded-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { data: stats } = useStats()
  const { data: together } = useMonthsTogether()
  const { data: recentMemories = [] } = useMemories({ limit: 5, sort: 'date_desc' })
  const { data: favorites = [] } = useMemories({ is_favorite: true, limit: 4, sort: 'date_desc' })
  const [formOpen, setFormOpen] = useState(false)
  const { isGuest, canWrite, ownerId } = useGuestMode()

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ?? 'amor'

  const statsConfig = [
    { label: 'Recuerdos',  value: stats?.total_memories   ?? 0, icon: <Heart size={20} />,  to: '/memories'   },
    { label: 'Fotos',      value: stats?.total_photos     ?? 0, icon: <Images size={20} />, to: '/gallery'    },
    { label: 'Categorías', value: stats?.total_categories ?? 0, icon: <Tag size={20} />,    to: '/categories' },
    { label: 'Favoritos',  value: stats?.favorites        ?? 0, icon: <Star size={20} />,   to: '/memories'   },
  ]

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">

      {/* ── Hero banner ── */}
      <motion.div
        variants={item}
        className="relative overflow-hidden rounded-3xl bg-hero p-8 lg:p-10 shadow-soft"
      >
        {/* ambient blobs */}
        <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={15} className="text-white/70" />
              <span className="text-white/70 text-sm font-medium tracking-wide">Bienvenido de vuelta</span>
            </div>
            <h1 className="font-display text-3xl lg:text-4xl font-bold text-white leading-tight">
              Hola, {firstName} 💕
            </h1>
            <p className="text-white/65 text-sm">{formatDate(new Date())}</p>
            {together && (
              <div className="inline-flex items-center gap-2 mt-3 bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 border border-white/20">
                <CalendarDays size={13} className="text-white/80" />
                <span className="text-sm text-white/90 font-medium">
                  {together.months > 0
                    ? `${together.months} mes${together.months !== 1 ? 'es' : ''} de recuerdos juntos 🌸`
                    : `${together.days} día${together.days !== 1 ? 's' : ''} de recuerdos juntos 🌸`}
                </span>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="lg"
            leftIcon={<Plus size={18} />}
            onClick={() => setFormOpen(true)}
            className={`shrink-0 bg-white text-rose-600 hover:bg-white/90 hover:text-rose-700 border border-white/30 shadow-sm${ (isGuest && !canWrite) ? ' hidden' : ''}`}
          >
            Nuevo recuerdo
          </Button>
        </div>
      </motion.div>

      {/* ── Days counter ── */}
      {together && together.days > 0 && (
        <motion.div variants={item}>
          <DaysCounter days={together.days} months={together.months} date={together.date} />
        </motion.div>
      )}

      {/* ── Stat cards ── */}
      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statsConfig.map((s) => (
          <Link key={s.label} to={s.to}>
            <div className="group bg-white rounded-2xl border border-gray-100 shadow-card p-6 transition-[box-shadow,transform,border-color] duration-300 hover:shadow-card-hover hover:-translate-y-0.5 hover:border-rose-100 cursor-pointer">
              <div className="flex flex-col gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-rose-50 text-rose-500 transition-transform duration-200 group-hover:scale-110">
                  {s.icon}
                </div>
                <div>
                  <p className="font-display text-3xl font-bold text-gray-900 leading-none">{s.value}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </motion.div>

      {/* ── Main content grid ── */}
      <div className={`grid gap-6 ${favorites.length > 0 ? 'lg:grid-cols-3' : ''}`}>

        {/* ── Recent memories ── */}
        <motion.div variants={item} className={favorites.length > 0 ? 'lg:col-span-2' : ''}>
          <Card padding="none" className="overflow-hidden">
            {/* card header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center">
                  <Heart size={14} className="text-rose-500" />
                </div>
                <h2 className="font-display font-bold text-gray-900">Recuerdos recientes</h2>
              </div>
              <Link
                to="/memories"
                className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-700 font-medium transition-colors"
              >
                Ver todos <ArrowRight size={12} />
              </Link>
            </div>

            {recentMemories.length === 0 ? (
              <div className="flex flex-col items-center py-14 text-center px-6">
                <span className="text-5xl mb-4">💕</span>
                <p className="font-display font-semibold text-gray-700 mb-1">Aún sin recuerdos</p>
                <p className="text-sm text-gray-400 mb-5">Empieza guardando vuestro primer momento especial.</p>
                <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setFormOpen(true)}>
                  Crear primer recuerdo
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentMemories.map((m, idx) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Link
                      to={`/memories/${m.id}`}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors group"
                    >
                      {/* icon/cover */}
                      <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center text-xl">
                        {m.cover_photo_url ? (
                          <img src={m.cover_photo_url} alt={m.title} className="w-full h-full object-cover" />
                        ) : (
                          m.category ? getIconEmoji(m.category.icon) : getMoodEmoji(m.mood) || '💕'
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 group-hover:text-rose-600 transition-colors truncate">
                          {m.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-gray-400">{formatDate(m.memory_date)}</span>
                          {m.category && <Badge color={m.category.color} size="sm">{m.category.name}</Badge>}
                          {m.is_favorite && <Heart size={11} className="text-rose-400 fill-rose-400" />}
                        </div>
                      </div>
                      <ArrowRight size={14} className="text-gray-300 group-hover:text-rose-400 transition-colors flex-shrink-0" />
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        {/* ── Favorites (right column) ── */}
        {favorites.length > 0 && (
          <motion.div variants={item}>
            <Card padding="none" className="overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100">
                <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center">
                  <Heart size={14} className="text-rose-500 fill-rose-500" />
                </div>
                <h3 className="font-display font-bold text-gray-900 text-sm">Favoritos</h3>
              </div>
              <div className="px-4 py-3 space-y-1">
                {favorites.map((m) => (
                  <Link
                    key={m.id}
                    to={`/memories/${m.id}`}
                    className="flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-gray-50 transition-colors group"
                  >
                    <span className="text-lg flex-shrink-0">{getMoodEmoji(m.mood) || '💕'}</span>
                    <span className="text-sm text-gray-700 group-hover:text-rose-600 transition-colors truncate flex-1">
                      {m.title}
                    </span>
                    <ArrowRight size={13} className="text-gray-300 group-hover:text-rose-400 flex-shrink-0 transition-colors" />
                  </Link>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </div>

      <MemoryForm open={formOpen} onClose={() => setFormOpen(false)} ownerId={canWrite ? (ownerId ?? undefined) : undefined} />
    </motion.div>
  )
}
