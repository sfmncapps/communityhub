import express from "express";
import { listMine, createMine, deleteMine } from "../controllers/myListingsController.js";
import { requireUser } from "../middleware/requireUser.js";

const router = express.Router();

router.get("/:resource", requireUser, listMine);
router.post("/:resource", requireUser, createMine);
router.delete("/:resource/:id", requireUser, deleteMine);

export default router;