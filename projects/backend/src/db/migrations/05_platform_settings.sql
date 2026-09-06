-- Migration: 05_platform_settings.sql
-- Description: Platform Settings, Theming, Menu, and Widget Architecture (RFP §3b, §4f)
-- Supports dynamic themes ('yellow_pages', 'modern_emerald', 'slate_minimal'),
-- menu configuration, and homepage widget arrangements.

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

-- Seed initial general settings if not present
INSERT INTO platform_settings (key, theme)
VALUES ('general', 'yellow_pages')
ON CONFLICT (key) DO NOTHING;

-- RLS policies
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
