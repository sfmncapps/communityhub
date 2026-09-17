import { useState, useEffect } from "react";
import supabase from "../../config/supabaseClient";

export default function VerificationUpload() {
  const [status, setStatus] = useState("unverified");
  const [notes, setNotes] = useState("");
  const [accountRole, setAccountRole] = useState("employer"); // 'employer' | 'employee'
  const [companyName, setCompanyName] = useState("");
  const [idType, setIdType] = useState("company_registration");
  const [redactedUrl, setRedactedUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;

      if (user) {
        // Query id_verifications table for current user
        const { data: verData } = await supabase
          .from("id_verifications")
          .select("*")
          .eq("user_id", user.id)
          .order("submitted_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (verData) {
          setStatus(verData.status || "pending");
          if (verData.document_url) {
            if (verData.document_url.startsWith("http")) {
              setRedactedUrl(verData.document_url);
            } else {
              const { data: urlData } = supabase.storage
                .from("id-documents")
                .getPublicUrl(verData.document_url);
              setRedactedUrl(urlData?.publicUrl || verData.document_url);
            }
          }
        }
      }

      // Check backend API for additional status notes
      const token = localStorage.getItem("token");
      if (token) {
        const res = await fetch("http://localhost:5000/api/verification/status", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.verification_status) setStatus(data.verification_status);
          if (data.verification_notes) setNotes(data.verification_notes);
          if (data.redacted_id_url && !redactedUrl) setRedactedUrl(data.redacted_id_url);
          if (data.id_type) setIdType(data.id_type);
          if (data.role === "employer") {
            setAccountRole("employer");
          } else if (data.role === "employee" || data.role === "user") {
            setAccountRole(data.role === "employer" ? "employer" : "employee");
          }
          if (data.company_name) setCompanyName(data.company_name);
        }
      } else {
        const cachedUser = localStorage.getItem("user");
        if (cachedUser) {
          try {
            const u = JSON.parse(cachedUser);
            if (u.role === "employer") setAccountRole("employer");
            if (u.company_name) setCompanyName(u.company_name);
          } catch {}
        }
      }
    } catch (e) {
      console.error("Verification status fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setRedactedUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);

    if (!selectedFile && !redactedUrl) {
      return setMsg({ type: "error", text: "Please choose a redacted ID image file or paste a URL" });
    }

    setSubmitting(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      let user = authData?.user;

      if (!user) {
        const cached = localStorage.getItem("user");
        if (cached) {
          try {
            user = JSON.parse(cached);
          } catch {}
        }
      }

      let filePath = redactedUrl;

      // 1. Storage Upload: Save file into 'id-documents' bucket with graceful fallback
      if (selectedFile) {
        try {
          const fileExt = selectedFile.name.split(".").pop() || "jpg";
          const uid = user?.id || "guest";
          const sPath = `${uid}/${Date.now()}_id.${fileExt}`;

          const { error: uploadErr } = await supabase.storage
            .from("id-documents")
            .upload(sPath, selectedFile, { upsert: true });

          if (!uploadErr) {
            const { data: pubData } = supabase.storage.from("id-documents").getPublicUrl(sPath);
            filePath = pubData?.publicUrl || sPath;
          } else {
            console.warn("Storage upload notice (falling back to data URL):", uploadErr.message);
          }
        } catch (err) {
          console.warn("Storage upload exception, fallback to data URL:", err);
        }

        // If upload wasn't successful or bucket missing, convert to data URL
        if (!filePath || filePath.startsWith("blob:")) {
          filePath = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => resolve(redactedUrl);
            reader.readAsDataURL(selectedFile);
          });
        }
      }

      // 2. Insert row into id_verifications table
      if (user?.id) {
        const { error: insertErr } = await supabase.from("id_verifications").insert({
          user_id: user.id,
          document_url: filePath,
          status: "pending",
        });

        if (insertErr) {
          console.warn("id_verifications insert notice:", insertErr.message);
        }
      }

      // 3. API Sync if backend service is active
      const token = localStorage.getItem("token");
      if (token) {
        try {
          await fetch("http://localhost:5000/api/verification/upload", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              redacted_id_url: filePath,
              id_type: idType,
              role: accountRole,
              company_name: companyName,
            }),
          });
        } catch (apiErr) {
          console.warn("API sync notice:", apiErr.message);
        }
      }

      // 4. Update local user cache
      const cached = localStorage.getItem("user");
      if (cached) {
        try {
          const u = JSON.parse(cached);
          u.role = accountRole;
          u.company_name = companyName;
          u.verification_status = "pending";
          localStorage.setItem("user", JSON.stringify(u));
          window.dispatchEvent(new Event("profile-updated"));
        } catch {}
      }

      setMsg({
        type: "success",
        text: `Official ${accountRole === "employer" ? "Employer" : "Employee"} ID submitted successfully! It is now pending administrator review.`,
      });
      setStatus("pending");
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const statusColors = {
    unverified: { bg: "#f1f5f9", text: "#475569", label: "Unverified" },
    pending: { bg: "#fef3c7", text: "#b45309", label: "⏳ Verification Pending Review" },
    verified: { bg: "#d1fae5", text: "#047857", label: "✓ ID Verified Account" },
    rejected: { bg: "#ffe4e6", text: "#e11d48", label: "✖ Verification Rejected" },
  };

  const currentPill = statusColors[status] || statusColors.unverified;

  if (loading) return <div>Loading verification status...</div>;

  return (
    <div className="verification-card">
      <div className="verification-header">
        <div>
          <h3 style={{ margin: 0 }}>Employer & Organization ID Verification</h3>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
            Official verification is required for <strong>Employers</strong> to post jobs. Employees and job seekers do <em>not</em> need to submit any official ID.
          </p>
        </div>
        <span
          className="status-pill"
          style={{ backgroundColor: currentPill.bg, color: currentPill.text }}
        >
          {currentPill.label}
        </span>
      </div>

      {notes && (
        <div className="admin-notes-box">
          <strong>Admin Review Note:</strong> {notes}
        </div>
      )}

      {accountRole === "employee" ? (
        <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "10px", padding: "20px", marginTop: "16px" }}>
          <h4 style={{ color: "#065f46", margin: "0 0 6px" }}>✓ Employee / Job Seeker Mode</h4>
          <p style={{ color: "#047857", fontSize: "14px", margin: "0 0 14px", lineHeight: "1.5" }}>
            Good news! As an employee or candidate, <strong>you do not need to verify an official ID</strong>. You have full access to explore the community, view verified job listings, and apply directly using recruiters' Google Forms.
          </p>
          <div style={{ display: "flex", gap: "10px" }}>
            <a href="/jobs" style={{ display: "inline-block", background: "#047857", color: "#fff", padding: "9px 18px", borderRadius: "8px", textDecoration: "none", fontWeight: "700", fontSize: "13px" }}>
              Explore Jobs ↗
            </a>
            <button
              type="button"
              onClick={() => { setAccountRole("employer"); setIdType("company_registration"); }}
              style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "9px 16px", borderRadius: "8px", fontWeight: "600", fontSize: "13px", cursor: "pointer" }}
            >
              Switch to Employer Verification
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* REDACTION GUIDELINES */}
          <div className="redaction-guide">
            <h4>🔒 Organization Document Guidelines:</h4>
            <ul>
              <li><strong>Acceptable Documents:</strong> Certificate of Incorporation, Business Registration, Tax ID / GST, Commercial License, or HR Official ID.</li>
              <li><strong>Privacy:</strong> Please redact any personal banking or sensitive identification numbers not needed for corporate verification.</li>
            </ul>
          </div>

          {msg && (
            <div className={`alert-msg ${msg.type}`}>
              {msg.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="verification-form">
            <div className="form-group">
              <label>Company / Organization Name <span style={{ color: "#ef4444" }}>*</span></label>
              <input
                type="text"
                placeholder="e.g. Acme Innovations Pvt Ltd"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                disabled={status === "verified"}
              />
            </div>

            <div className="form-group">
              <label>Official Document Type:</label>
              <select value={idType} onChange={(e) => setIdType(e.target.value)}>
                <option value="company_registration">Business / Incorporation Registration Document</option>
                <option value="tax_id">Tax ID / Business PAN / GST Certificate</option>
                <option value="business_license">Commercial Operating License</option>
                <option value="employer_hr_id">HR / Recruiter Official Employee ID Card</option>
              </select>
            </div>

            <div className="form-group">
              <label>Upload Official Employer Document File (Image / PDF):</label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                disabled={status === "verified"}
              />
            </div>

            <div className="form-group">
              <label>Or Paste Redacted Image URL / Cloud Storage Link:</label>
              <input
                type="text"
                placeholder="https://example.com/uploads/my-redacted-id.jpg"
                value={typeof redactedUrl === "string" && !redactedUrl.startsWith("blob:") ? redactedUrl : ""}
                onChange={(e) => {
                  setSelectedFile(null);
                  setRedactedUrl(e.target.value);
                }}
                disabled={status === "verified"}
              />
            </div>

            {redactedUrl && (
              <div className="preview-box">
                <span style={{ fontSize: 12, fontWeight: "bold", display: "block", marginBottom: 6 }}>
                  Document Image Preview:
                </span>
                <img
                  src={redactedUrl}
                  alt="Document Preview"
                  style={{ maxHeight: 200, maxWidth: "100%", borderRadius: 8, objectFit: "contain" }}
                />
              </div>
            )}

            <button
              type="submit"
              className="submit-btn"
              disabled={submitting || status === "verified"}
            >
              {submitting
                ? "Uploading & Submitting..."
                : status === "pending"
                ? "Re-submit Employer Document"
                : "Submit Employer Verification"}
            </button>
          </form>
        </>
      )}

      <style>{`
        .verification-card {
          background: white;
          border-radius: 14px;
          padding: 24px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 10px rgba(0,0,0,0.03);
          margin-bottom: 24px;
          font-family: system-ui, sans-serif;
        }

        .verification-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18px;
          flex-wrap: wrap;
          gap: 10px;
        }

        .status-pill {
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
        }

        .admin-notes-box {
          background: #fff1f2;
          border-left: 4px solid #e11d48;
          color: #9f1239;
          padding: 12px;
          border-radius: 6px;
          font-size: 13px;
          margin-bottom: 18px;
        }

        .redaction-guide {
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 14px 18px;
          margin-bottom: 20px;
        }

        .redaction-guide h4 {
          margin: 0 0 8px;
          font-size: 14px;
          color: #0f172a;
        }

        .redaction-guide ul {
          margin: 0;
          padding-left: 20px;
          font-size: 13px;
          color: #475569;
        }

        .verification-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-size: 13px;
          font-weight: 600;
          color: #334155;
        }

        .form-group input, .form-group select {
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font-size: 14px;
          outline: none;
        }

        .preview-box {
          border: 1px dashed #cbd5e1;
          padding: 10px;
          border-radius: 8px;
          background: #fafafa;
        }

        .preview-img {
          max-height: 200px;
          max-width: 100%;
          border-radius: 6px;
          object-fit: contain;
        }

        .submit-btn {
          background: #0f766e;
          color: white;
          border: none;
          padding: 12px;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s;
        }

        .submit-btn:hover { background: #0d9488; }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .alert-msg {
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 13px;
          margin-bottom: 12px;
        }
        .alert-msg.success { background: #d1fae5; color: #047857; }
        .alert-msg.error { background: #ffe4e6; color: #e11d48; }
      `}</style>
    </div>
  );
}
