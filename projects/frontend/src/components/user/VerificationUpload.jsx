import { useState, useEffect } from "react";

export default function VerificationUpload() {
  const [status, setStatus] = useState("unverified");
  const [notes, setNotes] = useState("");
  const [idType, setIdType] = useState("driver_license");
  const [redactedUrl, setRedactedUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    const token = localStorage.getItem("token");
    if (!token) return setLoading(false);

    try {
      const res = await fetch("http://localhost:5000/api/verification/status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data.verification_status || "unverified");
        setNotes(data.verification_notes || "");
        if (data.redacted_id_url) setRedactedUrl(data.redacted_id_url);
        if (data.id_type) setIdType(data.id_type);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);

    if (!redactedUrl) {
      return setMsg({ type: "error", text: "Please enter or paste your redacted document URL" });
    }

    setSubmitting(true);
    const token = localStorage.getItem("token");

    try {
      const res = await fetch("http://localhost:5000/api/verification/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          redacted_id_url: redactedUrl,
          id_type: idType,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMsg({ type: "success", text: "ID Verification document submitted successfully!" });
        setStatus("pending");
      } else {
        setMsg({ type: "error", text: data.message || "Failed to submit document" });
      }
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
            Submit a redacted government-issued ID for admin verification badge
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
          <strong>Admin Note:</strong> {notes}
        </div>
      )}

      {/* REDACTION GUIDELINES */}
      <div className="redaction-guide">
        <h4>🔒 Document Redaction Guidelines:</h4>
        <ul>
          <li><strong>DO:</strong> Ensure your Name, Photo, and Expiration date remain clearly visible.</li>
          <li><strong>MUST REDACT:</strong> Blur, black out, or cover sensitive numbers (Social Security Number, License/ID Number, DOB).</li>
          <li>Never share unredacted government document numbers over unencrypted forms.</li>
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
          <label>Redacted ID Image URL / Cloud Storage Link:</label>
          <input
            type="url"
            placeholder="https://example.com/uploads/my-redacted-id.jpg"
            value={redactedUrl}
            onChange={(e) => setRedactedUrl(e.target.value)}
            disabled={status === "verified"}
          />
        </div>

        {redactedUrl && (
          <div className="preview-box">
            <span style={{ fontSize: 12, fontWeight: "bold", display: "block", marginBottom: 6 }}>Document Preview:</span>
            <img src={redactedUrl} alt="Redacted ID Preview" className="preview-img" onError={(e) => (e.target.style.display = "none")} />
          </div>
        )}

        <button
          type="submit"
          className="submit-btn"
          disabled={submitting || status === "verified"}
        >
          {submitting ? "Submitting..." : status === "pending" ? "Re-submit Redacted Document" : "Submit for Verification"}
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
          max-height: 180px;
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
