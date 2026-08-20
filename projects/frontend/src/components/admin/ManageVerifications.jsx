import { useEffect, useState } from "react";
import supabase from "../../config/supabaseClient";

export default function ManageVerifications() {
  const [pendingList, setPendingList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewNotes, setReviewNotes] = useState({});
  const [submittingId, setSubmittingId] = useState(null);

  useEffect(() => {
    fetchPendingVerifications();
  }, []);

  const fetchPendingVerifications = async () => {
    setLoading(true);
    let results = [];

    try {
      // 1. Direct query from Supabase id_verifications table per RFP requirement
      const { data: verData, error: verErr } = await supabase
        .from("id_verifications")
        .select("*")
        .eq("status", "pending");

      if (!verErr && verData && verData.length > 0) {
        // Resolve storage URLs for image documents
        results = verData.map((item) => {
          let docUrl = item.document_url;
          if (docUrl && !docUrl.startsWith("http") && !docUrl.startsWith("blob:")) {
            const { data: publicUrlObj } = supabase.storage
              .from("id-documents")
              .getPublicUrl(docUrl);
            docUrl = publicUrlObj?.publicUrl || docUrl;
          }
          return {
            ...item,
            id: item.id,
            user_id: item.user_id,
            name: `User (${(item.user_id || "").slice(0, 8)})`,
            redacted_id_url: docUrl,
            id_type: item.id_type || "Driver's License",
          };
        });
      }

      // 2. Fallback/enrich from Express Backend API
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const res = await fetch("http://localhost:5000/api/verification/pending", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            const apiItems = data.pendingVerifications || [];
            if (apiItems.length > 0) {
              results = apiItems;
            }
          }
        } catch (apiErr) {
          console.warn("Backend verification query fallback:", apiErr.message);
        }
      }

      setPendingList(results);
    } catch (e) {
      console.error("Pending verifications fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (idOrUserId, status) => {
    setSubmittingId(idOrUserId);
    const notes = reviewNotes[idOrUserId] || "";

    try {
      // Update status in Supabase id_verifications table
      const { data: currentAuth } = await supabase.auth.getUser();
      const reviewerId = currentAuth?.user?.id || null;

      await supabase
        .from("id_verifications")
        .update({
          status: status === "verified" || status === "approved" ? "approved" : "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by: reviewerId,
        })
        .or(`id.eq.${idOrUserId},user_id.eq.${idOrUserId}`);

      // Backend API call sync if token present
      const token = localStorage.getItem("token");
      if (token) {
        try {
          await fetch(`http://localhost:5000/api/verification/${idOrUserId}/review`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ status: status === "approved" ? "verified" : status, notes }),
          });
        } catch (err) {
          console.warn("API review sync warning:", err.message);
        }
      }

      // Filter out reviewed request from UI state
      setPendingList((prev) => prev.filter((item) => item.id !== idOrUserId && item.user_id !== idOrUserId));
    } catch (e) {
      alert("Error submitting review: " + e.message);
    } finally {
      setSubmittingId(null);
    }
  };

  if (loading) return <div>Loading pending verifications...</div>;

  return (
    <div className="manage-verifications">
      <h2>ID Document Verification Requests ({pendingList.length})</h2>
      <p style={{ color: "#64748b", marginBottom: 20 }}>
        Review user uploaded redacted identification documents and approve or reject verification status
      </p>

      {pendingList.length === 0 ? (
        <div className="empty-box">✓ No pending ID verifications to review.</div>
      ) : (
        <div className="verifications-grid">
          {pendingList.map((user) => (
            <div key={user.id || user.user_id} className="verification-card">
              <div className="card-header">
                <div>
                  <h4>{user.name || user.username || `User ID: ${(user.user_id || "").slice(0, 8)}`}</h4>
                  <p className="email-text">{user.email ? user.email : user.submitted_at ? `Submitted: ${new Date(user.submitted_at).toLocaleDateString()}` : ""} {user.phone ? `| ${user.phone}` : ""}</p>
                  {user.company_name && <p className="company-text">Company: {user.company_name}</p>}
                </div>
                <span className="type-badge">{user.id_type || "Driver's License"}</span>
              </div>

              {/* DOCUMENT IMAGE PREVIEW */}
              <div className="doc-preview">
                {user.redacted_id_url || user.document_url ? (
                  <a href={user.redacted_id_url || user.document_url} target="_blank" rel="noopener noreferrer">
                    <img src={user.redacted_id_url || user.document_url} alt="Redacted ID Document" />
                    <span className="zoom-text">🔍 Click to Open Full Resolution Document</span>
                  </a>
                ) : (
                  <div className="no-doc">No document URL provided</div>
                )}
              </div>

              {/* NOTES INPUT */}
              <div className="notes-field">
                <label>Admin Review Notes (optional):</label>
                <input
                  type="text"
                  placeholder="e.g. Approved or Redact document number further..."
                  value={reviewNotes[user.id || user.user_id] || ""}
                  onChange={(e) => setReviewNotes({ ...reviewNotes, [user.id || user.user_id]: e.target.value })}
                />
              </div>

              {/* ACTIONS */}
              <div className="actions-row">
                <button
                  className="approve-btn"
                  disabled={submittingId === (user.id || user.user_id)}
                  onClick={() => handleReview(user.id || user.user_id, "approved")}
                >
                  ✓ Approve Verification
                </button>
                <button
                  className="reject-btn"
                  disabled={submittingId === (user.id || user.user_id)}
                  onClick={() => handleReview(user.id || user.user_id, "rejected")}
                >
                  ✖ Reject Document
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .manage-verifications {
          font-family: system-ui, sans-serif;
          padding: 10px;
        }

        .empty-box {
          background: #f0fdf4;
          color: #15803d;
          padding: 20px;
          border-radius: 10px;
          font-weight: 600;
          border: 1px solid #bbf7d0;
        }

        .verifications-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
          gap: 20px;
        }

        .verification-card {
          background: white;
          border-radius: 14px;
          padding: 20px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          display: flex;
          flex-direction: column;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 14px;
        }

        .card-header h4 {
          margin: 0 0 4px;
          font-size: 16px;
          color: #0f172a;
        }

        .email-text, .company-text {
          margin: 2px 0;
          font-size: 12px;
          color: #64748b;
        }

        .type-badge {
          background: #e0f2fe;
          color: #0369a1;
          font-size: 11px;
          font-weight: bold;
          padding: 4px 8px;
          border-radius: 6px;
          text-transform: capitalize;
        }

        .doc-preview {
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 10px;
          text-align: center;
          margin-bottom: 14px;
          position: relative;
        }

        .doc-preview img {
          max-height: 200px;
          max-width: 100%;
          border-radius: 6px;
          object-fit: contain;
        }

        .zoom-text {
          display: block;
          margin-top: 6px;
          font-size: 11px;
          color: #2563eb;
          font-weight: 600;
        }

        .no-doc {
          color: #94a3b8;
          font-style: italic;
          padding: 20px;
        }

        .notes-field {
          margin-bottom: 14px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .notes-field label {
          font-size: 12px;
          font-weight: 600;
          color: #475569;
        }

        .notes-field input {
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          font-size: 13px;
        }

        .actions-row {
          display: flex;
          gap: 10px;
          margin-top: auto;
        }

        .approve-btn {
          flex: 1;
          background: #047857;
          color: white;
          border: none;
          padding: 10px;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s;
        }

        .approve-btn:hover { background: #065f46; }

        .reject-btn {
          flex: 1;
          background: #e11d48;
          color: white;
          border: none;
          padding: 10px;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s;
        }

        .reject-btn:hover { background: #be123c; }

        .approve-btn:disabled, .reject-btn:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
