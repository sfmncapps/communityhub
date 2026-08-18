import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const RESOURCES = {
  jobs: ["job_title", "job_description", "job_type", "location", "apply_link"],
  directory_listings: [
    "business_name", "category", "sub_category", "year_established",
    "business_type", "owner_name", "mobile", "email", "website",
    "address", "city", "state", "zip", "description", "services",
    "price_range", "working_days", "open_time", "close_time",
    "facebook", "instagram", "linkedin", "experience", "business_image_url",
  ],
  classifieds: [
    "category", "sub_category", "title", "description", "price", "city",
    "zip_code", "region", "state", "contact_name", "contact_phone",
    "contact_email", "contact_whatsapp", "media_type", "youtube_url",
    "image_name", "media_url", "media_path",
  ],
  events: [
    "title", "category", "subcategory", "description", "organizer_name",
    "organizer_phone", "organizer_email", "event_date", "event_time",
    "end_date", "end_time", "venue_name", "address", "city", "state",
    "zip_code", "registration_link", "ticket_price", "entry_type", "banner_url",
  ],
};

const DEFAULT_STATUS = { jobs: "pending", directory_listings: "pending", classifieds: "pending", events: "pending" };

export const listMine = async (req, res) => {
  const { resource } = req.params;
  if (!RESOURCES[resource]) return res.status(400).json({ message: "Unknown resource" });

  const { data, error } = await supabase
    .from(resource)
    .select("*")
    .eq("user_id", req.activeUser.id)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ message: error.message });
  return res.json({ items: data || [] });
};

export const createMine = async (req, res) => {
  const { resource } = req.params;
  const allowedFields = RESOURCES[resource];
  if (!allowedFields) return res.status(400).json({ message: "Unknown resource" });

  const payload = { user_id: req.activeUser.id, status: DEFAULT_STATUS[resource] };
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) payload[field] = req.body[field];
  }

  const { data, error } = await supabase
    .from(resource)
    .insert([payload])
    .select()
    .single();

  if (error) return res.status(500).json({ message: error.message });
  return res.json({ message: "Submitted for approval", item: data });
};

export const deleteMine = async (req, res) => {
  const { resource, id } = req.params;
  if (!RESOURCES[resource]) return res.status(400).json({ message: "Unknown resource" });

  const { error } = await supabase
    .from(resource)
    .delete()
    .eq("id", id)
    .eq("user_id", req.activeUser.id);

  if (error) return res.status(500).json({ message: error.message });
  return res.json({ message: "Deleted" });
};