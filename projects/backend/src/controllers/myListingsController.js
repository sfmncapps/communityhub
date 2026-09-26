import { createClient } from "@supabase/supabase-js";
import { readStore, insertRecord, updateRecord, deleteRecord as deleteLocalRecord } from "../db/localStore.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const RESOURCES = {
  jobs: ["job_title", "job_description", "job_type", "location", "apply_link"],
  vendor_listings: [
    "shop_name", "owner_name", "category", "phone_number", "whatsapp_number",
    "email", "street_address", "landmark", "city", "state", "postal_code",
    "store_image_url", "description",
  ],
  directory_listings: [
    "business_name", "category", "sub_category", "year_established",
    "business_type", "owner_name", "mobile", "email", "website",
    "address", "city", "state", "zip", "description", "services",
    "price_range", "working_days", "open_time", "close_time",
    "facebook", "instagram", "linkedin", "experience", "business_image_url",
  ],
  classifieds: [
    "category", "sub_category", "title", "description", "price", "is_free",
    "condition", "images", "city", "location_city", "zip_code", "region",
    "state", "contact_name", "contact_phone", "contact_email",
    "contact_whatsapp", "media_type", "youtube_url", "image_name",
    "media_url", "media_path",
  ],
  events: [
    "title", "category", "subcategory", "description", "organizer_name",
    "organizer_phone", "organizer_email", "event_date", "event_time",
    "end_date", "end_time", "venue_name", "address", "city", "state",
    "zip_code", "registration_link", "ticket_price", "entry_type", "banner_url",
  ],
};

const DEFAULT_STATUS = { jobs: "pending", vendor_listings: "pending", directory_listings: "pending", classifieds: "pending", events: "pending" };

const normalizeVendorItem = (item) => ({
  id: item.id,
  user_id: item.user_id,
  shop_name: item.shop_name || item.business_name || "Community Business",
  owner_name: item.owner_name || "",
  category: item.category || "General",
  phone_number: item.phone_number || item.mobile || "",
  whatsapp_number: item.whatsapp_number || "",
  email: item.email || "",
  street_address: item.street_address || item.address || "",
  landmark: item.landmark || "",
  city: item.city || "",
  state: item.state || "",
  postal_code: item.postal_code || item.zip || "",
  store_image_url: item.store_image_url || item.business_image_url || "",
  description: item.description || "",
  status: item.status || "pending",
  created_at: item.created_at || new Date().toISOString(),
});

export const listMine = async (req, res) => {
  const { resource } = req.params;
  if (!RESOURCES[resource]) return res.status(400).json({ message: "Unknown resource" });

  const userId = req.activeUser.id;

  if (resource === "vendor_listings") {
    let combined = [];
    const seenIds = new Set();

    // 1. Check directory_listings in Supabase
    try {
      const { data } = await supabase
        .from("directory_listings")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (data) {
        for (const item of data) {
          const norm = normalizeVendorItem(item);
          combined.push(norm);
          seenIds.add(String(norm.id));
        }
      }
    } catch {}

    // 2. Check vendor_listings in Supabase (if table exists)
    try {
      const { data } = await supabase
        .from("vendor_listings")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (data) {
        for (const item of data) {
          const norm = normalizeVendorItem(item);
          if (!seenIds.has(String(norm.id))) {
            combined.push(norm);
            seenIds.add(String(norm.id));
          }
        }
      }
    } catch {}

    // 3. Check vendor_listings.json
    const local = readStore("vendor_listings.json").filter(
      (v) => String(v.user_id) === String(userId)
    );
    for (const item of local) {
      const norm = normalizeVendorItem(item);
      if (!seenIds.has(String(norm.id))) {
        combined.push(norm);
        seenIds.add(String(norm.id));
      }
    }

    combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return res.json({ items: combined });
  }

  // Standard resource listing
  try {
    const { data, error } = await supabase
      .from(resource)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      // Fallback to local store for resource
      const local = readStore(`${resource}.json`).filter((r) => String(r.user_id) === String(userId));
      return res.json({ items: local });
    }

    return res.json({ items: data || [] });
  } catch (err) {
    const local = readStore(`${resource}.json`).filter((r) => String(r.user_id) === String(userId));
    return res.json({ items: local });
  }
};

