import { useEffect, useState } from "react";

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
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("http://localhost:5000/api/verification/pending", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPendingList(data.pendingVerifications || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (userId, status) => {
    setSubmittingId(userId);
    const token = localStorage.getItem("token");
    const notes = reviewNotes[userId] || "";

    try {
      const res = await fetch(`http://localhost:5000/api/verification/${userId}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, notes }),
      });

      if (res.ok) {
        setPendingList((prev) => prev.filter((item) => item.id !== userId));
      } else {
        const errData = await res.json();
        alert(errData.message || "Failed to submit review");
      }
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
            <div key={user.id} className="verification-card">
              <div className="card-header">
                <div>
                  <h4>{user.name || user.username}</h4>
                  <p className="email-text">{user.email} {user.phone ? `| ${user.phone}` : ""}</p>
                  {user.company_name && <p className="company-text">Company: {user.company_name}</p>}
                </div>
                <span className="type-badge">{user.id_type || "Driver's License"}</span>
              </div>

              {/* DOCUMENT IMAGE PREVIEW */}
              <div className="doc-preview">
                {user.redacted_id_url ? (
                  <a href={user.redacted_id_url} target="_blank" rel="noopener noreferrer">
                    <img src={user.redacted_id_url} alt="Redacted ID Document" />
                    <span className="zoom-text">🔍 Click to Open Full Resolution Document</span>
                  </a>
                ) : (
                  <div className="no-doc">No document URL provided</div>
                )}
              </div>

              {/* NOTES INPUT */}
              <div className="notes-field">
                <label>Admin Review Notes (optional for rejection):</label>
                <input
                  type="text"
                  placeholder="e.g. Approved or Redact document number further..."
                  value={reviewNotes[user.id] || ""}
                  onChange={(e) => setReviewNotes({ ...reviewNotes, [user.id]: e.target.value })}
                />
              </div>

              {/* ACTIONS */}
              <div className="actions-row">
                <button
                  className="approve-btn"
                  disabled={submittingId === user.id}
                  onClick={() => handleReview(user.id, "verified")}
                >
                  ✓ Approve Verification
                </button>
                <button
                  className="reject-btn"
                  disabled={submittingId === user.id}
                  onClick={() => handleReview(user.id, "rejected")}
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
          font-family: sans-serif;
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
