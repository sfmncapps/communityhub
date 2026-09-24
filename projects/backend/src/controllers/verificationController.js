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

// ============================================================
// DEDICATED ORGANIZATION / EMPLOYER VERIFICATION
// ============================================================

/**
 * POST /api/verification/organization
 * User submits Organization Verification (Company Name, Document, Storefront/Office Photo)
 */
export const submitOrganizationVerification = async (req, res) => {
  try {
    const { company_name, registration_number, document_url, photo_url } = req.body;

    if (!company_name || !company_name.trim()) {
      return res.status(400).json({ message: "Company / Organization name is required" });
    }
    if (!document_url || !document_url.trim()) {
      return res.status(400).json({ message: "Official registration or verification document is required" });
    }

    const payload = {
      user_id: req.activeUser.id,
      company_name: company_name.trim(),
      registration_number: registration_number ? registration_number.trim() : null,
      document_url: document_url.trim(),
      photo_url: photo_url ? photo_url.trim() : null,
      status: "pending",
      rejection_reason: null,
      updated_at: new Date().toISOString(),
    };

    let savedRecord = null;
    try {
      const { data, error } = await supabase
        .from("organization_verifications")
        .insert([payload])
        .select()
        .single();
      if (!error && data) savedRecord = data;
    } catch (err) {
      console.warn("organization_verifications insert fallback:", err.message);
    }

    // Keep users_active in sync
    await supabase
      .from("users_active")
      .update({
        company_name: company_name.trim(),
        verification_status: "pending",
        verification_notes: null,
      })
      .eq("id", req.activeUser.id);

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

    let verifications = [];
    try {
      let query = supabase
        .from("organization_verifications")
        .select("*, user:user_id(id, name, email, phone, role)")
        .order("created_at", { ascending: false });

      if (status && status !== "all") {
        query = query.eq("status", status.toLowerCase());
      }

      const { data, error } = await query;
      if (!error && data) verifications = data;
    } catch {}

    // Fallback to users_active if organization_verifications table not yet queried
    if (verifications.length === 0) {
      const { data: usersData } = await supabase
        .from("users_active")
        .select("id, username, name, email, phone, role, company_name, verification_status, redacted_id_url, created_at")
        .eq("verification_status", "pending")
        .order("created_at", { ascending: false });

      verifications = (usersData || []).map((u) => ({
        id: u.id,
        user_id: u.id,
        company_name: u.company_name || u.name,
        document_url: u.redacted_id_url,
        photo_url: null,
        status: "pending",
        created_at: u.created_at,
        user: u,
      }));
    }

    return res.json({ verifications });
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

    try {
      const { data: record } = await supabase
        .from("organization_verifications")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (record) {
        targetUserId = record.user_id;
        companyName = record.company_name;

        await supabase
          .from("organization_verifications")
          .update({
            status,
            rejection_reason: status === "rejected" ? (rejection_reason || "Verification requirements not met") : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);
      }
    } catch {}

    if (!targetUserId) targetUserId = id;

    // Update user record: approve unlocks job posting and sets role to employer
    const userUpdates = {
      verification_status: status === "approved" ? "verified" : "rejected",
      verification_notes: status === "rejected" ? rejection_reason : "Organization verified",
      verified_at: status === "approved" ? new Date().toISOString() : null,
    };
    if (status === "approved") {
      userUpdates.role = "employer";
    }

    await supabase.from("users_active").update(userUpdates).eq("id", targetUserId);

    return res.json({
      message: `Organization verification ${status} successfully.`,
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
