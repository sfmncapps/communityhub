import express from "express";
import {
  getPublicSettings,
  updatePlatformSettings,
} from "../controllers/settingsController.js";
import { requireUser } from "../middleware/requireUser.js";
import { requireRole } from "../middleware/requireRole.js";

const router = express.Router();

// Public: Fetch theme, navigation menus, and homepage widgets
router.get("/", getPublicSettings);

// Admin & Superadmin only: Update platform appearance and configuration
router.put(
  "/",
  requireUser,
  requireRole(["admin", "superadmin"], { strict: true }),
  updatePlatformSettings
);

export default router;
