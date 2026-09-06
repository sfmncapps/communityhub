import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Middleware: requireCollectiveManager
 *
 * Verifies that the authenticated user is authorized to manage the specified collective.
 * - Platform 'superadmin' and 'admin' have oversight.
 * - 'manager' must satisfy:
 *     1. Primary: collectives.owner_id === req.activeUser.id
 *     2. Secondary: collective_members.role === 'owner' for this collective
 *     (Normal members or non-owners are strictly blocked)
 * - 'user' is blocked with 403.
 *
 * Attaches req.collective for downstream controllers.
 */
export const requireCollectiveManager = async (req, res, next) => {
  try {
    if (!req.activeUser) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const collectiveId =
      req.params.id ||
      req.params.collectiveId ||
      req.body.collective_id;

    if (!collectiveId) {
      return res.status(400).json({ message: "Collective ID is required" });
    }

    // 1. Fetch the collective to inspect owner
    const { data: collective, error: colErr } = await supabase
      .from("collectives")
      .select("*")
      .eq("id", collectiveId)
      .maybeSingle();

    if (colErr) {
      return res.status(500).json({ message: colErr.message });
    }

    if (!collective) {
      return res.status(404).json({ message: "Collective not found" });
    }

    const userRole = (req.activeUser.role || "user").toLowerCase();

    // 2. Superadmin and Admin have platform-level oversight
    if (["superadmin", "admin"].includes(userRole)) {
      req.collective = collective;
      return next();
    }

    // 3. Manager authorization check
    if (userRole === "manager") {
      // Primary check: collective owner
      if (collective.owner_id === req.activeUser.id) {
        req.collective = collective;
        return next();
      }

      // Secondary check: collective_members record with role = 'owner'
      try {
        const { data: memberRow, error: memberErr } = await supabase
          .from("collective_members")
          .select("role")
          .eq("collective_id", collectiveId)
          .eq("user_id", req.activeUser.id)
          .eq("role", "owner")
          .maybeSingle();

        if (!memberErr && memberRow) {
          req.collective = collective;
          return next();
        }
      } catch (err) {
        // Handle gracefully if table is not yet migrated
      }

      return res.status(403).json({
        message: "Access denied. You do not have management permissions for this collective.",
      });
    }

    // 4. Any other role (e.g. 'user') is rejected
    return res.status(403).json({
      message: "Access denied. Only authorized collective managers can perform this action.",
    });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};
