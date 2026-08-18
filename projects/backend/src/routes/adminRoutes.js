import express from "express";
import {
  sendApproval,
  getPendingUsers,
  getAllUsers,
  updateUserRole,
} from "../controllers/adminController.js";
import { requireUser } from "../middleware/requireUser.js";
import { requireRole } from "../middleware/requireRole.js";

const router = express.Router();

router.use(requireUser);
router.use(requireRole(["admin", "superadmin"]));

router.get("/pending-users", getPendingUsers);
router.post("/approve-user", sendApproval);
router.get("/users", getAllUsers);
router.put("/users/:id/role", requireRole(["superadmin"]), updateUserRole);

export default router;