import "dotenv/config";

import { requireRole, requireExactRole } from "../middleware/requireRole.js";
import { requireCollectiveManager } from "../middleware/requireCollectiveManager.js";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runTests() {
  console.log("==================================================");
  console.log("RUNNING TASK 1 RBAC & MANAGER SECURITY TESTS");
  console.log("==================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  // Helper to create mock Express req/res
  const createMockReqRes = (user, params = {}, body = {}) => {
    const req = {
      activeUser: user,
      params,
      body,
    };
    let statusCode = 200;
    let jsonResponse = null;
    let nextCalled = false;

    const res = {
      status: (code) => {
        statusCode = code;
        return res;
      },
      json: (data) => {
        jsonResponse = data;
        return res;
      },
    };

    const next = () => {
      nextCalled = true;
    };

    return { req, res, next, getStatus: () => statusCode, getJson: () => jsonResponse, wasNextCalled: () => nextCalled };
  };

  // --- TEST 1: Admin Routes Restricted from 'user' role ---
  {
    const mw = requireRole(["admin", "superadmin"], { strict: true });
    const { req, res, next, getStatus } = createMockReqRes({ id: "u-1", role: "user" });
    mw(req, res, next);
    assert(getStatus() === 403, "Role 'user' is blocked (403) from accessing admin routes");
  }

  // --- TEST 2: Admin Routes Restricted from 'manager' role ---
  {
    const mw = requireRole(["admin", "superadmin"], { strict: true });
    const { req, res, next, getStatus } = createMockReqRes({ id: "m-1", role: "manager" });
    mw(req, res, next);
    assert(getStatus() === 403, "Role 'manager' is strictly blocked (403) from accessing global admin routes");
  }

  // --- TEST 3: Admin Routes Accessible by 'admin' role ---
  {
    const mw = requireRole(["admin", "superadmin"], { strict: true });
    const { req, res, next, wasNextCalled } = createMockReqRes({ id: "a-1", role: "admin" });
    mw(req, res, next);
    assert(wasNextCalled() === true, "Role 'admin' is granted access to admin routes");
  }

  // --- TEST 4: Admin Routes Accessible by 'superadmin' role ---
  {
    const mw = requireRole(["admin", "superadmin"], { strict: true });
    const { req, res, next, wasNextCalled } = createMockReqRes({ id: "sa-1", role: "superadmin" });
    mw(req, res, next);
    assert(wasNextCalled() === true, "Role 'superadmin' is granted access to admin routes");
  }

  // --- TEST 5: Role Modification Endpoint: Blocked for 'admin' (Superadmin Only) ---
  {
    const mw = requireExactRole(["superadmin"]);
    const { req, res, next, getStatus } = createMockReqRes({ id: "a-1", role: "admin" });
    mw(req, res, next);
    assert(getStatus() === 403, "Role 'admin' attempting role update is blocked with 403 (Superadmin only)");
  }

  // --- TEST 6: Role Modification Endpoint: Allowed for 'superadmin' ---
  {
    const mw = requireExactRole(["superadmin"]);
    const { req, res, next, wasNextCalled } = createMockReqRes({ id: "sa-1", role: "superadmin" });
    mw(req, res, next);
    assert(wasNextCalled() === true, "Role 'superadmin' passes role update authorization guard");
  }

  // --- TEST 7: Superadmin Self-Demotion / Lockout Prevention ---
  {
    const { updateUserRole } = await import("../controllers/adminController.js");
    const { req, res, getStatus, getJson } = createMockReqRes(
      { id: "sa-1", role: "superadmin" },
      { id: "sa-1" },
      { role: "user" }
    );
    await updateUserRole(req, res);
    assert(
      getStatus() === 400 && getJson()?.message?.includes("prevent leaving the platform without a root account"),
      "Superadmin attempting to modify their own role is rejected with 400 (anti-lockout guard)"
    );
  }

  // Real collective ID from database
  const realColId = "68f98f58-38e5-446c-a0d7-f7aec212437f";

  // --- TEST 8: Platform Admin Oversight on Collective Manager API ---
  {
    const { req, res, next, wasNextCalled } = createMockReqRes(
      { id: "admin-1", role: "admin" },
      { id: realColId }
    );
    await requireCollectiveManager(req, res, next);
    assert(wasNextCalled() === true, "Platform admin oversight passes requireCollectiveManager guard");
  }

  // --- TEST 9: Manager Accessing Another Manager's Collective (Manipulated ID) ---
  {
    const { req, res, next, getStatus, getJson } = createMockReqRes(
      { id: "attacker-mgr-999", role: "manager" },
      { id: realColId }
    );
    await requireCollectiveManager(req, res, next);
    assert(
      getStatus() === 403 && getJson()?.message?.includes("You do not have management permissions"),
      "Manager attempting to access another collective by manipulating ID is BLOCKED with 403"
    );
  }

  // --- TEST 10: Normal User Accessing Collective Manager API ---
  {
    const { req, res, next, getStatus, getJson } = createMockReqRes(
      { id: "regular-user-1", role: "user" },
      { id: realColId }
    );
    await requireCollectiveManager(req, res, next);
    assert(
      getStatus() === 403 && getJson()?.message?.includes("Only authorized collective managers"),
      "Normal user attempting to access collective manager API is BLOCKED with 403"
    );
  }

  // --- TEST 11: Non-Existent Collective ID ---
  {
    const { req, res, next, getStatus } = createMockReqRes(
      { id: "admin-1", role: "admin" },
      { id: "00000000-0000-0000-0000-000000000000" }
    );
    await requireCollectiveManager(req, res, next);
    assert(getStatus() === 404, "Accessing non-existent collective ID returns 404 Not Found");
  }

  console.log("\n==================================================");
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) process.exit(1);
}

runTests().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
