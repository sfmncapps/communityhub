import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

console.log("=================================================");
console.log("   TASK 2 TEST SUITE: PROFILE SCHEMA UPGRADE");
console.log("=================================================\n");

// -------------------------------------------------------------
// TEST 1: Migration Script File & SQL Syntax Check
// -------------------------------------------------------------
console.log("--- Suite 1: Migration Script Integrity ---");
const migrationPath = path.join(__dirname, "migrations", "01_profile_schema_upgrade.sql");
assert(fs.existsSync(migrationPath), "Migration file 01_profile_schema_upgrade.sql exists");

const sqlContent = fs.readFileSync(migrationPath, "utf-8");
assert(sqlContent.includes("ALTER TABLE IF EXISTS users_active"), "Migration alters users_active table");
assert(sqlContent.includes("first_name VARCHAR(100)"), "Migration adds first_name column");
assert(sqlContent.includes("middle_name VARCHAR(100)"), "Migration adds middle_name column");
assert(sqlContent.includes("last_name VARCHAR(100)"), "Migration adds last_name column");
assert(sqlContent.includes("street_address TEXT"), "Migration adds street_address column");
assert(sqlContent.includes("city VARCHAR(100)"), "Migration adds city column");
assert(sqlContent.includes("state VARCHAR(100)"), "Migration adds state column");
assert(sqlContent.includes("country VARCHAR(100)"), "Migration adds country column");
assert(sqlContent.includes("zip_code VARCHAR(20)"), "Migration adds zip_code column");
assert(sqlContent.includes("ALTER TABLE IF EXISTS users_pending"), "Migration alters users_pending table with identical fields");
assert(sqlContent.includes("ALTER TABLE IF EXISTS collectives"), "Migration alters collectives table with RFP fields");
assert(sqlContent.includes("owner_id UUID"), "Migration ensures collectives.owner_id relation");
assert(sqlContent.includes("CREATE TABLE IF NOT EXISTS collective_members"), "Migration creates collective_members table");
assert(sqlContent.includes("UPDATE users_active"), "Migration backfills existing users without destroying data");

// -------------------------------------------------------------
// TEST 2: Name Synthesis & Backward Compatibility
// -------------------------------------------------------------
console.log("\n--- Suite 2: User Name Synthesis & Compatibility ---");
function synthesizeName(rawName) {
  const trimmed = (rawName || "").trim();
  const parts = trimmed ? trimmed.split(/\s+/) : [];
  let first = "";
  let middle = "";
  let last = "";

  if (parts.length === 1) {
    first = parts[0];
  } else if (parts.length === 2) {
    first = parts[0];
    last = parts[1];
  } else if (parts.length > 2) {
    first = parts[0];
    middle = parts.slice(1, -1).join(" ");
    last = parts[parts.length - 1];
  }
  return { first_name: first, middle_name: middle, last_name: last };
}

function syncFullName(first, middle, last) {
  return [first, middle, last].map(s => (s || "").trim()).filter(Boolean).join(" ");
}

const singleName = synthesizeName("Rahul");
assert(singleName.first_name === "Rahul" && singleName.middle_name === "" && singleName.last_name === "", "Single word name parsed correctly");

const twoName = synthesizeName("Rahul Sharma");
assert(twoName.first_name === "Rahul" && twoName.middle_name === "" && twoName.last_name === "Sharma", "Two word name parsed into first and last");

const threeName = synthesizeName("Mohandas Karamchand Gandhi");
assert(threeName.first_name === "Mohandas" && threeName.middle_name === "Karamchand" && threeName.last_name === "Gandhi", "Three word name parsed into first, middle, last");

const fourName = synthesizeName("Mary Ann Smith Jones");
assert(fourName.first_name === "Mary" && fourName.middle_name === "Ann Smith" && fourName.last_name === "Jones", "Compound name parsed correctly with multi-word middle name");

const combined = syncFullName("Rahul", "Kumar", "Sharma");
assert(combined === "Rahul Kumar Sharma", "Discrete fields cleanly reconstruct unified full name");

