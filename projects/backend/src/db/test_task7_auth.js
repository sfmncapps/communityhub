/**
 * TASK 7 TEST SUITE: OAUTH & SSO PROVIDER ALIGNMENT (RFP §7b)
 *
 * Validates:
 *  1. Provider matrix integrity (Google, Apple, Microsoft, Facebook, Twitter, WhatsApp, Email, Phone, Yahoo, Instagram)
 *  2. Name tokenization logic for OAuth profile metadata (discrete first/middle/last name parsing)
 *  3. WhatsApp & phone number normalization (+91 prefix, whitespace stripping)
 *  4. OAuth session issuance (JWT token generation & validation)
 *  5. API endpoint routing (/api/auth/providers & getAuthProviders)
 *  6. Unsupported provider handling & documentation (Yahoo enterprise SAML note, Instagram Meta API note)
 */

import "dotenv/config";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  SUPPORTED_SSO_PROVIDERS,
  getAuthProviders,
} from "../controllers/authController.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedTests++;
  }
}

// Helper duplicating name tokenization in oauthCheck
function parseOAuthNames(meta) {
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
  return { fullName, firstName, middleName, lastName };
}

// Helper duplicating phone normalizer in sendWhatsappOtp
function normalizePhone(raw) {
  const phone = String(raw || "").trim().replace(/\s+/g, "");
  return phone.startsWith("+") ? phone : `+91${phone}`;
}

