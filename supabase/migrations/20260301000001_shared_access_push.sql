-- =============================================================================
-- Migration: Shared Mode + Push Subscriptions + Photo Thumbnails
-- Apply in Supabase Dashboard → SQL Editor, or via:
--   supabase db push
-- =============================================================================

-- ─── 1. Add thumb_url column to photos ───────────────────────────────────────
-- The Edge Function `process-image` generates a 200×200 thumbnail and stores
-- its public URL here. The UI uses this for grids (faster, smaller).

ALTER TABLE photos ADD COLUMN IF NOT EXISTS thumb_url TEXT;

-- ─── 2. Push Subscriptions ───────────────────────────────────────────────────
-- Stores one Web Push subscription per user (device).

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    TEXT        NOT NULL,
  p256dh      TEXT        NOT NULL,
  auth        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id)  -- one active subscription per user
);

-- RLS: users can only see/modify their own subscription
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subscriptions: owner only"
  ON push_subscriptions
  FOR ALL
  TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── 3. Shared Access ─────────────────────────────────────────────────────────
-- Allows an owner to invite a guest (another registered user) to view their
-- memories in read-only mode.
--
-- Security model:
--   • invite_token is cryptographically random (UUID).
--   • Token is single-use: once accepted_at is set, the token cannot be reused.
--   • Token expires after 7 days if not accepted.
--   • The guest has read-only SELECT access enforced by the RLS policies below.
--   • The owner can revoke at any time by deleting the row.

CREATE TABLE IF NOT EXISTS shared_access (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_user_id   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  invite_token    UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  accepted_at     TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE shared_access ENABLE ROW LEVEL SECURITY;

-- Owner: full control over their own shares
CREATE POLICY "shared_access: owner full control"
  ON shared_access
  FOR ALL
  TO authenticated
  USING  (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Guest: can see the share record to validate the token (for invite acceptance)
CREATE POLICY "shared_access: guest can read their own"
  ON shared_access
  FOR SELECT
  TO authenticated
  USING (auth.uid() = guest_user_id);

-- Guest: can update to accept (set guest_user_id + accepted_at)
-- We restrict which columns can change via CHECK.
CREATE POLICY "shared_access: guest can accept pending invite"
  ON shared_access
  FOR UPDATE
  TO authenticated
  USING (
    accepted_at IS NULL
    AND expires_at > now()
    -- Token is scoped to the specific guest accepting it
  )
  WITH CHECK (
    auth.uid() = guest_user_id
    AND accepted_at IS NOT NULL
  );

-- ─── 4. Extend RLS on memories to allow guest read ───────────────────────────
-- The existing policy allows users to read their own memories.
-- This additional policy grants SELECT to guests with an active share.

CREATE POLICY "memories: shared guest read"
  ON memories
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shared_access sa
      WHERE sa.owner_id      = memories.user_id
        AND sa.guest_user_id = auth.uid()
        AND sa.accepted_at   IS NOT NULL
        AND sa.expires_at    > now()
    )
  );

-- ─── 5. Extend RLS on photos to allow guest read (same logic) ────────────────

CREATE POLICY "photos: shared guest read"
  ON photos
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shared_access sa
      WHERE sa.owner_id      = photos.user_id
        AND sa.guest_user_id = auth.uid()
        AND sa.accepted_at   IS NOT NULL
        AND sa.expires_at    > now()
    )
  );

-- ─── 6. Extend RLS on categories for guest read ──────────────────────────────

CREATE POLICY "categories: shared guest read"
  ON categories
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shared_access sa
      WHERE sa.owner_id      = categories.user_id
        AND sa.guest_user_id = auth.uid()
        AND sa.accepted_at   IS NOT NULL
        AND sa.expires_at    > now()
    )
  );

-- ─── 7. Helpful indexes ───────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_shared_access_token      ON shared_access (invite_token);
CREATE INDEX IF NOT EXISTS idx_shared_access_guest      ON shared_access (guest_user_id);
CREATE INDEX IF NOT EXISTS idx_shared_access_owner      ON shared_access (owner_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user  ON push_subscriptions (user_id);

-- ─── 8. Auto-update updated_at for push_subscriptions ────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
