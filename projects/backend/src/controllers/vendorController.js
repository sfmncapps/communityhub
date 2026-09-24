import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// In-memory store fallback if Supabase table is not yet created
export const memoryVendors = [];


/**
 * GET /api/vendors
 * Public listing of approved local community shops & vendors
 */
export const getPublicVendors = async (req, res) => {
  try {
    const { q, category, city } = req.query;

    let dbVendors = [];
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
      if (!error && data && data.length > 0) {
        dbVendors = data;
      }
    } catch {
      // Table may not yet be created in Supabase
    }

    // Merge DB results with approved sample memory vendors if needed
    let combined = [...dbVendors];
    const existingNames = new Set(combined.map((v) => (v.shop_name || "").toLowerCase()));

    for (const mem of memoryVendors) {
      if (mem.status === "approved" && !existingNames.has((mem.shop_name || "").toLowerCase())) {
        if (!category || category === "All" || mem.category === category) {
          if (!city || city === "All" || (mem.city || "").toLowerCase().includes(city.toLowerCase())) {
            combined.push(mem);
          }
        }
      }
    }

    // Search query filter
    if (q && q.trim()) {
      const term = q.trim().toLowerCase();
      combined = combined.filter(
        (v) =>
          (v.shop_name || "").toLowerCase().includes(term) ||
          (v.owner_name || "").toLowerCase().includes(term) ||
          (v.description || "").toLowerCase().includes(term) ||
          (v.category || "").toLowerCase().includes(term) ||
          (v.city || "").toLowerCase().includes(term) ||
          (v.landmark || "").toLowerCase().includes(term)
      );
    }

    return res.json({ vendors: combined, total: combined.length });
  } catch (err) {
    return res.status(500).json({ message: err.message, vendors: memoryVendors });
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

    let saved = false;
    let newListing = null;

    try {
      const { data, error } = await supabase
        .from("vendor_listings")
        .insert([payload])
        .select()
        .single();

      if (!error && data) {
        saved = true;
        newListing = data;
      }
    } catch {
      // Table may not yet be provisioned
    }

    if (!saved) {
      newListing = {
        ...payload,
        id: `vendor_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      };
      memoryVendors.unshift(newListing);
    }

    return res.status(201).json({
      message: "Shop listing submitted successfully! It is pending administrator approval before appearing in the public directory.",
      listing: newListing,
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
