import express from "express";
import { listMine, createMine, updateMine, deleteMine } from "../controllers/myListingsController.js";
import { requireUser } from "../middleware/requireUser.js";

const router = express.Router();

router.get("/:resource", requireUser, listMine);
router.post("/:resource", requireUser, createMine);
router.put("/:resource/:id", requireUser, updateMine);
router.delete("/:resource/:id", requireUser, deleteMine);

export default router;