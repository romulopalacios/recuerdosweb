-- ─── Migration: Storage bucket policies for write-permission guests ────────────
--
-- Problem: when a guest with write permission uploads a photo, the storage path
-- is  {owner_user_id}/{memory_id}/{filename}.
-- Supabase Storage's default INSERT policy only allows a user to write to
-- their OWN folder   ((storage.foldername(name))[1] = auth.uid()).
-- A guest's auth.uid() differs from owner_id, so the upload is blocked.
--
-- Fix: add a Storage INSERT policy that lets write-permission guests upload to
-- the folder belonging to the owner they have a valid share with.
-- Also add a Storage DELETE policy so the owner can delete any photo in their
-- folder, even ones uploaded by a guest.
--
-- Run this in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ── INSERT: write-permission guest can upload to owner's folder ───────────────
CREATE POLICY "photos bucket: write-guest can insert to owner folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'photos'
    AND EXISTS (
      SELECT 1 FROM public.shared_access sa
      WHERE  sa.owner_id::text    = (storage.foldername(name))[1]
        AND  sa.guest_user_id     = auth.uid()
        AND  sa.accepted_at  IS NOT NULL
        AND  sa.expires_at   > now()
        AND  sa.permission   = 'write'
    )
  );

-- ── SELECT: write-permission guest can read photos in the owner's folder ──────
--   (This is only needed if the bucket is PRIVATE.
--    If the bucket is PUBLIC this policy is ignored — public read is already on.)
CREATE POLICY "photos bucket: write-guest can read owner folder"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'photos'
    AND EXISTS (
      SELECT 1 FROM public.shared_access sa
      WHERE  sa.owner_id::text = (storage.foldername(name))[1]
        AND  sa.guest_user_id  = auth.uid()
        AND  sa.accepted_at   IS NOT NULL
        AND  sa.expires_at    > now()
    )
  );

-- ── DELETE: owner can delete any photo in their own folder (incl. guest uploads)
--   The owner's default DELETE policy is   (storage.foldername(name))[1] = auth.uid()
--   which already works when storage_path starts with owner_id. No extra policy needed.
--   Adding this only if the default policy is restrictive; harmless otherwise.
CREATE POLICY "photos bucket: owner can delete own folder"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── UPDATE: owner can update (replace) any photo in their folder ──────────────
CREATE POLICY "photos bucket: owner can update own folder"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── UPDATE: write-permission guest can update/replace photos in owner folder ──
CREATE POLICY "photos bucket: write-guest can update owner folder"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'photos'
    AND EXISTS (
      SELECT 1 FROM public.shared_access sa
      WHERE  sa.owner_id::text = (storage.foldername(name))[1]
        AND  sa.guest_user_id  = auth.uid()
        AND  sa.accepted_at   IS NOT NULL
        AND  sa.expires_at    > now()
        AND  sa.permission    = 'write'
    )
  );
