import express from "express";
import {
  getConversations,
  createConversation,
  getMessages,
  postMessage,
  getRecipients,
  sendBroadcastMessage,
} from "../controllers/messageController.js";
import { requireUser } from "../middleware/requireUser.js";

const router = express.Router();

router.use(requireUser);

router.get("/recipients", getRecipients);
router.post("/broadcast", sendBroadcastMessage);
router.get("/conversations", getConversations);
router.post("/conversations", createConversation);
router.get("/conversations/:id", getMessages);
router.post("/conversations/:id", postMessage);

export default router;
