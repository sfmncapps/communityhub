import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "https://fake.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "fake-key"
);

// In-memory fallback cache for environments where PostgREST schema cache has not yet refreshed
const memoryPages = new Map();

// Helper: Sanitize & validate page slug
export function sanitizePageSlug(raw) {
  if (!raw || typeof raw !== "string") return "";
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// Helper: Reserved slugs that shouldn't conflict with root application routes
const RESERVED_SLUGS = new Set([
  "admin",
  "login",
  "register",
  "dashboard",
  "manager",
  "events",
  "directory",
  "messages",
  "api",
  "overview",
  "edit",
  "delete",
]);

/**
 * GET /api/collectives/slug/:slug/pages
 * Public: Returns all published sub-pages for a collective by collective slug
 */
export async function getPublicCollectivePages(req, res) {
  try {
    const { slug } = req.params;
    if (!slug) {
      return res.status(400).json({ success: false, message: "Collective slug is required" });
    }

    // 1. Resolve collective ID from slug
    const { data: col, error: colErr } = await supabase
      .from("collectives")
      .select("id, name, slug")
      .eq("slug", slug.toLowerCase())
      .maybeSingle();

    if (colErr || !col) {
      return res.status(404).json({ success: false, message: "Collective not found" });
    }

    // 2. Fetch published pages
    try {
      const { data: pages, error: pageErr } = await supabase
        .from("collective_pages")
        .select("id, collective_id, page_slug, title, content, page_order, is_published, created_at, updated_at")
        .eq("collective_id", col.id)
        .eq("is_published", true)
        .order("page_order", { ascending: true });

      if (!pageErr && pages) {
        return res.json({
          success: true,
          collective: { id: col.id, name: col.name, slug: col.slug },
          pages,
        });
      }
    } catch (dbErr) {
      console.warn("DB collective_pages lookup failed, checking fallback cache:", dbErr.message);
    }

    // Fallback cache check
    const cached = Array.from(memoryPages.values())
      .filter((p) => p.collective_id === col.id && p.is_published)
      .sort((a, b) => (a.page_order || 0) - (b.page_order || 0));

    return res.json({
      success: true,
      collective: { id: col.id, name: col.name, slug: col.slug },
      pages: cached,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/collectives/slug/:slug/pages/:pageSlug
 * Public: Returns a single sub-page by collective slug and page slug
 */
export async function getPublicCollectivePageBySlug(req, res) {
  try {
    const { slug, pageSlug } = req.params;
    const cleanSlug = sanitizePageSlug(pageSlug);

    // 1. Resolve collective ID
    const { data: col, error: colErr } = await supabase
      .from("collectives")
      .select("id, name, slug")
      .eq("slug", slug.toLowerCase())
      .maybeSingle();

    if (colErr || !col) {
      return res.status(404).json({ success: false, message: "Collective not found" });
    }

    // 2. Query page
    try {
      const { data: page, error: pageErr } = await supabase
        .from("collective_pages")
        .select("*")
        .eq("collective_id", col.id)
        .eq("page_slug", cleanSlug)
        .eq("is_published", true)
        .maybeSingle();

      if (!pageErr && page) {
        return res.json({ success: true, page, collective: col });
      }
    } catch (dbErr) {
      console.warn("DB collective_page by slug lookup failed:", dbErr.message);
    }

    // Fallback cache check
    const cached = Array.from(memoryPages.values()).find(
      (p) => p.collective_id === col.id && p.page_slug === cleanSlug && p.is_published
    );

    if (cached) {
      return res.json({ success: true, page: cached, collective: col });
    }

    return res.status(404).json({ success: false, message: "Sub-page not found or not published" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/collectives/:id/pages
 * Manager: Lists all pages (both published and drafts) for an authorized collective
 */
export async function getCollectivePagesForManager(req, res) {
  try {
    const { id } = req.params;

    try {
      const { data: pages, error: pageErr } = await supabase
        .from("collective_pages")
        .select("*")
        .eq("collective_id", id)
        .order("page_order", { ascending: true });

      if (!pageErr && pages) {
        return res.json({ success: true, pages });
      }
    } catch (dbErr) {
      console.warn("Manager pages fetch failed, checking fallback:", dbErr.message);
    }

    const cached = Array.from(memoryPages.values())
      .filter((p) => p.collective_id === id)
      .sort((a, b) => (a.page_order || 0) - (b.page_order || 0));

    return res.json({ success: true, pages: cached });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/collectives/:id/pages
 * Manager: Creates a new sub-page for the collective
 */
export async function createCollectivePage(req, res) {
  try {
    const { id } = req.params;
    const { page_slug, title, content, page_order, is_published } = req.body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ success: false, message: "Page title is required" });
    }

    if (!page_slug || typeof page_slug !== "string") {
      return res.status(400).json({ success: false, message: "Page slug is required" });
    }

    const cleanSlug = sanitizePageSlug(page_slug);
    if (!cleanSlug || cleanSlug.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Page slug must be at least 2 alphanumeric characters",
      });
    }

    if (RESERVED_SLUGS.has(cleanSlug)) {
      return res.status(400).json({
        success: false,
        message: `'${cleanSlug}' is a reserved system route and cannot be used as a sub-page slug`,
      });
    }

    const newPage = {
      collective_id: id,
      page_slug: cleanSlug,
      title: title.trim(),
      content: typeof content === "string" ? content : "",
      page_order: Number.isInteger(Number(page_order)) ? Number(page_order) : 0,
      is_published: is_published !== false,
      updated_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase
        .from("collective_pages")
        .insert(newPage)
        .select()
        .single();

      if (!error && data) {
        memoryPages.set(data.id, data);
        return res.status(201).json({ success: true, page: data });
      }

      if (error && error.code === "23505") {
        return res.status(409).json({
          success: false,
          message: `A sub-page with slug '/${cleanSlug}' already exists for this collective`,
        });
      }
    } catch (dbErr) {
      console.warn("DB insert collective_pages error:", dbErr.message);
    }

    // Check duplicate in memory
    const existing = Array.from(memoryPages.values()).find(
      (p) => p.collective_id === id && p.page_slug === cleanSlug
    );
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `A sub-page with slug '/${cleanSlug}' already exists for this collective`,
      });
    }

    const syntheticId = `page_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const syntheticPage = {
      id: syntheticId,
      ...newPage,
      created_at: new Date().toISOString(),
    };
    memoryPages.set(syntheticId, syntheticPage);

    return res.status(201).json({ success: true, page: syntheticPage });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * PUT /api/collectives/:id/pages/:pageId
 * Manager: Updates an existing sub-page
 */
export async function updateCollectivePage(req, res) {
  try {
    const { id, pageId } = req.params;
    const { page_slug, title, content, page_order, is_published } = req.body;

    const updates = { updated_at: new Date().toISOString() };

    if (title !== undefined) {
      if (!title || typeof title !== "string" || !title.trim()) {
        return res.status(400).json({ success: false, message: "Page title cannot be empty" });
      }
      updates.title = title.trim();
    }

    if (page_slug !== undefined) {
      const cleanSlug = sanitizePageSlug(page_slug);
      if (!cleanSlug || cleanSlug.length < 2) {
        return res.status(400).json({
          success: false,
          message: "Page slug must be at least 2 alphanumeric characters",
        });
      }
      if (RESERVED_SLUGS.has(cleanSlug)) {
        return res.status(400).json({
          success: false,
          message: `'${cleanSlug}' is a reserved route and cannot be used as a sub-page slug`,
        });
      }
      updates.page_slug = cleanSlug;
    }

    if (content !== undefined) {
      updates.content = typeof content === "string" ? content : "";
    }

    if (page_order !== undefined) {
      updates.page_order = Number.isInteger(Number(page_order)) ? Number(page_order) : 0;
    }

    if (is_published !== undefined) {
      updates.is_published = Boolean(is_published);
    }

    try {
      const { data, error } = await supabase
        .from("collective_pages")
        .update(updates)
        .eq("id", pageId)
        .eq("collective_id", id)
        .select()
        .single();

      if (!error && data) {
        memoryPages.set(data.id, data);
        return res.json({ success: true, page: data });
      }
    } catch (dbErr) {
      console.warn("DB update collective_pages error:", dbErr.message);
    }

    // Fallback memory update
    const memPage = memoryPages.get(pageId);
    if (memPage && memPage.collective_id === id) {
      const updated = { ...memPage, ...updates };
      memoryPages.set(pageId, updated);
      return res.json({ success: true, page: updated });
    }

    return res.status(404).json({ success: false, message: "Collective sub-page not found" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * DELETE /api/collectives/:id/pages/:pageId
 * Manager: Deletes a sub-page
 */
export async function deleteCollectivePage(req, res) {
  try {
    const { id, pageId } = req.params;

    try {
      const { error } = await supabase
        .from("collective_pages")
        .delete()
        .eq("id", pageId)
        .eq("collective_id", id);

      if (!error) {
        memoryPages.delete(pageId);
        return res.json({ success: true, message: "Collective sub-page deleted successfully" });
      }
    } catch (dbErr) {
      console.warn("DB delete collective_pages error:", dbErr.message);
    }

    if (memoryPages.has(pageId)) {
      memoryPages.delete(pageId);
      return res.json({ success: true, message: "Collective sub-page deleted successfully" });
    }

    return res.status(404).json({ success: false, message: "Collective sub-page not found" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
