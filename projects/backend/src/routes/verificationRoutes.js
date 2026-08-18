import express from "express";
import {
  submitVerification,
  getMyVerificationStatus,
  getPendingVerifications,
  reviewVerification,
} from "../controllers/verificationController.js";
import { requireUser } from "../middleware/requireUser.js";
import { requireRole } from "../middleware/requireRole.js";

const router = express.Router();

// User verification endpoints
router.post("/upload", requireUser, submitVerification);
router.get("/status", requireUser, getMyVerificationStatus);

// Admin / Superadmin verification endpoints
router.get("/pending", requireUser, requireRole(["admin", "superadmin"]), getPendingVerifications);
router.post("/:userId/review", requireUser, requireRole(["admin", "superadmin"]), reviewVerification);

export default router;
