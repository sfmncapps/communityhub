-- ============================================================================
-- Migration 03: Collective State-Record Verification Workflow (RFP §7e)
-- Task 4 of CommunityHub v1.0 Roadmap
-- ============================================================================

-- 1. Extend collectives table with state corporation / NGO verification audit fields
ALTER TABLE IF EXISTS collectives
  ADD COLUMN IF NOT EXISTS state_record_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS state_record_notes TEXT,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES users_active(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'verified', 'rejected'));

-- 2. Indexes for fast status filtering and ID lookups
CREATE INDEX IF NOT EXISTS idx_collectives_verification ON collectives(verification_status);
CREATE INDEX IF NOT EXISTS idx_collectives_state_id ON collectives(state_record_id);

-- 3. Set existing approved collectives to 'unverified' by default if NULL
UPDATE collectives
SET verification_status = 'unverified'
WHERE verification_status IS NULL;
