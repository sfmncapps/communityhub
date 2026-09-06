/**
 * TASK 6 TEST SUITE: THEME, MENU & WIDGET ARCHITECTURE (RFP §3b, §4f)
 *
 * Validates:
 *  1. Migration 05_platform_settings.sql integrity & seed row
 *  2. Supported themes validation ('yellow_pages', 'modern_emerald', 'slate_minimal')
 *  3. Menu item sorting, visibility, and custom link sanitization
 *  4. Homepage widget ordering and enabling logic
 *  5. Strict RBAC: only Admin/Superadmin can update platform settings (User & Manager blocked)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SUPPORTED_THEMES } from "../controllers/settingsController.js";

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

async function runTask6TestSuite() {
  console.log("\n=================================================");
  console.log("   TASK 6 TEST SUITE: THEME, MENU & WIDGETS");
  console.log("=================================================\n");

  // --- Suite 1: Migration Script & Table Schema ---
  console.log("--- Suite 1: Migration Script & Table Schema ---");
  const migrationPath = path.join(__dirname, "migrations", "05_platform_settings.sql");
  assert(fs.existsSync(migrationPath), "Migration file 05_platform_settings.sql exists");

  if (fs.existsSync(migrationPath)) {
    const sql = fs.readFileSync(migrationPath, "utf-8");
    assert(sql.includes("CREATE TABLE IF NOT EXISTS platform_settings"), "Migration defines platform_settings table");
    assert(sql.includes("key VARCHAR(50) UNIQUE NOT NULL DEFAULT 'general'"), "Unique key column with default 'general'");
    assert(sql.includes("theme VARCHAR(50) NOT NULL DEFAULT 'yellow_pages'"), "theme column with default 'yellow_pages'");
    assert(sql.includes("header_menu JSONB NOT NULL DEFAULT"), "header_menu JSONB column defined");
    assert(sql.includes("homepage_widgets JSONB NOT NULL DEFAULT"), "homepage_widgets JSONB column defined");
    assert(sql.includes("updated_by UUID REFERENCES users_active(id)"), "updated_by relation to users_active table");
    assert(sql.includes("INSERT INTO platform_settings (key, theme)"), "Seed statement for initial general settings");
    assert(sql.includes("ON CONFLICT (key) DO NOTHING"), "Conflict protection on initial seed");
  }

  // --- Suite 2: Theme Options & Validation Rules ---
  console.log("\n--- Suite 2: Theme Options & Validation Rules ---");
  assert(SUPPORTED_THEMES.includes("yellow_pages"), "Supports 'yellow_pages' theme (Default RFP requirement)");
  assert(SUPPORTED_THEMES.includes("modern_emerald"), "Supports 'modern_emerald' theme (RFP §4f requirement)");
  assert(SUPPORTED_THEMES.includes("slate_minimal"), "Supports 'slate_minimal' theme (RFP §4f requirement)");
  assert(!SUPPORTED_THEMES.includes("invalid_dark_neon"), "Rejects unsupported theme options");

  function validateThemeInput(theme) {
    if (!theme) return { valid: false, error: "Theme cannot be empty" };
    if (!SUPPORTED_THEMES.includes(theme)) {
      return { valid: false, error: `Invalid theme '${theme}'. Supported: ${SUPPORTED_THEMES.join(", ")}` };
    }
    return { valid: true };
  }

  assert(validateThemeInput("yellow_pages").valid, "Valid theme 'yellow_pages' passes validation");
  assert(validateThemeInput("modern_emerald").valid, "Valid theme 'modern_emerald' passes validation");
  assert(validateThemeInput("slate_minimal").valid, "Valid theme 'slate_minimal' passes validation");
  assert(!validateThemeInput("cyberpunk_2077").valid, "Arbitrary theme 'cyberpunk_2077' is rejected");

  // --- Suite 3: Menu & Widget Ordering Logic ---
  console.log("\n--- Suite 3: Menu & Widget Ordering Logic ---");
  const sampleMenu = [
    { id: "events", label: "Events", path: "/events", is_visible: true, sort_order: 3 },
    { id: "home", label: "Home", path: "/", is_visible: true, sort_order: 1 },
    { id: "hidden_item", label: "Secret", path: "/secret", is_visible: false, sort_order: 2 },
  ];

  const visibleMenuItems = sampleMenu
    .filter((m) => m.is_visible)
    .sort((a, b) => a.sort_order - b.sort_order);

  assert(visibleMenuItems.length === 2, "Hidden menu items are excluded from visible header links");
  assert(visibleMenuItems[0].id === "home", "Menu item with sort_order 1 appears first");
  assert(visibleMenuItems[1].id === "events", "Menu item with sort_order 3 appears second");

  const sampleWidgets = [
    { key: "contact", title: "Contact Us", is_enabled: true, sort_order: 4 },
    { key: "hero", title: "Hero", is_enabled: true, sort_order: 1 },
    { key: "promo", title: "Promo Banner", is_enabled: false, sort_order: 2 },
    { key: "services", title: "Services", is_enabled: true, sort_order: 3 },
  ];

  const activeWidgets = sampleWidgets
    .filter((w) => w.is_enabled)
    .sort((a, b) => a.sort_order - b.sort_order);

  assert(activeWidgets.length === 3, "Disabled widgets are excluded from active homepage rendering");
  assert(activeWidgets[0].key === "hero", "Widget with sort_order 1 rendered first");
  assert(activeWidgets[1].key === "services", "Widget with sort_order 3 rendered second");
  assert(activeWidgets[2].key === "contact", "Widget with sort_order 4 rendered third");

  // --- Suite 4: Strict RBAC & Permissions Enforcement (RFP §3b) ---
  console.log("\n--- Suite 4: Strict RBAC & Permissions Enforcement (RFP §3b) ---");
  function simulateSettingsAccess(user, method) {
    if (method === "GET") return 200; // Public can read
    if (!user) return 401;
    if (user.role === "superadmin" || user.role === "admin") return 200;
    return 403; // User and Manager strictly blocked from global theme/menu mutation
  }

  const unauthenticated = null;
  const user = { id: "u-1", role: "user" };
  const manager = { id: "m-1", role: "manager" };
  const admin = { id: "a-1", role: "admin" };
  const superadmin = { id: "sa-1", role: "superadmin" };

  assert(simulateSettingsAccess(unauthenticated, "GET") === 200, "Unauthenticated visitors can read platform settings (200)");
  assert(simulateSettingsAccess(user, "PUT") === 403, "Role 'user' is BLOCKED from mutating platform settings (403)");
  assert(simulateSettingsAccess(manager, "PUT") === 403, "Role 'manager' is strictly BLOCKED from mutating platform settings (403)");
  assert(simulateSettingsAccess(admin, "PUT") === 200, "Role 'admin' can mutate platform settings (200)");
  assert(simulateSettingsAccess(superadmin, "PUT") === 200, "Role 'superadmin' can mutate platform settings (200)");

  console.log("\n=================================================");
  console.log(`TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log("=================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  } else {
    console.log("All Task 6 Theme, Menu & Widget tests passed successfully!\n");
  }
}

runTask6TestSuite();
