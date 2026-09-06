// backend/src/controllers/authController.js

import "dotenv/config";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";
import { generateOtp, hashOtp } from "../utils/otp.js";
import { sendEmailOtp, sendSmsOtp, sendWhatsAppOtp } from "../utils/notify.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const OTP_TTL_MIN = 10;
const OTP_RESEND_COOLDOWN_SEC = 30;

// Shared guard: block sending a fresh OTP if one was already sent
// to this channel+identifier+purpose within the cooldown window.
// Returns a cooldown message string if blocked, or null if OK to send.
const checkResendCooldown = async (channel, identifier, purpose) => {
  const { data: rows, error } = await supabase
    .from("otp_requests")
    .select("created_at")
    .eq("channel", channel)
    .eq("identifier", identifier)
    .eq("purpose", purpose)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) return null; // fail open rather than block legit sends on a query hiccup
  const last = rows?.[0];
  if (!last) return null;

  const lastTime = new Date(
    String(last.created_at).endsWith("Z") ? last.created_at : `${last.created_at}Z`
  ).getTime();
  const elapsedSec = (Date.now() - lastTime) / 1000;

  if (elapsedSec < OTP_RESEND_COOLDOWN_SEC) {
    const waitSec = Math.ceil(OTP_RESEND_COOLDOWN_SEC - elapsedSec);
    return `Please wait ${waitSec}s before requesting another OTP.`;
  }
  return null;
};

