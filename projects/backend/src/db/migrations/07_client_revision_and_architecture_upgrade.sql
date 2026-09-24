-- ==============================================================================
-- CommunityHub v2.1 — Client Revision & Architectural Upgrade Migration
-- Execute this complete script in your Supabase SQL Editor.
-- ==============================================================================

-- 1. Storage Buckets for Verification Docs, Classifieds Media, and Event Media
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('verification-docs', 'verification-docs', false),
  ('classifieds-media', 'classifieds-media', true),
  ('event-media', 'event-media', true),
  ('vendor-media', 'vendor-media', true),
  ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
DO $$
BEGIN
  -- Classifieds media (public read, authenticated insert)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Public Read Classifieds Media'
  ) THEN
    CREATE POLICY "Public Read Classifieds Media" ON storage.objects 
    FOR SELECT USING (bucket_id = 'classifieds-media');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Auth Users Upload Classifieds'
  ) THEN
    CREATE POLICY "Auth Users Upload Classifieds" ON storage.objects 
    FOR INSERT WITH CHECK (bucket_id = 'classifieds-media' AND auth.role() = 'authenticated');
  END IF;

  -- Event media (public read, authenticated insert)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Public Read Event Media'
  ) THEN
    CREATE POLICY "Public Read Event Media" ON storage.objects 
    FOR SELECT USING (bucket_id = 'event-media');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Auth Users Upload Event Media'
  ) THEN
    CREATE POLICY "Auth Users Upload Event Media" ON storage.objects 
    FOR INSERT WITH CHECK (bucket_id = 'event-media' AND auth.role() = 'authenticated');
  END IF;

  -- Verification docs (authenticated insert, owner/admin read)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Auth Users Upload Verification Docs'
  ) THEN
    CREATE POLICY "Auth Users Upload Verification Docs" ON storage.objects 
    FOR INSERT WITH CHECK (bucket_id = 'verification-docs' AND auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Users and Admins View Verification Docs'
  ) THEN
    CREATE POLICY "Users and Admins View Verification Docs" ON storage.objects 
    FOR SELECT USING (bucket_id = 'verification-docs' AND auth.role() = 'authenticated');
  END IF;
END $$;

-- 2. Native Event Registrations Table (Replacing Google Forms)
CREATE TABLE IF NOT EXISTS public.event_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    attendee_name VARCHAR(255) NOT NULL,
    attendee_email VARCHAR(255) NOT NULL,
    attendee_phone VARCHAR(50) NOT NULL,
    number_of_guests INT DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for event lookups
CREATE INDEX IF NOT EXISTS idx_event_registrations_event ON public.event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_user ON public.event_registrations(user_id);

-- RLS for event_registrations
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'event_registrations' AND policyname = 'Anyone can register for events') THEN
    CREATE POLICY "Anyone can register for events" ON public.event_registrations
    FOR INSERT WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'event_registrations' AND policyname = 'Event hosts and admins view registrations') THEN
    CREATE POLICY "Event hosts and admins view registrations" ON public.event_registrations
    FOR SELECT USING (
      auth.uid() = user_id 
      OR EXISTS (
        SELECT 1 FROM public.events WHERE events.id = event_registrations.event_id AND events.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.users_active WHERE users_active.id = auth.uid() AND users_active.role IN ('admin', 'superadmin')
      )
    );
  END IF;
END $$;

-- 3. Dedicated Organization Verification Table
CREATE TABLE IF NOT EXISTS public.organization_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(100),
    document_url TEXT NOT NULL,
    photo_url TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_verifications_user ON public.organization_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_org_verifications_status ON public.organization_verifications(status);

ALTER TABLE public.organization_verifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'organization_verifications' AND policyname = 'Users submit own org verification') THEN
    CREATE POLICY "Users submit own org verification" ON public.organization_verifications
    FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'organization_verifications' AND policyname = 'Users view own org verification') THEN
    CREATE POLICY "Users view own org verification" ON public.organization_verifications
    FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'organization_verifications' AND policyname = 'Admins manage all org verifications') THEN
    CREATE POLICY "Admins manage all org verifications" ON public.organization_verifications
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.users_active WHERE users_active.id = auth.uid() AND users_active.role IN ('admin', 'superadmin')
      )
    );
  END IF;
END $$;

-- 4. OLX-Style Classifieds Marketplace Table
CREATE TABLE IF NOT EXISTS public.classifieds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'Electronics', 'Vehicles', 'Furniture', 'Home Appliances', 'Fashion', 'Books & Hobbies', 'Free / Donation'
    price NUMERIC(10, 2) DEFAULT 0.00,
    is_free BOOLEAN DEFAULT FALSE,
    description TEXT NOT NULL,
    condition VARCHAR(50) DEFAULT 'Used', -- 'New', 'Like New', 'Used'
    images JSONB DEFAULT '[]'::JSONB, -- Array of image URLs
    location_city VARCHAR(100) NOT NULL,
    contact_phone VARCHAR(50) NOT NULL,
    contact_whatsapp VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'sold'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backward compatibility columns for existing classifieds records
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classifieds' AND column_name = 'is_free') THEN
    ALTER TABLE public.classifieds ADD COLUMN is_free BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classifieds' AND column_name = 'condition') THEN
    ALTER TABLE public.classifieds ADD COLUMN condition VARCHAR(50) DEFAULT 'Used';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classifieds' AND column_name = 'images') THEN
    ALTER TABLE public.classifieds ADD COLUMN images JSONB DEFAULT '[]'::JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classifieds' AND column_name = 'location_city') THEN
    ALTER TABLE public.classifieds ADD COLUMN location_city VARCHAR(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classifieds' AND column_name = 'contact_whatsapp') THEN
    ALTER TABLE public.classifieds ADD COLUMN contact_whatsapp VARCHAR(50);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_classifieds_status ON public.classifieds(status);
CREATE INDEX IF NOT EXISTS idx_classifieds_user ON public.classifieds(user_id);
CREATE INDEX IF NOT EXISTS idx_classifieds_category ON public.classifieds(category);

ALTER TABLE public.classifieds ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'classifieds' AND policyname = 'Public can view approved classifieds') THEN
    CREATE POLICY "Public can view approved classifieds" ON public.classifieds
    FOR SELECT USING (status = 'approved' OR auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'classifieds' AND policyname = 'Auth users can insert classifieds') THEN
    CREATE POLICY "Auth users can insert classifieds" ON public.classifieds
    FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'classifieds' AND policyname = 'Owners can update own classifieds') THEN
    CREATE POLICY "Owners can update own classifieds" ON public.classifieds
    FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 5. Dynamic Local Vendor / Directory Table
CREATE TABLE IF NOT EXISTS public.vendor_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    shop_name VARCHAR(255) NOT NULL,
    owner_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    whatsapp_number VARCHAR(50),
    street_address TEXT NOT NULL,
    landmark VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    store_image_url TEXT,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_listings_status ON public.vendor_listings(status);

ALTER TABLE public.vendor_listings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vendor_listings' AND policyname = 'Public can view approved vendor listings') THEN
    CREATE POLICY "Public can view approved vendor listings" ON public.vendor_listings
    FOR SELECT USING (status = 'approved' OR auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vendor_listings' AND policyname = 'Auth users can insert vendor listings') THEN
    CREATE POLICY "Auth users can insert vendor listings" ON public.vendor_listings
    FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
