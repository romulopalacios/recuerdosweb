import { useQuery } from '@tanstack/react-query'
import { getTimeline, extractYears, TimelineGroupWithMeta } from '@/services/timelineService'
import { useMemo } from 'react'

// ─── Query keys ───────────────────────────────────────────────────────────────

export const timelineKeys = {
  all:  ['timeline'] as const,
  full: () => [...timelineKeys.all, 'full'] as const,
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Fetch and group ALL memories into TimelineGroupWithMeta[].
 * Optionally filter to a specific year and/or reverse sort order.
 */
export function useTimeline(yearFilter?: number, sortOrder: 'desc' | 'asc' = 'desc') {
  const query = useQuery({
    queryKey: timelineKeys.full(),
    queryFn:  () => getTimeline(),
    staleTime: 1000 * 60 * 2,  // 2 min
  })

  const groups = useMemo<TimelineGroupWithMeta[]>(() => {
    if (!query.data) return []
    // query.data is always newest→oldest from the service
    let filtered = yearFilter ? query.data.filter((g) => g.year === yearFilter) : query.data
    if (sortOrder === 'asc') filtered = [...filtered].reverse()
    return filtered
  }, [query.data, yearFilter, sortOrder])

  const totalInView = useMemo(
    () => groups.reduce((acc, g) => acc + g.memories.length, 0),
    [groups]
  )

  return {
    ...query,
    groups,
    totalInView,
  }
}

/** Returns list of distinct years in the full timeline (newest first) */
export function useTimelineYears() {
  const { data } = useQuery({
    queryKey: timelineKeys.full(),
    queryFn:  () => getTimeline(),
    staleTime: 1000 * 60 * 2,
  })

  return useMemo(() => (data ? extractYears(data) : []), [data])
}
