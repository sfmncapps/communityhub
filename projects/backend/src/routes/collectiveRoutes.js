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
  verifyCollectiveStateRecord,
  getCollectiveVerification,
  addCollectiveMember,
  removeCollectiveMember,
} from "../controllers/collectiveController.js";
import {
  getPublicCollectivePages,
  getPublicCollectivePageBySlug,
  getCollectivePagesForManager,
  createCollectivePage,
  updateCollectivePage,
  deleteCollectivePage,
} from "../controllers/collectivePageController.js";
import { requireUser } from "../middleware/requireUser.js";
import { requireRole } from "../middleware/requireRole.js";
import { requireCollectiveManager } from "../middleware/requireCollectiveManager.js";

const router = express.Router();

// Public routes
router.get("/", getCollectives);
router.get("/slug/:slug", getCollectiveBySlug);
router.get("/slug/:slug/pages", getPublicCollectivePages);
router.get("/slug/:slug/pages/:pageSlug", getPublicCollectivePageBySlug);

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

// Sub-page hierarchy management (Strict backend ownership verified)
router.get("/:id/pages", requireUser, requireCollectiveManager, getCollectivePagesForManager);
router.post("/:id/pages", requireUser, requireCollectiveManager, createCollectivePage);
router.put("/:id/pages/:pageId", requireUser, requireCollectiveManager, updateCollectivePage);
router.delete("/:id/pages/:pageId", requireUser, requireCollectiveManager, deleteCollectivePage);

// Admin / Superadmin routes (Strict RBAC: Managers blocked)
router.get("/admin/pending", requireUser, requireRole(["admin", "superadmin"], { strict: true }), getPendingCollectives);
router.post("/:id/approve", requireUser, requireRole(["admin", "superadmin"], { strict: true }), approveCollective);
router.post("/:id/reject", requireUser, requireRole(["admin", "superadmin"], { strict: true }), rejectCollective);
router.post("/:id/verify-state", requireUser, requireRole(["admin", "superadmin"], { strict: true }), verifyCollectiveStateRecord);
router.get("/:id/verification", requireUser, requireRole(["admin", "superadmin"], { strict: true }), getCollectiveVerification);

export default router;
