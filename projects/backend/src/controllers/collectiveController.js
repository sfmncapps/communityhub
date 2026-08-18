import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper to format string into URL-friendly slug
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
};

// Ensure slug is unique by appending a random suffix if collision exists
const getUniqueSlug = async (baseName) => {
  let slug = slugify(baseName) || "collective";
  const { data } = await supabase
    .from("collectives")
    .select("slug")
    .eq("slug", slug)
    .maybeSingle();

  if (data) {
    slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
  }
  return slug;
};

// GET /api/collectives (Public/All)
// Supports search 'q' and alphabetical letter 'letter'
export const getCollectives = async (req, res) => {
  try {
    const { q, letter } = req.query;
    let query = supabase
      .from("collectives")
      .select(`
        *,
        owner:owner_id(id, name, email, company_name)
      `)
      .eq("status", "approved")
      .order("name", { ascending: true });

    if (letter && letter !== "All" && letter !== "#") {
      query = query.ilike("name", `${letter}%`);
    } else if (letter === "#") {
      // Names starting with numbers or special chars
      query = query.or("name.ilike.0%,name.ilike.1%,name.ilike.2%,name.ilike.3%,name.ilike.4%,name.ilike.5%,name.ilike.6%,name.ilike.7%,name.ilike.8%,name.ilike.9%");
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ message: error.message });

    let results = data || [];
    if (q) {
      const searchTerm = q.toLowerCase();
      results = results.filter(
        (c) =>
          c.name.toLowerCase().includes(searchTerm) ||
          c.description?.toLowerCase().includes(searchTerm) ||
          c.city?.toLowerCase().includes(searchTerm)
      );
    }

    return res.json({ collectives: results });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// GET /api/collectives/pending (Admin/Superadmin only)
export const getPendingCollectives = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("collectives")
      .select(`
        *,
        owner:owner_id(id, name, email)
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ message: error.message });
    return res.json({ collectives: data || [] });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// GET /api/collectives/slug/:slug
export const getCollectiveBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const { data: collective, error } = await supabase
      .from("collectives")
      .select(`
        *,
        owner:owner_id(id, name, email, phone, company_name, category)
      `)
      .eq("slug", slug)
      .maybeSingle();

    if (error) return res.status(500).json({ message: error.message });
    if (!collective) return res.status(404).json({ message: "Collective not found" });

    // Fetch members
    const { data: members } = await supabase
      .from("collective_members")
      .select(`
        id, role, joined_at,
        user:user_id(id, name, email, company_name, category)
      `)
      .eq("collective_id", collective.id);

    return res.json({
      collective: {
        ...collective,
        members: members || [],
      },
    });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// GET /api/collectives/:id
export const getCollectiveById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("collectives")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) return res.status(500).json({ message: error.message });
    if (!data) return res.status(404).json({ message: "Collective not found" });

    return res.json({ collective: data });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// POST /api/collectives
export const createCollective = async (req, res) => {
  try {
    const {
      name,
      description,
      logo_url,
      banner_url,
      partners,
      address,
      city,
      state,
      zip,
      website,
      contact_email,
      contact_phone,
    } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Collective name is required" });
    }

    const userRole = (req.activeUser.role || "user").toLowerCase();
    // Rule: Admins/Superadmins pre-approved, Users/Managers require approval ('pending')
    const initialStatus = ["admin", "superadmin"].includes(userRole) ? "approved" : "pending";

    const slug = await getUniqueSlug(name);

    const { data: newCollective, error } = await supabase
      .from("collectives")
      .insert([
        {
          name,
          slug,
          description: description || "",
          logo_url: logo_url || "",
          banner_url: banner_url || "",
          owner_id: req.activeUser.id,
          partners: Array.isArray(partners) ? partners : [],
          address: address || "",
          city: city || "",
          state: state || "",
          zip: zip || "",
          website: website || "",
          contact_email: contact_email || req.activeUser.email || "",
          contact_phone: contact_phone || req.activeUser.phone || "",
          status: initialStatus,
        },
      ])
      .select()
      .single();

    if (error) return res.status(500).json({ message: error.message });

    // Automatically add owner to collective_members
    await supabase.from("collective_members").insert([
      {
        collective_id: newCollective.id,
        user_id: req.activeUser.id,
        role: "owner",
      },
    ]);

    const msg =
      initialStatus === "approved"
        ? "Collective profile created and published successfully!"
        : "Collective profile submitted for Admin approval.";

    return res.status(201).json({ message: msg, collective: newCollective });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// PUT /api/collectives/:id
export const updateCollective = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: collective } = await supabase
      .from("collectives")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!collective) return res.status(404).json({ message: "Collective not found" });

    const userRole = (req.activeUser.role || "user").toLowerCase();
    const isOwner = collective.owner_id === req.activeUser.id;
    const isAdmin = ["admin", "superadmin"].includes(userRole);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized to edit this collective" });
    }

    const updates = { updated_at: new Date().toISOString() };
    const fields = [
      "name",
      "description",
      "logo_url",
      "banner_url",
      "partners",
      "address",
      "city",
      "state",
      "zip",
      "website",
      "contact_email",
      "contact_phone",
    ];

    for (const field of fields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    const { data: updated, error } = await supabase
      .from("collectives")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) return res.status(500).json({ message: error.message });
    return res.json({ message: "Collective updated successfully", collective: updated });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// POST /api/collectives/:id/approve
export const approveCollective = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("collectives")
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) return res.status(500).json({ message: error.message });
    return res.json({ message: "Collective approved", collective: data });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// POST /api/collectives/:id/reject
export const rejectCollective = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("collectives")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) return res.status(500).json({ message: error.message });
    return res.json({ message: "Collective rejected", collective: data });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// DELETE /api/collectives/:id
export const deleteCollective = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: collective } = await supabase
      .from("collectives")
      .select("owner_id")
      .eq("id", id)
      .maybeSingle();

    if (!collective) return res.status(404).json({ message: "Collective not found" });

    const userRole = (req.activeUser.role || "user").toLowerCase();
    if (collective.owner_id !== req.activeUser.id && !["admin", "superadmin"].includes(userRole)) {
      return res.status(403).json({ message: "Not authorized to delete this collective" });
    }

    await supabase.from("collectives").delete().eq("id", id);
    return res.json({ message: "Collective deleted" });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// POST /api/collectives/:id/members
export const addCollectiveMember = async (req, res) => {
  try {
    const { id: collective_id } = req.params;
    const { user_id, role = "member" } = req.body;

    if (!user_id) return res.status(400).json({ message: "user_id is required" });

    const { data: member, error } = await supabase
      .from("collective_members")
      .insert([{ collective_id, user_id, role }])
      .select()
      .single();

    if (error) return res.status(500).json({ message: error.message });
    return res.status(201).json({ message: "Member added", member });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// DELETE /api/collectives/:id/members/:userId
export const removeCollectiveMember = async (req, res) => {
  try {
    const { id: collective_id, userId } = req.params;

    const { error } = await supabase
      .from("collective_members")
      .delete()
      .eq("collective_id", collective_id)
      .eq("user_id", userId);

    if (error) return res.status(500).json({ message: error.message });
    return res.json({ message: "Member removed" });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};
