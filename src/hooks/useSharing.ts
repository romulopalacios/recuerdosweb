import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createInviteLink,
  getMyShares,
  acceptInvite,
  revokeShare,
} from '@/services/sharingService'

// ─── Query keys ───────────────────────────────────────────────────────────────

export const sharingKeys = {
  list: () => ['sharing', 'list'] as const,
}

// ─── List shares ──────────────────────────────────────────────────────────────

export function useMyShares() {
  return useQuery({
    queryKey:  sharingKeys.list(),
    queryFn:   getMyShares,
    staleTime: 1000 * 60 * 5,
  })
}

// ─── Create invite ────────────────────────────────────────────────────────────

export function useCreateInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createInviteLink,
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: sharingKeys.list() })
      // Copy to clipboard automatically
      navigator.clipboard
        .writeText(result.inviteUrl)
        .then(() => toast.success('¡Enlace de invitación copiado! Compártelo con tu pareja 💕'))
        .catch(() => toast.success(`Invitación creada: ${result.inviteUrl}`))
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

// ─── Accept invite ────────────────────────────────────────────────────────────

export function useAcceptInvite() {
  return useMutation({
    mutationFn: (token: string) => acceptInvite(token),
    onSuccess: () => toast.success('¡Acceso compartido aceptado! Ahora puedes ver los recuerdos 💕'),
    onError:   (err: Error) => toast.error(err.message),
  })
}

// ─── Revoke share ─────────────────────────────────────────────────────────────

export function useRevokeShare() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => revokeShare(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sharingKeys.list() })
      toast.success('Acceso revocado')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
