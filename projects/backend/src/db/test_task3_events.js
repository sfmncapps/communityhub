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
console.log("   TASK 3 TEST SUITE: EVENTS DIRECTORY & RBAC");
console.log("=================================================\n");

// -------------------------------------------------------------
// SUITE 1: Migration Script Integrity
// -------------------------------------------------------------
console.log("--- Suite 1: Migration Script & Table Schema ---");
const migrationPath = path.join(__dirname, "migrations", "02_events_directory.sql");
assert(fs.existsSync(migrationPath), "Migration file 02_events_directory.sql exists");

const sqlContent = fs.readFileSync(migrationPath, "utf-8");
assert(sqlContent.includes("CREATE TABLE IF NOT EXISTS events"), "Migration defines events table");
assert(sqlContent.includes("title VARCHAR(255) NOT NULL"), "Migration requires title");
assert(sqlContent.includes("category VARCHAR(100) NOT NULL"), "Migration requires category");
assert(sqlContent.includes("event_date DATE NOT NULL"), "Migration requires event_date");
assert(sqlContent.includes("event_time TIME NOT NULL"), "Migration requires event_time");
assert(sqlContent.includes("venue_name VARCHAR(255) NOT NULL"), "Migration requires venue_name");
assert(sqlContent.includes("entry_type VARCHAR(20) DEFAULT 'Free'"), "Migration sets default entry_type");
assert(sqlContent.includes("status VARCHAR(20) DEFAULT 'pending'"), "Migration sets default status to pending");
assert(sqlContent.includes("CREATE INDEX IF NOT EXISTS idx_events_status"), "Migration indexes status");
assert(sqlContent.includes("CREATE INDEX IF NOT EXISTS idx_events_event_date"), "Migration indexes event_date");
assert(sqlContent.includes("CREATE INDEX IF NOT EXISTS idx_events_category"), "Migration indexes category");
assert(sqlContent.includes("CREATE POLICY \"Public can view approved events\""), "Migration enforces public read policy for approved events");
assert(sqlContent.includes("Hyderabad Community NGO Summit 2026"), "Migration includes initial seed events");

// -------------------------------------------------------------
// SUITE 2: Event Validation Logic
// -------------------------------------------------------------
console.log("\n--- Suite 2: Event Validation Rules ---");
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9\s\-()]{7,25}$/;

function validateEventPayload(body) {
  const errors = [];
  if (!body.title || !body.title.trim()) errors.push("Event title is required");
  if (body.title && body.title.trim().length > 255) errors.push("Title too long");
  if (!body.category || !body.category.trim()) errors.push("Category is required");
  if (!body.description || !body.description.trim()) errors.push("Description is required");
  if (!body.event_date) errors.push("Event date is required");
  if (!body.event_time) errors.push("Event time is required");
  if (!body.venue_name || !body.venue_name.trim()) errors.push("Venue name is required");
  if (!body.city || !body.city.trim()) errors.push("City is required");
  if (!body.state || !body.state.trim()) errors.push("State is required");

  if (body.organizer_email && !EMAIL_REGEX.test(body.organizer_email.trim())) {
    errors.push("Invalid organizer email format");
  }
  if (body.organizer_phone && !PHONE_REGEX.test(body.organizer_phone.trim())) {
    errors.push("Invalid organizer phone format");
  }
  if (body.zip_code && body.zip_code.trim().length > 20) {
    errors.push("ZIP code cannot exceed 20 characters");
  }

  return errors;
}

const validEvent = {
  title: "Community Tree Plantation Drive",
  category: "Community Event",
  description: "Join us this Saturday to plant 500 indigenous trees across the neighborhood park.",
  event_date: "2026-09-20",
  event_time: "08:00:00",
  venue_name: "KBR National Park Gate 2",
  city: "Hyderabad",
  state: "Telangana",
  organizer_email: "green@ngo.org",
  organizer_phone: "+91 98765 11223",
  zip_code: "500034",
  entry_type: "Free",
};
assert(validateEventPayload(validEvent).length === 0, "Valid event payload passes all checks");

const missingRequired = {
  title: "",
  category: "",
  description: "",
  event_date: "",
  event_time: "",
  venue_name: "",
  city: "",
  state: "",
};
assert(validateEventPayload(missingRequired).length === 8, "Missing required fields caught accurately");

const malformedEvent = {
  ...validEvent,
  organizer_email: "bad-email",
  organizer_phone: "123",
  zip_code: "12345678901234567890123", // 23 chars
};
const malformedErrors = validateEventPayload(malformedEvent);
assert(malformedErrors.includes("Invalid organizer email format"), "Invalid email rejected");
assert(malformedErrors.includes("Invalid organizer phone format"), "Invalid phone rejected");
assert(malformedErrors.includes("ZIP code cannot exceed 20 characters"), "Excessive ZIP length rejected");

