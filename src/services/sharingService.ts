/**
 * Sharing Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Implements the "Shared Mode" feature:
 *  • An owner can generate an invite link (token-based).
 *  • A guest clicks the link → the token is validated → a shared_access row
 *    is created associating guest_user_id with the owner's data.
 *  • RLS on memories/photos is extended to allow SELECT when a valid
 *    shared_access row exists (owner_id matches, accepted is true).
 *
 * Security model:
 *  • Tokens are cryptographically random (UUID).
 *  • Tokens expire after 7 days if not accepted.
 *  • Once accepted, the accepted_at timestamp is set and the token is
 *    invalidated (cannot be reused).
 *  • The guest can only READ (SELECT). Never INSERT / UPDATE / DELETE.
 *  • The owner can revoke access at any time (delete the row).
 */

import { supabase } from '@/lib/supabase'
import type { SharedAccess, CreateInviteResult, SharePermission } from '@/types'

// ─── Create invite link ───────────────────────────────────────────────────────

export interface CreateInviteOptions {
  permission:  SharePermission
  guestName?:  string   // optional display name for the invite list
  guestEmail?: string   // if provided, only this email can accept
}

export async function createInviteLink({
  permission  = 'read',
  guestName,
  guestEmail,
}: CreateInviteOptions = { permission: 'read' }): Promise<CreateInviteResult> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // expires_at = now + 7 days
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('shared_access')
    .insert({
      owner_id:    user.id,
      permission,
      guest_name:  guestName  || null,
      guest_email: guestEmail ? guestEmail.toLowerCase().trim() : null,
      expires_at:  expiresAt,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  const row = data as SharedAccess
  const inviteUrl = `${window.location.origin}/invite/${row.invite_token}`
  const label = row.guest_name ?? row.guest_email ?? null

  return { row, inviteUrl, label }
}

// ─── List active shares ───────────────────────────────────────────────────────

export async function getMyShares(): Promise<SharedAccess[]> {
  // SEC: always scope to the current user's owner_id as defense-in-depth.
  // RLS migration-2 permits any authenticated user to SELECT all pending
  // invite rows (needed for token acceptance). Without this explicit filter
  // a future query could inadvertently return other owners' invite metadata.
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('shared_access')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as SharedAccess[]
}

// ─── Accept an invite ─────────────────────────────────────────────────────────

export async function acceptInvite(token: string): Promise<SharedAccess> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be logged in to accept an invite')

  // SEC: Use the SECURITY DEFINER RPC function which:
  //   • Never exposes other users' invite rows (no direct SELECT on shared_access)
  //   • Validates token, expiry, email restriction, and marks accepted atomically
  //   • Row-locks against concurrent accept races
  const { data, error } = await supabase.rpc('accept_shared_invite', { p_token: token })

  if (error) {
    const msg = error.message ?? ''
    if (msg.includes('INVALID_TOKEN'))
      throw new Error('Este enlace no es válido o ya ha sido usado. Pide uno nuevo.')
    if (msg.includes('OWN_INVITE'))
      throw new Error('No puedes aceptar tu propia invitación.')
    if (msg.includes('EXPIRED'))
      throw new Error('Este enlace ha expirado. Pide uno nuevo.')
    if (msg.includes('WRONG_EMAIL')) {
      const email = msg.split('WRONG_EMAIL:')[1]?.trim() ?? ''
      throw new Error(
        `Este enlace fue creado para ${email}. Inicia sesión con esa cuenta para aceptarlo.`
      )
    }
    if (msg.includes('ALREADY_USED'))
      throw new Error('Este enlace ya fue aceptado por otra persona.')
    throw new Error(error.message)
  }

  return data as SharedAccess
}

// ─── Revoke a share ───────────────────────────────────────────────────────────

export async function revokeShare(shareId: string): Promise<void> {
  const { error } = await supabase
    .from('shared_access')
    .delete()
    .eq('id', shareId)

  if (error) throw new Error(error.message)
}

// ─── Check if current user is viewing as a guest ─────────────────────────────

export async function getSharedOwner(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('shared_access')
    .select('owner_id')
    .eq('guest_user_id', user.id)
    .not('accepted_at', 'is', null)
    .gt('expires_at', new Date().toISOString())   // BUG-03 fix: skip expired shares
    .order('accepted_at', { ascending: false })
    .limit(1)
    .single()

  return data ? (data as { owner_id: string }).owner_id : null
}
