import { supabase } from '@/lib/supabase'
import { Memory, TimelineGroup } from '@/types'
import { formatMonthYear, groupBy } from '@/lib/utils'
import { parseISO, getYear, getMonth } from 'date-fns'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface AnniversaryMarker {
  label: string           // "1er aniversario 💑", "Primer mes 🌹", etc.
  memory_date: string     // original memory_date that matches
  years_ago?: number
  is_monthly?: boolean
}

export interface TimelineGroupWithMeta extends TimelineGroup {
  anniversaries: AnniversaryMarker[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns ordinal string in Spanish: 1er, 2do, 3er, 4to … */
function ordinal(n: number): string {
  if (n === 1) return '1er'
  if (n === 2) return '2do'
  if (n === 3) return '3er'
  return `${n}to`
}

/**
 * Detect anniversary markers for a given month group.
 * Triggers when the first memory with is_first_memory flag (i.e. the earliest
 * overall memory) shares the same month-day as today AND falls in this group.
 *
 * We compute them externally from the consumer; here we just expose the logic.
 */
export function detectAnniversaries(
  memories: Memory[],
  today: Date = new Date()
): AnniversaryMarker[] {
  const todayMonth = today.getMonth() + 1   // 1-based
  const todayDay   = today.getDate()

  const markers: AnniversaryMarker[] = []

  for (const mem of memories) {
    const d = parseISO(mem.memory_date)
    const m = getMonth(d) + 1   // 1-based
    const day = d.getDate()
    const diffYears = getYear(today) - getYear(d)

    // Exact birthday/anniversary: same month + day, in any prior year
    if (m === todayMonth && day === todayDay && diffYears > 0) {
      markers.push({
        label: `${ordinal(diffYears)} aniversario 💑`,
        memory_date: mem.memory_date,
        years_ago: diffYears,
      })
    }
  }

  return markers
}

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Fetch ALL memories (no pagination) for the timeline, sorted newest→oldest.
 * Includes category join. Cover photo URL is already stored on the memory row.
 */
export async function getTimelineMemories(): Promise<Memory[]> {
  const { data, error } = await supabase
    .from('memories')
    .select('*, category:categories(*)')
    .order('memory_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as Memory[]
}

/**
 * Group memories into TimelineGroupWithMeta[], newest month first.
 * Each group gets a list of anniversary markers for that month.
 */
export function buildTimelineGroups(
  memories: Memory[],
  today: Date = new Date()
): TimelineGroupWithMeta[] {
  if (memories.length === 0) return []

  // Group by "YYYY-MM" key (e.g. "2025-02")
  const grouped = groupBy(memories, (m) => {
    const d = parseISO(m.memory_date)
    const y = getYear(d)
    const mo = String(getMonth(d) + 1).padStart(2, '0')
    return `${y}-${mo}`
  })

  // Sort keys newest → oldest
  const sortedKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return sortedKeys.map((key) => {
    const mems = grouped[key]
    const [yearStr, monthStr] = key.split('-')
    const year  = parseInt(yearStr, 10)
    const month = parseInt(monthStr, 10)     // 1-based

    // Use the first memory's date to generate the label
    const label = formatMonthYear(mems[0].memory_date)
    const capitalLabel = label.charAt(0).toUpperCase() + label.slice(1)

    const anniversaries = detectAnniversaries(mems, today)

    return {
      label: capitalLabel,
      year,
      month,
      memories: mems,
      anniversaries,
    } satisfies TimelineGroupWithMeta
  })
}

/** Convenience: complete fetch + group in one call */
export async function getTimeline(today: Date = new Date()): Promise<TimelineGroupWithMeta[]> {
  const memories = await getTimelineMemories()
  return buildTimelineGroups(memories, today)
}

/** Return all distinct years present in the timeline, sorted newest→oldest */
export function extractYears(groups: TimelineGroupWithMeta[]): number[] {
  const years = [...new Set(groups.map((g) => g.year))]
  return years.sort((a, b) => b - a)
}
