import express from "express";
import {
  getPublicJobs,
  applyToJob,
  getJobApplicants,
  getMyJobApplicantCounts,
  updateApplicationStatus,
  uploadResume,
  downloadApplicantResume,
} from "../controllers/jobController.js";
import { requireUser, optionalUser } from "../middleware/requireUser.js";

const router = express.Router();

// Public Job Listings (only approved)
router.get("/", getPublicJobs);

// Upload resume file
router.post("/upload-resume", uploadResume);

// Download applicant resume (direct file download)
router.get("/applications/:id/resume/download", downloadApplicantResume);

// Apply to a job (native application with resume)
router.post("/:id/apply", optionalUser, applyToJob);

// Employer: Get applicants for their job
router.get("/:id/applications", requireUser, getJobApplicants);

// Employer: Get summary of applicant counts per job
router.get("/my/applications-counts", requireUser, getMyJobApplicantCounts);

// Employer or Admin: Update application status
router.put("/applications/:id/status", requireUser, updateApplicationStatus);

export default router;
