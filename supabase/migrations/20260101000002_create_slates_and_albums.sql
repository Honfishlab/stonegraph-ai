-- Create slates table
CREATE TABLE IF NOT EXISTS slates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'personal',
  year INTEGER,
  cover_memory_id UUID REFERENCES memories(id) ON DELETE SET NULL,
  memory_ids UUID[] DEFAULT ARRAY[]::UUID[],
  is_generated BOOLEAN DEFAULT FALSE,
  generated_at TIMESTAMPTZ,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create albums table
CREATE TABLE IF NOT EXISTS albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover_memory UUID REFERENCES memories(id) ON DELETE SET NULL,
  memory_ids UUID[] DEFAULT ARRAY[]::UUID[],
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for slates
CREATE INDEX IF NOT EXISTS idx_slates_user_id ON slates(user_id);
CREATE INDEX IF NOT EXISTS idx_slates_family_id ON slates(family_id);
CREATE INDEX IF NOT EXISTS idx_slates_type ON slates(type);
CREATE INDEX IF NOT EXISTS idx_slates_year ON slates(year);

-- Create indexes for albums
CREATE INDEX IF NOT EXISTS idx_albums_user_id ON albums(user_id);
CREATE INDEX IF NOT EXISTS idx_albums_family_id ON albums(family_id);

-- Add RLS policies for slates
ALTER TABLE slates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own slates"
  ON slates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own slates"
  ON slates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own slates"
  ON slates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own slates"
  ON slates FOR DELETE
  USING (auth.uid() = user_id);

-- Add RLS policies for albums
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own albums"
  ON albums FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can create their own albums"
  ON albums FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own albums"
  ON albums FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own albums"
  ON albums FOR DELETE
  USING (auth.uid() = user_id);

-- Add auto-update trigger for updated_at
CREATE OR REPLACE FUNCTION update_slate_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_slate_updated_at
  BEFORE UPDATE ON slates
  FOR EACH ROW
  EXECUTE FUNCTION update_slate_updated_at();

CREATE OR REPLACE FUNCTION update_album_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_album_updated_at
  BEFORE UPDATE ON albums
  FOR EACH ROW
  EXECUTE FUNCTION update_album_updated_at();
