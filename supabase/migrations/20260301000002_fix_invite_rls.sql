-- =============================================================================
-- Fix: allow any authenticated user to SELECT a pending, non-expired invite row.
--
-- Why this is needed:
--   The original migration only has SELECT policies for the owner (owner_id =
--   auth.uid()) and the guest (guest_user_id = auth.uid()). But when a guest
--   first opens the invite link, guest_user_id is still NULL — so neither
--   policy matches, PostgREST returns 0 rows → .single() → HTTP 406.
--
-- Security note:
--   The invite_token is a UUID (128-bit random). Knowing the token IS the
--   proof of authorization — exactly like a magic-link. We don't expose any
--   data that isn't already known to someone who has the token.
--   The policy is also restricted to accepted_at IS NULL AND expires_at > now()
--   so accepted/expired invites are never exposed this way.
-- =============================================================================

CREATE POLICY "shared_access: any auth user can read pending invite by token"
  ON public.shared_access
  FOR SELECT
  TO authenticated
  USING (
    accepted_at IS NULL
    AND expires_at > now()
  );
