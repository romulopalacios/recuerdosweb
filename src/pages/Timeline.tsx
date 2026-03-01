import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Clock, PlusCircle, Layers, Heart, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTimeline, useTimelineYears } from '@/hooks/useTimeline'
import TimelineMonth from '@/components/timeline/TimelineMonth'

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TimelineSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {[0, 1, 2].map((g) => (
        <div key={g} className="space-y-3">
          <div className="h-9 w-40 rounded-full bg-gray-200" />
          <div className="pl-6 space-y-3">
            {[0, 1].map((c) => (
              <div key={c} className="flex gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0" />
                <div className="flex-1 h-24 rounded-2xl bg-gray-100" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Year filter tabs ─────────────────────────────────────────────────────────

interface YearTabsProps {
  years:      number[]
  activeYear: number | undefined
  onSelect:   (year: number | undefined) => void
  totalCount: number
}

function YearTabs({ years, activeYear, onSelect, totalCount }: YearTabsProps) {
  if (years.length <= 1) return null

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelect(undefined)}
        className={cn(
          'px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
          !activeYear
            ? 'gradient-hero text-white shadow-sm'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        )}
      >
        Todos
        {!activeYear && (
          <span className="ml-1.5 text-white/70 text-xs">{totalCount}</span>
        )}
      </button>

      {years.map((yr) => (
        <button
          key={yr}
          onClick={() => onSelect(yr)}
          className={cn(
            'px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
            activeYear === yr
              ? 'gradient-hero text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}
        >
          {yr}
        </button>
      ))}
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function TimelineEmpty() {
  return (
    <div className="relative overflow-hidden rounded-3xl gradient-sidebar p-10 text-center shadow-soft">
      <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-44 h-44 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl gradient-hero flex items-center justify-center mb-5 shadow-soft animate-float">
          <Clock size={26} className="text-white" />
        </div>
        <h2 className="font-display text-xl font-bold text-white mb-3">
          Tu timeline está vacío
        </h2>
        <p className="text-white/50 text-sm max-w-xs leading-relaxed mb-6">
          Comienza creando recuerdos. Cada uno aparecerá aquí ordenado cronológicamente.
        </p>
        <Link
          to="/memories"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/15 text-white text-sm font-semibold border border-white/20 hover:bg-white/25 transition-colors"
        >
          <PlusCircle size={16} />
          Crear primer recuerdo
        </Link>
      </div>
    </div>
  )
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

interface StatsBarProps {
  totalMemories: number
  totalMonths:   number
  favorites:     number
}

function StatsBar({ totalMemories, totalMonths, favorites }: StatsBarProps) {
  const stats = [
    { icon: <Layers size={14} />, label: 'Recuerdos', value: totalMemories },
    { icon: <Clock  size={14} />, label: 'Épocas',    value: totalMonths   },
    { icon: <Heart  size={14} />, label: 'Favoritos', value: favorites     },
  ]
  return (
    <div className="flex gap-3 flex-wrap">
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-full px-3 py-1.5"
        >
          <span className="text-rose-400">{s.icon}</span>
          <span className="font-semibold text-gray-700">{s.value}</span>
          <span>{s.label}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Back-to-top FAB ─────────────────────────────────────────────────────────

function BackToTop() {
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Volver arriba"
      className="fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full gradient-hero shadow-lg flex items-center justify-center text-white hover:scale-110 transition-transform duration-200"
    >
      <ChevronUp size={18} />
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TimelinePage() {
  const [activeYear, setActiveYear] = useState<number | undefined>(undefined)

  const {
    groups,
    isLoading,
    isError,
    data: allGroups,
    totalInView,
  } = useTimeline(activeYear)

  const years = useTimelineYears()

  // Derived totals from the full (unfiltered) dataset
  const totalMemories = allGroups?.reduce((s, g) => s + g.memories.length, 0) ?? 0
  const totalMonths   = allGroups?.length ?? 0
  const favorites     = allGroups?.reduce(
    (s, g) => s + g.memories.filter((m) => m.is_favorite).length,
    0
  ) ?? 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6 pb-24"
    >
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl lg:text-3xl font-bold text-gray-900">
          Timeline
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Tu historia cronológica</p>
      </div>

      {/* Stats */}
      {!isLoading && totalMemories > 0 && (
        <StatsBar
          totalMemories={totalMemories}
          totalMonths={totalMonths}
          favorites={favorites}
        />
      )}

      {/* Year tabs */}
      {!isLoading && (
        <YearTabs
          years={years}
          activeYear={activeYear}
          onSelect={setActiveYear}
          totalCount={totalInView}
        />
      )}

      {/* Content */}
      {isLoading && <TimelineSkeleton />}

      {isError && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center text-sm text-red-600">
          Error al cargar el timeline. Intenta recargar la página.
        </div>
      )}

      {!isLoading && !isError && groups.length === 0 && <TimelineEmpty />}

      {!isLoading && !isError && groups.length > 0 && (
        <div className="space-y-10">
          {groups.map((group, index) => (
            <TimelineMonth
              key={`${group.year}-${group.month}`}
              group={group}
              index={index}
            />
          ))}

          {/* Footer count */}
          <div className="text-center pt-4">
            <p className="text-xs text-gray-300 inline-flex items-center gap-1.5">
              <Clock size={11} />
              {activeYear
                ? `${totalInView} recuerdo${totalInView !== 1 ? 's' : ''} en ${activeYear}`
                : `${totalMemories} recuerdo${totalMemories !== 1 ? 's' : ''} en total`}
            </p>
          </div>
        </div>
      )}

      {/* Back-to-top FAB when there's a lot to scroll */}
      {!isLoading && groups.length >= 4 && <BackToTop />}
    </motion.div>
  )
}