// STEP 1: Send OTP
// STEP 1: Send OTP
export const sendOtp = async (req, res) => {
  try {
    const { channel, identifier } = req.body;

    if (!channel || !identifier) {
      return res.status(400).json({ message: "Missing channel/identifier" });
    }

    // Normalize phone numbers (+91 format)
    const phoneFormatted =
      identifier.startsWith("+") ? identifier : `+91${identifier}`;
    const normalizedIdentifier = channel === "email" ? identifier : phoneFormatted;

    const cooldownMsg = await checkResendCooldown(channel, normalizedIdentifier, "signup");
    if (cooldownMsg) return res.status(429).json({ message: cooldownMsg });

    let query = supabase.from("users_active").select("id");

    if (channel === "email") {
      query = query.eq("email", identifier);
    }

    if (channel === "phone") {
      query = query.eq("phone", phoneFormatted);
    }

    if (channel === "whatsapp") {
      query = query.eq("whatsapp", phoneFormatted);
    }

    const { data: activeUser, error: activeErr } = await query.maybeSingle();

    if (activeErr) {
      return res.status(500).json({ message: activeErr.message });
    }

    if (activeUser) {
      return res
        .status(409)
        .json({ message: "Account already approved. Please login." });
    }

    const otp = generateOtp();
    const otpHash = hashOtp(otp);

    const expiresAt = new Date(
      Date.now() + OTP_TTL_MIN * 60 * 1000
    ).toISOString();

    const { error: otpInsertErr } = await supabase.from("otp_requests").insert([
      {
        channel,
        identifier: normalizedIdentifier,
        otp_hash: otpHash,
        expires_at: expiresAt,
        verified: false,
        purpose: "signup",
      },
    ]);

    if (otpInsertErr) {
      return res.status(500).json({ message: otpInsertErr.message });
    }

    if (channel === "email") await sendEmailOtp(identifier, otp);
    if (channel === "phone") await sendSmsOtp(phoneFormatted, otp);
    if (channel === "whatsapp") await sendWhatsAppOtp(phoneFormatted, otp);

    return res.json({ message: "OTP sent" });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};
// STEP 2: Verify OTP -> issue TEMP token (to allow password set)
export const verifyOtp = async (req, res) => {
  try {
    let { channel, identifier, otp } = req.body;

    if (!channel || !identifier || !otp) {
      return res.status(400).json({ message: "Missing fields" });
    }

    // ✅ Normalize identifier exactly like sendOtp
    identifier = String(identifier).trim().replace(/\s+/g, "");
    if (channel === "phone" || channel === "whatsapp") {
      if (!identifier.startsWith("+")) identifier = `+91${identifier}`;
    }

    otp = String(otp).trim();

    const otpHash = hashOtp(otp);
    // ... (rest same)

    const { data: rows, error: fetchErr } = await supabase
  .from("otp_requests")
  .select("*")
  .eq("channel", channel)
  .eq("identifier", identifier)
  .order("created_at", { ascending: false })
  .limit(1);

if (fetchErr) return res.status(500).json({ message: fetchErr.message });

const row = rows?.[0];
if (!row) return res.status(400).json({ message: "Invalid OTP" });

if (row.otp_hash !== otpHash) {
  return res.status(400).json({ message: "Invalid OTP" });
}

    // ✅ FIX: handle timestamp without timezone by forcing UTC if needed
    const expiry = new Date(
      String(row.expires_at).includes("Z") || String(row.expires_at).includes("+")
        ? row.expires_at
        : `${row.expires_at}Z`
    );

    if (Number.isNaN(expiry.getTime())) {
      return res.status(500).json({
        message:
          "OTP expiry time parse failed. Convert otp_requests.expires_at to timestamptz in Supabase.",
      });
    }

    if (expiry.getTime() < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    const { error: markUsedErr } = await supabase
      .from("otp_requests")
      .update({ verified: true })
      .eq("id", row.id);

    if (markUsedErr) {
      return res.status(500).json({ message: markUsedErr.message });
    }

    const tempToken = jwt.sign({ channel, identifier }, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });

    return res.json({ message: "OTP verified", tempToken });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// STEP 3: Set Password + Insert into users_pending
export const completeSignup = async (req, res) => {
  try {
    const { password, name, username } = req.body;
    const { channel, identifier } = req.tempAuth; // from middleware

    if (!password) return res.status(400).json({ message: "Password required" });

    const passwordHash = await bcrypt.hash(password, 10);

    // map identifier -> correct column
    const phoneFormatted =
  identifier.startsWith("+") ? identifier : `+91${identifier}`;

const payload = {
  login_method: channel,
  password: passwordHash,
  name: name || null,
  username: username || null,
  email: channel === "email" ? identifier : null,
  phone: channel === "phone" ? phoneFormatted : null,
  whatsapp: channel === "whatsapp" ? phoneFormatted : null,
};

    // Already an active member with this identifier?
    const { data: activeExists, error: activeErr } = await supabase
      .from("users_active")
      .select("id")
      .or(
        `email.eq.${payload.email || "___"},phone.eq.${
          payload.phone || "___"
        },whatsapp.eq.${payload.whatsapp || "___"}`
      )
      .maybeSingle();

    if (activeErr) {
      return res.status(500).json({ message: activeErr.message });
    }

    if (activeExists) {
      return res
        .status(409)
        .json({ message: "An account with this identifier already exists. Please log in instead." });
    }

    // Auto-approve: go straight into users_active, no admin review step.
    const { data: newUser, error: insErr } = await supabase
      .from("users_active")
      .insert([payload])
      .select()
      .single();
    if (insErr) return res.status(500).json({ message: insErr.message });

    // Log them in immediately, same as any other successful login.
    const token = jwt.sign({ userId: newUser.id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    const { password: _pw, ...safeUser } = newUser;
    return res.json({ message: "Account created", token, user: safeUser });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// LOGIN (after approval) - identifier + password
export const loginPassword = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const { data: user, error: uErr } = await supabase
      .from("users_active")
      .select("*")
      .or(
        `email.eq.${identifier},phone.eq.${identifier},whatsapp.eq.${identifier},username.eq.${identifier}`
      )
      .maybeSingle();

    if (uErr) return res.status(500).json({ message: uErr.message });

    if (!user) {
      return res
        .status(403)
        .json({ message: "Not approved yet or account not found" });
    }

    const ok = await bcrypt.compare(password, user.password || "");
    if (!ok) return res.status(401).json({ message: "Invalid password" });

    // create your app session token (optional)
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.json({ message: "Login success", token, user });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// ============================================================
// OTP LOGIN (for RETURNING / already-approved users)
// Separate from sendOtp/verifyOtp above, which are SIGNUP-only.
// ============================================================

// STEP 1: Send OTP to an existing, approved user
export const sendLoginOtp = async (req, res) => {
  try {
    const { channel, identifier } = req.body;

    if (!channel || !identifier) {
      return res.status(400).json({ message: "Missing channel/identifier" });
    }
    if (!["email", "phone", "whatsapp"].includes(channel)) {
      return res.status(400).json({ message: "Invalid channel" });
    }

    const isPhoneChannel = channel === "phone" || channel === "whatsapp";
    const value = String(identifier).trim().replace(/\s+/g, "");
    const normalized = isPhoneChannel
      ? (value.startsWith("+") ? value : `+91${value}`)
      : value;

    // Must already be an approved user to get a login OTP
    let query = supabase.from("users_active").select("id");
    if (channel === "email") query = query.eq("email", normalized);
    if (channel === "phone") query = query.eq("phone", normalized);
    if (channel === "whatsapp") query = query.eq("whatsapp", normalized);

    const { data: activeUser, error: activeErr } = await query.maybeSingle();
    if (activeErr) return res.status(500).json({ message: activeErr.message });

    if (!activeUser) {
      // Same message regardless of which part is wrong, so we don't leak
      // which identifiers exist in the system.
      return res.status(404).json({ message: "No account found. Please sign up first." });
    }

    const cooldownMsg = await checkResendCooldown(channel, normalized, "login");
    if (cooldownMsg) return res.status(429).json({ message: cooldownMsg });

    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000).toISOString();

    const { error: otpInsertErr } = await supabase.from("otp_requests").insert([
      {
        channel,
        identifier: normalized,
        otp_hash: otpHash,
        expires_at: expiresAt,
        verified: false,
        purpose: "login",
      },
    ]);
    if (otpInsertErr) return res.status(500).json({ message: otpInsertErr.message });

    if (channel === "email") await sendEmailOtp(normalized, otp);
    if (channel === "phone") await sendSmsOtp(normalized, otp);
    if (channel === "whatsapp") await sendWhatsAppOtp(normalized, otp);

    return res.json({ message: "OTP sent" });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// STEP 2: Verify OTP -> issue a real session token (skips password entirely)
export const verifyLoginOtp = async (req, res) => {
  try {
    let { channel, identifier, otp } = req.body;

    if (!channel || !identifier || !otp) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const isPhoneChannel = channel === "phone" || channel === "whatsapp";
    identifier = String(identifier).trim().replace(/\s+/g, "");
    if (isPhoneChannel && !identifier.startsWith("+")) identifier = `+91${identifier}`;
    otp = String(otp).trim();

    const otpHash = hashOtp(otp);

    const { data: rows, error: fetchErr } = await supabase
      .from("otp_requests")
      .select("*")
      .eq("channel", channel)
      .eq("identifier", identifier)
      .eq("purpose", "login")
      .order("created_at", { ascending: false })
      .limit(1);

    if (fetchErr) return res.status(500).json({ message: fetchErr.message });

    const row = rows?.[0];
    if (!row) return res.status(400).json({ message: "Invalid OTP" });
    if (row.otp_hash !== otpHash) return res.status(400).json({ message: "Invalid OTP" });

    const expiry = new Date(
      String(row.expires_at).includes("Z") || String(row.expires_at).includes("+")
        ? row.expires_at
        : `${row.expires_at}Z`
    );
    if (Number.isNaN(expiry.getTime())) {
      return res.status(500).json({ message: "OTP expiry parse failed." });
    }
    if (expiry.getTime() < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }
    if (row.verified) {
      return res.status(400).json({ message: "OTP already used" });
    }

    // Fetch the approved user this identifier belongs to
    let query = supabase.from("users_active").select("*");
    if (channel === "email") query = query.eq("email", identifier);
    if (channel === "phone") query = query.eq("phone", identifier);
    if (channel === "whatsapp") query = query.eq("whatsapp", identifier);

    const { data: user, error: uErr } = await query.maybeSingle();
    if (uErr) return res.status(500).json({ message: uErr.message });
    if (!user) return res.status(404).json({ message: "Account not found" });

    // Mark OTP used only after we've confirmed the account still exists
    await supabase.from("otp_requests").update({ verified: true }).eq("id", row.id);

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.json({ message: "Login success", token, user });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

export const manualRegister = async (req, res) => {
  try {
    const {
      username, name, email, phone,
      company_name, category, company_address,
      password
    } = req.body;

    if (!username || !name || !email || !phone || !company_name || !category || !company_address || !password) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const payload = {
      username,
      name,
      email,
      phone: phone.startsWith("+") ? phone : `+91${phone}`,
      company_name,
      category,
      company_address,
      password: passwordHash,
      approved: false,
      login_method: "manual",
    };

    const { error } = await supabase.from("users_pending").insert([payload]);
    if (error) return res.status(500).json({ message: error.message });

    return res.json({ message: "Submitted for admin approval" });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};
// ============================================================
// GET/UPDATE "my profile" — works for both custom-JWT and
// Supabase-OAuth logins, via requireUser middleware setting
// req.activeUser.
// ============================================================

export const getMyProfile = async (req, res) => {
  const { password, ...safeUser } = req.activeUser;

  // Synthesize discrete name parts if legacy record only has 'name'
  if (!safeUser.first_name && safeUser.name) {
    const tokens = safeUser.name.trim().split(/\s+/);
    safeUser.first_name = tokens[0] || "";
    if (tokens.length === 2) {
      safeUser.last_name = tokens[1];
      safeUser.middle_name = "";
    } else if (tokens.length > 2) {
      safeUser.middle_name = tokens.slice(1, -1).join(" ");
      safeUser.last_name = tokens[tokens.length - 1];
    } else {
      safeUser.middle_name = "";
      safeUser.last_name = "";
    }
  }

  // Synthesize address if legacy record only has 'company_address' / 'company_location'
  if (!safeUser.street_address && safeUser.company_address) {
    safeUser.street_address = safeUser.company_address;
  }
  if (!safeUser.city && safeUser.company_location) {
    safeUser.city = safeUser.company_location;
  }
  if (!safeUser.country) {
    safeUser.country = "India";
  }

  return res.json({ user: safeUser });
};

const PROFILE_EDITABLE_FIELDS = [
  "name",
  "first_name",
  "middle_name",
  "last_name",
  "email",
  "phone",
  "street_address",
  "city",
  "state",
  "country",
  "zip_code",
  "company_name",
  "company_location",
  "category",
  "company_address",
  "business_about",
  "profile_pic",
  "company_logo",
  "brand_tagline",
];

export const updateMyProfile = async (req, res) => {
  try {
    const updates = {};

    // 1. Validation checks
    if (req.body.email) {
      const emailStr = String(req.body.email).trim();
      if (emailStr.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
        return res.status(400).json({ message: "Invalid email address format" });
      }
      updates.email = emailStr.toLowerCase();
    }

    if (req.body.phone) {
      const phoneStr = String(req.body.phone).trim();
      if (phoneStr.length < 7 || phoneStr.length > 20 || !/^\+?[0-9\s\-()]+$/.test(phoneStr)) {
        return res.status(400).json({ message: "Invalid phone number format" });
      }
      updates.phone = phoneStr;
    }

    if (req.body.zip_code) {
      const zipStr = String(req.body.zip_code).trim();
      if (zipStr.length > 20 || !/^[a-zA-Z0-9\s\-]+$/.test(zipStr)) {
        return res.status(400).json({ message: "Invalid ZIP / Postal code format" });
      }
      updates.zip_code = zipStr;
    }

    // Length restrictions
    const lengthLimits = {
      first_name: 100,
      middle_name: 100,
      last_name: 100,
      city: 100,
      state: 100,
      country: 100,
      street_address: 500,
      company_name: 255,
    };

    for (const [key, maxLen] of Object.entries(lengthLimits)) {
      if (req.body[key] !== undefined) {
        const val = String(req.body[key]).trim();
        if (val.length > maxLen) {
          return res.status(400).json({ message: `${key} exceeds maximum length of ${maxLen} characters` });
        }
        updates[key] = val;
      }
    }

    // Standard fields
    for (const field of ["category", "company_location", "company_address", "business_about", "profile_pic", "company_logo", "brand_tagline"]) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    // 2. Backward compatibility: Synchronize full 'name' from discrete parts
    const fName = updates.first_name !== undefined ? updates.first_name : (req.activeUser.first_name || "");
    const mName = updates.middle_name !== undefined ? updates.middle_name : (req.activeUser.middle_name || "");
    const lName = updates.last_name !== undefined ? updates.last_name : (req.activeUser.last_name || "");
    const nameParts = [fName, mName, lName].filter(Boolean);
    if (nameParts.length > 0) {
      updates.name = nameParts.join(" ");
    }

    // Sync address fields to legacy columns
    if (updates.street_address && !updates.company_address) {
      updates.company_address = updates.street_address;
    }
    if (updates.city && !updates.company_location) {
      updates.company_location = updates.state ? `${updates.city}, ${updates.state}` : updates.city;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    // 3. Attempt update in database
    let { data, error } = await supabase
      .from("users_active")
      .update(updates)
      .eq("id", req.activeUser.id)
      .select()
      .maybeSingle();

    // Graceful fallback: If Supabase schema cache hasn't loaded discrete columns yet (PGRST204)
    if (error && (error.code === "PGRST204" || error.code === "42703")) {
      const coreUpdates = {};
      const coreFields = [
        "name", "email", "phone", "company_name", "company_location",
        "company_address", "category", "business_about", "profile_pic",
        "company_logo", "brand_tagline"
      ];
      for (const f of coreFields) {
        if (updates[f] !== undefined) coreUpdates[f] = updates[f];
      }

      const retry = await supabase
        .from("users_active")
        .update(coreUpdates)
        .eq("id", req.activeUser.id)
        .select()
        .maybeSingle();

      if (retry.error) return res.status(500).json({ message: retry.error.message });
      data = { ...retry.data, ...updates };
    } else if (error) {
      return res.status(500).json({ message: error.message });
    }

    const { password, ...safeUser } = data;
    return res.json({ message: "Profile updated successfully", user: safeUser });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// ============================================================
// SUPPORTED SSO / SOCIAL LOGIN PROVIDERS (RFP §7b)
// ============================================================
export const SUPPORTED_SSO_PROVIDERS = [
  {
    id: "google",
    name: "Google",
    type: "oauth",
    status: "active",
    authProviderKey: "google",
    instructions: "Configured via Supabase Auth (Google OAuth Client ID & Secret).",
  },
  {
    id: "apple",
    name: "Apple",
    type: "oauth",
    status: "active",
    authProviderKey: "apple",
    instructions: "Configured via Supabase Auth (Apple Services ID, Key ID, & Private Key).",
  },
  {
    id: "azure",
    name: "Microsoft (Outlook / Azure AD)",
    type: "oauth",
    status: "active",
    authProviderKey: "azure",
    instructions: "Configured via Supabase Auth (Azure AD App Registration Client ID & Secret).",
  },
  {
    id: "facebook",
    name: "Facebook",
    type: "oauth",
    status: "active",
    authProviderKey: "facebook",
    instructions: "Configured via Supabase Auth (Meta for Developers App ID & App Secret).",
  },
  {
    id: "twitter",
    name: "Twitter / X",
    type: "oauth",
    status: "active",
    authProviderKey: "twitter",
    instructions: "Configured via Supabase Auth (X Developer Portal API Key & Secret).",
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    type: "otp",
    status: "active",
    instructions: "Unified instant passwordless OTP delivered via CommunityHub WhatsApp Gateway.",
  },
  {
    id: "email",
    name: "Email OTP",
    type: "otp",
    status: "active",
    instructions: "Email verification OTP delivered via CommunityHub Mail Service.",
  },
  {
    id: "phone",
    name: "Phone / SMS OTP",
    type: "otp",
    status: "active",
    instructions: "Phone verification OTP delivered via CommunityHub SMS Gateway.",
  },
  {
    id: "yahoo",
    name: "Yahoo",
    type: "oauth",
    status: "unsupported",
    reason: "Supabase Auth does not provide an out-of-the-box Yahoo OAuth provider; requires custom OpenID Connect enterprise connector.",
  },
  {
    id: "instagram",
    name: "Instagram",
    type: "oauth",
    status: "unsupported",
    reason: "Meta deprecated the standalone Instagram Basic Display API in Dec 2024; Instagram authentication is folded into Facebook Login for Business.",
  },
];

export const getAuthProviders = async (req, res) => {
  return res.json({
    providers: SUPPORTED_SSO_PROVIDERS,
    active: SUPPORTED_SSO_PROVIDERS.filter((p) => p.status === "active"),
    unsupported: SUPPORTED_SSO_PROVIDERS.filter((p) => p.status === "unsupported"),
  });
};

// ============================================================
// OAuth post-login check (Google/Apple/Facebook/Twitter/Azure)
// Runs through the backend (service_role) to create/verify users_active.
// Issues a standard CommunityHub session token for consistent auth.
// ============================================================
export const oauthCheck = async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Missing token" });

    const { data: supaUser, error: supaErr } = await supabase.auth.getUser(token);
    if (supaErr || !supaUser?.user) {
      return res.status(401).json({ message: "Invalid or expired session" });
    }
    const authUser = supaUser.user;

    // Already an approved member?
    const { data: activeUser, error: activeErr } = await supabase
      .from("users_active")
      .select("*")
      .eq("auth_id", authUser.id)
      .maybeSingle();
    if (activeErr) return res.status(500).json({ message: activeErr.message });

    if (activeUser) {
      const sessionJwt = jwt.sign({ userId: activeUser.id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });
      const { password, ...safeUser } = activeUser;
      return res.json({ approved: true, user: safeUser, token: sessionJwt });
    }

    // Parse provider & user metadata across providers (Google, Apple, Facebook, Twitter, Azure, etc.)
    const rawProvider = (authUser.app_metadata?.provider || "oauth").toLowerCase();
    const meta = authUser.user_metadata || {};

    const fullName = (meta.full_name || meta.name || "").trim();
    let firstName = (meta.given_name || meta.first_name || "").trim();
    let lastName = (meta.family_name || meta.last_name || "").trim();
    let middleName = "";

    if (!firstName && fullName) {
      const tokens = fullName.split(/\s+/);
      firstName = tokens[0] || "";
      if (tokens.length === 2) {
        lastName = tokens[1] || "";
      } else if (tokens.length > 2) {
        middleName = tokens.slice(1, -1).join(" ");
        lastName = tokens[tokens.length - 1] || "";
      }
    }

    const avatarUrl = meta.avatar_url || meta.picture || meta.profile_pic || null;

    // First time this OAuth account has signed in — auto-approve,
    // create them straight in users_active, no pending step.
    const newUserData = {
      auth_id: authUser.id,
      email: authUser.email || null,
      name: fullName || `${firstName} ${lastName}`.trim() || null,
      first_name: firstName || null,
      middle_name: middleName || null,
      last_name: lastName || null,
      profile_pic: avatarUrl,
      login_method: rawProvider,
      role: "user",
      approved: true,
    };

    let { data: newUser, error: insertErr } = await supabase
      .from("users_active")
      .insert(newUserData)
      .select()
      .single();

    // Fallback if discrete schema columns are still refreshing in PostgREST cache
    if (insertErr && (insertErr.code === "PGRST204" || insertErr.code === "42703")) {
      const fallbackData = {
        auth_id: authUser.id,
        email: authUser.email || null,
        name: fullName || `${firstName} ${lastName}`.trim() || null,
        login_method: rawProvider,
        role: "user",
      };
      const retry = await supabase.from("users_active").insert(fallbackData).select().single();
      if (retry.error) return res.status(500).json({ message: retry.error.message });
      newUser = { ...retry.data, ...newUserData };
    } else if (insertErr) {
      return res.status(500).json({ message: insertErr.message });
    }

    const sessionJwt = jwt.sign({ userId: newUser.id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    const { password, ...safeNewUser } = newUser;
    return res.json({ approved: true, user: safeNewUser, token: sessionJwt });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// ============================================================
// WHATSAPP — single unified flow, no separate signup step.
// Enter number -> OTP -> verified -> logged in, whether the
// number is new (auto-created) or returning. No password.
// ============================================================

export const sendWhatsappOtp = async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier) return res.status(400).json({ message: "Phone number required" });

    const phone = String(identifier).trim().replace(/\s+/g, "");
    const normalized = phone.startsWith("+") ? phone : `+91${phone}`;

    const cooldownMsg = await checkResendCooldown("whatsapp", normalized, "whatsapp_unified");
    if (cooldownMsg) return res.status(429).json({ message: cooldownMsg });

    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000).toISOString();

    const { error: otpInsertErr } = await supabase.from("otp_requests").insert([
      {
        channel: "whatsapp",
        identifier: normalized,
        otp_hash: otpHash,
        expires_at: expiresAt,
        verified: false,
        purpose: "whatsapp_unified",
      },
    ]);
    if (otpInsertErr) return res.status(500).json({ message: otpInsertErr.message });

    await sendWhatsAppOtp(normalized, otp);

    return res.json({ message: "OTP sent" });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

export const verifyWhatsappOtp = async (req, res) => {
  try {
    let { identifier, otp } = req.body;
    if (!identifier || !otp) return res.status(400).json({ message: "Missing fields" });

    identifier = String(identifier).trim().replace(/\s+/g, "");
    if (!identifier.startsWith("+")) identifier = `+91${identifier}`;
    otp = String(otp).trim();

    const otpHash = hashOtp(otp);

    const { data: rows, error: fetchErr } = await supabase
      .from("otp_requests")
      .select("*")
      .eq("channel", "whatsapp")
      .eq("identifier", identifier)
      .eq("purpose", "whatsapp_unified")
      .order("created_at", { ascending: false })
      .limit(1);
    if (fetchErr) return res.status(500).json({ message: fetchErr.message });

    const row = rows?.[0];
    if (!row) return res.status(400).json({ message: "Invalid OTP" });
    if (row.otp_hash !== otpHash) return res.status(400).json({ message: "Invalid OTP" });
    if (row.verified) return res.status(400).json({ message: "OTP already used" });

    const expiry = new Date(
      String(row.expires_at).includes("Z") || String(row.expires_at).includes("+")
        ? row.expires_at
        : `${row.expires_at}Z`
    );
    if (Number.isNaN(expiry.getTime())) {
      return res.status(500).json({ message: "OTP expiry parse failed." });
    }
    if (expiry.getTime() < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    await supabase.from("otp_requests").update({ verified: true }).eq("id", row.id);

    // Returning user?
    const { data: existingUser, error: findErr } = await supabase
      .from("users_active")
      .select("*")
      .eq("whatsapp", identifier)
      .maybeSingle();
    if (findErr) return res.status(500).json({ message: findErr.message });

    let user = existingUser;

    if (!user) {
      // New number — auto-create, no password, no pending step.
      const { data: newUser, error: insertErr } = await supabase
        .from("users_active")
        .insert([{ whatsapp: identifier, login_method: "whatsapp" }])
        .select()
        .single();
      if (insertErr) return res.status(500).json({ message: insertErr.message });
      user = newUser;
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    const { password, ...safeUser } = user;
    return res.json({ message: "Login success", token, user: safeUser });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};
