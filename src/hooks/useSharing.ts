import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { notifyOwner } from '@/lib/pushNotify'
import {
  createInviteLink,
  getMyShares,
  acceptInvite,
  revokeShare,
  type CreateInviteOptions,
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
    mutationFn: (opts: CreateInviteOptions) => createInviteLink(opts),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: sharingKeys.list() })
      const permLabel = result.row.permission === 'write' ? 'lectura y escritura' : 'solo lectura'
      const forWho    = result.label ? ` para ${result.label}` : ''
      navigator.clipboard
        .writeText(result.inviteUrl)
        .then(() => toast.success(`¡Enlace copiado${forWho}! Acceso de ${permLabel} 💕`))
        .catch(() => toast.success(`Invitación creada (${permLabel}): ${result.inviteUrl}`))
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

// ─── Accept invite ────────────────────────────────────────────────────────────

interface AcceptInviteCallbacks {
  onAccepted?: () => void
  onFailed?: (message: string) => void
}

export function useAcceptInvite(callbacks?: AcceptInviteCallbacks) {
  const callbacksRef = React.useRef(callbacks)
  callbacksRef.current = callbacks

  return useMutation({
    mutationFn: (token: string) => acceptInvite(token),
    // Global onSuccess fires even under React 18 StrictMode double-effect,
    // because it goes through MutationCache, not the component observer.
    onSuccess: (share) => {
      // Notify the owner that someone accepted their invite
      notifyOwner({
        owner_id: share.owner_id,
        title:    '¡Invitación aceptada! 💕',
        body:     'Alguien ha aceptado tu invitación y ahora puede ver tus recuerdos.',
        url:      '/settings',
      })
      toast.success('¡Acceso compartido aceptado! Ahora puedes ver los recuerdos 💕')
      callbacksRef.current?.onAccepted?.()
    },
    onError: (err: Error) => {
      toast.error(err.message)
      callbacksRef.current?.onFailed?.(err.message)
    },
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
