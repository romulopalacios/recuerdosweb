import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { memoryKeys } from './useMemories'
import { photoKeys } from './usePhotos'

/**
 * Subscribe to Supabase Postgres Changes (Realtime) for the current user's
 * `memories` and `photos` tables.
 *
 * Why this matters for a couple's app:
 * Both partners use the same account. When one person adds/edits a memory on
 * their device the other person sees the update live — no manual refresh needed.
 *
 * Mount this hook once in AppLayout so the subscription is active for the full
 * authenticated session and automatically tears down on sign-out.
 */
export function useRealtimeSync() {
  const qc   = useQueryClient()
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    if (!user) return

    // ── Memories channel ───────────────────────────────────────────────────
    const memoriesChannel = supabase
      .channel('rt-memories')
      .on(
        'postgres_changes',
        {
          event:  '*',
          schema: 'public',
          table:  'memories',
          // RLS already restricts rows, but adding this filter avoids
          // receiving events for other users' rows on shared Supabase projects.
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Always refresh lists + stats + timeline
          qc.invalidateQueries({ queryKey: memoryKeys.all() })
          qc.invalidateQueries({ queryKey: ['stats'] })
          qc.invalidateQueries({ queryKey: ['timeline'] })

          // Also invalidate the specific detail cache if we can identify the row
          const row = (payload.new ?? payload.old) as { id?: string } | null
          if (row?.id) {
            qc.invalidateQueries({ queryKey: memoryKeys.detail(row.id) })
          }
        },
      )
      .subscribe()

    // ── Photos channel ─────────────────────────────────────────────────────
    const photosChannel = supabase
      .channel('rt-photos')
      .on(
        'postgres_changes',
        {
          event:  '*',
          schema: 'public',
          table:  'photos',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          qc.invalidateQueries({ queryKey: photoKeys.all() })
          qc.invalidateQueries({ queryKey: photoKeys.gallery() })
          qc.invalidateQueries({ queryKey: ['stats'] })

          // Invalidate the specific memory's photos
          const row = (payload.new ?? payload.old) as { memory_id?: string } | null
          if (row?.memory_id) {
            qc.invalidateQueries({ queryKey: photoKeys.byMemory(row.memory_id) })
            // Cover photo might have changed — refresh the memory too
            qc.invalidateQueries({ queryKey: memoryKeys.detail(row.memory_id) })
            qc.invalidateQueries({ queryKey: memoryKeys.all() })
          }
        },
      )
      .subscribe()

    // Cleanup: unsubscribe when user signs out or component unmounts
    return () => {
      supabase.removeChannel(memoriesChannel)
      supabase.removeChannel(photosChannel)
    }
  }, [user, qc])
}
