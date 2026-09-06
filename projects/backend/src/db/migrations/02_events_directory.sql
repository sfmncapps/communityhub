-- ============================================================================
-- Migration 02: Events Directory Module Schema & Policies
-- Task 3 of CommunityHub v1.0 Roadmap
-- ============================================================================

-- 1. Create events table if not exists with all required fields
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

-- 2. Indexes for fast filtering & search
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);

-- 3. Row Level Security Policies
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view approved events" ON events;
CREATE POLICY "Public can view approved events" ON events
  FOR SELECT USING (status = 'approved');

DROP POLICY IF EXISTS "Allow authenticated inserts" ON events;
CREATE POLICY "Allow authenticated inserts" ON events
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow owners to update own events" ON events;
CREATE POLICY "Allow owners to update own events" ON events
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow owners to delete own events" ON events;
CREATE POLICY "Allow owners to delete own events" ON events
  FOR DELETE USING (auth.uid() = user_id);

-- 4. Seed initial approved events if empty
INSERT INTO events (
  title,
  category,
  subcategory,
  description,
  organizer_name,
  organizer_phone,
  organizer_email,
  event_date,
  event_time,
  venue_name,
  address,
  city,
  state,
  zip_code,
  registration_link,
  ticket_price,
  entry_type,
  banner_url,
  status
)
SELECT
  'Hyderabad Community NGO Summit 2026',
  'Community Event',
  'Meetup',
  'Annual gathering of non-profit leaders, social impact volunteers, and community founders to collaborate on grassroots development, education, and healthcare initiatives.',
  'Telangana Social Welfare Forum',
  '+91 98765 43210',
  'summit@communityhub.org',
  CURRENT_DATE + INTERVAL '7 days',
  '10:00:00',
  'HITEX Exhibition Center, Hall 2',
  'Trade Fair Office Building, Izzat Nagar, Madhapur',
  'Hyderabad',
  'Telangana',
  '500084',
  'https://communityhub.org/rsvp/summit-2026',
  NULL,
  'Free',
  'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&auto=format&fit=crop&q=60',
  'approved'
WHERE NOT EXISTS (SELECT 1 FROM events WHERE title = 'Hyderabad Community NGO Summit 2026');

INSERT INTO events (
  title,
  category,
  subcategory,
  description,
  organizer_name,
  organizer_phone,
  organizer_email,
  event_date,
  event_time,
  venue_name,
  address,
  city,
  state,
  zip_code,
  registration_link,
  ticket_price,
  entry_type,
  banner_url,
  status
)
SELECT
  'Tech for Good: Digital Skills Bootcamp',
  'Workshop',
  'Technical Workshop',
  'A hands-on intensive workshop designed for young professionals and non-profit coordinators to learn open-source web technologies, collaborative tools, and digital outreach.',
  'DevCommunity Hyderabad',
  '+91 91234 56789',
  'workshops@devcommunity.in',
  CURRENT_DATE + INTERVAL '14 days',
  '14:00:00',
  'T-Hub Phase 2, Auditorium B',
  'Knowledge City, Raidurg',
  'Hyderabad',
  'Telangana',
  '500081',
  'https://devcommunity.in/bootcamp',
  '₹499',
  'Paid',
  'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&auto=format&fit=crop&q=60',
  'approved'
WHERE NOT EXISTS (SELECT 1 FROM events WHERE title = 'Tech for Good: Digital Skills Bootcamp');

INSERT INTO events (
  title,
  category,
  subcategory,
  description,
  organizer_name,
  organizer_phone,
  organizer_email,
  event_date,
  event_time,
  venue_name,
  address,
  city,
  state,
  zip_code,
  registration_link,
  ticket_price,
  entry_type,
  banner_url,
  status
)
SELECT
  'Heritage Cultural Festival & Artisan Market',
  'Cultural Program',
  'Festival Celebration',
  'Celebrate traditional handicrafts, folk dances, organic culinary delicacies, and live acoustic music by local artists. Bring family and friends!',
  'Artisans Guild Collective',
  '+91 94400 11223',
  'guild@artisans.org',
  CURRENT_DATE + INTERVAL '21 days',
  '11:00:00',
  'Shilparamam Crafts Village',
  'Hi-Tech City Main Road, Madhapur',
  'Hyderabad',
  'Telangana',
  '500081',
  'https://artisans.org/festival',
  NULL,
  'Free',
  'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&auto=format&fit=crop&q=60',
  'approved'
WHERE NOT EXISTS (SELECT 1 FROM events WHERE title = 'Heritage Cultural Festival & Artisan Market');
