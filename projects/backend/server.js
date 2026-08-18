import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, ".env") });

import authRoutes from "./src/routes/authRoutes.js";
import adminRoutes from "./src/routes/adminRoutes.js";
import myListingsRoutes from "./src/routes/myListingsRoutes.js";
import collectiveRoutes from "./src/routes/collectiveRoutes.js";
import verificationRoutes from "./src/routes/verificationRoutes.js";
import messageRoutes from "./src/routes/messageRoutes.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "API is running", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/my", myListingsRoutes);
app.use("/api/collectives", collectiveRoutes);
app.use("/api/verification", verificationRoutes);
app.use("/api/messages", messageRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log("SMTP_USER:", process.env.SMTP_USER || "Not set");
});