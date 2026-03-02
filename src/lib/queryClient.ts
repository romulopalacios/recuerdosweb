import { QueryClient } from '@tanstack/react-query'

/**
 * Singleton QueryClient — exported so it can be referenced outside React
 * (e.g. authStore.ts to clear the cache on sign-out).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,   // 5 min
      retry: 1,
    },
  },
})
