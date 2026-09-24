import express from "express";
import {
  submitOrganizationVerification,
  getMyOrganizationVerification,
  getPendingOrganizationVerifications,
  reviewOrganizationVerification,
  uploadVerificationDoc,
  submitVerification,
  getMyVerificationStatus,
  getPendingVerifications,
  reviewVerification,
} from "../controllers/verificationController.js";
import { requireUser } from "../middleware/requireUser.js";
import { requireRole } from "../middleware/requireRole.js";

const router = express.Router();

// Document / Media Upload
router.post("/upload-doc", requireUser, uploadVerificationDoc);

// Dedicated Organization Verification
router.post("/organization", requireUser, submitOrganizationVerification);
router.get("/organization/status", requireUser, getMyOrganizationVerification);
router.get("/organization/pending", requireUser, requireRole(["admin", "superadmin"]), getPendingOrganizationVerifications);
router.post("/organization/:id/review", requireUser, requireRole(["admin", "superadmin"]), reviewOrganizationVerification);
router.put("/organization/:id/review", requireUser, requireRole(["admin", "superadmin"]), reviewOrganizationVerification);

// Legacy aliases
router.post("/upload", requireUser, submitVerification);
router.get("/status", requireUser, getMyVerificationStatus);
router.get("/pending", requireUser, requireRole(["admin", "superadmin"]), getPendingVerifications);
router.post("/:userId/review", requireUser, requireRole(["admin", "superadmin"]), reviewVerification);

export default router;
