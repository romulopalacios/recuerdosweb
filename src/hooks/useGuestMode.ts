/**
 * useGuestMode
 * ─────────────────────────────────────────────────────────────────────────────
 * Returns whether the current user is viewing as a guest (via a shared invite).
 *
 * How it works:
 *  • Queries shared_access for rows where guest_user_id = auth.uid() and
 *    accepted_at IS NOT NULL (active share).
 *  • If found, the user is in "guest mode" — they're viewing the owner's data.
 *
 * Usage:
 *   const { isGuest, ownerName } = useGuestMode()
 *   if (isGuest) hide write actions
 */
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { SharePermission } from '@/types'

export interface GuestModeInfo {
  isGuest:     boolean
  ownerId:     string | null
  ownerName:   string | null
  permission:  SharePermission | null   // null when not a guest
  canWrite:    boolean                  // shorthand: isGuest && permission === 'write'
  isLoading:   boolean
}

export function useGuestMode(): GuestModeInfo {
  const { user } = useAuthStore()

  const { data, isLoading } = useQuery({
    queryKey:  ['guestMode', user?.id],
    enabled:   !!user,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      // Check if current user is a guest in any active share
      const { data: shares } = await supabase
        .from('shared_access')
        .select('owner_id, permission')
        .eq('guest_user_id', user!.id)
        .not('accepted_at', 'is', null)
        .gt('expires_at', new Date().toISOString())
        .limit(1)

      if (!shares || shares.length === 0) return null

      return {
        ownerId:    shares[0].owner_id  as string,
        ownerName:  null,
        permission: (shares[0].permission ?? 'read') as SharePermission,
      }
    },
  })

  const permission = data?.permission ?? null
  const isGuest    = !!data

  return {
    isGuest,
    ownerId:   data?.ownerId   ?? null,
    ownerName: data?.ownerName ?? null,
    permission,
    canWrite:  isGuest && permission === 'write',
    isLoading,
  }
}
