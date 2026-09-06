import express from "express";
import {
  getPublicEvents,
  getEventById,
  createEvent,
} from "../controllers/eventController.js";
import { requireUser } from "../middleware/requireUser.js";

const router = express.Router();

// Public routes
router.get("/", getPublicEvents);
router.get("/:id", getEventById);

// Authenticated route
router.post("/", requireUser, createEvent);

export default router;
