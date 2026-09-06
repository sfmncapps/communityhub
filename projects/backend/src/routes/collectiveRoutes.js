import express from "express";
import {
  getCollectives,
  getPendingCollectives,
  getCollectiveBySlug,
  getCollectiveById,
  getMyManagedCollectives,
  createCollective,
  updateCollective,
  approveCollective,
  rejectCollective,
  deleteCollective,
  addCollectiveMember,
  removeCollectiveMember,
} from "../controllers/collectiveController.js";
import { requireUser } from "../middleware/requireUser.js";
import { requireRole } from "../middleware/requireRole.js";
import { requireCollectiveManager } from "../middleware/requireCollectiveManager.js";

const router = express.Router();

// Public routes
router.get("/", getCollectives);
router.get("/slug/:slug", getCollectiveBySlug);

// Manager specific: Get assigned collectives for the logged-in manager
router.get(
  "/manager/managed",
  requireUser,
  requireRole(["manager", "admin", "superadmin"]),
  getMyManagedCollectives
);

router.get("/:id", getCollectiveById);

// Protected routes (Create collective: logged in users)
router.post("/", requireUser, createCollective);

// Manager protected routes for a specific collective (Strict backend ownership verified)
router.put("/:id", requireUser, requireCollectiveManager, updateCollective);
router.delete("/:id", requireUser, requireCollectiveManager, deleteCollective);

// Member management (Strict backend ownership verified)
router.post("/:id/members", requireUser, requireCollectiveManager, addCollectiveMember);
router.delete("/:id/members/:userId", requireUser, requireCollectiveManager, removeCollectiveMember);

// Admin / Superadmin routes
router.get("/admin/pending", requireUser, requireRole(["admin", "superadmin"], { strict: true }), getPendingCollectives);
router.post("/:id/approve", requireUser, requireRole(["admin", "superadmin"], { strict: true }), approveCollective);
router.post("/:id/reject", requireUser, requireRole(["admin", "superadmin"], { strict: true }), rejectCollective);

export default router;
