import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Format validators
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9\s\-()]{7,25}$/;

/**
 * GET /api/events
 * Public directory of approved events with search, category & date filters
 */
export const getPublicEvents = async (req, res) => {
  try {
    const { q, category, timing } = req.query;

    const todayStr = new Date().toISOString().split("T")[0];

    let query = supabase
      .from("events")
      .select("*")
      .eq("status", "approved");

    // Timing filter
    if (timing === "past") {
      query = query.lt("event_date", todayStr).order("event_date", { ascending: false });
    } else if (timing === "today") {
      query = query.eq("event_date", todayStr).order("event_time", { ascending: true });
    } else if (timing === "all") {
      query = query.order("event_date", { ascending: false });
    } else {
      // Default: 'upcoming' (today or future)
      query = query.gte("event_date", todayStr).order("event_date", { ascending: true });
    }

    // Category filter
    if (category && category !== "All" && category.trim()) {
      query = query.eq("category", category.trim());
    }

    const { data, error } = await query;
    if (error) {
      // If table is empty or error occurs, return empty array gracefully
      return res.status(200).json({ events: [] });
    }

    let results = data || [];

    // Search query
    if (q && q.trim()) {
      const term = q.trim().toLowerCase();
      results = results.filter(
        (ev) =>
          (ev.title || "").toLowerCase().includes(term) ||
          (ev.description || "").toLowerCase().includes(term) ||
          (ev.venue_name || "").toLowerCase().includes(term) ||
          (ev.city || "").toLowerCase().includes(term) ||
          (ev.organizer_name || "").toLowerCase().includes(term)
      );
    }

    return res.json({ events: results });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

/**
 * GET /api/events/:id
 * Public event details
 */
export const getEventById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: event, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) return res.status(500).json({ message: error.message });
    if (!event) return res.status(404).json({ message: "Event not found" });

    // If event is not approved, only organizer or platform admin can view it
    if (event.status !== "approved") {
      const activeUser = req.activeUser;
      const isAdmin = activeUser && ["admin", "superadmin"].includes((activeUser.role || "").toLowerCase());
      const isOwner = activeUser && activeUser.id === event.user_id;

      if (!isAdmin && !isOwner) {
        return res.status(403).json({ message: "This event is currently pending approval" });
      }
    }

    return res.json({ event });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

/**
 * POST /api/events
 * Create new event (authenticated user or manager)
 */
export const createEvent = async (req, res) => {
  try {
    const {
      title,
      category,
      subcategory,
      description,
      organizer_name,
      organizer_phone,
      organizer_email,
      event_date,
      event_time,
      end_date,
      end_time,
      venue_name,
      address,
      city,
      state,
      zip_code,
      registration_link,
      ticket_price,
      entry_type = "Free",
      banner_url,
    } = req.body;

    // Required Validations
    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Event title is required" });
    }
    if (title.trim().length > 255) {
      return res.status(400).json({ message: "Event title cannot exceed 255 characters" });
    }
    if (!category || !category.trim()) {
      return res.status(400).json({ message: "Category is required" });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ message: "Event description is required" });
    }
    if (!event_date) {
      return res.status(400).json({ message: "Event date is required" });
    }
    if (!event_time) {
      return res.status(400).json({ message: "Event start time is required" });
    }
    if (!venue_name || !venue_name.trim()) {
      return res.status(400).json({ message: "Venue name is required" });
    }
    if (!city || !city.trim()) {
      return res.status(400).json({ message: "City is required" });
    }
    if (!state || !state.trim()) {
      return res.status(400).json({ message: "State is required" });
    }

    // Format Validations
    if (organizer_email && !EMAIL_REGEX.test(organizer_email.trim())) {
      return res.status(400).json({ message: "Invalid organizer email format" });
    }
    if (organizer_phone && !PHONE_REGEX.test(organizer_phone.trim())) {
      return res.status(400).json({ message: "Invalid organizer phone format" });
    }
    if (zip_code && zip_code.trim().length > 20) {
      return res.status(400).json({ message: "ZIP code cannot exceed 20 characters" });
    }

    const userRole = (req.activeUser.role || "user").toLowerCase();
    const initialStatus = ["admin", "superadmin"].includes(userRole) ? "approved" : "pending";

    const payload = {
      user_id: req.activeUser.id,
      title: title.trim(),
      category: category.trim(),
      subcategory: subcategory ? subcategory.trim() : null,
      description: description.trim(),
      organizer_name: organizer_name ? organizer_name.trim() : (req.activeUser.name || ""),
      organizer_phone: organizer_phone ? organizer_phone.trim() : (req.activeUser.phone || ""),
      organizer_email: organizer_email ? organizer_email.trim() : (req.activeUser.email || ""),
      event_date,
      event_time,
      end_date: end_date || null,
      end_time: end_time || null,
      venue_name: venue_name.trim(),
      address: address ? address.trim() : "",
      city: city.trim(),
      state: state.trim(),
      zip_code: zip_code ? zip_code.trim() : "",
      registration_link: registration_link ? registration_link.trim() : "",
      ticket_price: entry_type === "Paid" ? ticket_price : null,
      entry_type: entry_type === "Paid" ? "Paid" : "Free",
      banner_url: banner_url || "",
      status: initialStatus,
    };

    const { data: newEvent, error } = await supabase
      .from("events")
      .insert([payload])
      .select()
      .single();

    if (error) return res.status(500).json({ message: error.message });

    const message =
      initialStatus === "approved"
        ? "Event created and published successfully!"
        : "Event submitted successfully. It is pending admin approval.";

    return res.status(201).json({ message, event: newEvent });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};
