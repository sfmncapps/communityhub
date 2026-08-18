import express from "express";
import {
  getCollectives,
  getPendingCollectives,
  getCollectiveBySlug,
  getCollectiveById,
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

const router = express.Router();

// Public routes
router.get("/", getCollectives);
router.get("/slug/:slug", getCollectiveBySlug);
router.get("/:id", getCollectiveById);

// Protected routes (Logged in users)
router.post("/", requireUser, createCollective);
router.put("/:id", requireUser, updateCollective);
router.delete("/:id", requireUser, deleteCollective);

// Member management
router.post("/:id/members", requireUser, addCollectiveMember);
router.delete("/:id/members/:userId", requireUser, removeCollectiveMember);

// Admin / Superadmin routes
router.get("/admin/pending", requireUser, requireRole(["admin", "superadmin"]), getPendingCollectives);
router.post("/:id/approve", requireUser, requireRole(["admin", "superadmin"]), approveCollective);
router.post("/:id/reject", requireUser, requireRole(["admin", "superadmin"]), rejectCollective);

export default router;
