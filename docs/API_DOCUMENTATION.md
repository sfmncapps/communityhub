# CommunityHub v1.0 — REST API Specification

CommunityHub v1.0 exposes RESTful JSON endpoints mounted under `/api`. All authenticated endpoints expect a standard `Bearer <TOKEN>` in the `Authorization` request header.

---

## 1. System Diagnostics & Health

### `GET /api/health`
Returns health, uptime, and database connectivity.
- **Access:** Public
- **Response `200 OK`:**
  ```json
  {
    "ok": true,
    "service": "CommunityHub API",
    "version": "1.0.0",
    "environment": "production",
    "uptimeSeconds": 124,
    "timestamp": "2026-09-06T12:00:00.000Z",
    "database": { "status": "connected" }
  }
  ```

---

## 2. Authentication & SSO (`/api/auth`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/auth/providers` | Public | Lists all active SSO providers and technical notes. |
| `POST` | `/api/auth/login` | Public | Password login with username/email/phone. |
| `POST` | `/api/auth/send-otp` | Public | Sends OTP for new registration (Email/Phone). |
| `POST` | `/api/auth/verify-otp` | Public | Verifies signup OTP and returns temporary token. |
| `POST` | `/api/auth/complete-signup` | Temp Token | Sets initial password and auto-approves account. |
| `POST` | `/api/auth/send-login-otp` | Public | Sends login OTP to existing user. |
| `POST` | `/api/auth/verify-login-otp` | Public | Verifies login OTP and issues 7-day JWT. |
| `POST` | `/api/auth/whatsapp/send-otp` | Public | Initiates unified passwordless WhatsApp OTP. |
| `POST` | `/api/auth/whatsapp/verify-otp` | Public | Verifies WhatsApp OTP and returns user session. |
| `POST` | `/api/auth/oauth-check` | Bearer Token | Post-OAuth token exchange and account auto-provisioning. |
| `GET` | `/api/auth/me` | Logged In | Fetches user's own profile (discrete name/address). |
| `PUT` | `/api/auth/me` | Logged In | Updates user's discrete profile fields. |

---

## 3. Administration & RBAC (`/api/admin`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/users` | Admin / Superadmin | Paginated list of all active platform users. |
| `PUT` | `/api/admin/users/:id/role` | Superadmin Only | Modifies user's platform role (`user`, `manager`, `admin`, `superadmin`). |
| `GET` | `/api/admin/collectives` | Admin / Superadmin | Lists all directory collectives with verification status. |
| `PUT` | `/api/admin/collectives/:id/status` | Admin / Superadmin | Approves or rejects collective directory listing. |

---

## 4. Collectives & Sub-Page Hierarchy (`/api/collectives`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/collectives/slug/:slug` | Public | Returns collective overview by URL slug. |
| `GET` | `/api/collectives/slug/:slug/pages` | Public | Returns published sub-pages for collective hierarchy. |
| `GET` | `/api/collectives/slug/:slug/pages/:pageSlug` | Public | Returns specific published sub-page content. |
| `GET` | `/api/collectives/:id/pages` | Manager / Admin | Returns all sub-pages (including drafts) for collective manager. |
| `POST` | `/api/collectives/:id/pages` | Manager / Admin | Creates a new sub-page in collective hierarchy. |
| `PUT` | `/api/collectives/:id/pages/:pageId` | Manager / Admin | Updates page title, slug, content, order, or published state. |
| `DELETE` | `/api/collectives/:id/pages/:pageId` | Manager / Admin | Deletes sub-page from hierarchy. |

---

## 5. Verification Workflows (`/api/verification`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/verification/upload-id` | Logged In | Submits redacted ID document for verification. |
| `GET` | `/api/verification/pending-ids` | Admin / Superadmin | Lists pending individual ID submissions. |
| `PUT` | `/api/verification/review-id/:id` | Admin / Superadmin | Approves or rejects user ID document. |
| `PUT` | `/api/verification/collective-state/:id` | Admin / Superadmin | Manually records state registration ID and audits collective. |

---

## 6. Events Directory (`/api/events`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/events` | Public | Lists approved events with date/category filters. |
| `GET` | `/api/events/:id` | Public | Fetches detailed event information and RSVP link. |
| `POST` | `/api/events` | Logged In | Submits a new event for administrator moderation. |
| `GET` | `/api/events/admin/all` | Admin / Superadmin | Lists all events across pending, approved, rejected. |
| `PUT` | `/api/events/admin/:id/status` | Admin / Superadmin | Moderates event submission (approve/reject). |

---

## 7. Platform Appearance & Settings (`/api/settings`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/settings` | Public | Fetches active theme, header menu, and homepage widgets. |
| `PUT` | `/api/settings` | Admin / Superadmin | Updates site appearance, theme palette, and menu order. |
