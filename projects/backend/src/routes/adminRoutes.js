import express from "express";
import {
  sendApproval,
  getPendingUsers,
  getAllUsers,
  updateUserRole,
  getAdminStats,
  getAdminEvents,
  updateEventStatus,
  deleteEvent,
  getAdminJobs,
  updateJobStatus,
  deleteJob,
  getAdminVendors,
  updateVendorStatus,
  deleteVendor,
  getAdminClassifieds,
  updateClassifiedStatus,
  deleteClassified,
} from "../controllers/adminController.js";
import { requireUser } from "../middleware/requireUser.js";
import { requireRole, requireExactRole } from "../middleware/requireRole.js";

const router = express.Router();

router.use(requireUser);
// Global admin routes are strictly limited to admin and superadmin (managers are blocked)
router.use(requireRole(["admin", "superadmin"], { strict: true }));

router.get("/stats", getAdminStats);
router.get("/pending-users", getPendingUsers);
router.post("/approve-user", sendApproval);
router.get("/users", getAllUsers);

// Events Moderation
router.get("/events", getAdminEvents);
router.put("/events/:id/status", updateEventStatus);
router.delete("/events/:id", deleteEvent);

// Jobs Moderation
router.get("/jobs", getAdminJobs);
router.put("/jobs/:id/status", updateJobStatus);
router.delete("/jobs/:id", deleteJob);

// Local Vendor & Community Shop Moderation
router.get("/vendors", getAdminVendors);
router.put("/vendors/:id/status", updateVendorStatus);
router.delete("/vendors/:id", deleteVendor);

// Classifieds Moderation
router.get("/classifieds", getAdminClassifieds);
router.put("/classifieds/:id/status", updateClassifiedStatus);
router.delete("/classifieds/:id", deleteClassified);

// Only superadmin can promote/demote roles; admins get 403
router.put("/users/:id/role", requireExactRole(["superadmin"]), updateUserRole);

export default router;