import { useEffect, useMemo, useState } from "react";
import { FaBriefcase, FaCheck, FaTimes, FaTrash, FaExternalLinkAlt, FaSearch } from "react-icons/fa";
import supabase from "../../config/supabaseClient";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const ManageJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending"); // 'pending', 'approved', 'all'
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState({ msg: "", type: "info" });

  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "info" }), 3500);
  };

  const getToken = () => localStorage.getItem("token");

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (token) {
        const res = await fetch(`${API}/admin/jobs?status=${activeTab}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setJobs(data.jobs || []);
          setLoading(false);
          return;
        }
      }

      // Fallback directly to Supabase client
      let query = supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false });

      if (activeTab !== "all") {
        query = query.eq("status", activeTab);
      }

      const { data, error } = await query;
      if (error) throw error;
      setJobs(data || []);
    } catch (err) {
      showToast(err.message || "Failed to load jobs", "error");
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [activeTab]);

  const updateStatus = async (id, newStatus) => {
    const ok = window.confirm(`Confirm to ${newStatus.toUpperCase()} this job listing?`);
    if (!ok) return;

    try {
      const token = getToken();
      if (token) {
        const res = await fetch(`${API}/admin/jobs/${id}/status`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        });

        if (res.ok) {
          showToast(`Job marked as ${newStatus}`, "success");
          fetchJobs();
          return;
        }
      }

      // Fallback to Supabase client
      const { error } = await supabase
        .from("jobs")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;
      showToast(`Job marked as ${newStatus}`, "success");
      fetchJobs();
    } catch (err) {
      showToast(`Status update failed: ${err.message}`, "error");
    }
  };

  const deleteJob = async (id) => {
    const ok = window.confirm("Are you sure you want to permanently delete this job listing?");
    if (!ok) return;

    try {
      const token = getToken();
      if (token) {
        const res = await fetch(`${API}/admin/jobs/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          showToast("Job deleted successfully", "success");
          fetchJobs();
          return;
        }
      }

      const { error } = await supabase.from("jobs").delete().eq("id", id);
      if (error) throw error;
      showToast("Job deleted successfully", "success");
      fetchJobs();
    } catch (err) {
      showToast(`Delete failed: ${err.message}`, "error");
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((j) => {
      return (
        (j.job_title || "").toLowerCase().includes(q) ||
        (j.job_description || "").toLowerCase().includes(q) ||
        (j.location || "").toLowerCase().includes(q) ||
        (j.job_type || "").toLowerCase().includes(q)
      );
    });
  }, [jobs, search]);

  const pendingCount = jobs.filter((j) => j.status === "pending").length;

  return (
    <div className="manage-jobs-page">
      <div className="mng-header">
        <div>
          <h2>Job Postings Moderation</h2>
          <p>Review, verify, approve, or reject employer job submissions</p>
        </div>
        <button className="btn-refresh" onClick={fetchJobs}>
          ↻ Refresh
        </button>
      </div>

      {toast.msg && <div className={`mng-toast ${toast.type}`}>{toast.msg}</div>}

      <div className="mng-bar">
        <div className="mng-tabs">
          <button
            className={`mng-tab ${activeTab === "pending" ? "active" : ""}`}
            onClick={() => setActiveTab("pending")}
          >
            Pending Review
            {activeTab === "pending" && pendingCount > 0 && (
              <span className="count-chip">{pendingCount}</span>
            )}
          </button>
          <button
            className={`mng-tab ${activeTab === "approved" ? "active" : ""}`}
            onClick={() => setActiveTab("approved")}
          >
            Approved Jobs
          </button>
          <button
            className={`mng-tab ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            All Submissions
          </button>
        </div>

        <div className="mng-search-box">
          <FaSearch className="mng-search-icon" />
          <input
            type="text"
            placeholder="Search title, location, type, company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading && (
        <div className="mng-loading">
          <div className="mng-spinner"></div>
          <p>Loading jobs...</p>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="mng-empty-state">
          <FaBriefcase className="empty-icon" />
          <h3>No jobs found</h3>
          <p>
            {activeTab === "pending"
              ? "All submitted jobs have been reviewed! There are no pending jobs at this time."
              : "No jobs match your current search criteria."}
          </p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="mng-grid">
          {filtered.map((job) => (
            <div key={job.id} className="job-admin-card">
              <div className="card-top">
                <div className="card-top-left">
                  <div className="status-row">
                    <span className={`status-pill ${job.status || "pending"}`}>
                      {(job.status || "pending").toUpperCase()}
                    </span>
                    <span className="type-pill">{job.job_type || "Full Time"}</span>
                  </div>
                  <h3 className="job-title">{job.job_title}</h3>
                  <div className="job-location">📍 {job.location || "Remote / Unspecified"}</div>
                </div>
              </div>

              <div className="card-body">
                <div className="desc-box">
                  <pre className="desc-text">{job.job_description || "No description provided."}</pre>
                </div>

                {job.apply_link && (
                  <div className="apply-link-box">
                    <span className="apply-label">Google Form / Apply Link:</span>
                    <a
                      href={job.apply_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="apply-link"
                    >
                      {job.apply_link} <FaExternalLinkAlt className="ext-icon" />
                    </a>
                  </div>
                )}
              </div>

              <div className="card-actions">
                {job.status === "pending" && (
                  <>
                    <button
                      className="btn-action approve"
                      onClick={() => updateStatus(job.id, "approved")}
                    >
                      <FaCheck /> Approve
                    </button>
                    <button
                      className="btn-action reject"
                      onClick={() => updateStatus(job.id, "rejected")}
                    >
                      <FaTimes /> Reject
                    </button>
                  </>
                )}

                {job.status === "approved" && (
                  <button
                    className="btn-action reject"
                    onClick={() => updateStatus(job.id, "rejected")}
                  >
                    <FaTimes /> Revoke Approval
                  </button>
                )}

                {job.status === "rejected" && (
                  <button
                    className="btn-action approve"
                    onClick={() => updateStatus(job.id, "approved")}
                  >
                    <FaCheck /> Re-Approve
                  </button>
                )}

                <button
                  className="btn-action delete"
                  onClick={() => deleteJob(job.id)}
                  title="Permanently Delete Job"
                >
                  <FaTrash /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .manage-jobs-page {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: #0f172a;
        }

        .mng-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .mng-header h2 {
          font-size: 22px;
          font-weight: 800;
          margin: 0 0 4px;
        }
        .mng-header p {
          color: #64748b;
          font-size: 13px;
          margin: 0;
        }
        .btn-refresh {
          background: white;
          border: 1px solid #cbd5e1;
          color: #334155;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
        }

        .mng-toast {
          padding: 12px 16px;
          border-radius: 10px;
          margin-bottom: 16px;
          font-size: 14px;
          font-weight: 700;
        }
        .mng-toast.success { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
        .mng-toast.error { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
        .mng-toast.info { background: #e0f2fe; color: #075985; border: 1px solid #7dd3fc; }

        .mng-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .mng-tabs {
          display: flex;
          gap: 8px;
          background: #e2e8f0;
          padding: 4px;
          border-radius: 10px;
        }
        .mng-tab {
          border: none;
          background: transparent;
          padding: 8px 14px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 13px;
          color: #475569;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all .15s;
        }
        .mng-tab.active {
          background: white;
          color: #0f172a;
          box-shadow: 0 2px 6px rgba(0,0,0,0.08);
        }
        .count-chip {
          background: #f59e0b;
          color: #1e293b;
          font-size: 11px;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 999px;
        }

        .mng-search-box {
          position: relative;
          min-width: 320px;
        }
        .mng-search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }
        .mng-search-box input {
          width: 100%;
          padding: 10px 14px 10px 36px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          font-size: 13px;
          outline: none;
        }

        .mng-loading, .mng-empty-state {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 60px 20px;
          text-align: center;
        }
        .mng-spinner {
          width: 36px;
          height: 36px;
          border: 3px solid #e2e8f0;
          border-top-color: #0f766e;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 12px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .empty-icon {
          font-size: 38px;
          color: #94a3b8;
          margin-bottom: 12px;
        }

        .mng-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
          gap: 20px;
        }

        .job-admin-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.04);
          display: flex;
          flex-direction: column;
        }

        .card-top {
          padding: 16px;
          background: #f8fafc;
          border-bottom: 1px solid #f1f5f9;
        }
        .status-row {
          display: flex;
          gap: 8px;
          margin-bottom: 8px;
        }
        .status-pill {
          font-size: 10px;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 6px;
        }
        .status-pill.pending { background: #fef3c7; color: #92400e; }
        .status-pill.approved { background: #dcfce7; color: #166534; }
        .status-pill.rejected { background: #fee2e2; color: #991b1b; }

        .type-pill {
          font-size: 10px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 6px;
          background: #e0f2fe;
          color: #0369a1;
        }

        .job-title {
          font-size: 16px;
          font-weight: 800;
          margin: 0 0 6px;
          color: #0f172a;
        }
        .job-location {
          font-size: 12px;
          color: #64748b;
          font-weight: 600;
        }

        .card-body {
          padding: 16px;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .desc-box {
          background: #f8fafc;
          border: 1px solid #f1f5f9;
          border-radius: 8px;
          padding: 10px 12px;
          max-height: 140px;
          overflow-y: auto;
        }
        .desc-text {
          font-family: inherit;
          font-size: 12px;
          color: #475569;
          white-space: pre-wrap;
          margin: 0;
          line-height: 1.5;
        }

        .apply-link-box {
          font-size: 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .apply-label {
          font-weight: 700;
          color: #334155;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .apply-link {
          color: #0f766e;
          word-break: break-all;
          text-decoration: none;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .apply-link:hover {
          text-decoration: underline;
        }
        .ext-icon {
          font-size: 10px;
          flex-shrink: 0;
        }

        .card-actions {
          padding: 12px 16px;
          background: #f8fafc;
          border-top: 1px solid #f1f5f9;
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }
        .btn-action {
          padding: 7px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          border: none;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          transition: filter 0.15s;
        }
        .btn-action.approve {
          background: #10b981;
          color: white;
        }
        .btn-action.reject {
          background: #f1f5f9;
          color: #b91c1c;
          border: 1px solid #fca5a5;
        }
        .btn-action.delete {
          background: #fff5f5;
          color: #ef4444;
          border: 1px solid #fecaca;
        }
        .btn-action:hover {
          filter: brightness(0.95);
        }
      `}</style>
    </div>
  );
};

export default ManageJobs;