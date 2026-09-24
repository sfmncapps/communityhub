import express from "express";
import {
  getPublicEvents,
  getEventById,
  createEvent,
  registerForEvent,
  getEventRegistrations,
} from "../controllers/eventController.js";
import { requireUser, optionalUser } from "../middleware/requireUser.js";

const router = express.Router();

// Public routes
router.get("/", getPublicEvents);
router.get("/:id", optionalUser, getEventById);

// Native event registration / RSVP (supports guests and logged-in members)
router.post("/:id/register", optionalUser, registerForEvent);

// Organizer & Admin view attendees
router.get("/:id/registrations", requireUser, getEventRegistrations);

// Authenticated route to host an event
router.post("/", requireUser, createEvent);

export default router;
