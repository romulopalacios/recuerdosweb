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
  const { data, error } = await supabase
    .from('shared_access')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as SharedAccess[]
}

// ─── Accept an invite ─────────────────────────────────────────────────────────

export async function acceptInvite(token: string): Promise<SharedAccess> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be logged in to accept an invite')

  // Validate the token is unused and not expired.
  // NOTE: RLS must include a policy that allows SELECT on pending rows.
  // If get PGRST116 (0 rows / 406) the token is invalid, expired, or already used.
  const { data: row, error: fetchError } = await supabase
    .from('shared_access')
    .select('*')
    .eq('invite_token', token)
    .single()

  if (fetchError?.code === 'PGRST116' || !row) {
    throw new Error('Este enlace no es válido o ya ha sido usado. Pide uno nuevo.')
  }
  if (fetchError) throw new Error(fetchError.message)

  const share = row as SharedAccess

  // Already accepted — might be this same guest re-opening the link
  if (share.accepted_at !== null) {
    if (share.guest_user_id === user.id) {
      // Already accepted by this user — treat as success, just return
      return share
    }
    throw new Error('Este enlace ya fue aceptado por otra persona.')
  }

  // Cannot accept your own invite
  if (share.owner_id === user.id) {
    throw new Error('No puedes aceptar tu propia invitación.')
  }

  // Email restriction: if the owner set a specific email, only that address can accept
  if (share.guest_email && user.email?.toLowerCase().trim() !== share.guest_email) {
    throw new Error(
      `Este enlace fue creado para ${share.guest_email}. Inicia sesión con esa cuenta para aceptarlo.`
    )
  }

  // Token expired
  if (new Date(share.expires_at) < new Date()) {
    throw new Error('Este enlace ha expirado. Pide uno nuevo.')
  }

  // Accept: set guest_user_id and accepted_at
  const { data: updated, error: updateError } = await supabase
    .from('shared_access')
    .update({
      guest_user_id: user.id,
      accepted_at:   new Date().toISOString(),
    })
    .eq('invite_token', token)
    .select()
    .single()

  if (updateError) throw new Error(updateError.message)
  return updated as SharedAccess
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
    .order('accepted_at', { ascending: false })
    .limit(1)
    .single()

  return data ? (data as { owner_id: string }).owner_id : null
}
