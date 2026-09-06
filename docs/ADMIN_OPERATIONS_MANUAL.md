# CommunityHub v1.0 — Administrator Operations Manual

This manual provides operating procedures for **Superadmins**, **Admins**, and **Managers** operating the CommunityHub v1.0 platform.

---

## 1. 4-Tier Role-Based Access Control (RBAC) Overview

CommunityHub strictly enforces a 4-tier privilege model defined in RFP §3:

| Role | Access Level | Description | Key Privileges |
| :--- | :--- | :--- | :--- |
| **Superadmin ("root")** | Platform Root | Full access across all collectives, users, settings, and infrastructure. | Assign/revoke roles, platform settings, oversight on all managers, emergency moderation. |
| **Admin** | Operations Admin | Features administration and community operations. | Verify IDs, verify collective state records, moderate events, configure themes/menus/widgets. |
| **Manager** | Collective Admin | Isolated management of assigned collective only. | Edit collective profile, manage sub-page hierarchy (`/:slug/:subPage`), message collective members. |
| **User** | Community Member | Individual registered participant. | View directory, view events, manage personal profile, submit listings, direct messaging. |

> [!CAUTION]
> **Strict Manager Boundary:** Managers are strictly isolated to their own collective (`owner_id` or authorized membership). Cross-collective modification requests return HTTP `403 Forbidden`.

---

## 2. Collective State-Record Verification (RFP §7e)

Platform Admins and Superadmins manually verify organizations against state records (e.g., Secretary of State corporations registry).

### Procedure:
1. Log into the Admin Panel at `/admin` and select the **Directory / Collectives** tab.
2. Locate a collective with status `unverified` or `pending`.
3. Click the **"Verify State Record"** action button.
4. Search the corresponding official state corporate registry for the legal entity name.
5. In the verification dialog:
   - Enter the official **State Corporate / Registration ID** (e.g., `C1234567` or `LLC-98765`).
   - Enter verification audit notes (e.g., *"Confirmed active LLC status in CA Secretary of State database on 2026-09-06"*).
6. Select **Approve (Verified)** or **Reject**.
7. The collective immediately receives the green **"State Verified"** badge on its public Yellow Pages directory listing and profile.

---

## 3. Individual ID Verification (RFP §7c)

Users submit redacted government-issued photo IDs (e.g., Driver's License or National ID) for manual approval.

### Procedure:
1. Open the **ID Verification** tab in the Admin Panel (`/admin`).
2. Review the submitted document in the secure preview modal.
3. Verify that the name matches the user's registered name and that sensitive personal numbers (SSN/full DL number) are properly redacted.
4. Click **Approve** to award verified member status, or **Reject** with feedback explaining why the upload was invalid.

---

## 4. Events Directory Moderation (RFP §8.7b)

CommunityHub features a moderated community events calendar.

### Moderation Workflow:
1. Navigate to **Events** in the Admin panel.
2. Filter by status: `Pending`, `Approved`, or `Rejected`.
3. Click on a pending submission to inspect:
   - Title, category, start date/time, venue address, and description.
   - Host collective or individual submitter.
4. Click **Approve** to publish the event immediately to `/events` and `/events/:id`.
5. Approved events automatically reflect in the public calendar, date range search, and category filters.

---

## 5. Visual Theming & Menu Customization (RFP §3b, §4f)

Admins can customize the visual styling and navigation structure without redeploying code.

### Available Themes:
1. **Yellow Pages (Default):** Warm, high-contrast amber/yellow theme honoring classic directory layouts.
2. **Modern Emerald:** Clean corporate forest emerald and mint accents tailored for environmental/civic non-profits.
3. **Slate Minimal:** Monochromatic high-tech theme with deep indigo touches.

### Customizing Appearance:
1. Open the **Theme & Layout** tab in `/admin`.
2. **Select Theme:** Click a theme card to immediately set the default look-and-feel.
3. **Top Navigation Menu:**
   - Reorder items using the **Up** / **Down** arrows.
   - Toggle visibility (**Visible** vs **Hidden**).
   - Add new custom navigation links with target URLs.
4. **Homepage Widgets:**
   - Reorder sections: Hero Banner, Community Pillars, About, Join/Contact.
   - Toggle widgets on or off.
5. Click **"Save Appearance Settings"** to persist updates site-wide.

---

## 6. Messaging & Email Mirroring (RFP §5c, §5d, §5e)

1. **Manager Messages:** Managers can send broadcast messages to all members of their assigned collective.
2. **Admin Messages:** Admins can send platform-wide announcements.
3. **Email Mirroring:** All direct messages and broadcasts automatically trigger mirrored email notifications to the recipient's primary email via the configured SMTP service.
