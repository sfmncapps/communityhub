import { useState, useEffect } from "react";
import supabase from "../../config/supabaseClient";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export default function VerificationUpload() {
  const [status, setStatus] = useState("unverified");
  const [rejectionReason, setRejectionReason] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");

  const [docFile, setDocFile] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [docPreview, setDocPreview] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        const res = await fetch(`${API}/verification/organization/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.verification) {
            const v = data.verification;
            setStatus(v.status || "unverified");
            setCompanyName(v.company_name || "");
            setRegistrationNumber(v.registration_number || "");
            setDocumentUrl(v.document_url || "");
            setPhotoUrl(v.photo_url || "");
            setRejectionReason(v.rejection_reason || "");
            if (v.document_url) setDocPreview(v.document_url);
            if (v.photo_url) setPhotoPreview(v.photo_url);
            setLoading(false);
            return;
          }
        }
      }

      // Supabase direct fallback
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;

      if (user) {
        const { data: orgData } = await supabase
          .from("organization_verifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (orgData) {
          setStatus(orgData.status || "pending");
          setCompanyName(orgData.company_name || "");
          setRegistrationNumber(orgData.registration_number || "");
          setDocumentUrl(orgData.document_url || "");
          setPhotoUrl(orgData.photo_url || "");
          setRejectionReason(orgData.rejection_reason || "");
          if (orgData.document_url) setDocPreview(orgData.document_url);
          if (orgData.photo_url) setPhotoPreview(orgData.photo_url);
        }
      }
    } catch (e) {
      console.error("Organization verification fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file, bucket = "verification-docs") => {
    if (!file) return null;

    // 1. Try backend endpoint
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
        });

        const res = await fetch(`${API}/verification/upload-doc`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            fileName: file.name,
            fileData: base64,
            fileType: file.type,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.url) return data.url;
        }
      } catch (err) {
        console.warn("Backend upload error, trying Supabase storage:", err);
      }
    }

    // 2. Direct Supabase Storage upload
    try {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id || "org";
      const ext = file.name.split(".").pop();
      const sPath = `${uid}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(sPath, file, { upsert: true });

      if (!upErr) {
        const { data: pubData } = supabase.storage.from(bucket).getPublicUrl(sPath);
        return pubData?.publicUrl || sPath;
      }
    } catch (supaErr) {
      console.warn("Supabase storage upload error:", supaErr);
    }

    // 3. Fallback to Data URL
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);

    if (!companyName.trim()) {
      return setMsg({ type: "error", text: "Please enter your Company / Organization Name" });
    }

    if (!docFile && !documentUrl) {
      return setMsg({
        type: "error",
        text: "Please upload an official registration document or certificate",
      });
    }

    setSubmitting(true);

    try {
      let finalDocUrl = documentUrl;
      let finalPhotoUrl = photoUrl;

      if (docFile) {
        finalDocUrl = await uploadFile(docFile, "verification-docs");
      }
      if (photoFile) {
        finalPhotoUrl = await uploadFile(photoFile, "verification-docs");
      }

      const payload = {
        company_name: companyName.trim(),
        registration_number: registrationNumber.trim() || null,
        document_url: finalDocUrl,
        photo_url: finalPhotoUrl || null,
      };

      const token = localStorage.getItem("token");
      if (token) {
        const res = await fetch(`${API}/verification/organization`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.message || "Failed to submit organization verification");
        }
      } else {
        // Fallback directly to Supabase table
        const { data: authData } = await supabase.auth.getUser();
        if (!authData?.user) throw new Error("Please log in to submit verification");

        const { error: insErr } = await supabase.from("organization_verifications").insert([
          {
            user_id: authData.user.id,
            ...payload,
            status: "pending",
          },
        ]);
        if (insErr) throw insErr;
      }

      // Update local storage user profile
      const cached = localStorage.getItem("user");
      if (cached) {
        try {
          const u = JSON.parse(cached);
          u.company_name = companyName.trim();
          u.verification_status = "pending";
          localStorage.setItem("user", JSON.stringify(u));
          window.dispatchEvent(new Event("profile-updated"));
        } catch {}
      }

      setStatus("pending");
      setDocumentUrl(finalDocUrl);
      setPhotoUrl(finalPhotoUrl);
      setMsg({
        type: "success",
        text: "Organization verification submitted successfully! It is now pending administrator review. Once approved, you can publish job openings.",
      });
    } catch (err) {
      setMsg({ type: "error", text: err.message || "Submission failed" });
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadges = {
    unverified: { bg: "#f1f5f9", text: "#475569", label: "Unverified" },
    pending: { bg: "#fef3c7", text: "#b45309", label: "⏳ Pending Administrator Review" },
    approved: { bg: "#d1fae5", text: "#047857", label: "✓ Verified Organization" },
    verified: { bg: "#d1fae5", text: "#047857", label: "✓ Verified Organization" },
    rejected: { bg: "#ffe4e6", text: "#e11d48", label: "✖ Verification Rejected" },
  };

  const currentBadge = statusBadges[status] || statusBadges.unverified;
  const isApproved = status === "approved" || status === "verified";

  if (loading) return <div style={{ padding: 30, color: "#64748b" }}>Loading organization verification status...</div>;

  return (
    <div className="org-verif-container">
      <div className="org-verif-header">
        <div>
          <h2>Organization & Employer Verification</h2>
          <p>
            Official verification is required for organizations and employers before publishing jobs.
            Your documentation is reviewed by platform administrators to ensure safety and credibility.
          </p>
        </div>
        <span
          className="org-status-pill"
          style={{ backgroundColor: currentBadge.bg, color: currentBadge.text }}
        >
          {currentBadge.label}
        </span>
      </div>

      {/* STATUS NOTICES */}
      {isApproved && (
        <div className="org-alert-banner success">
          <strong>✓ Organization Verified & Job Posting Unlocked</strong>
          <p>
            Your organization <strong>{companyName}</strong> has been reviewed and approved by administrators.
            You have full permissions to post and manage recruitment openings in the <strong>My Jobs</strong> portal.
          </p>
        </div>
      )}

      {status === "pending" && (
        <div className="org-alert-banner warning">
          <strong>⏳ Verification Under Review</strong>
          <p>
            Your organization verification for <strong>{companyName}</strong> has been submitted and is currently
            being reviewed by our administration team. Once verified, job posting permissions will be granted automatically.
          </p>
        </div>
      )}

      {status === "rejected" && (
        <div className="org-alert-banner danger">
          <strong>✖ Verification Not Approved</strong>
          <p>
            {rejectionReason || "Your verification documents did not meet platform guidelines."}
            <br />
            Please update your organization details or submit a clearer document below.
          </p>
        </div>
      )}

      {/* GUIDELINES */}
      <div className="org-guidelines">
        <h4>📋 Verification Requirements</h4>
        <ul>
          <li><strong>Official Document:</strong> Certificate of Incorporation, GST / Tax ID Certificate, Business License, or Corporate Letterhead.</li>
          <li><strong>Organization Photo:</strong> Storefront, office building, workspace, or company signage to build community trust.</li>
          <li><strong>Privacy Protection:</strong> Sensitive financial records or banking details may be redacted before uploading.</li>
        </ul>
      </div>

      {msg && <div className={`org-alert ${msg.type}`}>{msg.text}</div>}

      {/* VERIFICATION FORM */}
      <form onSubmit={handleSubmit} className="org-verif-form">
        <div className="form-row">
          <label>
            Company / Organization Name <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Apollo Health Care, Acme Tech Labs"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
            disabled={isApproved}
          />
        </div>

        <div className="form-row">
          <label>Registration / Tax Identification Number (Optional)</label>
          <input
            type="text"
            placeholder="e.g. GSTIN, CIN, EIN, or Business Registration No"
            value={registrationNumber}
            onChange={(e) => setRegistrationNumber(e.target.value)}
            disabled={isApproved}
          />
        </div>

        {/* REGISTRATION DOCUMENT */}
        <div className="form-row">
          <label>
            Official Registration Document (PDF or Image) <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setDocFile(file);
                if (file.type.startsWith("image/")) {
                  setDocPreview(URL.createObjectURL(file));
                } else {
                  setDocPreview(file.name);
                }
              }
            }}
            disabled={isApproved}
          />
          <small className="field-hint">Upload Incorporation Certificate, Trade License, or Tax ID Document.</small>

          {docPreview && (
            <div className="preview-wrap">
              {docPreview.startsWith("http") || docPreview.startsWith("blob:") ? (
                <img src={docPreview} alt="Registration Document Preview" className="preview-thumb" />
              ) : (
                <div className="preview-doc-badge">📄 {docPreview}</div>
              )}
            </div>
          )}
        </div>

        {/* STOREFRONT / OFFICE PHOTO */}
        <div className="form-row">
          <label>Organization / Storefront Photo (Recommended)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setPhotoFile(file);
                setPhotoPreview(URL.createObjectURL(file));
              }
            }}
            disabled={isApproved}
          />
          <small className="field-hint">Upload a real photograph of your office exterior, workplace, or storefront.</small>

          {photoPreview && (
            <div className="preview-wrap">
              <img src={photoPreview} alt="Organization Photo Preview" className="preview-thumb" />
            </div>
          )}
        </div>

        {!isApproved && (
          <button type="submit" className="org-submit-btn" disabled={submitting}>
            {submitting
              ? "Submitting Verification..."
              : status === "rejected"
              ? "Re-Submit Organization Verification"
              : status === "pending"
              ? "Update Organization Verification"
              : "Submit Organization Verification"}
          </button>
        )}
      </form>

      <style>{`
        .org-verif-container {
          background: #ffffff;
          border-radius: 16px;
          padding: 28px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          max-width: 820px;
        }

        .org-verif-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .org-verif-header h2 {
          margin: 0 0 6px;
          font-size: 22px;
          color: #0f172a;
          font-weight: 800;
        }

        .org-verif-header p {
          margin: 0;
          font-size: 13.5px;
          color: #64748b;
          line-height: 1.5;
          max-width: 600px;
        }

        .org-status-pill {
          padding: 6px 14px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
        }

        .org-alert-banner {
          padding: 14px 18px;
          border-radius: 12px;
          margin-bottom: 20px;
          font-size: 13.5px;
          line-height: 1.5;
        }
        .org-alert-banner.success {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #166534;
        }
        .org-alert-banner.warning {
          background: #fffbeb;
          border: 1px solid #fde68a;
          color: #92400e;
        }
        .org-alert-banner.danger {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
        }

        .org-guidelines {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 24px;
        }
        .org-guidelines h4 {
          margin: 0 0 8px;
          font-size: 13.5px;
          color: #1e293b;
          font-weight: 700;
        }
        .org-guidelines ul {
          margin: 0;
          padding-left: 20px;
          font-size: 13px;
          color: #475569;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .org-verif-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .form-row {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-row label {
          font-size: 13.5px;
          font-weight: 600;
          color: #334155;
        }

        .form-row input[type="text"] {
          padding: 11px 14px;
          border-radius: 10px;
          border: 1px solid #cbd5e1;
          font-size: 14px;
          outline: none;
        }
        .form-row input[type="file"] {
          font-size: 13px;
          color: #475569;
        }

        .field-hint {
          font-size: 12px;
          color: #64748b;
        }

        .preview-wrap {
          margin-top: 8px;
          padding: 10px;
          border: 1px dashed #cbd5e1;
          border-radius: 10px;
          background: #f8fafc;
          display: inline-block;
          max-width: 320px;
        }
        .preview-thumb {
          max-height: 140px;
          max-width: 100%;
          border-radius: 8px;
          object-fit: cover;
          display: block;
        }
        .preview-doc-badge {
          font-size: 13px;
          font-weight: 600;
          color: #0f766e;
        }

        .org-submit-btn {
          margin-top: 10px;
          background: linear-gradient(135deg, #0f766e, #16a34a);
          color: #ffffff;
          border: none;
          padding: 14px;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: filter 0.15s ease;
        }
        .org-submit-btn:hover {
          filter: brightness(1.05);
        }
        .org-submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .org-alert {
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 13.5px;
          font-weight: 600;
          margin-bottom: 16px;
        }
        .org-alert.success { background: #dcfce7; color: #166534; }
        .org-alert.error { background: #fee2e2; color: #991b1b; }
      `}</style>
    </div>
  );
}