export const createMine = async (req, res) => {
  const { resource } = req.params;
  const allowedFields = RESOURCES[resource];
  if (!allowedFields) return res.status(400).json({ message: "Unknown resource" });

  const userId = req.activeUser.id;
  const payload = { user_id: userId, status: DEFAULT_STATUS[resource] };
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) payload[field] = req.body[field];
  }

  if (resource === "vendor_listings") {
    let savedItem = null;

    // 1. Insert into directory_listings (guaranteed existing table)
    try {
      const dirPayload = {
        user_id: userId,
        business_name: payload.shop_name,
        owner_name: payload.owner_name,
        category: payload.category,
        mobile: payload.phone_number,
        email: payload.email,
        address: payload.street_address,
        city: payload.city,
        state: payload.state,
        zip: payload.postal_code,
        description: payload.description,
        business_image_url: payload.store_image_url,
        status: "pending",
      };

      const { data: dirData, error: dirErr } = await supabase
        .from("directory_listings")
        .insert([dirPayload])
        .select()
        .single();

      if (!dirErr && dirData) {
        savedItem = normalizeVendorItem({ ...payload, ...dirData });
      }
    } catch (e) {
      console.warn("createMine directory_listings fallback:", e.message);
    }

    // 2. Also try vendor_listings table
    try {
      const { data: vData, error: vErr } = await supabase
        .from("vendor_listings")
        .insert([payload])
        .select()
        .single();

      if (!vErr && vData && !savedItem) {
        savedItem = normalizeVendorItem(vData);
      }
    } catch {}

    // 3. Always persist to local store
    const localRecord = insertRecord("vendor_listings.json", savedItem || payload);

    return res.json({ message: "Submitted for approval", item: savedItem || localRecord });
  }

  // If company_name or experience was passed for jobs, ensure it is recorded in description
  if (resource === "jobs" && (req.body.company_name || req.body.experience)) {
    const headerParts = [];
    if (req.body.company_name) headerParts.push(`Company: ${req.body.company_name.trim()}`);
    if (req.body.experience) headerParts.push(`Experience: ${req.body.experience.trim()}`);
    const header = headerParts.join(" | ");
    if (payload.job_description && !payload.job_description.includes(header)) {
      payload.job_description = `${header}\n\n${payload.job_description}`;
    }
  }

  if (resource === "classifieds") {
    if (payload.location_city && !payload.city) payload.city = payload.location_city;
    if (payload.city && !payload.location_city) payload.location_city = payload.city;
    if (payload.condition && !payload.description?.includes(payload.condition)) {
      payload.description = `[Condition: ${payload.condition}] ${payload.description || ""}`.trim();
    }
    if (payload.images && Array.isArray(payload.images) && payload.images.length > 0 && !payload.media_url) {
      payload.media_url = payload.images[0];
    }
    if (!payload.media_type) payload.media_type = "image";
  }

  const supaPayload = { ...payload };
  if (resource === "classifieds") {
    delete supaPayload.condition;
    delete supaPayload.is_free;
    delete supaPayload.images;
    delete supaPayload.location_city;
  }

  let data = null;
  try {
    const res = await supabase.from(resource).insert([supaPayload]).select().maybeSingle();
    if (!res.error && res.data) data = res.data;
    else if (res.error) console.warn(`Supabase ${resource} insert warning:`, res.error.message);
  } catch (err) {
    console.warn(`Supabase ${resource} insert error:`, err.message);
  }

  const localRecord = insertRecord(`${resource}.json`, { ...payload, ...(data || {}) });

  return res.json({ message: "Submitted for approval", item: data || localRecord });
};

export const updateMine = async (req, res) => {
  const { resource, id } = req.params;
  const allowedFields = RESOURCES[resource];
  if (!allowedFields) return res.status(400).json({ message: "Unknown resource" });

  const payload = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) payload[field] = req.body[field];
  }

  if (resource === "vendor_listings") {
    const dirUpdates = {};
    if (payload.shop_name) dirUpdates.business_name = payload.shop_name;
    if (payload.owner_name) dirUpdates.owner_name = payload.owner_name;
    if (payload.category) dirUpdates.category = payload.category;
    if (payload.phone_number) dirUpdates.mobile = payload.phone_number;
    if (payload.email) dirUpdates.email = payload.email;
    if (payload.street_address) dirUpdates.address = payload.street_address;
    if (payload.city) dirUpdates.city = payload.city;
    if (payload.state) dirUpdates.state = payload.state;
    if (payload.postal_code) dirUpdates.zip = payload.postal_code;
    if (payload.description) dirUpdates.description = payload.description;
    if (payload.store_image_url) dirUpdates.business_image_url = payload.store_image_url;

    try {
      await supabase.from("directory_listings").update(dirUpdates).eq("id", id).eq("user_id", req.activeUser.id);
    } catch {}

    try {
      await supabase.from("vendor_listings").update(payload).eq("id", id).eq("user_id", req.activeUser.id);
    } catch {}

    updateRecord("vendor_listings.json", id, payload);
    return res.json({ message: "Updated successfully", item: { id, ...payload } });
  }

  if (resource === "classifieds") {
    if (payload.location_city && !payload.city) payload.city = payload.location_city;
    if (payload.city && !payload.location_city) payload.location_city = payload.city;
    if (req.body.status === "sold") payload.status = "sold";
  }

  try {
    const { data } = await supabase
      .from(resource)
      .update(payload)
      .eq("id", id)
      .eq("user_id", req.activeUser.id)
      .select()
      .single();

    updateRecord(`${resource}.json`, id, payload);
    return res.json({ message: "Updated successfully", item: data || { id, ...payload } });
  } catch (error) {
    updateRecord(`${resource}.json`, id, payload);
    return res.json({ message: "Updated successfully", item: { id, ...payload } });
  }
};

export const deleteMine = async (req, res) => {
  const { resource, id } = req.params;
  if (!RESOURCES[resource]) return res.status(400).json({ message: "Unknown resource" });

  if (resource === "vendor_listings") {
    try {
      await supabase.from("directory_listings").delete().eq("id", id).eq("user_id", req.activeUser.id);
    } catch {}
    try {
      await supabase.from("vendor_listings").delete().eq("id", id).eq("user_id", req.activeUser.id);
    } catch {}
    deleteLocalRecord("vendor_listings.json", id);
    return res.json({ message: "Deleted" });
  }

  try {
    await supabase.from(resource).delete().eq("id", id).eq("user_id", req.activeUser.id);
  } catch {}
  deleteLocalRecord(`${resource}.json`, id);

  return res.json({ message: "Deleted" });
};