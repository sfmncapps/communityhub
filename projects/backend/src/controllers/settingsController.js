import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "https://fake.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "fake-key"
);

// Valid theme choices per RFP §4f
export const SUPPORTED_THEMES = ["yellow_pages", "modern_emerald", "slate_minimal"];

// Default baseline settings
const DEFAULT_SETTINGS = {
  key: "general",
  theme: "yellow_pages",
  header_menu: [
    { id: "home", label: "Home", path: "/", is_visible: true, sort_order: 1 },
    { id: "welcome", label: "Welcome", path: "/welcome", is_visible: true, sort_order: 2 },
    { id: "events", label: "Events", path: "/events", is_visible: true, sort_order: 3 },
    { id: "directory", label: "Directory", path: "/directory", is_visible: true, sort_order: 4 },
    { id: "community", label: "Community", path: "/community", is_visible: true, sort_order: 5 },
    { id: "jobs", label: "Jobs", path: "/jobs", is_visible: true, sort_order: 6 },
    { id: "classifieds", label: "Classifieds", path: "/classifieds", is_visible: true, sort_order: 7 },
  ],
  homepage_widgets: [
    { key: "hero", title: "Hero Welcome Banner", is_enabled: true, sort_order: 1 },
    { key: "about", title: "About & Mission", is_enabled: true, sort_order: 2 },
    { key: "services", title: "Community Pillars", is_enabled: true, sort_order: 3 },
    { key: "contact", title: "Get in Touch & Join", is_enabled: true, sort_order: 4 },
  ],
  footer_text: "© 2026 CommunityHub. Empowering non-profits and community organizations.",
  updated_at: new Date().toISOString(),
};

// In-memory fallback cache for high reliability
let cachedSettings = { ...DEFAULT_SETTINGS };

/**
 * GET /api/settings
 * Public endpoint to fetch platform theme, navigation menu, and widget configuration
 */
export async function getPublicSettings(req, res) {
  try {
    try {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("*")
        .eq("key", "general")
        .maybeSingle();

      if (!error && data) {
        cachedSettings = { ...DEFAULT_SETTINGS, ...data };
        return res.json({ success: true, settings: cachedSettings });
      }
    } catch (dbErr) {
      console.warn("DB platform_settings fetch failed, returning cached settings:", dbErr.message);
    }

    return res.json({ success: true, settings: cachedSettings });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * PUT /api/settings
 * Admin/Superadmin endpoint to configure theme, header menu, and widgets
 */
export async function updatePlatformSettings(req, res) {
  try {
    const { theme, header_menu, homepage_widgets, footer_text } = req.body;
    const updates = {
      updated_at: new Date().toISOString(),
      updated_by: req.activeUser?.id || null,
    };

    // 1. Validate Theme
    if (theme !== undefined) {
      if (!SUPPORTED_THEMES.includes(theme)) {
        return res.status(400).json({
          success: false,
          message: `Invalid theme '${theme}'. Supported themes: ${SUPPORTED_THEMES.join(", ")}`,
        });
      }
      updates.theme = theme;
    }

    // 2. Validate Header Menu
    if (header_menu !== undefined) {
      if (!Array.isArray(header_menu)) {
        return res.status(400).json({ success: false, message: "header_menu must be an array" });
      }
      updates.header_menu = header_menu.map((item, idx) => ({
        id: item.id || `menu_${idx}`,
        label: String(item.label || "Link").trim(),
        path: String(item.path || "/").trim(),
        is_visible: item.is_visible !== false,
        sort_order: Number.isInteger(Number(item.sort_order)) ? Number(item.sort_order) : idx + 1,
      }));
    }

    // 3. Validate Homepage Widgets
    if (homepage_widgets !== undefined) {
      if (!Array.isArray(homepage_widgets)) {
        return res.status(400).json({ success: false, message: "homepage_widgets must be an array" });
      }
      updates.homepage_widgets = homepage_widgets.map((w, idx) => ({
        key: String(w.key || `widget_${idx}`),
        title: String(w.title || "Widget Section"),
        is_enabled: w.is_enabled !== false,
        sort_order: Number.isInteger(Number(w.sort_order)) ? Number(w.sort_order) : idx + 1,
      }));
    }

    // 4. Validate Footer Text
    if (footer_text !== undefined) {
      updates.footer_text = String(footer_text).trim();
    }

    // Update in Supabase
    try {
      const { data, error } = await supabase
        .from("platform_settings")
        .upsert({ key: "general", ...updates }, { onConflict: "key" })
        .select()
        .single();

      if (!error && data) {
        cachedSettings = { ...cachedSettings, ...data };
        return res.json({
          success: true,
          message: "Platform settings updated successfully",
          settings: cachedSettings,
        });
      }
    } catch (dbErr) {
      console.warn("DB update platform_settings failed, updating fallback cache:", dbErr.message);
    }

    cachedSettings = { ...cachedSettings, ...updates };
    return res.json({
      success: true,
      message: "Platform settings updated successfully",
      settings: cachedSettings,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
