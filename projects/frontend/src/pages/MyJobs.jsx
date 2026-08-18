import { useEffect, useMemo, useState } from "react";
import supabase from "../config/supabaseClient";

const MyJobsAdvanced = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  // Post
  const [showPost, setShowPost] = useState(false);
  const [posting, setPosting] = useState(false);
  const [jobForm, setJobForm] = useState({
    job_title: "",
    job_description: "",
    job_type: "",
    location: "",
    apply_link: "",
  });


  
  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState(null);

  const getAuthUserId = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data?.user?.id || null;
  };

  const fetchJobs = async () => {
    setLoading(true);
    const uid = await getAuthUserId();
    if (!uid) {
      setJobs([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      alert(`Failed to load jobs: ${error.message}`);
      setJobs([]);
      setLoading(false);
      return;
    }

    setJobs(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchJobs();
    // eslint-disable-next-line
  }, []);

  const typeOptions = useMemo(() => {
    const s = new Set((jobs || []).map((j) => (j.job_type || "").trim()).filter(Boolean));
    return ["all", ...Array.from(s)];
  }, [jobs]);

  const locationOptions = useMemo(() => {
    const s = new Set((jobs || []).map((j) => (j.location || "").trim()).filter(Boolean));
    return ["all", ...Array.from(s)];
  }, [jobs]);

  const counts = useMemo(() => {
    const c = { total: jobs.length, pending: 0, approved: 0, rejected: 0, active: 0 };
    for (const j of jobs) {
      const s = (j.status || "").toLowerCase();
      if (c[s] !== undefined) c[s] += 1;
    }
    return c;
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    let list = [...jobs];

    if (statusFilter !== "all") {
      list = list.filter((j) => (j.status || "").toLowerCase() === statusFilter);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((j) => {
        const title = (j.job_title || "").toLowerCase();
        const desc = (j.job_description || "").toLowerCase();
        const loc = (j.location || "").toLowerCase();
        const type = (j.job_type || "").toLowerCase();
        return title.includes(q) || desc.includes(q) || loc.includes(q) || type.includes(q);
      });
    }

    if (typeFilter !== "all") list = list.filter((j) => (j.job_type || "").trim() === typeFilter);
    if (locationFilter !== "all") list = list.filter((j) => (j.location || "").trim() === locationFilter);

    if (sortBy === "oldest") {
      list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sortBy === "title") {
      list.sort((a, b) => (a.job_title || "").localeCompare(b.job_title || ""));
    } else {
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    return list;
  }, [jobs, statusFilter, search, typeFilter, locationFilter, sortBy]);

  const validateJob = () => {
    if (!jobForm.job_title.trim()) return "Job Title required";
    if (!jobForm.job_description.trim()) return "Job Description required";
    if (!jobForm.job_type.trim()) return "Job Type required";
    if (!jobForm.location.trim()) return "Location required";
    if (!jobForm.apply_link.trim()) return "Apply Link required";
    return null;
  };

  const submitJob = async () => {
    const err = validateJob();
    if (err) return alert(err);

    setPosting(true);

    const uid = await getAuthUserId();
    if (!uid) {
      setPosting(false);
      return alert("Auth user not found. Please login again.");
    }

    const tempId = `temp_${Date.now()}`;
    const optimistic = {
      id: tempId,
      user_id: uid,
      ...jobForm,
      status: "pending",
      created_at: new Date().toISOString(),
      __optimistic: true,
    };
    setJobs((prev) => [optimistic, ...prev]);

    const { data, error } = await supabase
      .from("jobs")
      .insert([
        {
          user_id: uid,
          job_title: jobForm.job_title,
          job_description: jobForm.job_description,
          job_type: jobForm.job_type,
          location: jobForm.location,
          apply_link: jobForm.apply_link,
          status: "pending",
        },
      ])
      .select("*")
      .single();

    if (error) {
      console.error("Insert error:", error);
      setJobs((prev) => prev.filter((j) => j.id !== tempId));
      setPosting(false);
      return alert(`Failed to post job: ${error.message}`);
    }

    setJobs((prev) => prev.map((j) => (j.id === tempId ? data : j)));
    setJobForm({ job_title: "", job_description: "", job_type: "", location: "", apply_link: "" });

    setPosting(false);
    setShowPost(false);
  };

  const openEdit = (job) => {
    setEditForm({ ...job });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editForm?.id) return;
    setEditSaving(true);

    const payload = {
      job_title: editForm.job_title,
      job_description: editForm.job_description,
      job_type: editForm.job_type,
      location: editForm.location,
      apply_link: editForm.apply_link,
    };

    const { error } = await supabase.from("jobs").update(payload).eq("id", editForm.id);

    if (error) {
      console.error(error);
      setEditSaving(false);
      return alert(`Update failed: ${error.message}`);
    }

    setJobs((prev) => prev.map((j) => (j.id === editForm.id ? { ...j, ...payload } : j)));
    setEditSaving(false);
    setEditOpen(false);
    setEditForm(null);
  };

  const deleteJob = async (job) => {
    const ok = window.confirm(`Delete "${job.job_title}" ?`);
    if (!ok) return;

    const snapshot = jobs;
    setJobs((prev) => prev.filter((j) => j.id !== job.id));

    const { error } = await supabase.from("jobs").delete().eq("id", job.id);

    if (error) {
      console.error(error);
      setJobs(snapshot);
      return alert(`Delete failed: ${error.message}`);
    }
  };

  const prettyDate = (iso) => {
    if (!iso) return "";
    return new Date(iso).toLocaleString();
  };

  return (
    <div className="wrap">
      <div className="page">
        <div className="header">
          <div className="headLeft">
            <h2 className="h2">My Jobs</h2>
            <p className="sub">Post, track approvals, edit & manage your jobs.</p>
          </div>

          <div className="headerActions">
            <button className="btn btnPrimary btnWide" onClick={fetchJobs}>
              Refresh
            </button>
            <button className="btn btnPrimary btnWide" onClick={() => setShowPost((s) => !s)}>
              {showPost ? "Close" : "Post a Job"}
            </button>
          </div>
        </div>

        <div className="statsRow">
          <div className="statCard"><span>Total</span><b>{counts.total}</b></div>
          <div className="statCard"><span>Pending</span><b>{counts.pending}</b></div>
          <div className="statCard"><span>Approved</span><b>{counts.approved}</b></div>
          <div className="statCard"><span>Rejected</span><b>{counts.rejected}</b></div>
          <div className="statCard"><span>Active</span><b>{counts.active}</b></div>
        </div>

        <div className={`postWrap ${showPost ? "open" : ""}`}>
          <div className="postCard slideIn">
            <div className="postTitle">
              <h3 className="h3">Post a Job</h3>
              <span className="hint">New job will be pending until admin approves.</span>
            </div>

            <div className="formGrid">
              <div className="field">
                <label>Job Title</label>
                <input value={jobForm.job_title} onChange={(e) => setJobForm({ ...jobForm, job_title: e.target.value })} />
              </div>

              <div className="field">
                <label>Job Type</label>
                <input value={jobForm.job_type} onChange={(e) => setJobForm({ ...jobForm, job_type: e.target.value })} />
              </div>

              <div className="field">
                <label>Location</label>
                <input value={jobForm.location} onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })} />
              </div>

              <div className="field">
                <label>Apply Link</label>
                <input value={jobForm.apply_link} onChange={(e) => setJobForm({ ...jobForm, apply_link: e.target.value })} />
              </div>

              <div className="field fieldFull">
                <label>Job Description</label>
                <textarea value={jobForm.job_description} onChange={(e) => setJobForm({ ...jobForm, job_description: e.target.value })} />
              </div>
            </div>

            <div className="postActions">
              <button className="btn btnPrimary btnWide" onClick={submitJob} disabled={posting}>
                {posting ? "Posting..." : "Submit Job"}
              </button>
              <button className="btn btnPrimary btnWide" onClick={() => setShowPost(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>

        <div className="filterBar">
          <input className="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." />

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="active">Active</option>
          </select>

          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            {typeOptions.map((t) => <option key={t} value={t}>{t === "all" ? "All Types" : t}</option>)}
          </select>

          <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}>
            {locationOptions.map((l) => <option key={l} value={l}>{l === "all" ? "All Locations" : l}</option>)}
          </select>

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="title">Title A→Z</option>
          </select>

          <button className="btn btnPrimary btnWide" onClick={() => {
            setSearch(""); setTypeFilter("all"); setLocationFilter("all");
            setStatusFilter("all"); setSortBy("newest");
          }}>
            Reset
          </button>
        </div>

        <div className="listHeader">
          <span className="badge">Showing {filteredJobs.length} jobs</span>
          {loading && <span className="badge ghost">Loading...</span>}
        </div>

        {!loading && filteredJobs.length === 0 && (
          <div className="empty">
            <h3 className="h3">No jobs found</h3>
            <p className="sub">Try filters or post a new job.</p>
          </div>
        )}

        <div className="grid">
          {filteredJobs.map((job) => (
            <div key={job.id} className={`card ${job.__optimistic ? "pulse" : ""}`}>
              <div className="cardTop">
                <h3 className="h3 jobTitle">{job.job_title}</h3>
                <span className={`pill pill-${(job.status || "unknown").toLowerCase()}`}>
                  {(job.status || "unknown").toUpperCase()}
                </span>
              </div>

              <div className="meta">{prettyDate(job.created_at)}</div>

              <div className="info">
                <div>Type: {job.job_type || "-"}</div>
                <div>Location: {job.location || "-"}</div>
              </div>

              <div className="desc">{job.job_description || ""}</div>

              <div className="actions">
                <a
                  className="btn btnPrimary btnWide"
                  href={job.apply_link || "#"}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => !job.apply_link && e.preventDefault()}
                >
                  Apply Link
                </a>

                <button className="btn btnPrimary btnWide" onClick={() => openEdit(job)}>
                  Edit
                </button>

                <button className="btn btnPrimary btnWide" onClick={() => deleteJob(job)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {editOpen && (
          <div className="modalOverlay" onClick={() => setEditOpen(false)}>
            <div className="modal slideIn" onClick={(e) => e.stopPropagation()}>
              <div className="modalHead">
                <div>
                  <h3 className="h3">Edit Job</h3>
                  <p className="hint">Status changes only by admin.</p>
                </div>
                <button className="btn btnPrimary btnWide" onClick={() => setEditOpen(false)}>
                  Close
                </button>
              </div>

              <div className="formGrid">
                <div className="field">
                  <label>Job Title</label>
                  <input value={editForm?.job_title || ""} onChange={(e) => setEditForm({ ...editForm, job_title: e.target.value })} />
                </div>

                <div className="field">
                  <label>Job Type</label>
                  <input value={editForm?.job_type || ""} onChange={(e) => setEditForm({ ...editForm, job_type: e.target.value })} />
                </div>

                <div className="field">
                  <label>Location</label>
                  <input value={editForm?.location || ""} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} />
                </div>

                <div className="field">
                  <label>Apply Link</label>
                  <input value={editForm?.apply_link || ""} onChange={(e) => setEditForm({ ...editForm, apply_link: e.target.value })} />
                </div>

                <div className="field fieldFull">
                  <label>Job Description</label>
                  <textarea value={editForm?.job_description || ""} onChange={(e) => setEditForm({ ...editForm, job_description: e.target.value })} />
                </div>
              </div>

              <div className="postActions">
                <button className="btn btnPrimary btnWide" onClick={saveEdit} disabled={editSaving}>
                  {editSaving ? "Saving..." : "Save"}
                </button>
                <button className="btn btnPrimary btnWide" onClick={() => setEditOpen(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <style>{`
          :root{
            --btn: linear-gradient(135deg, #0f766e, #16a34a);
            --border: #e5e7eb;
            --text: #0f172a;
            --muted: #64748b;
          }

          .wrap{ width:100%; padding: 12px; }
          .page{
            width:100%;
            max-width: 1200px;
            margin: 0 auto;
            padding: 18px;
            background: #ffffff;
            border: 1px solid var(--border);
            border-radius: 14px;
          }

          /* Header fix */
          .header{
            display:flex;
            justify-content:space-between;
            align-items:flex-start;
            gap: 12px;
            flex-wrap: wrap;
            padding-bottom: 10px;
            border-bottom: 1px solid #f1f5f9;
            margin-bottom: 14px;
          }
          .headLeft{ min-width: 260px; }
          .h2{
            margin:0;
            color: var(--text);
            font-weight: 700;
            letter-spacing: .2px;
          }
          .h3{
            margin:0;
            color: var(--text);
            font-weight: 600;
          }
          .sub{
            margin: 6px 0 0;
            color: var(--muted);
            font-weight: 400;
            line-height: 1.4;
          }

          .headerActions{ display:flex; gap:10px; flex-wrap:wrap; align-items:center; }

          /* Buttons: all same gradient */
          .btn{
            border:none;
            border-radius: 10px;
            padding: 11px 16px;
            cursor:pointer;
            font-weight: 600;
            color: #fff;
            background: var(--btn);
            transition: transform .15s ease, box-shadow .15s ease, filter .15s ease;
            white-space: nowrap;
          }
          .btnWide{ min-width: 140px; } /* ✅ wider */
          .btn:hover{
            transform: translateY(-1px);
            box-shadow: 0 12px 22px rgba(2,6,23,.14);
            filter: saturate(1.05);
          }
          .btn:active{ transform: translateY(1px); box-shadow:none; }
          .btn:disabled{ opacity:.65; cursor:not-allowed; }

          /* Stats */
          .statsRow{
            display:grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 10px;
            margin: 12px 0 14px;
          }
          .statCard{
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 12px;
            display:flex;
            justify-content:space-between;
            align-items:center;
            background: #ffffff;
            transition: transform .15s ease, box-shadow .15s ease;
          }
          .statCard:hover{ transform: translateY(-2px); box-shadow: 0 10px 18px rgba(2,6,23,.08); }
          .statCard span{ color: var(--muted); font-weight: 500; }
          .statCard b{ color: var(--text); font-weight: 700; font-size: 1.05rem; }

          /* Post form */
          .postWrap{ max-height:0; overflow:hidden; transition:max-height .35s ease; }
          .postWrap.open{ max-height: 900px; margin-bottom: 12px; }
          .postCard{
            border: 1px solid var(--border);
            border-radius: 14px;
            padding: 14px;
            background: #fff;
          }
          .postTitle{ display:flex; flex-direction:column; gap:6px; }
          .hint{ color: var(--muted); font-size: .9rem; font-weight: 400; }

          .formGrid{
            display:grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            margin-top: 10px;
          }
          .field label{
            display:block;
            margin-bottom: 6px;
            font-size:.85rem;
            color: var(--muted);
            font-weight: 500;
          }
          .fieldFull{ grid-column: 1/-1; }

          input, textarea, select{
            width:100%;
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 10px 12px;
            outline:none;
            font-weight: 400;
          }
          input:focus, textarea:focus, select:focus{
            border-color: rgba(15,118,110,.55);
            box-shadow: 0 0 0 4px rgba(15,118,110,.10);
          }
          textarea{ min-height: 100px; resize: vertical; }

          .postActions{ display:flex; justify-content:flex-end; gap:10px; margin-top: 12px; flex-wrap:wrap; }

          /* Filter bar */
          .filterBar{
            display:flex;
            gap: 10px;
            align-items:center;
            flex-wrap: nowrap;
            overflow-x: auto;
            padding: 10px;
            border: 1px solid var(--border);
            border-radius: 12px;
            background: #fff;
          }
          .search{ min-width: 260px; }

          .listHeader{
            margin: 12px 0;
            display:flex;
            gap:10px;
            align-items:center;
          }
          .badge{
            border:1px solid var(--border);
            border-radius: 999px;
            padding: 8px 12px;
            background: #fff;
            color: var(--text);
            font-weight: 500;
          }
          .ghost{ color: var(--muted); }

          /* Cards */
          .grid{
            display:grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
          }
          .card{
            border: 1px solid var(--border);
            border-radius: 14px;
            padding: 14px;
            background: #fff;
            transition: transform .16s ease, box-shadow .16s ease;
            animation: pop .22s ease both;
          }
          .card:hover{
            transform: translateY(-3px);
            box-shadow: 0 18px 28px rgba(2,6,23,.10);
          }

          @keyframes pop{ from{opacity:0; transform: translateY(6px);} to{opacity:1; transform: translateY(0);} }
          .pulse{ animation: pulse 1.2s ease-in-out infinite; }
          @keyframes pulse{ 0%,100%{box-shadow:none;} 50%{box-shadow: 0 14px 24px rgba(22,163,74,.14);} }

          .cardTop{ display:flex; justify-content:space-between; align-items:flex-start; gap:10px; }
          .jobTitle{ font-weight: 600; }

          .pill{
            font-size:.75rem;
            font-weight: 600;
            padding: 6px 10px;
            border-radius: 999px;
            border:1px solid var(--border);
            background:#f8fafc;
            color:#0f172a;
          }
          .pill-pending{ background:#fff7ed; border-color:#fed7aa; }
          .pill-approved{ background:#ecfdf5; border-color:#bbf7d0; }
          .pill-rejected{ background:#fef2f2; border-color:#fecaca; }
          .pill-active{ background:#eff6ff; border-color:#bfdbfe; }

          .meta{ margin-top: 8px; color: var(--muted); font-size:.85rem; font-weight: 400; }

          .info{
            margin-top: 10px;
            padding: 10px;
            border-radius: 12px;
            background: #f8fafc;
            border: 1px solid #eef2f7;
            color: #0f172a;
            display:flex;
            justify-content:space-between;
            gap:10px;
            flex-wrap:wrap;
            font-weight: 400;
          }

          .desc{
            margin-top: 10px;
            color: #0f172a;
            opacity: .9;
            display: -webkit-box;
            -webkit-line-clamp: 4;
            -webkit-box-orient: vertical;
            overflow: hidden;
            line-height: 1.45;
            font-weight: 400;
          }

          .actions{ display:flex; gap:10px; flex-wrap:wrap; margin-top: 12px; }

          /* Modal */
          .modalOverlay{
            position: fixed; inset: 0;
            background: rgba(15,23,42,.35);
            display:flex; align-items:center; justify-content:center;
            padding: 14px; z-index: 9999;
          }
          .modal{
            width: min(760px, 96vw);
            background: #fff;
            border: 1px solid var(--border);
            border-radius: 14px;
            padding: 14px;
          }
          .modalHead{ display:flex; justify-content:space-between; align-items:flex-start; gap:10px; }

          .slideIn{ animation: slide .22s ease both; }
          @keyframes slide{ from{ opacity:0; transform: translateY(10px);} to{ opacity:1; transform: translateY(0);} }

          /* Responsive */
          @media (max-width: 1100px){
            .grid{ grid-template-columns: repeat(2, 1fr); }
            .statsRow{ grid-template-columns: repeat(2, 1fr); }
            .formGrid{ grid-template-columns: 1fr; }
          }
          @media (max-width: 720px){
            .grid{ grid-template-columns: 1fr; }
            .statsRow{ grid-template-columns: 1fr; }
          }
        `}</style>
      </div>
    </div>
  );
};

export default MyJobsAdvanced;