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

/**
 * POST /api/events/:id/register
 * Native attendee registration / RSVP for an event
 */
export const registerForEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { attendee_name, attendee_email, attendee_phone, number_of_guests = 1, notes } = req.body;

    if (!attendee_name || !attendee_name.trim()) {
      return res.status(400).json({ message: "Attendee name is required" });
    }
    if (!attendee_email || !attendee_email.trim()) {
      return res.status(400).json({ message: "Attendee email is required" });
    }
    if (!attendee_phone || !attendee_phone.trim()) {
      return res.status(400).json({ message: "Attendee phone number is required" });
    }

    // Verify event exists
    const { data: event, error: evErr } = await supabase
      .from("events")
      .select("id, title, status")
      .eq("id", id)
      .maybeSingle();

    if (evErr) return res.status(500).json({ message: evErr.message });
    if (!event) return res.status(404).json({ message: "Event not found" });

    const payload = {
      event_id: id,
      user_id: req.activeUser?.id || null,
      attendee_name: attendee_name.trim(),
      attendee_email: attendee_email.trim(),
      attendee_phone: attendee_phone.trim(),
      number_of_guests: parseInt(number_of_guests, 10) || 1,
      notes: notes ? notes.trim() : null,
    };

    const { data: registration, error: regErr } = await supabase
      .from("event_registrations")
      .insert([payload])
      .select()
      .single();

    if (regErr) {
      console.error("Event registration insertion error:", regErr);
      return res.status(500).json({ message: regErr.message });
    }

    return res.status(201).json({
      message: "Successfully registered for the event! 🎉",
      registration,
    });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

/**
 * GET /api/events/:id/registrations
 * Organizer & Admin view attendee registrations
 */
export const getEventRegistrations = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: event, error: evErr } = await supabase
      .from("events")
      .select("id, user_id, title")
      .eq("id", id)
      .maybeSingle();

    if (evErr) return res.status(500).json({ message: evErr.message });
    if (!event) return res.status(404).json({ message: "Event not found" });

    const activeUser = req.activeUser;
    const isAdmin = activeUser && ["admin", "superadmin"].includes((activeUser.role || "").toLowerCase());
    const isOwner = activeUser && activeUser.id === event.user_id;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: "Not authorized to view attendee registrations" });
    }

    const { data: registrations, error } = await supabase
      .from("event_registrations")
      .select("*")
      .eq("event_id", id)
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ message: error.message });

    const totalGuests = (registrations || []).reduce(
      (sum, r) => sum + (parseInt(r.number_of_guests, 10) || 1),
      0
    );

    return res.json({
      event_id: id,
      event_title: event.title,
      count: (registrations || []).length,
      total_guests: totalGuests,
      registrations: registrations || [],
    });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};
