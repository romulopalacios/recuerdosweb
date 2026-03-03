-- =============================================================================
-- Migration: Atomic & secure invite acceptance via SECURITY DEFINER function
-- =============================================================================
--
-- Problem with the previous approach (migration 20260301000002):
--   The SELECT policy "any auth user can read pending invite by token" has
--   NO token filter in its USING clause. Any authenticated user can call:
--
--     SELECT * FROM shared_access WHERE accepted_at IS NULL AND expires_at > now()
--
--   without supplying a token, and receive ALL pending invites from ALL owners,
--   exposing owner_id, guest_name, and guest_email metadata.
--
-- Fix:
--   1. Drop the overly-permissive SELECT policy.
--   2. Introduce a SECURITY DEFINER function `accept_shared_invite(p_token)`.
--      The function runs with elevated privileges (bypasses RLS) and performs
--      all validations + the UPDATE atomically inside a transaction.
--      Callers never touch the shared_access table directly for acceptance.
-- =============================================================================

-- ── 1. Drop the permissive policy ────────────────────────────────────────────
DROP POLICY IF EXISTS "shared_access: any auth user can read pending invite by token"
  ON public.shared_access;

-- ── 2. Create the secure acceptance function ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.accept_shared_invite(p_token UUID)
RETURNS public.shared_access
LANGUAGE plpgsql
SECURITY DEFINER
-- Explicit search_path prevents search_path injection attacks
SET search_path = public
AS $$
DECLARE
  v_share     public.shared_access;
  v_caller_id UUID   := auth.uid();
  v_caller_email TEXT := (SELECT email FROM auth.users WHERE id = v_caller_id);
BEGIN
  -- Lock the row to prevent race conditions on concurrent accept attempts
  SELECT * INTO v_share
  FROM public.shared_access
  WHERE invite_token = p_token
  FOR UPDATE;

  -- Token not found (invalid or never existed)
  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVALID_TOKEN';
  END IF;

  -- Cannot accept your own invite
  IF v_share.owner_id = v_caller_id THEN
    RAISE EXCEPTION 'OWN_INVITE';
  END IF;

  -- Token has expired
  IF v_share.expires_at < now() THEN
    RAISE EXCEPTION 'EXPIRED';
  END IF;

  -- Email restriction: if owner scoped the invite, only that address may accept
  IF v_share.guest_email IS NOT NULL
     AND lower(v_caller_email) != v_share.guest_email THEN
    RAISE EXCEPTION 'WRONG_EMAIL:%', v_share.guest_email;
  END IF;

  -- Idempotent: already accepted by THIS caller
  IF v_share.accepted_at IS NOT NULL AND v_share.guest_user_id = v_caller_id THEN
    RETURN v_share;
  END IF;

  -- Already accepted by someone else
  IF v_share.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'ALREADY_USED';
  END IF;

  -- Accept: set guest_user_id + accepted_at
  UPDATE public.shared_access
  SET guest_user_id = v_caller_id,
      accepted_at   = now()
  WHERE id = v_share.id
  RETURNING * INTO v_share;

  RETURN v_share;
END;
$$;

-- Only authenticated users may call this function
REVOKE ALL ON FUNCTION public.accept_shared_invite(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_shared_invite(UUID) TO authenticated;
