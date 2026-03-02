import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TimelineGroupWithMeta } from '@/services/timelineService'
import TimelineMemoryCard from './TimelineMemoryCard'

// ─── Animation variants ───────────────────────────────────────────────────────

const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TimelineMonthProps {
  group:      TimelineGroupWithMeta
  /** Index within the full timeline (used for entrance animation delay) */
  index:      number
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TimelineMonth({ group, index }: TimelineMonthProps) {
  const [collapsed, setCollapsed] = useState(false)

  const count = group.memories.length

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: 'easeOut' }}
      className="relative"
    >
      {/* ── Month header pill ─────────────────────────────────────────────── */}
      <button
        onClick={() => setCollapsed((p) => !p)}
        className={cn(
          'flex items-center gap-2.5 mb-4 w-auto',
          'sticky top-2 z-20',
          'bg-white/90 backdrop-blur-md',
          'border border-rose-100/80 shadow-sm',
          'rounded-full px-4 py-2',
          'hover:shadow-md transition-all duration-200',
          'text-left'
        )}
        aria-expanded={!collapsed}
      >
        {/* Color dot */}
        <span className="w-2 h-2 rounded-full gradient-hero flex-shrink-0" />

        {/* Label */}
        <span className="text-sm font-semibold text-gray-800 capitalize">
          {group.label}
        </span>

        {/* Count */}
        <span className="text-[11px] font-medium text-gray-400">
          {count} recuerdo{count !== 1 ? 's' : ''}
        </span>

        {/* Anniversary badges */}
        {group.anniversaries.map((ann) => (
          <span
            key={ann.memory_date}
            className="hidden sm:inline-flex items-center text-[10px] font-semibold text-rose-500 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full"
          >
            {ann.label}
          </span>
        ))}

        {/* Chevron */}
        <ChevronDown
          size={13}
          className={cn(
            'text-gray-400 ml-1 flex-shrink-0 transition-transform duration-200',
            collapsed && 'rotate-180'
          )}
        />
      </button>

      {/* ── Anniversary badges (mobile — below header) ────────────────────── */}
      {group.anniversaries.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3 pl-2 sm:hidden">
          {group.anniversaries.map((ann) => (
            <span
              key={ann.memory_date}
              className="inline-flex items-center text-[10px] font-semibold text-rose-500 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full"
            >
              {ann.label}
            </span>
          ))}
        </div>
      )}

      {/* ── Memory cards list ─────────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="cards"
            variants={listVariants}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, height: 0, overflow: 'hidden', transition: { duration: 0.2 } }}
            className="relative pl-6 overflow-hidden"
          >
            {/* Continuous vertical line for the month */}
            <div
              aria-hidden
              className="absolute left-0 top-2 bottom-4 w-px bg-rose-200 opacity-60"
            />

            {group.memories.map((memory) => (
              // TimelineMemoryCard itself IS a motion.div with cardVariants,
              // so it acts as the direct stagger child — no extra wrapper needed.
              <TimelineMemoryCard key={memory.id} memory={memory} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
