import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { readStore, insertRecord, updateRecord, deleteRecord } from "../db/localStore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper to normalize directory listing into vendor format
const normalizeVendor = (item) => {
  if (!item) return null;
  return {
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
    updated_at: item.updated_at || item.created_at || new Date().toISOString(),
  };
};

/**
 * GET /api/vendors
 * Public listing of approved local community shops & vendors
 */
export const getPublicVendors = async (req, res) => {
  try {
    const { q, category, city } = req.query;

    let dbVendors = [];

    // 1. Fetch from Supabase directory_listings (approved)
    try {
      let query = supabase
        .from("directory_listings")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (category && category !== "All") {
        query = query.eq("category", category);
      }
      if (city && city !== "All") {
        query = query.ilike("city", `%${city}%`);
      }

      const { data, error } = await query;
      if (!error && data) {
        dbVendors.push(...data.map(normalizeVendor));
      }
    } catch {
      // ignore
    }

    // 2. Fetch from Supabase vendor_listings (if table exists and approved)
    try {
      let query = supabase
        .from("vendor_listings")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (category && category !== "All") {
        query = query.eq("category", category);
      }
      if (city && city !== "All") {
        query = query.ilike("city", `%${city}%`);
      }

      const { data, error } = await query;
      if (!error && data) {
        dbVendors.push(...data.map(normalizeVendor));
      }
    } catch {
      // Table may not yet be created in Supabase
    }

    // 3. Fetch from persistent local store (approved only)
    const localVendors = readStore("vendor_listings.json")
      .filter((v) => v.status === "approved")
      .map(normalizeVendor);

    // Merge & deduplicate by ID or shop_name
    const combined = [...dbVendors];
    const seenIds = new Set(combined.map((v) => String(v.id)));
    const seenNames = new Set(combined.map((v) => (v.shop_name || "").toLowerCase()));

    for (const v of localVendors) {
      if (!seenIds.has(String(v.id)) && !seenNames.has((v.shop_name || "").toLowerCase())) {
        if (!category || category === "All" || v.category === category) {
          if (!city || city === "All" || (v.city || "").toLowerCase().includes(city.toLowerCase())) {
            combined.push(v);
            seenIds.add(String(v.id));
            seenNames.add((v.shop_name || "").toLowerCase());
          }
        }
      }
    }

    // Search query filter
    let results = combined;
    if (q && q.trim()) {
      const term = q.trim().toLowerCase();
      results = results.filter(
        (v) =>
          (v.shop_name || "").toLowerCase().includes(term) ||
          (v.owner_name || "").toLowerCase().includes(term) ||
          (v.description || "").toLowerCase().includes(term) ||
          (v.category || "").toLowerCase().includes(term) ||
          (v.city || "").toLowerCase().includes(term) ||
          (v.landmark || "").toLowerCase().includes(term)
      );
    }

    return res.json({ vendors: results, total: results.length });
  } catch (err) {
    return res.status(500).json({ message: err.message, vendors: [] });
  }
};

/**
 * POST /api/vendors
 * Submit a local community vendor or shop listing (enters as pending approval)
 */
export const createVendorListing = async (req, res) => {
  try {
    const {
      shop_name,
      owner_name,
      category,
      phone_number,
      whatsapp_number,
      email,
      street_address,
      landmark,
      city,
      state,
      postal_code,
      store_image_url,
      description,
    } = req.body;

    // Required validations
    if (!shop_name || !shop_name.trim()) {
      return res.status(400).json({ message: "Shop Name is required" });
    }
    if (!owner_name || !owner_name.trim()) {
      return res.status(400).json({ message: "Owner Name is required" });
    }
    if (!category || !category.trim()) {
      return res.status(400).json({ message: "Business Category is required" });
    }
    if (!phone_number || !phone_number.trim()) {
      return res.status(400).json({ message: "Contact Phone Number is required" });
    }
    if (!street_address || !street_address.trim()) {
      return res.status(400).json({ message: "Street Address is required" });
    }
    if (!city || !city.trim()) {
      return res.status(400).json({ message: "City is required" });
    }

    const userId = req.activeUser?.id || null;

    const payload = {
      user_id: userId,
      shop_name: shop_name.trim(),
      owner_name: owner_name.trim(),
      category: category.trim(),
      phone_number: phone_number.trim(),
      whatsapp_number: whatsapp_number ? whatsapp_number.trim() : null,
      email: email ? email.trim() : null,
      street_address: street_address.trim(),
      landmark: landmark ? landmark.trim() : null,
      city: city.trim(),
      state: state ? state.trim() : "Texas",
      postal_code: postal_code ? postal_code.trim() : null,
      store_image_url: store_image_url || null,
      description: description ? description.trim() : null,
      status: "pending", // Mandated: requires admin approval before public visibility
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let newListing = null;

    // 1. Insert into Supabase directory_listings (guaranteed existing table)
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
        newListing = normalizeVendor({ ...payload, ...dirData });
      }
    } catch (e) {
      console.warn("directory_listings insert notice:", e.message);
    }

    // 2. Also try Supabase vendor_listings if table exists
    try {
      const { data: vData, error: vErr } = await supabase
        .from("vendor_listings")
        .insert([payload])
        .select()
        .single();

      if (!vErr && vData && !newListing) {
        newListing = vData;
      }
    } catch {
      // Table may not yet be provisioned
    }

    // 3. Always persist to local store (ensuring 100% data preservation)
    const localRecord = insertRecord("vendor_listings.json", newListing || payload);

    return res.status(201).json({
      message: "Shop listing submitted successfully! It is pending administrator approval before appearing in the public directory.",
      listing: newListing || localRecord,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/vendors/upload-image
 * Upload storefront photo (to Supabase 'vendor-media' or local fallback)
 */
export const uploadVendorImage = async (req, res) => {
  try {
    const { fileName, fileData, fileType } = req.body;

    if (!fileName || !fileData) {
      return res.status(400).json({ message: "fileName and fileData (base64) are required" });
    }

    const cleanBase64 = fileData.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");

    const safeName = `storefronts/${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, "")}`;

    // Try Supabase Storage upload
    try {
      const { error: supaErr } = await supabase.storage
        .from("vendor-media")
        .upload(safeName, buffer, {
          contentType: fileType || "image/jpeg",
          upsert: true,
        });

      if (!supaErr) {
        const { data: pubData } = supabase.storage.from("vendor-media").getPublicUrl(safeName);
        return res.json({ url: pubData?.publicUrl || safeName, path: safeName });
      }
    } catch (e) {
      console.warn("Supabase vendor-media upload notice:", e.message);
    }

    // Fallback: save to backend static directory
    const uploadDir = path.resolve(__dirname, "../../uploads/vendors");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const localFileName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, "")}`;
    fs.writeFileSync(path.join(uploadDir, localFileName), buffer);

    const host = req.get("host") || "localhost:5000";
    const protocol = req.protocol || "http";
    const localUrl = `${protocol}://${host}/uploads/vendors/${localFileName}`;

    return res.json({ url: localUrl, path: `/uploads/vendors/${localFileName}` });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
