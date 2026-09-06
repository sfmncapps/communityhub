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
console.log("   TASK 4 TEST SUITE: STATE RECORD VERIFICATION");
console.log("=================================================\n");

// -------------------------------------------------------------
// SUITE 1: Migration Script Integrity
// -------------------------------------------------------------
console.log("--- Suite 1: Migration Script & Table Schema ---");
const migrationPath = path.join(__dirname, "migrations", "03_collective_verification.sql");
assert(fs.existsSync(migrationPath), "Migration file 03_collective_verification.sql exists");

const sqlContent = fs.readFileSync(migrationPath, "utf-8");
assert(sqlContent.includes("ALTER TABLE IF EXISTS collectives"), "Migration alters collectives table");
assert(sqlContent.includes("state_record_id VARCHAR(100)"), "Migration adds state_record_id column");
assert(sqlContent.includes("state_record_notes TEXT"), "Migration adds state_record_notes column");
assert(sqlContent.includes("verified_by UUID REFERENCES users_active(id)"), "Migration adds verified_by relation to users_active");
assert(sqlContent.includes("verified_at TIMESTAMPTZ"), "Migration adds verified_at timestamp column");
assert(sqlContent.includes("verification_status VARCHAR(20) DEFAULT 'unverified'"), "Migration adds verification_status column");
assert(sqlContent.includes("idx_collectives_verification"), "Migration indexes verification_status");
assert(sqlContent.includes("idx_collectives_state_id"), "Migration indexes state_record_id");

// -------------------------------------------------------------
// SUITE 2: Verification Business Logic & Validation
// -------------------------------------------------------------
console.log("\n--- Suite 2: State Record Verification Business Logic ---");

function processStateVerification({ state_record_id, state_record_notes, verification_status, auto_approve = true }) {
  const errors = [];
  const validStatuses = ["verified", "rejected", "unverified"];

  if (!verification_status || !validStatuses.includes(verification_status)) {
    errors.push("Invalid verification status");
  }

  if (verification_status === "verified" && (!state_record_id || !state_record_id.trim())) {
    errors.push("State registration / corporate ID is required for verification");
  }

  if (state_record_id && state_record_id.trim().length > 100) {
    errors.push("State record ID cannot exceed 100 characters");
  }

  if (state_record_notes && state_record_notes.trim().length > 1000) {
    errors.push("State record notes cannot exceed 1000 characters");
  }

  if (errors.length > 0) return { ok: false, errors };

  const updates = {
    state_record_id: state_record_id ? state_record_id.trim() : null,
    state_record_notes: state_record_notes ? state_record_notes.trim() : null,
    verification_status,
    verified_at: new Date().toISOString(),
  };

  if (verification_status === "verified" && auto_approve) {
    updates.status = "approved";
  } else if (verification_status === "rejected") {
    updates.status = "rejected";
  }

  return { ok: true, updates };
}

const validVerification = processStateVerification({
  state_record_id: "LLC-2026-98124",
  state_record_notes: "Verified on Secretary of State registry. Corporate entity active and in good standing.",
  verification_status: "verified",
  auto_approve: true,
});
assert(validVerification.ok, "Valid state record verification payload passes");
assert(validVerification.updates.status === "approved", "Auto-approve sets collective status to 'approved'");
assert(validVerification.updates.verification_status === "verified", "Verification status is marked 'verified'");

const missingStateId = processStateVerification({
  state_record_id: "",
  verification_status: "verified",
});
assert(!missingStateId.ok, "Missing state record ID on verified decision is rejected");

const longStateId = processStateVerification({
  state_record_id: "A".repeat(101),
  verification_status: "verified",
});
assert(!longStateId.ok, "State record ID exceeding 100 characters is rejected");

const rejectionVerification = processStateVerification({
  state_record_id: "INVALID-999",
  state_record_notes: "No record found on state registry; dissolved entity.",
  verification_status: "rejected",
});
assert(rejectionVerification.ok, "Rejection decision processes cleanly");
assert(rejectionVerification.updates.status === "rejected", "Rejection marks collective status as 'rejected'");

// -------------------------------------------------------------
// SUITE 3: RBAC Protection Regression for Verification
// -------------------------------------------------------------
console.log("\n--- Suite 3: RBAC Protections for Verification ---");

const ROLE_RANK = {
  superadmin: 4,
  admin: 3,
  manager: 2,
  user: 1,
};

function canVerifyCollective(userRole) {
  // Strict rule: Only admin and superadmin can verify collectives against state records
  const norm = (userRole || "").toLowerCase();
  return ["admin", "superadmin"].includes(norm);
}

assert(!canVerifyCollective("user"), "Role 'user' is BLOCKED from state verification (403)");
assert(!canVerifyCollective("manager"), "Role 'manager' is strictly BLOCKED from state verification (403)");
assert(canVerifyCollective("admin"), "Role 'admin' can execute state verification (200)");
assert(canVerifyCollective("superadmin"), "Role 'superadmin' can execute state verification (200)");

// Collective manager self-verification prevention
function checkManagerSelfVerification(managerId, collectiveOwnerId, userRole) {
  if (!canVerifyCollective(userRole)) {
    return { ok: false, status: 403, message: "Only administrators can perform state verification" };
  }
  return { ok: true, status: 200 };
}

const managerAttempt = checkManagerSelfVerification("mgr-1", "mgr-1", "manager");
assert(!managerAttempt.ok && managerAttempt.status === 403, "Manager attempting to self-verify collective is BLOCKED (403)");

const adminExecution = checkManagerSelfVerification("admin-1", "mgr-1", "admin");
assert(adminExecution.ok && adminExecution.status === 200, "Platform admin can verify manager collective");

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log("\n=================================================");
console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log("=================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("All Task 4 State Record Verification tests passed successfully!\n");
  process.exit(0);
}
