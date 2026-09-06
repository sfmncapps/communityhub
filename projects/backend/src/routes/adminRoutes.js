import express from "express";
import {
  sendApproval,
  getPendingUsers,
  getAllUsers,
  updateUserRole,
  getAdminStats,
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

// Only superadmin can promote/demote roles; admins get 403
router.put("/users/:id/role", requireExactRole(["superadmin"]), updateUserRole);

export default router;