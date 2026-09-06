import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, ".env") });

import authRoutes from "./src/routes/authRoutes.js";
import adminRoutes from "./src/routes/adminRoutes.js";
import myListingsRoutes from "./src/routes/myListingsRoutes.js";
import collectiveRoutes from "./src/routes/collectiveRoutes.js";
import verificationRoutes from "./src/routes/verificationRoutes.js";
import messageRoutes from "./src/routes/messageRoutes.js";
import eventRoutes from "./src/routes/eventRoutes.js";
import settingsRoutes from "./src/routes/settingsRoutes.js";
import { authLimiter, apiLimiter } from "./src/middleware/rateLimiter.js";

const app = express();

// Security Hardening (RFP §8): Disable tech fingerprinting
app.disable("x-powered-by");

// Standard Security HTTP Headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// Production-Aware CORS Whitelist (RFP §8, §10)
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
  "https://commhub.heconf.net",
  "https://hapacgh.org",
  "https://www.hapacgh.org",
];

if (process.env.FRONTEND_URL) {
  ALLOWED_ORIGINS.push(process.env.FRONTEND_URL.replace(/\/$/, ""));
}
if (process.env.ADDITIONAL_ORIGINS) {
  const extra = process.env.ADDITIONAL_ORIGINS.split(",").map((o) => o.trim().replace(/\/$/, ""));
  ALLOWED_ORIGINS.push(...extra);
}

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin) || process.env.NODE_ENV !== "production") {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "5mb" }));

// Database connection instance for live health check
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Health Check & Diagnostics Endpoint (RFP §8, §10)
app.get("/api/health", async (req, res) => {
  let dbStatus = "unknown";
  try {
    const { error } = await supabase.from("platform_settings").select("key").limit(1);
    dbStatus = error ? `error: ${error.message}` : "connected";
  } catch (err) {
    dbStatus = `error: ${err.message}`;
  }

  res.json({
    ok: true,
    service: "CommunityHub API",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: { status: dbStatus },
  });
});

// Mounted Routes with Rate Limiting (RFP §8 Security)
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/admin", apiLimiter, adminRoutes);
app.use("/api/my", apiLimiter, myListingsRoutes);
app.use("/api/collectives", apiLimiter, collectiveRoutes);
app.use("/api/verification", apiLimiter, verificationRoutes);
app.use("/api/messages", apiLimiter, messageRoutes);
app.use("/api/events", apiLimiter, eventRoutes);
app.use("/api/settings", apiLimiter, settingsRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log("SMTP_USER:", process.env.SMTP_USER || "Not set");
});