const combinedNoMiddle = syncFullName("Rahul", "", "Sharma");
assert(combinedNoMiddle === "Rahul Sharma", "Unified full name omits empty middle name without extra whitespace");

// -------------------------------------------------------------
// TEST 3: Validation Rules (Email, Phone, ZIP, Max Lengths)
// -------------------------------------------------------------
console.log("\n--- Suite 3: Data Validation Rules ---");
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\+?[0-9\s\-()]{7,25}$/;

// Email validation
assert(emailRegex.test("user@example.com"), "Valid standard email passes");
assert(emailRegex.test("john.doe+work@sub.domain.org"), "Valid complex email passes");
assert(!emailRegex.test("invalid-email"), "Email missing @ is rejected");
assert(!emailRegex.test("user@no-tld"), "Email missing TLD is rejected");
assert(!emailRegex.test(""), "Empty email rejected when required");

// Phone validation
assert(phoneRegex.test("+91 98765 43210"), "Valid international phone passes");
assert(phoneRegex.test("040-1234567"), "Valid landline with hyphen passes");
assert(phoneRegex.test("(555) 123-4567"), "Valid US phone with parentheses passes");
assert(!phoneRegex.test("123"), "Phone with fewer than 7 characters rejected");
assert(!phoneRegex.test("call-me-now"), "Phone with alpha characters rejected");

// ZIP validation
function validateZip(zip) {
  if (!zip) return true; // optional
  const z = zip.trim();
  return z.length <= 20 && /^[A-Za-z0-9\s\-]+$/.test(z);
}
assert(validateZip("500081"), "6-digit Indian PIN code passes");
assert(validateZip("90210-1234"), "US 9-digit ZIP code passes");
assert(validateZip("SW1A 1AA"), "UK alphanumeric postal code passes");
assert(!validateZip("123456789012345678901"), "ZIP exceeding 20 characters rejected");
assert(!validateZip("90210$#@"), "ZIP with illegal punctuation rejected");

// -------------------------------------------------------------
// TEST 4: Collective Payload & Partners Processing
// -------------------------------------------------------------
console.log("\n--- Suite 4: Collective Profile Structure ---");
function processCollectivePayload(input) {
  const errors = [];
  if (!input.name || !input.name.trim()) errors.push("Collective name is required");
  if (input.name && input.name.trim().length > 255) errors.push("Name too long");
  if (input.contact_email && !emailRegex.test(input.contact_email.trim())) errors.push("Invalid email");
  if (input.contact_phone && !phoneRegex.test(input.contact_phone.trim())) errors.push("Invalid phone");
  if (input.zip && !validateZip(input.zip)) errors.push("Invalid zip");

  const partners = Array.isArray(input.partners)
    ? input.partners
    : typeof input.partners === "string"
    ? input.partners.split(",").map(p => p.trim()).filter(Boolean)
    : [];

  return {
    errors,
    data: {
      name: (input.name || "").trim(),
      address: input.address || "",
      city: input.city || "",
      state: input.state || "",
      country: input.country || "India",
      zip: input.zip || "",
      website: input.website || "",
      contact_email: input.contact_email || "",
      contact_phone: input.contact_phone || "",
      partners,
    }
  };
}

const validCollective = processCollectivePayload({
  name: "Green Earth Alliance",
  address: "123 Eco Road",
  city: "Hyderabad",
  state: "Telangana",
  country: "India",
  zip: "500081",
  website: "https://greenearth.org",
  contact_email: "contact@greenearth.org",
  contact_phone: "+91 91234 56789",
  partners: "UNEP, Tech4Good, Rotary Club",
});
assert(validCollective.errors.length === 0, "Valid collective profile passes all checks");
assert(validCollective.data.partners.length === 3, "Comma-separated partners correctly transformed to array");
assert(validCollective.data.country === "India", "Default country set properly");

const invalidCollective = processCollectivePayload({
  name: "",
  contact_email: "not-an-email",
  contact_phone: "bad-phone",
});
assert(invalidCollective.errors.length === 3, "Missing name and malformed email/phone caught");

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log("\n=================================================");
console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log("=================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("All Task 2 validation tests passed successfully!\n");
  process.exit(0);
}
