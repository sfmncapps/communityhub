-- ========================================================
-- STEP 1: Directory / Collectives Table & Seed Sample Data
-- ========================================================

-- Table for Collectives & Businesses
CREATE TABLE IF NOT EXISTS public.collectives (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    type TEXT DEFAULT 'business', -- 'business', 'org', 'family'
    category TEXT,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'India',
    description TEXT,
    phone TEXT,
    website TEXT,
    logo_url TEXT,
    banner_url TEXT,
    partners JSONB DEFAULT '[]'::jsonb,
    address TEXT,
    zip TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    owner_id UUID,
    status TEXT DEFAULT 'approved', -- 'pending', 'approved', 'rejected'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Index for fast slug lookup and status filtering
CREATE INDEX IF NOT EXISTS idx_collectives_slug ON public.collectives(slug);
CREATE INDEX IF NOT EXISTS idx_collectives_status ON public.collectives(status);

-- Public Read RLS Policy
ALTER TABLE public.collectives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view approved collectives" ON public.collectives;
CREATE POLICY "Public can view approved collectives" 
ON public.collectives FOR SELECT 
TO anon, authenticated 
USING (status = 'approved');

-- Allow authenticated users to insert/update their own collectives
DROP POLICY IF EXISTS "Authenticated users can create collectives" ON public.collectives;
CREATE POLICY "Authenticated users can create collectives" 
ON public.collectives FOR INSERT 
TO authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can manage owned collectives" ON public.collectives;
CREATE POLICY "Authenticated users can manage owned collectives" 
ON public.collectives FOR ALL 
TO authenticated 
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);


-- Insert Sample Data for Directory and A-Z index testing
INSERT INTO public.collectives (name, slug, type, category, city, state, country, description)
VALUES 
('Apollo Tech', 'apollotech', 'business', 'IT Services', 'Hyderabad', 'Telangana', 'India', 'Cloud & AI Solutions'),
('Bombay Sweets', 'bombaysweets', 'business', 'Food & Dining', 'Mumbai', 'Maharashtra', 'India', 'Traditional sweets and catering'),
('Care India NGO', 'careindia', 'org', 'Non-Profit', 'Delhi', 'Delhi', 'India', 'Community welfare services')
ON CONFLICT (slug) DO NOTHING;


-- ========================================================
-- STEP 2: ID / DL Document Verification Storage & Table
-- ========================================================

-- Storage Bucket Policy for id-documents (Bucket: 'id-documents' created via Supabase Storage Dashboard)
-- Ensure id-documents bucket exists in Storage
INSERT INTO storage.buckets (id, name, public) 
VALUES ('id-documents', 'id-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload their own ID" ON storage.objects;
CREATE POLICY "Users can upload their own ID"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'id-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can view their own ID" ON storage.objects;
CREATE POLICY "Users can view their own ID"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'id-documents' AND auth.uid()::text = (storage.foldername(name))[1]);


-- Verification Status Table
CREATE TABLE IF NOT EXISTS public.id_verifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    document_url TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.id_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view and submit their own verification" ON public.id_verifications;
CREATE POLICY "Users can view and submit their own verification"
ON public.id_verifications FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view and review all verifications" ON public.id_verifications;
CREATE POLICY "Admins can view and review all verifications"
ON public.id_verifications FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
