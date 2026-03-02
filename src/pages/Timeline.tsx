import { Fragment, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Clock, PlusCircle, Layers, Heart, ChevronUp, ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { parseISO, getYear, getMonth } from 'date-fns'
import { cn } from '@/lib/utils'
import { useTimeline, useTimelineYears } from '@/hooks/useTimeline'
import TimelineMonth from '@/components/timeline/TimelineMonth'
import type { TimelineGroupWithMeta } from '@/services/timelineService'
import type { Memory } from '@/types'

// ─── Helper ───────────────────────────────────────────────────────────────────

function memToGroupKey(m: Memory): string {
  const d = parseISO(m.memory_date)
  return `${getYear(d)}-${String(getMonth(d) + 1).padStart(2, '0')}`
}

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

// ─── Sort toggle ──────────────────────────────────────────────────────────────

interface SortToggleProps {
  value:    'desc' | 'asc'
  onChange: (v: 'desc' | 'asc') => void
}

function SortToggle({ value, onChange }: SortToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1 w-fit">
      <button
        onClick={() => onChange('desc')}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-200',
          value === 'desc' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'
        )}
      >
        <ArrowDown size={11} />
        Más recientes
      </button>
      <button
        onClick={() => onChange('asc')}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-200',
          value === 'asc' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'
        )}
      >
        <ArrowUp size={11} />
        Más antiguos
      </button>
    </div>
  )
}

// ─── Activity Heatmap ─────────────────────────────────────────────────────────

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

interface ActivityHeatmapProps {
  allGroups:  TimelineGroupWithMeta[]
  activeYear: number | undefined
  years:      number[]
}

