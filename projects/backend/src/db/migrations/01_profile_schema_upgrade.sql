-- ============================================================================
-- Migration 01: User and Collective Profile Schema Upgrade
-- Task 2 of CommunityHub v1.0 Roadmap
-- ============================================================================

-- 1. Upgrade users_active table with discrete name & address columns (RFP §7a)
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

-- 2. Upgrade users_pending table with matching discrete columns
ALTER TABLE IF EXISTS users_pending
  ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS street_address TEXT,
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS state VARCHAR(100),
  ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'India',
  ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20);

-- 3. Upgrade collectives table to match RFP requirements (RFP §7d)
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

-- 4. Create collective_members table if not exists (for team/partners roster)
CREATE TABLE IF NOT EXISTS collective_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collective_id UUID REFERENCES collectives(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users_active(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(collective_id, user_id)
);

-- 5. Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_users_active_email ON users_active(email);
CREATE INDEX IF NOT EXISTS idx_collectives_owner_id ON collectives(owner_id);
CREATE INDEX IF NOT EXISTS idx_collective_members_col ON collective_members(collective_id);
CREATE INDEX IF NOT EXISTS idx_collective_members_user ON collective_members(user_id);
