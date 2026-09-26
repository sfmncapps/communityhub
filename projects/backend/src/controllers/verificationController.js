import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { sendEmailOtp } from "../utils/notify.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

import { insertRecord, readStore, updateRecord } from "../db/localStore.js";

// ============================================================
// DEDICATED ORGANIZATION / EMPLOYER VERIFICATION
// ============================================================

/**
 * POST /api/verification/organization and /api/verification/upload
 * User submits Organization/Employer Verification
 */
export const submitOrganizationVerification = async (req, res) => {
  try {
    const rawCompanyName = req.body.company_name || req.body.business_name || req.activeUser?.company_name || req.activeUser?.name;
    const docUrl = req.body.document_url || req.body.redacted_id_url || req.body.id_document_url || req.body.file_url;
    const photoUrl = req.body.photo_url || req.body.storefront_photo_url || req.body.logo_url || null;
    const regNum = req.body.registration_number || req.body.id_type || null;

    if (!rawCompanyName || !rawCompanyName.trim()) {
      return res.status(400).json({ message: "Company or Organization name is required" });
    }
    if (!docUrl || !docUrl.trim()) {
      return res.status(400).json({ message: "Official registration or verification document is required" });
    }

    const payload = {
      id: `verif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      user_id: req.activeUser.id,
      company_name: rawCompanyName.trim(),
      registration_number: regNum ? regNum.trim() : null,
      document_url: docUrl.trim(),
      redacted_id_url: docUrl.trim(),
      photo_url: photoUrl ? photoUrl.trim() : null,
      status: "pending",
      rejection_reason: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let savedRecord = null;
    // 1. Try Supabase
    try {
      const { data, error } = await supabase
        .from("organization_verifications")
        .insert([{
          user_id: payload.user_id,
          company_name: payload.company_name,
          registration_number: payload.registration_number,
          document_url: payload.document_url,
          photo_url: payload.photo_url,
          status: payload.status,
          updated_at: payload.updated_at,
        }])
        .select()
        .single();
      if (!error && data) savedRecord = data;
    } catch (err) {
      console.warn("organization_verifications Supabase insert warning:", err.message);
    }

    // 2. Persist to localStore
    const localSaved = insertRecord("organization_verifications.json", savedRecord || payload);
    if (!savedRecord) savedRecord = localSaved;

    // 3. Keep users_active in sync
    try {
      await supabase
        .from("users_active")
        .update({
          company_name: payload.company_name,
          verification_status: "pending",
          redacted_id_url: payload.document_url,
          verification_notes: null,
        })
        .eq("id", req.activeUser.id);
    } catch (err) {
      console.warn("users_active sync warning:", err.message);
    }

    return res.status(201).json({
      message: "Organization verification submitted for administrator review. Once approved, you can publish job openings.",
      verification: savedRecord || payload,
    });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

/**
 * GET /api/verification/organization/status
 * Check current user's organization verification status
 */
export const getMyOrganizationVerification = async (req, res) => {
  try {
    let orgRecord = null;
    try {
      const { data, error } = await supabase
        .from("organization_verifications")
        .select("*")
        .eq("user_id", req.activeUser.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!error && data) orgRecord = data;
    } catch {}

    if (!orgRecord) {
      const localRecords = readStore("organization_verifications.json");
      orgRecord = localRecords
        .filter((r) => r.user_id === req.activeUser.id)
        .sort((a, b) => new Date(b.created_at || b.updated_at) - new Date(a.created_at || a.updated_at))[0] || null;
    }

    if (orgRecord) {
      return res.json({ verification: orgRecord });
    }

    // Fallback to active user profile fields
    const isApproved =
      req.activeUser.verification_status === "verified" ||
      req.activeUser.role === "employer";

    return res.json({
      verification: {
        status: isApproved ? "approved" : (req.activeUser.verification_status || "unverified"),
        company_name: req.activeUser.company_name || "",
        document_url: req.activeUser.redacted_id_url || "",
        photo_url: req.activeUser.company_logo || req.activeUser.profile_pic || "",
        rejection_reason: req.activeUser.verification_notes || "",
      },
    });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

/**
 * GET /api/verification/organization/pending
 * Admin/Superadmin list all organization verifications
 */
export const getPendingOrganizationVerifications = async (req, res) => {
  try {
    const { status = "pending" } = req.query;

    // Fetch active users for metadata and verified state check
    let usersMap = new Map();
    try {
      const { data: usersData } = await supabase
        .from("users_active")
        .select("id, username, name, email, phone, role, company_name, verification_status, redacted_id_url, created_at");
      if (usersData) {
        for (const u of usersData) {
          usersMap.set(String(u.id), u);
        }
      }
    } catch {}

    const localRecords = readStore("organization_verifications.json");
    // Sort local records newest first
    localRecords.sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));

    // Deduplicate by user_id so each organization has one canonical entry
    const dedupedByUser = new Map();
    for (const rec of localRecords) {
      const uid = String(rec.user_id || rec.id);
      if (!dedupedByUser.has(uid)) {
        const u = usersMap.get(uid);
        // If users_active is verified, align local status if needed
        let effStatus = rec.status || "pending";
        if (u?.verification_status === "verified" && effStatus !== "rejected") {
          effStatus = "approved";
        }
        dedupedByUser.set(uid, {
          ...rec,
          status: effStatus,
          user: u || { id: uid, name: rec.company_name, email: rec.email },
        });
      }
    }

    // Also include any users with pending verification_status from users_active not in localStore
    for (const [uid, u] of usersMap.entries()) {
      if (!dedupedByUser.has(uid) && u.verification_status && u.verification_status !== "unverified") {
        dedupedByUser.set(uid, {
          id: u.id,
          user_id: u.id,
          company_name: u.company_name || u.name || "Organization",
          registration_number: null,
          document_url: u.redacted_id_url,
          photo_url: null,
          status: u.verification_status === "verified" ? "approved" : u.verification_status,
          created_at: u.created_at,
          user: u,
        });
      }
    }

    let results = Array.from(dedupedByUser.values());

    if (status && status !== "all") {
      results = results.filter((r) => (r.status || "").toLowerCase() === status.toLowerCase());
    }

    results.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    return res.json({ verifications: results });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

/**
 * PUT /api/verification/organization/:id/review
 * Admin reviews (Approve/Reject) an organization verification
 */
export const reviewOrganizationVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason } = req.body; // status: 'approved' | 'rejected'

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Status must be 'approved' or 'rejected'" });
    }

    let targetUserId = null;
    let companyName = "";

    const localRecords = readStore("organization_verifications.json");
    const matched = localRecords.find((r) => r.id === id || r.user_id === id);
    if (matched) {
      targetUserId = matched.user_id;
      companyName = matched.company_name;
    }
    if (!targetUserId) targetUserId = id;

    // 1. Update ALL records in localStore for this user or id
    updateRecord(
      "organization_verifications.json",
      (r) => r.id === id || (targetUserId && String(r.user_id) === String(targetUserId)),
      {
        status,
        rejection_reason: status === "rejected" ? (rejection_reason || "Verification requirements not met") : null,
        updated_at: new Date().toISOString(),
      }
    );

    // 2. Update users_active in Supabase
    // NOTE: users_active_role_check only allows 'user', 'admin', 'superadmin', 'manager'.
    // Do NOT set role to 'employer' as that violates database check constraint.
    // verification_status 'verified' grants job posting privileges directly.
    const userUpdates = {
      verification_status: status === "approved" ? "verified" : "rejected",
      verification_notes: status === "rejected" ? (rejection_reason || "Verification requirements not met") : "Organization verified",
      verified_at: status === "approved" ? new Date().toISOString() : null,
    };

    try {
      await supabase.from("users_active").update(userUpdates).eq("id", targetUserId);
    } catch (err) {
      console.warn("users_active update warning:", err.message);
    }

    // 3. Sync with Supabase id_verifications table if present
    try {
      await supabase.from("id_verifications").update({
        status,
        reviewed_at: new Date().toISOString(),
      }).eq("user_id", targetUserId);
    } catch {}

    return res.json({
      message: `Organization verification ${status} successfully.`,
      status,
      user_id: targetUserId,
    });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

/**
 * POST /api/verification/upload-doc
 * Upload registration doc or storefront photo (to Supabase Storage 'verification-docs' or local fallback)
 */
export const uploadVerificationDoc = async (req, res) => {
  try {
    const { fileName, fileData, fileType } = req.body;

    if (!fileName || !fileData) {
      return res.status(400).json({ message: "fileName and fileData (base64) are required" });
    }

    const cleanBase64 = fileData.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");
    const safeName = `docs/${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, "")}`;

    // 1. Try Supabase Storage upload
    try {
      const { error: supaErr } = await supabase.storage
        .from("verification-docs")
        .upload(safeName, buffer, {
          contentType: fileType || "application/octet-stream",
          upsert: true,
        });

      if (!supaErr) {
        const { data: pubData } = supabase.storage.from("verification-docs").getPublicUrl(safeName);
        return res.json({ url: pubData?.publicUrl || safeName, path: safeName });
      }
    } catch (e) {
      console.warn("Supabase verification-docs upload warning:", e.message);
    }

    // 2. Fallback to local server disk storage
    const uploadDir = path.resolve(__dirname, "../../uploads/verifications");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const localFileName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, "")}`;
    fs.writeFileSync(path.join(uploadDir, localFileName), buffer);

    const host = req.get("host") || "localhost:5000";
    const protocol = req.protocol || "http";
    const localUrl = `${protocol}://${host}/uploads/verifications/${localFileName}`;

    return res.json({ url: localUrl, path: `/uploads/verifications/${localFileName}` });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ============================================================
// LEGACY COMPATIBILITY
// ============================================================
export const submitVerification = submitOrganizationVerification;
export const getMyVerificationStatus = getMyOrganizationVerification;
export const getPendingVerifications = getPendingOrganizationVerifications;
export const reviewVerification = reviewOrganizationVerification;
