import { useEffect, useState } from "react";
import supabase from "../../config/supabaseClient";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export default function ManageVerifications() {
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending"); // pending | approved | rejected | all
  const [rejectionNotes, setRejectionNotes] = useState({});
  const [processingId, setProcessingId] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchVerifications();
  }, [activeTab]);

  const fetchVerifications = async () => {
    setLoading(true);
    let results = [];

    try {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const res = await fetch(
            `${API}/verification/organization/pending?status=${activeTab}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          if (res.ok) {
            const data = await res.json();
            if (data.verifications) {
              results = data.verifications;
            }
          }
        } catch (apiErr) {
          console.warn("API pending verifications fetch:", apiErr.message);
        }
      }

      // Supabase direct query fallback from users_active if backend empty
      if (results.length === 0) {
        let query = supabase
          .from("users_active")
          .select("id, name, email, phone, role, company_name, verification_status, redacted_id_url, created_at")
          .order("created_at", { ascending: false });

        if (activeTab === "pending") {
          query = query.eq("verification_status", "pending");
        } else if (activeTab === "approved") {
          query = query.eq("verification_status", "verified");
        } else if (activeTab === "rejected") {
          query = query.eq("verification_status", "rejected");
        }

        const { data: supaData, error } = await query;
        if (!error && supaData) {
          results = supaData.map((u) => ({
            id: u.id,
            user_id: u.id,
            company_name: u.company_name || u.name || "Organization",
            document_url: u.redacted_id_url,
            photo_url: null,
            status: u.verification_status === "verified" ? "approved" : u.verification_status,
            created_at: u.created_at,
            user: u,
          }));
        }
      }

      setVerifications(results);
    } catch (e) {
      console.error("Fetch verifications error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (id, status) => {
    setProcessingId(id);
    const rejectionReason = rejectionNotes[id] || "";

    if (status === "rejected" && !rejectionReason.trim()) {
      alert("Please provide a rejection reason so the organization knows what to correct.");
      setProcessingId(null);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      let apiSuccess = false;

      if (token) {
        try {
          const res = await fetch(`${API}/verification/organization/${id}/review`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              status,
              rejection_reason: status === "rejected" ? rejectionReason : null,
            }),
          });
          if (res.ok) {
            apiSuccess = true;
          }
        } catch (err) {
          console.warn("Backend review endpoint call:", err.message);
        }
      }

      // Direct Supabase users_active sync for safety
      try {
        const item = verifications.find((v) => v.id === id);
        const targetUserId = item?.user_id || id;
        if (targetUserId) {
          await supabase.from("users_active").update({
            verification_status: status === "approved" ? "verified" : "rejected",
            verification_notes: status === "rejected" ? rejectionReason : "Organization verified",
            verified_at: status === "approved" ? new Date().toISOString() : null,
          }).eq("id", targetUserId);
        }
      } catch (e) {
        console.warn("Direct Supabase update notice:", e.message);
      }

      // Immediately filter out from pending list in UI
      setVerifications((prev) =>
        prev
          .map((v) =>
            v.id === id || v.user_id === id
              ? { ...v, status, rejection_reason: status === "rejected" ? rejectionReason : null }
              : v
          )
          .filter((v) => activeTab === "all" || v.status === activeTab)
      );

      await fetchVerifications();
      alert(
        `Organization verification has been ${
          status === "approved"
            ? "approved successfully! Job posting authorization has been granted to the employer."
            : "marked as rejected."
        }`
      );
    } catch (err) {
      alert("Error reviewing verification: " + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = verifications.filter((v) => {
    const q = search.toLowerCase();
    const cName = (v.company_name || "").toLowerCase();
    const regNo = (v.registration_number || "").toLowerCase();
    const uEmail = (v.user?.email || "").toLowerCase();
    return !q || cName.includes(q) || regNo.includes(q) || uEmail.includes(q);
  });

  return (
    <div className="manage-org-verifications">
      <div className="verif-header">
        <div>
          <h2>Organization Verifications ({verifications.length})</h2>
          <p>
            Review company registration documents, verify business credentials, and grant job posting authorization to genuine employers.
          </p>
        </div>

        <div className="header-controls">
          <input
            type="text"
            placeholder="Search company or registration #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="verif-tabs">
        {["pending", "approved", "rejected", "all"].map((tab) => (
          <button
            key={tab}
            className={`verif-tab ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "all"
              ? "All Submissions"
              : tab === "pending"
              ? "⏳ Pending Review"
              : tab === "approved"
              ? "✓ Approved"
              : "✖ Rejected"}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: "#64748b" }}>
          Loading organization verification requests...
        </div>
      ) : filtered.length === 0 ? (
        <div className="verif-empty">
          <h3>No Organization Verifications Found</h3>
          <p>There are currently no verification records under the "{activeTab}" filter.</p>
        </div>
      ) : (
        <div className="verif-grid">
          {filtered.map((item) => {
            const isApproved = item.status === "approved";
            const isRejected = item.status === "rejected";
            const isPending = item.status === "pending";

            return (
              <div className="verif-card" key={item.id}>
                <div className="verif-card-header">
                  <div>
                    <h3 className="company-title">{item.company_name}</h3>
                    {item.registration_number && (
                      <span className="reg-number">Reg / Tax ID: {item.registration_number}</span>
                    )}
                  </div>
                  <span className={`verif-badge ${item.status}`}>
                    {item.status.toUpperCase()}
                  </span>
                </div>

                <div className="user-meta">
                  <span>Applicant ID: {item.user_id ? item.user_id.slice(0, 8) : "N/A"}</span>
                  {item.user?.email && <span> • ✉ {item.user.email}</span>}
                  {item.user?.phone && <span> • 📞 {item.user.phone}</span>}
                  <span style={{ display: "block", marginTop: 4 }}>
                    Submitted: {new Date(item.created_at).toLocaleDateString()} at {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* MEDIA & DOCUMENT PREVIEWS */}
                <div className="verif-media-row">
                  {item.document_url ? (
                    <div className="media-preview-box">
                      <div className="media-label">📄 Official Document</div>
                      {item.document_url.endsWith(".pdf") ? (
                        <a
                          href={item.document_url}
                          target="_blank"
                          rel="noreferrer"
                          className="doc-link-btn"
                        >
                          View PDF Document ↗
                        </a>
                      ) : (
                        <a href={item.document_url} target="_blank" rel="noreferrer">
                          <img
                            src={item.document_url}
                            alt="Verification Document"
                            className="doc-thumb"
                          />
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="media-preview-box empty">No Document Attached</div>
                  )}

                  {item.photo_url ? (
                    <div className="media-preview-box">
                      <div className="media-label">🏢 Storefront / Office Photo</div>
                      <a href={item.photo_url} target="_blank" rel="noreferrer">
                        <img
                          src={item.photo_url}
                          alt="Organization Photo"
                          className="doc-thumb"
                        />
                      </a>
                    </div>
                  ) : null}
                </div>

                {isRejected && item.rejection_reason && (
                  <div className="rejection-box">
                    <strong>Rejection Reason:</strong> {item.rejection_reason}
                  </div>
                )}

                {/* ACTIONS */}
                {isPending && (
                  <div className="verif-actions-panel">
                    <input
                      type="text"
                      placeholder="Optional feedback / rejection reason..."
                      value={rejectionNotes[item.id] || ""}
                      onChange={(e) =>
                        setRejectionNotes({ ...rejectionNotes, [item.id]: e.target.value })
                      }
                      className="notes-input"
                    />

                    <div className="action-btns">
                      <button
                        className="btn-reject"
                        onClick={() => handleReview(item.id, "rejected")}
                        disabled={processingId === item.id}
                      >
                        Reject Verification
                      </button>

                      <button
                        className="btn-approve"
                        onClick={() => handleReview(item.id, "approved")}
                        disabled={processingId === item.id}
                      >
                        Approve & Grant Job Posting
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .manage-org-verifications {
          padding: 24px;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: #0f172a;
        }

        .verif-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .verif-header h2 {
          margin: 0 0 6px;
          font-size: 24px;
          font-weight: 800;
          color: #0f172a;
        }

        .verif-header p {
          margin: 0;
          color: #64748b;
          font-size: 14px;
        }

        .search-input {
          padding: 10px 14px;
          border-radius: 10px;
          border: 1px solid #cbd5e1;
          font-size: 14px;
          width: 260px;
          outline: none;
        }

        .verif-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 12px;
        }

        .verif-tab {
          padding: 8px 16px;
          border-radius: 8px;
          border: 1px solid transparent;
          background: #f1f5f9;
          color: #475569;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .verif-tab.active {
          background: #0f766e;
          color: #ffffff;
        }

        .verif-empty {
          background: #ffffff;
          padding: 60px 20px;
          text-align: center;
          border-radius: 16px;
          border: 1px dashed #cbd5e1;
          color: #64748b;
        }

        .verif-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(460px, 1fr));
          gap: 20px;
        }

        .verif-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .verif-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .company-title {
          margin: 0;
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
        }

        .reg-number {
          display: inline-block;
          margin-top: 4px;
          font-size: 12px;
          font-weight: 600;
          color: #0f766e;
          background: #f0fdf4;
          padding: 2px 8px;
          border-radius: 6px;
        }

        .verif-badge {
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.5px;
        }
        .verif-badge.pending { background: #fef3c7; color: #b45309; }
        .verif-badge.approved { background: #dcfce7; color: #15803d; }
        .verif-badge.rejected { background: #fee2e2; color: #b91c1c; }

        .user-meta {
          font-size: 12.5px;
          color: #64748b;
        }

        .verif-media-row {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        .media-preview-box {
          flex: 1;
          min-width: 180px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 10px;
          background: #f8fafc;
        }

        .media-label {
          font-size: 12px;
          font-weight: 700;
          color: #475569;
          margin-bottom: 8px;
        }

        .doc-thumb {
          width: 100%;
          height: 120px;
          object-fit: cover;
          border-radius: 8px;
          display: block;
        }

        .doc-link-btn {
          display: inline-block;
          background: #0f766e;
          color: #ffffff;
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
        }

        .rejection-box {
          background: #fef2f2;
          border-left: 3px solid #ef4444;
          padding: 10px 14px;
          border-radius: 6px;
          font-size: 13px;
          color: #991b1b;
        }

        .verif-actions-panel {
          border-top: 1px solid #f1f5f9;
          padding-top: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .notes-input {
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font-size: 13px;
          outline: none;
        }

        .action-btns {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }

        .btn-approve {
          background: #16a34a;
          color: #ffffff;
          border: none;
          padding: 9px 16px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
        }
        .btn-approve:hover { background: #15803d; }

        .btn-reject {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
          padding: 9px 16px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
        }
        .btn-reject:hover { background: #fee2e2; }
      `}</style>
    </div>
  );
}
