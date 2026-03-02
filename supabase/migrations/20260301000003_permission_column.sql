-- ─── Migration: permission column on shared_access ────────────────────────────
-- Adds a `permission` column ('read' | 'write') so owners can control what
-- a guest can do: merely view (read) or also create/edit/delete (write).
--
-- Also adds RLS policies that allow write-permission guests to INSERT /
-- UPDATE / DELETE memories, photos and categories in the OWNER's collection.
--
-- Run this in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add permission column (default 'read' so existing rows stay read-only)
ALTER TABLE public.shared_access
  ADD COLUMN IF NOT EXISTS permission TEXT NOT NULL DEFAULT 'read'
  CHECK (permission IN ('read', 'write'));

-- ─── MEMORIES ─────────────────────────────────────────────────────────────────

-- Write-permission guest can INSERT memories into the owner's collection
-- (frontend sends user_id = owner_id when operating as write-guest)
CREATE POLICY "memories: write-share guest can insert"
  ON public.memories FOR INSERT TO authenticated
  WITH CHECK (
    user_id IN (
      SELECT sa.owner_id
      FROM public.shared_access sa
      WHERE sa.guest_user_id = auth.uid()
        AND sa.accepted_at  IS NOT NULL
        AND sa.expires_at   > now()
        AND sa.permission   = 'write'
    )
  );

-- Write-permission guest can UPDATE memories in the owner's collection
CREATE POLICY "memories: write-share guest can update"
  ON public.memories FOR UPDATE TO authenticated
  USING (
    user_id IN (
      SELECT sa.owner_id
      FROM public.shared_access sa
      WHERE sa.guest_user_id = auth.uid()
        AND sa.accepted_at  IS NOT NULL
        AND sa.expires_at   > now()
        AND sa.permission   = 'write'
    )
  );

-- Write-permission guest can DELETE memories in the owner's collection
CREATE POLICY "memories: write-share guest can delete"
  ON public.memories FOR DELETE TO authenticated
  USING (
    user_id IN (
      SELECT sa.owner_id
      FROM public.shared_access sa
      WHERE sa.guest_user_id = auth.uid()
        AND sa.accepted_at  IS NOT NULL
        AND sa.expires_at   > now()
        AND sa.permission   = 'write'
    )
  );

-- ─── PHOTOS ───────────────────────────────────────────────────────────────────

-- Write-permission guest can INSERT photos for memories they can write to
CREATE POLICY "photos: write-share guest can insert"
  ON public.photos FOR INSERT TO authenticated
  WITH CHECK (
    user_id IN (
      SELECT sa.owner_id
      FROM public.shared_access sa
      WHERE sa.guest_user_id = auth.uid()
        AND sa.accepted_at  IS NOT NULL
        AND sa.expires_at   > now()
        AND sa.permission   = 'write'
    )
  );

-- Write-permission guest can UPDATE photos
CREATE POLICY "photos: write-share guest can update"
  ON public.photos FOR UPDATE TO authenticated
  USING (
    user_id IN (
      SELECT sa.owner_id
      FROM public.shared_access sa
      WHERE sa.guest_user_id = auth.uid()
        AND sa.accepted_at  IS NOT NULL
        AND sa.expires_at   > now()
        AND sa.permission   = 'write'
    )
  );

-- Write-permission guest can DELETE photos
CREATE POLICY "photos: write-share guest can delete"
  ON public.photos FOR DELETE TO authenticated
  USING (
    user_id IN (
      SELECT sa.owner_id
      FROM public.shared_access sa
      WHERE sa.guest_user_id = auth.uid()
        AND sa.accepted_at  IS NOT NULL
        AND sa.expires_at   > now()
        AND sa.permission   = 'write'
    )
  );

-- ─── CATEGORIES ───────────────────────────────────────────────────────────────

-- Write-permission guest can INSERT categories for the owner
CREATE POLICY "categories: write-share guest can insert"
  ON public.categories FOR INSERT TO authenticated
  WITH CHECK (
    user_id IN (
      SELECT sa.owner_id
      FROM public.shared_access sa
      WHERE sa.guest_user_id = auth.uid()
        AND sa.accepted_at  IS NOT NULL
        AND sa.expires_at   > now()
        AND sa.permission   = 'write'
    )
  );

-- Write-permission guest can UPDATE categories
CREATE POLICY "categories: write-share guest can update"
  ON public.categories FOR UPDATE TO authenticated
  USING (
    user_id IN (
      SELECT sa.owner_id
      FROM public.shared_access sa
      WHERE sa.guest_user_id = auth.uid()
        AND sa.accepted_at  IS NOT NULL
        AND sa.expires_at   > now()
        AND sa.permission   = 'write'
    )
  );

-- ─── Guest identification (name / email) ─────────────────────────────────────
-- Allows the owner to label who they're inviting. guest_email is also used
-- as a soft restriction: if set, only that email address can accept the invite.

ALTER TABLE public.shared_access
  ADD COLUMN IF NOT EXISTS guest_name  TEXT,
  ADD COLUMN IF NOT EXISTS guest_email TEXT;
