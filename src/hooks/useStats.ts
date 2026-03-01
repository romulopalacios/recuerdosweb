import { useQuery } from '@tanstack/react-query'
import { getStats, getFirstMemoryDate } from '@/services/memoriesService'
import { differenceInMonths, differenceInDays, parseISO } from 'date-fns'

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn:  getStats,
    staleTime: 1000 * 60 * 2, // 2 min
  })
}

export function useMonthsTogether() {
  return useQuery({
    queryKey: ['firstMemoryDate'],
    queryFn:  async () => {
      const date = await getFirstMemoryDate()
      if (!date) return null
      const start = parseISO(date)
      const now   = new Date()
      const months = differenceInMonths(now, start)
      const days   = differenceInDays(now, start)
      return { months, days, date }
    },
  })
}
