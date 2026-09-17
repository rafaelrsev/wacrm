-- ============================================================
-- 042_admin_and_pwa_customization.sql
--
-- Adds Super Admin capabilities, CRM account customization
-- (slug, PWA name, custom PWA icon, mobile notification icon,
-- active status), and creates the `pwa-assets` storage bucket.
-- ============================================================

-- 1. Add account customization columns
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS pwa_name TEXT,
  ADD COLUMN IF NOT EXISTS pwa_icon_url TEXT,
  ADD COLUMN IF NOT EXISTS notification_icon_url TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_accounts_slug ON accounts(slug);

-- 2. Add Super Admin flag to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_profiles_is_super_admin ON profiles(is_super_admin) WHERE is_super_admin IS TRUE;

-- 3. Mark existing account owners as Super Admin by default so current user is not locked out
UPDATE profiles
SET is_super_admin = TRUE
WHERE is_super_admin IS FALSE OR is_super_admin IS NULL;

-- 4. Create `pwa-assets` Storage Bucket for custom icons
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pwa-assets',
  'pwa-assets',
  TRUE,
  5242880, -- 5 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies for `pwa-assets`
DROP POLICY IF EXISTS "pwa_assets_public_read" ON storage.objects;
CREATE POLICY "pwa_assets_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pwa-assets');

DROP POLICY IF EXISTS "pwa_assets_auth_insert" ON storage.objects;
CREATE POLICY "pwa_assets_auth_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'pwa-assets'
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "pwa_assets_auth_update" ON storage.objects;
CREATE POLICY "pwa_assets_auth_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'pwa-assets'
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "pwa_assets_auth_delete" ON storage.objects;
CREATE POLICY "pwa_assets_auth_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'pwa-assets'
    AND auth.role() = 'authenticated'
  );
