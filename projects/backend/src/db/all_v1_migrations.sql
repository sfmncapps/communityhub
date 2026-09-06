-- ==============================================================================
-- CommunityHub v1.0 — Master Consolidated Database Migration
-- Run this complete script in the Supabase SQL Editor for your project.
-- Safe to run multiple times (uses IF NOT EXISTS / ON CONFLICT DO NOTHING).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. USER & COLLECTIVE PROFILE SCHEMA UPGRADES (RFP §7a, §7d)
-- ------------------------------------------------------------------------------

-- Discrete name & address fields on users_active
ALTER TABLE IF EXISTS users_active
  ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS street_address TEXT,
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS state VARCHAR(100),
  ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'India',
  ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20);

-- Backfill first_name / last_name from existing name data where present
UPDATE users_active
SET 
  first_name = SPLIT_PART(TRIM(name), ' ', 1),
  last_name = CASE 
    WHEN POSITION(' ' IN TRIM(name)) > 0 THEN SUBSTRING(TRIM(name) FROM POSITION(' ' IN TRIM(name)) + 1)
    ELSE ''
  END
WHERE (first_name IS NULL OR first_name = '') AND name IS NOT NULL AND TRIM(name) != '';

-- Backfill street_address & city from legacy company_address / company_location
UPDATE users_active
SET 
  street_address = company_address,
  city = company_location
WHERE (street_address IS NULL OR street_address = '') AND company_address IS NOT NULL;

-- Discrete columns on users_pending
ALTER TABLE IF EXISTS users_pending
  ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS street_address TEXT,
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS state VARCHAR(100),
  ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'India',
  ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20);

-- Collectives profile upgrades
ALTER TABLE IF EXISTS collectives
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users_active(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS partners JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS zip VARCHAR(20),
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Collective members roster table
CREATE TABLE IF NOT EXISTS collective_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collective_id UUID REFERENCES collectives(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users_active(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(collective_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_collective_members_collective ON collective_members(collective_id);
CREATE INDEX IF NOT EXISTS idx_collective_members_user ON collective_members(user_id);

-- ------------------------------------------------------------------------------
-- 2. EVENTS DIRECTORY MODULE (RFP §8.7b)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users_active(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100),
  description TEXT NOT NULL,
  organizer_name VARCHAR(150),
  organizer_phone VARCHAR(50),
  organizer_email VARCHAR(255),
  event_date DATE NOT NULL,
  event_time TIME NOT NULL,
  end_date DATE,
  end_time TIME,
  venue_name VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  zip_code VARCHAR(20),
  registration_link TEXT,
  ticket_price VARCHAR(50),
  entry_type VARCHAR(20) DEFAULT 'Free' CHECK (entry_type IN ('Free', 'Paid')),
  banner_url TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view approved events" ON events;
CREATE POLICY "Public can view approved events" ON events
  FOR SELECT USING (status = 'approved');

DROP POLICY IF EXISTS "Allow authenticated inserts" ON events;
CREATE POLICY "Allow authenticated inserts" ON events
  FOR INSERT WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 3. COLLECTIVE STATE-RECORD VERIFICATION (RFP §7e)
-- ------------------------------------------------------------------------------

ALTER TABLE IF EXISTS collectives
  ADD COLUMN IF NOT EXISTS state_record_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS state_record_notes TEXT,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES users_active(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'verified', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_collectives_verification ON collectives(verification_status);
CREATE INDEX IF NOT EXISTS idx_collectives_state_id ON collectives(state_record_id);

UPDATE collectives
SET verification_status = 'unverified'
WHERE verification_status IS NULL;

-- ------------------------------------------------------------------------------
-- 4. COLLECTIVE PAGE HIERARCHY (RFP §3c, §4b)
-- ------------------------------------------------------------------------------

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

CREATE INDEX IF NOT EXISTS idx_collective_pages_lookup 
  ON collective_pages (collective_id, is_published, page_order ASC);

CREATE INDEX IF NOT EXISTS idx_collective_pages_slug 
  ON collective_pages (collective_id, page_slug);

ALTER TABLE collective_pages ENABLE ROW LEVEL SECURITY;

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

-- ------------------------------------------------------------------------------
-- 5. PLATFORM SETTINGS & THEMING (RFP §3b, §4f)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(50) UNIQUE NOT NULL DEFAULT 'general',
  theme VARCHAR(50) NOT NULL DEFAULT 'yellow_pages',
  header_menu JSONB NOT NULL DEFAULT '[
    {"id": "home", "label": "Home", "path": "/", "is_visible": true, "sort_order": 1},
    {"id": "welcome", "label": "Welcome", "path": "/welcome", "is_visible": true, "sort_order": 2},
    {"id": "events", "label": "Events", "path": "/events", "is_visible": true, "sort_order": 3},
    {"id": "directory", "label": "Directory", "path": "/directory", "is_visible": true, "sort_order": 4},
    {"id": "community", "label": "Community", "path": "/community", "is_visible": true, "sort_order": 5},
    {"id": "jobs", "label": "Jobs", "path": "/jobs", "is_visible": true, "sort_order": 6},
    {"id": "classifieds", "label": "Classifieds", "path": "/classifieds", "is_visible": true, "sort_order": 7}
  ]'::jsonb,
  homepage_widgets JSONB NOT NULL DEFAULT '[
    {"key": "hero", "title": "Hero Welcome Banner", "is_enabled": true, "sort_order": 1},
    {"key": "about", "title": "About & Mission", "is_enabled": true, "sort_order": 2},
    {"key": "services", "title": "Community Pillars", "is_enabled": true, "sort_order": 3},
    {"key": "contact", "title": "Get in Touch & Join", "is_enabled": true, "sort_order": 4}
  ]'::jsonb,
  footer_text TEXT DEFAULT '© 2026 CommunityHub. Empowering non-profits and community organizations.',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users_active(id)
);

INSERT INTO platform_settings (key, theme)
VALUES ('general', 'yellow_pages')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'platform_settings' AND policyname = 'Public can read general platform settings'
  ) THEN
    CREATE POLICY "Public can read general platform settings"
      ON platform_settings FOR SELECT
      USING (true);
  END IF;
END $$;