function ActivityHeatmap({ allGroups, activeYear, years }: ActivityHeatmapProps) {
  const heatYear = activeYear ?? years[0]
  if (!heatYear) return null

  const counts = new Array<number>(12).fill(0)
  allGroups
    .filter((g) => g.year === heatYear)
    .forEach((g) => { counts[g.month - 1] = g.memories.length })

  const max   = Math.max(...counts, 1)
  const total = counts.reduce((s, c) => s + c, 0)
  if (total === 0) return null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
          <ArrowUpDown size={11} className="text-rose-400" />
          Actividad en {heatYear}
        </span>
        <span className="text-xs text-gray-400">{total} recuerdo{total !== 1 ? 's' : ''}</span>
      </div>

      <div className="flex gap-1">
        {MONTH_NAMES.map((label, i) => {
          const count = counts[i]
          const ratio = count / max
          return (
            <div key={label} className="flex flex-col items-center gap-1 flex-1 min-w-0">
              <div
                className="w-full rounded-md transition-all duration-300"
                style={{
                  height: '28px',
                  background: count > 0 ? `rgba(225,29,72,${0.15 + ratio * 0.82})` : '#f3f4f6',
                }}
                title={`${label}: ${count} recuerdo${count !== 1 ? 's' : ''}`}
              />
              <span className="text-[9px] text-gray-400 leading-none">{label}</span>
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-end gap-1.5 pt-0.5">
        <span className="text-[9px] text-gray-300">Menos</span>
        {[0.1, 0.3, 0.55, 0.8, 1].map((v) => (
          <div key={v} className="w-3 h-3 rounded-sm" style={{ background: `rgba(225,29,72,${v})` }} />
        ))}
        <span className="text-[9px] text-gray-300">Más</span>
      </div>
    </div>
  )
}

// ─── Milestone card ───────────────────────────────────────────────────────────

interface MilestoneItem {
  emoji: string
  label: string
}

function MilestoneCard({ emoji, label }: MilestoneItem) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="relative flex items-center gap-3 my-1 px-2"
    >
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-rose-200 to-transparent" />
      <div className="flex-shrink-0 flex items-center gap-2 px-4 py-1.5 rounded-full border border-rose-100 bg-rose-50 shadow-sm">
        <span className="text-base leading-none">{emoji}</span>
        <span className="text-xs font-semibold text-rose-600">{label}</span>
      </div>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-rose-200 to-transparent" />
    </motion.div>
  )
}

// ─── Milestone computation ────────────────────────────────────────────────────

function useMilestones(allGroups: TimelineGroupWithMeta[] | undefined): Map<string, MilestoneItem[]> {
  return useMemo(() => {
    const map = new Map<string, MilestoneItem[]>()
    if (!allGroups || allGroups.length === 0) return map

    const allMemories: Memory[] = allGroups
      .flatMap((g) => g.memories)
      .sort((a, b) => a.memory_date.localeCompare(b.memory_date))

    if (allMemories.length === 0) return map

    function add(groupKey: string, ms: MilestoneItem) {
      const arr = map.get(groupKey) ?? []
      map.set(groupKey, [...arr, ms])
    }

    // Primer recuerdo
    add(memToGroupKey(allMemories[0]), { emoji: '🌱', label: 'Primer recuerdo juntos' })

    // Count milestones
    const thresholds: Array<[number, string, string]> = [
      [10,  '10 recuerdos',  '📸'],
      [25,  '25 recuerdos',  '💕'],
      [50,  '50 recuerdos',  '✨'],
      [100, '100 recuerdos', '🎉'],
      [200, '200 recuerdos', '💎'],
    ]
    for (const [n, label, emoji] of thresholds) {
      if (allMemories.length >= n) {
        add(memToGroupKey(allMemories[n - 1]), { emoji, label })
      }
    }

    // Year anniversaries (1st, 2nd, 3rd)
    const oldest = parseISO(allMemories[0].memory_date)
    const annivEmojis: Record<number, string> = { 1: '🎂', 2: '🌟', 3: '💎' }
    for (const yrs of [1, 2, 3]) {
      const target = new Date(oldest)
      target.setFullYear(target.getFullYear() + yrs)
      if (target <= new Date()) {
        const key = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}`
        if (allGroups.some((g) => `${g.year}-${String(g.month).padStart(2, '0')}` === key)) {
          add(key, { emoji: annivEmojis[yrs] ?? '🎉', label: `${yrs} año${yrs > 1 ? 's' : ''} de recuerdos juntos` })
        }
      }
    }

    return map
  }, [allGroups])
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
  const [sortOrder,  setSortOrder]  = useState<'desc' | 'asc'>('desc')

  const {
    groups,
    isLoading,
    isError,
    data: allGroups,
    totalInView,
  } = useTimeline(activeYear, sortOrder)

  const years = useTimelineYears()

  // Derived totals from the full (unfiltered) dataset
  const totalMemories = allGroups?.reduce((s, g) => s + g.memories.length, 0) ?? 0
  const totalMonths   = allGroups?.length ?? 0
  const favorites     = allGroups?.reduce(
    (s, g) => s + g.memories.filter((m) => m.is_favorite).length,
    0
  ) ?? 0

  // Milestones computed from the full (unfiltered) dataset
  const milestoneMap = useMilestones(allGroups)

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

      {/* Activity heatmap */}
      {!isLoading && allGroups && allGroups.length > 0 && (
        <ActivityHeatmap allGroups={allGroups} activeYear={activeYear} years={years} />
      )}

      {/* Year tabs + sort toggle */}
      {!isLoading && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <YearTabs
            years={years}
            activeYear={activeYear}
            onSelect={setActiveYear}
            totalCount={totalInView}
          />
          {totalMemories > 1 && (
            <SortToggle value={sortOrder} onChange={setSortOrder} />
          )}
        </div>
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
          {groups.map((group, index) => {
            const groupKey = `${group.year}-${String(group.month).padStart(2, '0')}`
            const milestones = milestoneMap.get(groupKey) ?? []
            return (
              <Fragment key={groupKey}>
                <TimelineMonth group={group} index={index} />
                {milestones.map((ms) => (
                  <MilestoneCard key={ms.label} emoji={ms.emoji} label={ms.label} />
                ))}
              </Fragment>
            )
          })}

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
