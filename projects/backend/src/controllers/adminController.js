import { createClient } from "@supabase/supabase-js";
import { sendEmailOtp, sendSmsOtp, sendWhatsAppOtp } from "../utils/notify.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const sendApproval = async (req, res) => {
  const { id, role = "user" } = req.body;

  try {
    const { data: pendingUser, error: fetchErr } = await supabase
      .from("users_pending")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !pendingUser) {
      return res.status(404).json({ message: "Pending user not found" });
    }

    const { error: insertErr } = await supabase
      .from("users_active")
      .insert([
        {
          auth_id: pendingUser.auth_id,
          username: pendingUser.username,
          name: pendingUser.name,
          email: pendingUser.email,
          phone: pendingUser.phone,
          whatsapp: pendingUser.whatsapp,
          company_name: pendingUser.company_name,
          category: pendingUser.category,
          company_address: pendingUser.company_address,
          password: pendingUser.password,
          login_method: pendingUser.login_method,
          role: role || pendingUser.role || "user",
          verification_status: "unverified",
        },
      ]);

    if (insertErr) {
      return res.status(500).json({ message: insertErr.message });
    }

    await supabase.from("users_pending").delete().eq("id", id);

    const msg = `✅ Your account has been approved as role '${role}'. You can login now.`;

    if (pendingUser.login_method === "email" && pendingUser.email) {
      await sendEmailOtp(pendingUser.email, msg);
    }
    if (pendingUser.login_method === "phone" && pendingUser.phone) {
      await sendSmsOtp(pendingUser.phone, msg);
    }
    if (pendingUser.login_method === "whatsapp" && pendingUser.whatsapp) {
      await sendWhatsAppOtp(pendingUser.whatsapp, msg);
    }

    return res.json({ message: "User approved successfully" });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

export const getPendingUsers = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users_pending")
      .select("*")
      .eq("approved", false)
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ message: error.message });
    return res.json({ users: data || [] });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// GET /api/admin/users (List all active users)
export const getAllUsers = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users_active")
      .select("id, username, name, email, phone, company_name, category, role, verification_status, created_at")
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ message: error.message });
    return res.json({ users: data || [] });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// PUT /api/admin/users/:id/role (Superadmin ONLY update user role)
export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const callerRole = (req.activeUser.role || "").toLowerCase();
    if (callerRole !== "superadmin") {
      return res.status(403).json({ message: "Access denied. Only superadmin can modify user roles." });
    }

    // Condition 3: Prevent Superadmin from accidentally modifying their own role to avoid lockout
    if (id === req.activeUser.id) {
      return res.status(400).json({
        message: "Superadmins cannot modify their own role to prevent leaving the platform without a root account.",
      });
    }

    const validRoles = ["superadmin", "admin", "manager", "user"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: `Role must be one of: ${validRoles.join(", ")}` });
    }

    const { data: updated, error } = await supabase
      .from("users_active")
      .update({ role })
      .eq("id", id)
      .select("id, name, email, role")
      .single();

    if (error) return res.status(500).json({ message: error.message });
    return res.json({ message: "User role updated successfully", user: updated });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// GET /api/admin/stats (Dashboard statistics for admin panel)
export const getAdminStats = async (req, res) => {
  try {
    const { count: activeUsers } = await supabase
      .from("users_active")
      .select("*", { count: "exact", head: true });

    const { count: pendingUsers } = await supabase
      .from("users_pending")
      .select("*", { count: "exact", head: true });

    const { count: jobs } = await supabase
      .from("jobs")
      .select("*", { count: "exact", head: true });

    const { count: directory } = await supabase
      .from("directory_listings")
      .select("*", { count: "exact", head: true });

    const { count: classifieds } = await supabase
      .from("classifieds")
      .select("*", { count: "exact", head: true });

    let eventsCount = 0;
    let pendingEventsCount = 0;
    try {
      const { count } = await supabase.from("events").select("*", { count: "exact", head: true });
      eventsCount = count || 0;
      const { count: pendingCount } = await supabase.from("events").select("*", { count: "exact", head: true }).eq("status", "pending");
      pendingEventsCount = pendingCount || 0;
    } catch {
      // Table may be empty
    }

    return res.json({
      users: (activeUsers || 0) + (pendingUsers || 0),
      active_users: activeUsers || 0,
      pending_users: pendingUsers || 0,
      jobs: jobs || 0,
      directory: directory || 0,
      classifieds: classifieds || 0,
      events: eventsCount,
      pending_events: pendingEventsCount,
    });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// GET /api/admin/events (Admin & Superadmin: list events with status filter)
export const getAdminEvents = async (req, res) => {
  try {
    const { status = "all", q } = req.query;

    let query = supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status.toLowerCase());
    }

    const { data, error } = await query;
    if (error) {
      return res.status(200).json({ events: [] });
    }

    let results = data || [];
    if (q && q.trim()) {
      const term = q.trim().toLowerCase();
      results = results.filter(
        (ev) =>
          (ev.title || "").toLowerCase().includes(term) ||
          (ev.venue_name || "").toLowerCase().includes(term) ||
          (ev.organizer_name || "").toLowerCase().includes(term) ||
          (ev.city || "").toLowerCase().includes(term)
      );
    }

    return res.json({ events: results });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// PUT /api/admin/events/:id/status (Admin & Superadmin: approve/reject event)
export const updateEventStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["pending", "approved", "rejected", "completed", "cancelled"];
    if (!status || !validStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(", ")}` });
    }

    const { data, error } = await supabase
      .from("events")
      .update({ status: status.toLowerCase(), updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) return res.status(500).json({ message: error.message });
    return res.json({ message: `Event status updated to ${status}`, event: data });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// DELETE /api/admin/events/:id (Admin & Superadmin: delete event)
export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", id);

    if (error) return res.status(500).json({ message: error.message });
    return res.json({ message: "Event deleted successfully" });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};