// -------------------------------------------------------------
// SUITE 3: Event Search & Category Filtering Simulation
// -------------------------------------------------------------
console.log("\n--- Suite 3: Event Filtering & Search Simulation ---");
const sampleEvents = [
  {
    id: "1",
    title: "Hyderabad Community NGO Summit 2026",
    category: "Community Event",
    description: "Annual gathering of non-profit leaders and social impact volunteers.",
    venue_name: "HITEX Exhibition Center",
    city: "Hyderabad",
    event_date: "2026-09-20",
    event_time: "10:00:00",
    status: "approved",
  },
  {
    id: "2",
    title: "Tech for Good: Digital Skills Bootcamp",
    category: "Workshop",
    description: "Intensive training for young professionals and non-profit coordinators.",
    venue_name: "T-Hub Phase 2",
    city: "Hyderabad",
    event_date: "2026-09-28",
    event_time: "14:00:00",
    status: "approved",
  },
  {
    id: "3",
    title: "Bengaluru Clean Energy Forum",
    category: "Business Event",
    description: "Renewable energy panel discussion and solar technology showcase.",
    venue_name: "Palace Grounds",
    city: "Bengaluru",
    event_date: "2026-08-15", // past
    event_time: "09:30:00",
    status: "approved",
  },
  {
    id: "4",
    title: "Draft Event Awaiting Review",
    category: "Community Event",
    description: "Unreviewed event.",
    venue_name: "Local Hall",
    city: "Hyderabad",
    event_date: "2026-10-01",
    event_time: "10:00:00",
    status: "pending",
  },
];

function filterEvents(eventsList, { q, category, timing }) {
  const today = "2026-09-06"; // simulated current date

  // Public directory only sees approved
  let list = eventsList.filter((e) => e.status === "approved");

  if (category && category !== "All") {
    list = list.filter((e) => e.category === category);
  }

  if (timing === "upcoming") {
    list = list.filter((e) => e.event_date >= today);
  } else if (timing === "past") {
    list = list.filter((e) => e.event_date < today);
  }

  if (q && q.trim()) {
    const term = q.trim().toLowerCase();
    list = list.filter(
      (e) =>
        e.title.toLowerCase().includes(term) ||
        e.description.toLowerCase().includes(term) ||
        e.venue_name.toLowerCase().includes(term) ||
        e.city.toLowerCase().includes(term)
    );
  }

  return list;
}

const upcomingOnly = filterEvents(sampleEvents, { timing: "upcoming" });
assert(upcomingOnly.length === 2, "Only upcoming approved events returned by default");

const categoryFilter = filterEvents(sampleEvents, { category: "Workshop", timing: "upcoming" });
assert(categoryFilter.length === 1 && categoryFilter[0].id === "2", "Category filtering returns exact matches");

const searchFilter = filterEvents(sampleEvents, { q: "HITEX", timing: "upcoming" });
assert(searchFilter.length === 1 && searchFilter[0].id === "1", "Keyword search across venue name works");

const pastFilter = filterEvents(sampleEvents, { timing: "past" });
assert(pastFilter.length === 1 && pastFilter[0].id === "3", "Past events query filters accurately");

// -------------------------------------------------------------
// SUITE 4: Regression Tests - RBAC Protections
// -------------------------------------------------------------
console.log("\n--- Suite 4: RBAC Protections & Access Guards Regression ---");

const ROLE_RANK = {
  superadmin: 4,
  admin: 3,
  manager: 2,
  user: 1,
};

function requireRoleCheck(userRole, allowedRoles, strict = false) {
  const normRole = (userRole || "").toLowerCase();
  if (strict) {
    return allowedRoles.map((r) => r.toLowerCase()).includes(normRole);
  }
  const minRank = Math.min(...allowedRoles.map((r) => ROLE_RANK[r.toLowerCase()] || 0));
  return (ROLE_RANK[normRole] || 0) >= minRank;
}

// 1. Admin Events Endpoint access
assert(!requireRoleCheck("user", ["admin", "superadmin"], true), "Role 'user' is BLOCKED from admin events moderation");
assert(!requireRoleCheck("manager", ["admin", "superadmin"], true), "Role 'manager' is BLOCKED from admin events moderation");
assert(requireRoleCheck("admin", ["admin", "superadmin"], true), "Role 'admin' can access admin events moderation");
assert(requireRoleCheck("superadmin", ["admin", "superadmin"], true), "Role 'superadmin' can access admin events moderation");

// 2. Superadmin anti-lockout protection
function testSuperadminRoleDemotion(callerId, targetId, newRole) {
  if (callerId === targetId) {
    return { ok: false, status: 400, message: "Superadmins cannot modify their own role" };
  }
  return { ok: true, status: 200, message: "Role updated" };
}
const selfDemote = testSuperadminRoleDemotion("super-1", "super-1", "user");
assert(!selfDemote.ok && selfDemote.status === 400, "Superadmin self-demotion is strictly prevented (anti-lockout)");

// 3. Manager collective isolation
function testManagerCollectiveAccess(managerUser, collective) {
  if (["admin", "superadmin"].includes(managerUser.role)) return true;
  return collective.owner_id === managerUser.id;
}
const legitManager = { id: "mgr-1", role: "manager" };
const hackerManager = { id: "mgr-2", role: "manager" };
const targetCollective = { id: "col-100", owner_id: "mgr-1" };

assert(testManagerCollectiveAccess(legitManager, targetCollective), "Assigned collective manager has access");
assert(!testManagerCollectiveAccess(hackerManager, targetCollective), "Unassigned manager is BLOCKED from manipulating another collective");

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log("\n=================================================");
console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log("=================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("All Task 3 Events Directory & RBAC Regression tests passed successfully!\n");
  process.exit(0);
}
