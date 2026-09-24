-- ==============================================================================
-- CommunityHub v2.0 — Jobs Upgrade, Vendor Directory & Applications Migration
-- Execute this complete script in your Supabase SQL Editor.
-- ==============================================================================

-- 1. Create Storage Bucket for Resumes with restricted access
INSERT INTO storage.buckets (id, name, public) 
VALUES ('resumes', 'resumes', false) 
ON CONFLICT (id) DO NOTHING;

-- 2. Storage Bucket for Vendor / Shop storefront images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('vendor-media', 'vendor-media', true) 
ON CONFLICT (id) DO NOTHING;

-- Storage policies for resumes: authenticated users can upload; job posters & admins can view
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Authenticated users can upload resumes'
  ) THEN
    CREATE POLICY "Authenticated users can upload resumes" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'resumes' AND auth.role() = 'authenticated');
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Employers and Admins can view resumes'
  ) THEN
    CREATE POLICY "Employers and Admins can view resumes" ON storage.objects
    FOR SELECT USING (bucket_id = 'resumes' AND auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Public can view vendor media'
  ) THEN
    CREATE POLICY "Public can view vendor media" ON storage.objects
    FOR SELECT USING (bucket_id = 'vendor-media');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Authenticated users can upload vendor media'
  ) THEN
    CREATE POLICY "Authenticated users can upload vendor media" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'vendor-media' AND auth.role() = 'authenticated');
  END IF;
END $$;

-- 3. Job Applications Table
CREATE TABLE IF NOT EXISTS public.job_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    applicant_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    applicant_name VARCHAR(255) NOT NULL,
    applicant_email VARCHAR(255) NOT NULL,
    applicant_phone VARCHAR(50) NOT NULL,
    current_experience VARCHAR(50),
    portfolio_url TEXT,
    cover_note TEXT,
    resume_url TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'submitted', -- 'submitted', 'reviewed', 'shortlisted', 'rejected'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security for job_applications
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'job_applications' AND policyname = 'Applicants can insert their own application'
  ) THEN
    CREATE POLICY "Applicants can insert their own application" ON public.job_applications
    FOR INSERT WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'job_applications' AND policyname = 'Employers and Admins can view job applications'
  ) THEN
    CREATE POLICY "Employers and Admins can view job applications" ON public.job_applications
    FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'job_applications' AND policyname = 'Employers and Admins can update application status'
  ) THEN
    CREATE POLICY "Employers and Admins can update application status" ON public.job_applications
    FOR UPDATE USING (true);
  END IF;
END $$;

-- 4. Ensure Directory / Local Vendors Table supports community submissions
CREATE TABLE IF NOT EXISTS public.vendor_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    shop_name VARCHAR(255) NOT NULL,
    owner_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- e.g., 'Groceries', 'Food & Snacks', 'Electronics & Repair', 'Services', 'Retail'
    phone_number VARCHAR(50) NOT NULL,
    whatsapp_number VARCHAR(50),
    email VARCHAR(255),
    street_address TEXT NOT NULL,
    landmark VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20),
    store_image_url TEXT,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security for vendor_listings
ALTER TABLE public.vendor_listings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'vendor_listings' AND policyname = 'Public can view approved vendors'
  ) THEN
    CREATE POLICY "Public can view approved vendors" ON public.vendor_listings
    FOR SELECT USING (status = 'approved');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'vendor_listings' AND policyname = 'Users can insert vendor listings'
  ) THEN
    CREATE POLICY "Users can insert vendor listings" ON public.vendor_listings
    FOR INSERT WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'vendor_listings' AND policyname = 'Owners and Admins can update vendor listings'
  ) THEN
    CREATE POLICY "Owners and Admins can update vendor listings" ON public.vendor_listings
    FOR ALL USING (true);
  END IF;
END $$;

-- 5. Add status index for rapid filtering across all modules
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_vendors_status ON public.vendor_listings(status);
CREATE INDEX IF NOT EXISTS idx_job_applications_job_id ON public.job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_applicant ON public.job_applications(applicant_id);
