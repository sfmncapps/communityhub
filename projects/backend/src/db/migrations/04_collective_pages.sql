-- Migration: 04_collective_pages.sql
-- Description: Collective Page Hierarchy & Sub-Pages (RFP §3c, §4b)
-- Enables collective managers to configure sub-pages (e.g. /:slug/about, /:slug/programs, /:slug/team)

CREATE TABLE IF NOT EXISTS collective_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collective_id UUID NOT NULL REFERENCES collectives(id) ON DELETE CASCADE,
  page_slug VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  page_order INT DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_collective_page_slug UNIQUE(collective_id, page_slug)
);

-- Indexes for efficient lookup and ordering
CREATE INDEX IF NOT EXISTS idx_collective_pages_lookup 
  ON collective_pages (collective_id, is_published, page_order ASC);

CREATE INDEX IF NOT EXISTS idx_collective_pages_slug 
  ON collective_pages (collective_id, page_slug);

-- Ensure RLS is configured if enabled
ALTER TABLE collective_pages ENABLE ROW LEVEL SECURITY;

-- Allow public read access to published pages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'collective_pages' AND policyname = 'Public can view published collective pages'
  ) THEN
    CREATE POLICY "Public can view published collective pages"
      ON collective_pages FOR SELECT
      USING (is_published = true);
  END IF;
END $$;

-- Allow managers/authenticated users full access via application service role
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'collective_pages' AND policyname = 'Authenticated full access'
  ) THEN
    CREATE POLICY "Authenticated full access"
      ON collective_pages FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
