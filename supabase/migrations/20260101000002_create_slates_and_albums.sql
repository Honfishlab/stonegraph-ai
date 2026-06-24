-- =============================================================
-- Stonegraph AI: Create slates + albums tables
-- Paste this entire file into Supabase SQL Editor and click Run
-- =============================================================

-- ── slates table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS slates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'personal',
  year INTEGER,
  cover_memory_id UUID REFERENCES memories(id) ON DELETE SET NULL,
  memory_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  is_generated BOOLEAN NOT NULL DEFAULT FALSE,
  generated_at TIMESTAMPTZ,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── albums table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  cover_memory_id UUID REFERENCES memories(id) ON DELETE SET NULL,
  memory_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_slates_user_id ON slates(user_id);
CREATE INDEX IF NOT EXISTS idx_slates_family_id ON slates(family_id);
CREATE INDEX IF NOT EXISTS idx_slates_created_by ON slates(created_by);
CREATE INDEX IF NOT EXISTS idx_albums_user_id ON albums(user_id);
CREATE INDEX IF NOT EXISTS idx_albums_family_id ON albums(family_id);
CREATE INDEX IF NOT EXISTS idx_albums_slug ON albums(slug);

-- ── RLS: slates ──────────────────────────────────────────────
ALTER TABLE slates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'slates_select_own' AND tablename = 'slates') THEN
    CREATE POLICY "slates_select_own" ON slates FOR SELECT
      USING (auth.uid() = user_id OR is_public = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'slates_insert_own' AND tablename = 'slates') THEN
    CREATE POLICY "slates_insert_own" ON slates FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'slates_update_own' AND tablename = 'slates') THEN
    CREATE POLICY "slates_update_own" ON slates FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'slates_delete_own' AND tablename = 'slates') THEN
    CREATE POLICY "slates_delete_own" ON slates FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── RLS: albums ──────────────────────────────────────────────
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'albums_select_own' AND tablename = 'albums') THEN
    CREATE POLICY "albums_select_own" ON albums FOR SELECT
      USING (auth.uid() = user_id OR is_public = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'albums_insert_own' AND tablename = 'albums') THEN
    CREATE POLICY "albums_insert_own" ON albums FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'albums_update_own' AND tablename = 'albums') THEN
    CREATE POLICY "albums_update_own" ON albums FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'albums_delete_own' AND tablename = 'albums') THEN
    CREATE POLICY "albums_delete_own" ON albums FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── updated_at triggers ──────────────────────────────────────
CREATE OR REPLACE FUNCTION update_slate_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION update_album_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trigger_slate_updated_at ON slates;
CREATE TRIGGER trigger_slate_updated_at
  BEFORE UPDATE ON slates FOR EACH ROW
  EXECUTE FUNCTION update_slate_updated_at();

DROP TRIGGER IF EXISTS trigger_album_updated_at ON albums;
CREATE TRIGGER trigger_album_updated_at
  BEFORE UPDATE ON albums FOR EACH ROW
  EXECUTE FUNCTION update_album_updated_at();

-- ── RPC helpers: add/remove memory_ids atomically ────────────
CREATE OR REPLACE FUNCTION slate_add_memories(p_slate_id UUID, p_memory_ids UUID[])
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE slates
  SET memory_ids = (
    SELECT ARRAY_AGG(DISTINCT m) FROM (
      SELECT UNNEST(memory_ids) AS m FROM slates WHERE id = p_slate_id
      UNION
      SELECT UNNEST(p_memory_ids) AS m
    ) sub
  ),
  updated_at = NOW()
  WHERE id = p_slate_id;
END; $$;

CREATE OR REPLACE FUNCTION slate_remove_memories(p_slate_id UUID, p_memory_ids UUID[])
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE slates
  SET memory_ids = (
    SELECT COALESCE(ARRAY_AGG(m), ARRAY[]::UUID[])
    FROM UNNEST(memory_ids) AS m
    WHERE m <> ALL(p_memory_ids)
  ),
  updated_at = NOW()
  WHERE id = p_slate_id;
END; $$;

CREATE OR REPLACE FUNCTION album_add_memories(p_album_id UUID, p_memory_ids UUID[])
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE albums
  SET memory_ids = (
    SELECT ARRAY_AGG(DISTINCT m) FROM (
      SELECT UNNEST(memory_ids) AS m FROM albums WHERE id = p_album_id
      UNION
      SELECT UNNEST(p_memory_ids) AS m
    ) sub
  ),
  updated_at = NOW()
  WHERE id = p_album_id;
END; $$;

CREATE OR REPLACE FUNCTION album_remove_memories(p_album_id UUID, p_memory_ids UUID[])
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE albums
  SET memory_ids = (
    SELECT COALESCE(ARRAY_AGG(m), ARRAY[]::UUID[])
    FROM UNNEST(memory_ids) AS m
    WHERE m <> ALL(p_memory_ids)
  ),
  updated_at = NOW()
  WHERE id = p_album_id;
END; $$;

-- Verify
SELECT
  'slates' AS table_name,
  COUNT(*) AS row_count
FROM slates
UNION ALL
SELECT
  'albums' AS table_name,
  COUNT(*) AS row_count
FROM albums;