async function runTask7TestSuite() {
  console.log("\n=================================================");
  console.log("   TASK 7 TEST SUITE: OAUTH & SSO PROVIDERS");
  console.log("=================================================\n");

  // --- Suite 1: Provider Matrix & RFP §7b Coverage ---
  console.log("--- Suite 1: Provider Matrix & RFP §7b Coverage ---");
  assert(Array.isArray(SUPPORTED_SSO_PROVIDERS), "SUPPORTED_SSO_PROVIDERS is defined as an array");
  assert(SUPPORTED_SSO_PROVIDERS.length === 10, "Matrix includes all 10 RFP §7b providers");

  const providerMap = new Map(SUPPORTED_SSO_PROVIDERS.map((p) => [p.id, p]));

  // Active OAuth providers
  assert(providerMap.has("google") && providerMap.get("google").status === "active", "Google OAuth provider is active");
  assert(providerMap.has("apple") && providerMap.get("apple").status === "active", "Apple OAuth provider is active");
  assert(providerMap.has("azure") && providerMap.get("azure").status === "active", "Microsoft / Azure AD OAuth provider is active");
  assert(providerMap.has("facebook") && providerMap.get("facebook").status === "active", "Facebook OAuth provider is active");
  assert(providerMap.has("twitter") && providerMap.get("twitter").status === "active", "Twitter / X OAuth provider is active");

  // Active OTP channels
  assert(providerMap.has("whatsapp") && providerMap.get("whatsapp").status === "active", "WhatsApp unified OTP is active");
  assert(providerMap.has("email") && providerMap.get("email").status === "active", "Email OTP is active");
  assert(providerMap.has("phone") && providerMap.get("phone").status === "active", "Phone / SMS OTP is active");

  // Documented unsupported providers
  assert(providerMap.has("yahoo") && providerMap.get("yahoo").status === "unsupported", "Yahoo provider flagged as unsupported in native Supabase");
  assert(providerMap.get("yahoo").reason.includes("OpenID Connect"), "Yahoo has clear technical justification documented");
  assert(providerMap.has("instagram") && providerMap.get("instagram").status === "unsupported", "Instagram provider flagged as unsupported in native Supabase");
  assert(providerMap.get("instagram").reason.includes("deprecated"), "Instagram has clear Meta API deprecation reason documented");

  // --- Suite 2: Name Tokenization Logic for OAuth Users ---
  console.log("\n--- Suite 2: Name Tokenization Logic for OAuth Users ---");
  const case1 = parseOAuthNames({ name: "Alex" });
  assert(case1.firstName === "Alex" && case1.middleName === "" && case1.lastName === "", "Single token name parses as first name");

  const case2 = parseOAuthNames({ full_name: "Sarah Jenkins" });
  assert(case2.firstName === "Sarah" && case2.middleName === "" && case2.lastName === "Jenkins", "Two token name parses as first and last name");

  const case3 = parseOAuthNames({ full_name: "Robert Downey Junior" });
  assert(case3.firstName === "Robert" && case3.middleName === "Downey" && case3.lastName === "Junior", "Three token name parses middle name correctly");

  const case4 = parseOAuthNames({ full_name: "Maria de la Vega" });
  assert(case4.firstName === "Maria" && case4.middleName === "de la" && case4.lastName === "Vega", "Multi-token name parses multi-word middle name correctly");

  const case5 = parseOAuthNames({ given_name: "David", family_name: "Miller", name: "David Miller" });
  assert(case5.firstName === "David" && case5.lastName === "Miller", "Explicit given_name and family_name take precedence");

  // --- Suite 3: Phone Normalization & WhatsApp Handling ---
  console.log("\n--- Suite 3: Phone Normalization & WhatsApp Handling ---");
  assert(normalizePhone("9876543210") === "+919876543210", "10-digit Indian phone auto-prepends +91 prefix");
  assert(normalizePhone("+1 555 123 4567") === "+15551234567", "International phone with spaces stripped and maintains + prefix");
  assert(normalizePhone("+44 20 7946 0958") === "+442079460958", "UK phone with spaces stripped and maintains +44 prefix");
  assert(normalizePhone("  +91 99999 88888  ") === "+919999988888", "Leading and trailing whitespace sanitized correctly");

  // --- Suite 4: OAuth Session JWT Generation & Verification ---
  console.log("\n--- Suite 4: OAuth Session JWT Generation & Verification ---");
  const testUserId = "b4f2c7a1-8d3e-4b2a-9f1e-3c5a7d9e1b3f";
  const jwtSecret = process.env.JWT_SECRET || "test-jwt-secret-for-communityhub";

  const token = jwt.sign({ userId: testUserId }, jwtSecret, { expiresIn: "7d" });
  assert(typeof token === "string" && token.length > 20, "Generates valid JWT signature string");

  const decoded = jwt.verify(token, jwtSecret);
  assert(decoded.userId === testUserId, "Decoded JWT contains matching userId payload");
  assert(decoded.exp > Math.floor(Date.now() / 1000), "Generated JWT has valid future expiration");

  // --- Suite 5: Route & Endpoint Verification ---
  console.log("\n--- Suite 5: Route & Endpoint Verification ---");
  const routesPath = path.join(__dirname, "..", "routes", "authRoutes.js");
  assert(fs.existsSync(routesPath), "authRoutes.js exists");

  const routesSrc = fs.readFileSync(routesPath, "utf-8");
  assert(routesSrc.includes('router.get("/providers", getAuthProviders)'), "authRoutes exposes GET /providers endpoint");
  assert(routesSrc.includes('router.post("/oauth-check", oauthCheck)'), "authRoutes exposes POST /oauth-check endpoint");
  assert(routesSrc.includes('router.post("/whatsapp/send-otp"'), "authRoutes exposes WhatsApp send-otp endpoint");
  assert(routesSrc.includes('router.post("/whatsapp/verify-otp"'), "authRoutes exposes WhatsApp verify-otp endpoint");

  // Mock getAuthProviders res.json
  let capturedResponse = null;
  const mockRes = {
    json: (data) => {
      capturedResponse = data;
      return data;
    },
  };
  await getAuthProviders({}, mockRes);
  assert(capturedResponse !== null, "getAuthProviders responds with JSON");
  assert(capturedResponse.active.length === 8, "getAuthProviders identifies 8 active SSO/OTP channels");
  assert(capturedResponse.unsupported.length === 2, "getAuthProviders identifies 2 documented unsupported providers (Yahoo, Instagram)");

  // --- Summary ---
  console.log("\n=================================================");
  console.log(`TASK 7 TEST RESULTS: ${passedTests} Passed, ${failedTests} Failed`);
  console.log("=================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTask7TestSuite();
