import { createClient } from "@supabase/supabase-js";
import { sendEmailOtp } from "../utils/notify.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// POST /api/verification/upload (User submits ID verification document)
export const submitVerification = async (req, res) => {
  try {
    const { redacted_id_url, id_document_url, id_type = "driver_license" } = req.body;

    if (!redacted_id_url && !id_document_url) {
      return res.status(400).json({ message: "Redacted ID document URL is required" });
    }

    const { data: updatedUser, error } = await supabase
      .from("users_active")
      .update({
        redacted_id_url: redacted_id_url || id_document_url,
        id_document_url: id_document_url || redacted_id_url,
        id_type,
        verification_status: "pending",
        verification_notes: null,
      })
      .eq("id", req.activeUser.id)
      .select("id, name, email, verification_status, redacted_id_url, id_type")
      .single();

    if (error) return res.status(500).json({ message: error.message });

    return res.json({
      message: "ID document submitted for admin verification",
      user: updatedUser,
    });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// GET /api/verification/status (User checks own verification status)
export const getMyVerificationStatus = async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from("users_active")
      .select("id, name, email, verification_status, id_type, redacted_id_url, verification_notes, verified_at")
      .eq("id", req.activeUser.id)
      .maybeSingle();

    if (error) return res.status(500).json({ message: error.message });

    return res.json({
      verification_status: user?.verification_status || "unverified",
      verification_notes: user?.verification_notes || "",
      verified_at: user?.verified_at || null,
      id_type: user?.id_type || null,
      redacted_id_url: user?.redacted_id_url || null,
    });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// GET /api/verification/pending (Admin/Superadmin list pending verifications)
export const getPendingVerifications = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users_active")
      .select("id, username, name, email, phone, company_name, verification_status, id_type, redacted_id_url, id_document_url, created_at")
      .eq("verification_status", "pending")
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ message: error.message });

    return res.json({ pendingVerifications: data || [] });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// POST /api/verification/:userId/review (Admin/Superadmin review)
export const reviewVerification = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, notes } = req.body; // status: 'verified' or 'rejected'

    if (!["verified", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Status must be 'verified' or 'rejected'" });
    }

    const { data: targetUser, error: fetchErr } = await supabase
      .from("users_active")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (fetchErr || !targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const updatePayload = {
      verification_status: status,
      verification_notes: notes || "",
      verified_at: new Date().toISOString(),
      verified_by: req.activeUser.id,
    };

    const { data: updatedUser, error: updateErr } = await supabase
      .from("users_active")
      .update(updatePayload)
      .eq("id", userId)
      .select()
      .single();

    if (updateErr) return res.status(500).json({ message: updateErr.message });

    // Send email notification to user regarding verification result
    if (targetUser.email) {
      const subjectMsg =
        status === "verified"
          ? "🎉 Your ID Verification has been approved!"
          : "⚠️ Update on your ID Verification request";
      const bodyMsg =
        status === "verified"
          ? `<p>Hi ${targetUser.name || "User"},</p><p>Your ID verification document has been reviewed and <strong>approved</strong>. You now have verified badge status on CommunityHub.</p>`
          : `<p>Hi ${targetUser.name || "User"},</p><p>Your ID verification request was not approved.</p><p><strong>Reason / Notes:</strong> ${notes || "Please re-upload a clear, redacted document."}</p>`;

      try {
        await sendEmailOtp(targetUser.email, `${subjectMsg}\n\n${bodyMsg}`);
      } catch (err) {
        console.error("Failed to send verification notification email:", err.message);
      }
    }

    return res.json({
      message: `ID Verification ${status} successfully`,
      user: updatedUser,
    });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};
