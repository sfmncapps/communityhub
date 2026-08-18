-- Migration: RFP Features (4-Tier RBAC, Collectives Entity, ID Verification, In-App Messaging)

-- 1. Upgrade users_active table with RBAC & ID Verification columns
ALTER TABLE IF EXISTS users_active
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('superadmin', 'admin', 'manager', 'user')),
  ADD COLUMN IF NOT EXISTS id_document_url TEXT,
  ADD COLUMN IF NOT EXISTS redacted_id_url TEXT,
  ADD COLUMN IF NOT EXISTS id_type VARCHAR(50) DEFAULT 'driver_license',
  ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
  ADD COLUMN IF NOT EXISTS verification_notes TEXT,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by UUID;

-- Upgrade users_pending table to carry role and verification fields
ALTER TABLE IF EXISTS users_pending
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'unverified';

-- 2. Create Collectives table
CREATE TABLE IF NOT EXISTS collectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  owner_id UUID REFERENCES users_active(id) ON DELETE SET NULL,
  partners JSONB DEFAULT '[]'::jsonb,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  zip VARCHAR(20),
  website VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast slug lookup and status filtering
CREATE INDEX IF NOT EXISTS idx_collectives_slug ON collectives(slug);
CREATE INDEX IF NOT EXISTS idx_collectives_status ON collectives(status);

-- 3. Create Collective Members table
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

-- 4. Create Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) DEFAULT 'direct' CHECK (type IN ('direct', 'collective')),
  collective_id UUID REFERENCES collectives(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create Conversation Participants table
CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users_active(id) ON DELETE CASCADE,
  unread_count INT DEFAULT 0,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_conv ON conversation_participants(conversation_id);

-- 6. Create Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users_active(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
