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
 * Optionally filter to a specific year.
 */
export function useTimeline(yearFilter?: number) {
  const query = useQuery({
    queryKey: timelineKeys.full(),
    queryFn:  () => getTimeline(),
    staleTime: 1000 * 60 * 2,  // 2 min
  })

  const groups = useMemo<TimelineGroupWithMeta[]>(() => {
    if (!query.data) return []
    if (!yearFilter) return query.data
    return query.data.filter((g) => g.year === yearFilter)
  }, [query.data, yearFilter])

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
