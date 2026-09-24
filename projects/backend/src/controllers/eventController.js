import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Format validators
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9\s\-()]{7,25}$/;
export const GOOGLE_FORM_REGEX = /^(https?:\/\/)?(forms\.gle\/[a-zA-Z0-9_-]+|(docs|drive)\.google\.com\/forms\/[^\s]+)/i;

export const isGoogleFormUrl = (url) => {
  if (!url) return false;
  return GOOGLE_FORM_REGEX.test(url.trim());
};

export const isEventConcluded = (ev) => {
  if (!ev || !ev.event_date) return false;
  try {
    const datePart = ev.end_date || ev.event_date;
    const timePart = ev.end_time || ev.event_time || "23:59:59";
    const parsedTime = timePart.length === 5 ? `${timePart}:00` : timePart;
    const eventEnd = new Date(`${datePart}T${parsedTime}`);
    if (isNaN(eventEnd.getTime())) {
      return new Date(datePart).setHours(23, 59, 59, 999) < Date.now();
    }
    return eventEnd.getTime() < Date.now();
  } catch {
    return false;
  }
};

/**
 * GET /api/events
 * Public directory of approved events with search, category & date filters
 */
export const getPublicEvents = async (req, res) => {
  try {
    const { q, category, timing } = req.query;

    let query = supabase
      .from("events")
      .select("*")
      .eq("status", "approved");

    // Category filter
    if (category && category !== "All" && category.trim()) {
      query = query.eq("category", category.trim());
    }

    const { data, error } = await query;
    if (error) {
      // If table is empty or error occurs, return empty array gracefully
      return res.status(200).json({ events: [] });
    }

    let results = (data || []).map((ev) => ({
      ...ev,
      is_concluded: isEventConcluded(ev),
    }));

    // Timing filter
    if (timing === "past" || timing === "previous") {
      results = results
        .filter((ev) => ev.is_concluded)
        .sort((a, b) => new Date(b.event_date) - new Date(a.event_date));
    } else if (timing === "today") {
      const todayStr = new Date().toISOString().split("T")[0];
      results = results
        .filter((ev) => (ev.end_date || ev.event_date) === todayStr && !ev.is_concluded)
        .sort((a, b) => (a.event_time || "").localeCompare(b.event_time || ""));
    } else if (timing === "all") {
      results = results.sort((a, b) => new Date(b.event_date) - new Date(a.event_date));
    } else {
      // Default: 'upcoming' (events whose end time has not yet passed)
      results = results
        .filter((ev) => !ev.is_concluded)
        .sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
    }

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

    if (!registration_link || !registration_link.trim()) {
      return res.status(400).json({ message: "A Google Form registration link is required for hosting an event." });
    }
    if (!isGoogleFormUrl(registration_link.trim())) {
      return res.status(400).json({
        message: "Registration link must be a valid Google Form link (e.g. https://forms.gle/... or https://docs.google.com/forms/...)",
      });
    }

    // Every submitted event enters as status = 'pending' and requires Admin approval
    const initialStatus = "pending";

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

    if (error) {
      console.error("Event insertion error in eventController:", error);
      return res.status(500).json({
        message:
          error.code === "42501"
            ? "Database Permission Error: Supabase 'events' table blocked insertion due to Row Level Security (RLS). Please run the SQL policy in Supabase SQL Editor or update SUPABASE_SERVICE_ROLE_KEY in backend/.env."
            : error.message,
      });
    }

    const message = "Event submitted successfully. It is pending administrator approval before appearing publicly.";

    return res.status(201).json({ message, event: newEvent });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};
