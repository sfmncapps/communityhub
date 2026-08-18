import { useEffect, useMemo, useState } from "react";
import supabase from "../../config/supabaseClient";

const ManageJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchJobs();
    // eslint-disable-next-line
  }, []);

  const fetchJobs = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch pending jobs error:", error);
      alert(`Admin cannot load jobs: ${error.message}`);
      setJobs([]);
      setLoading(false);
      return;
    }

    setJobs(data || []);
    setLoading(false);
  };

  const updateStatus = async (id, status) => {
    const ok = window.confirm(`Confirm to ${status.toUpperCase()} this job?`);
    if (!ok) return;

    const { error } = await supabase
      .from("jobs")
      .update({ status })
      .eq("id", id);

    if (error) {
      console.error("Update status error:", error);
      return alert(`Status update failed: ${error.message}`);
    }

    fetchJobs();
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

  return (
    <div className="page">
      <div className="top">
        <div>
          <h2 className="h2">Pending Jobs</h2>
          <p className="sub">Approve / Reject job posts submitted by users.</p>
        </div>

        <div className="actions">
          <button className="btn" onClick={fetchJobs}>
            Refresh
          </button>
        </div>
      </div>

      <div className="bar">
        <input
          className="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, location, type..."
        />
        <span className="pill">Pending: {filtered.length}</span>
      </div>

      {loading && <p className="muted">Loading...</p>}

      {!loading && filtered.length === 0 && (
        <div className="empty">
          <h3>No pending jobs</h3>
          <p>New jobs will appear here once users post.</p>
        </div>
      )}

      <div className="grid">
        {filtered.map((job) => (
          <div key={job.id} className="card">
            <div className="cardTop">
              <h3 className="title">{job.job_title}</h3>
              <span className="status">PENDING</span>
            </div>

            <div className="meta">
              <span><b>Type:</b> {job.job_type || "-"}</span>
              <span><b>Location:</b> {job.location || "-"}</span>
            </div>

            <p className="desc">{job.job_description || "-"}</p>

            <div className="btnRow">
              <button className="btn" onClick={() => updateStatus(job.id, "approved")}>
                Approve
              </button>
              <button className="btn" onClick={() => updateStatus(job.id, "rejected")}>
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        :root{
          --btn: linear-gradient(135deg, #0f766e, #16a34a);
          --border: #e5e7eb;
          --text: #0f172a;
          --muted: #64748b;
        }
        .page{
          max-width: 1200px;
          margin: 0 auto;
          padding: 18px;
          background:#fff;
          border:1px solid var(--border);
          border-radius: 14px;
        }
        .top{
          display:flex;
          justify-content:space-between;
          gap:12px;
          flex-wrap:wrap;
          align-items:flex-start;
          border-bottom:1px solid #f1f5f9;
          padding-bottom: 10px;
          margin-bottom: 14px;
        }
        .h2{ margin:0; color:var(--text); font-weight:700; }
        .sub{ margin:6px 0 0; color:var(--muted); }
        .actions{ display:flex; gap:10px; }

        .btn{
          background: var(--btn);
          color:#fff;
          border:none;
          border-radius: 10px;
          padding: 11px 16px;
          font-weight: 600;
          cursor:pointer;
          min-width: 140px;
          transition: transform .15s ease, box-shadow .15s ease;
        }
        .btn:hover{ transform: translateY(-1px); box-shadow: 0 12px 22px rgba(2,6,23,.14); }
        .btn:active{ transform: translateY(1px); box-shadow:none; }

        .bar{
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          align-items:center;
          margin: 10px 0 14px;
        }
        .search{
          flex: 1;
          min-width: 280px;
          border:1px solid var(--border);
          border-radius: 10px;
          padding: 10px 12px;
          outline:none;
        }
        .pill{
          border:1px solid var(--border);
          border-radius: 999px;
          padding: 8px 12px;
          color: var(--text);
          background:#fff;
          font-weight: 600;
        }

        .muted{ color: var(--muted); }

        .grid{
          display:grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        .card{
          border:1px solid var(--border);
          border-radius: 14px;
          padding: 14px;
          background:#fff;
          transition: transform .16s ease, box-shadow .16s ease;
        }
        .card:hover{ transform: translateY(-3px); box-shadow: 0 18px 28px rgba(2,6,23,.10); }

        .cardTop{
          display:flex;
          justify-content:space-between;
          gap:10px;
          align-items:flex-start;
        }
        .title{ margin:0; color:var(--text); font-weight: 700; font-size: 1.05rem; }
        .status{
          font-size:.75rem;
          font-weight: 800;
          padding: 6px 10px;
          border-radius: 999px;
          background:#fff7ed;
          border:1px solid #fed7aa;
          color:#9a3412;
        }

        .meta{
          margin-top: 10px;
          display:flex;
          justify-content:space-between;
          gap:10px;
          flex-wrap:wrap;
          color: var(--muted);
          font-weight: 500;
        }

        .desc{
          margin-top: 10px;
          color: var(--text);
          opacity: .9;
          line-height: 1.45;
          display:-webkit-box;
          -webkit-line-clamp: 4;
          -webkit-box-orient: vertical;
          overflow:hidden;
        }

        .btnRow{
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          margin-top: 12px;
        }

        .empty{
          border:1px solid var(--border);
          border-radius: 14px;
          padding: 18px;
          color: var(--muted);
          background:#fff;
        }

        @media (max-width: 1100px){
          .grid{ grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 720px){
          .grid{ grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default ManageJobs;