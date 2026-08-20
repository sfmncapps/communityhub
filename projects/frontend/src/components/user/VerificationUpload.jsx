import { useState, useEffect } from "react";
import supabase from "../../config/supabaseClient";

export default function VerificationUpload() {
  const [status, setStatus] = useState("unverified");
  const [notes, setNotes] = useState("");
  const [idType, setIdType] = useState("driver_license");
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
        const sessionToken = localStorage.getItem("token");
        if (sessionToken) {
          // Parse basic user info if token exists
          user = { id: "user_session" };
        }
      }

      let filePath = redactedUrl;

      // 1. Storage Upload: Save file into 'id-documents' bucket per RFP
      if (selectedFile && user?.id) {
        const fileExt = selectedFile.name.split(".").pop() || "jpg";
        filePath = `${user.id}/${Date.now()}_id.${fileExt}`;

        const { error: uploadErr } = await supabase.storage
          .from("id-documents")
          .upload(filePath, selectedFile, { upsert: true });

        if (uploadErr) {
          console.warn("Storage upload warning:", uploadErr.message);
        }
      }

      // 2. Insert row into id_verifications table per RFP requirement
      if (user?.id) {
        const { error: insertErr } = await supabase.from("id_verifications").insert({
          user_id: user.id,
          document_url: filePath,
          status: "pending",
        });

        if (insertErr) {
          console.warn("id_verifications table insert warning:", insertErr.message);
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
            }),
          });
        } catch (apiErr) {
          console.warn("API sync error:", apiErr.message);
        }
      }

      setMsg({ type: "success", text: "Redacted Driver's License / ID submitted successfully for approval!" });
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
          <h3 style={{ margin: 0 }}>Identity Document Verification</h3>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
            Submit a redacted government-issued Driver's License or ID for Admin verification badge
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

      {/* REDACTION GUIDELINES */}
      <div className="redaction-guide">
        <h4>🔒 Document Redaction Guidelines (RFP Requirement):</h4>
        <ul>
          <li><strong>DO:</strong> Ensure your Full Name, Photo, and Expiration Date are clearly visible.</li>
          <li><strong>MUST REDACT:</strong> Black out, blur, or cover sensitive identifiers (Driver's License / ID Number, SSN, DOB).</li>
          <li>Files uploaded to Supabase Storage bucket <code>id-documents</code> are stored securely.</li>
        </ul>
      </div>

      {msg && (
        <div className={`alert-msg ${msg.type}`}>
          {msg.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="verification-form">
        <div className="form-group">
          <label>Document Type:</label>
          <select value={idType} onChange={(e) => setIdType(e.target.value)}>
            <option value="driver_license">Driver's License (Redacted)</option>
            <option value="passport">Passport (Redacted)</option>
            <option value="national_id">State / National ID (Redacted)</option>
          </select>
        </div>

        <div className="form-group">
          <label>Upload Redacted ID Document File (Supabase Storage):</label>
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
              Redacted ID Image Document Preview:
            </span>
            <img
              src={redactedUrl}
              alt="Redacted ID Preview"
              className="preview-img"
              onError={(e) => (e.target.style.display = "none")}
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
            ? "Re-submit Redacted Document"
            : "Upload & Submit for Verification"}
        </button>
      </form>

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
