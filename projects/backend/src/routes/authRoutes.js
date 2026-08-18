import express from "express";
import {
  sendOtp,
  verifyOtp,
  completeSignup,
  loginPassword,
  manualRegister,
  sendLoginOtp,
  verifyLoginOtp,
  getMyProfile,
  updateMyProfile,
  oauthCheck,
  sendWhatsappOtp,
  verifyWhatsappOtp,
} from "../controllers/authController.js";
import { requireTempToken } from "../middleware/authTempToken.js";
import { requireUser } from "../middleware/requireUser.js";

const router = express.Router();

// Signup flow (OTP verify -> set password) — email / phone only now
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/complete-signup", requireTempToken, completeSignup);

// Password login (existing, approved users)
router.post("/login", loginPassword);

// OTP login (existing, approved users) — email / phone
router.post("/send-login-otp", sendLoginOtp);
router.post("/verify-login-otp", verifyLoginOtp);

// WhatsApp — single unified flow (enter number -> OTP -> logged in,
// new or returning, no password, no separate signup step)
router.post("/whatsapp/send-otp", sendWhatsappOtp);
router.post("/whatsapp/verify-otp", verifyWhatsappOtp);

// Manual registration
router.post("/register", manualRegister);

// Logged-in user's own profile — works for OTP/password AND Google/Apple logins
router.get("/me", requireUser, getMyProfile);
router.put("/me", requireUser, updateMyProfile);

// OAuth (Google/Apple) post-login check — creates account via
// service_role, since the frontend anon client is blocked by RLS
router.post("/oauth-check", oauthCheck);

export default router;
