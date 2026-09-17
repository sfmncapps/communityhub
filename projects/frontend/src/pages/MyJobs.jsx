import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import supabase from "../config/supabaseClient";
import {
  FaBriefcase,
  FaBuilding,
  FaUserCheck,
  FaIdCard,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaExternalLinkAlt,
  FaPlus,
  FaSearch,
  FaShieldAlt,
} from "react-icons/fa";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const GOOGLE_FORM_REGEX = /^(https?:\/\/)?(forms\.gle\/[a-zA-Z0-9_-]+|(docs|drive)\.google\.com\/forms\/[^\s]+)/i;

const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Internship", "Remote", "Hybrid"];
const EXPERIENCE_LEVELS = ["Entry Level (0-1 yrs)", "Junior (1-3 yrs)", "Mid-Level (3-5 yrs)", "Senior (5+ yrs)", "Director / Executive"];

export default function MyJobs() {
  const navigate = useNavigate();

  // User & Verification State
  const [currentUser, setCurrentUser] = useState(null);
  const [verification, setVerification] = useState({
    status: "unverified", // unverified | pending | verified | approved
    role: "user", // employer | employee | user
    company_name: "",
    id_type: "",
    redacted_id_url: "",
  });
  const [loadingUser, setLoadingUser] = useState(true);

  // Verification Prompt Form Modal State
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyRole, setVerifyRole] = useState("employer"); // 'employer' | 'employee'
  const [verifyCompany, setVerifyCompany] = useState("");
  const [verifyIdType, setVerifyIdType] = useState("company_registration");
  const [verifyFile, setVerifyFile] = useState(null);
  const [verifyUrl, setVerifyUrl] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState({ type: "", text: "" });

  // Jobs State
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  // Post Job Form State
  const [showPost, setShowPost] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postMsg, setPostMsg] = useState({ type: "", text: "" });
  const [jobForm, setJobForm] = useState({
    job_title: "",
    company_name: "",
    job_type: "Full-time",
    experience: "Junior (1-3 yrs)",
    location: "",
    apply_link: "",
    job_description: "",
  });

  // Edit Modal State
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState(null);

  // Load User & Verification
  useEffect(() => {
    loadUserAndVerification();
  }, []);

  const loadUserAndVerification = async () => {
    setLoadingUser(true);
    let userObj = null;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        userObj = user;
      } else {
        const cached = localStorage.getItem("user");
        if (cached) {
          try {
            userObj = JSON.parse(cached);
          } catch {}
        }
      }

      const token = localStorage.getItem("token");
      if (token) {
        try {
          const res = await fetch(`${API}/verification/status`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const vData = await res.json();
            setVerification({
              status: vData.verification_status || "unverified",
              role: vData.role || (userObj?.role || "user"),
              company_name: vData.company_name || (userObj?.company_name || ""),
              id_type: vData.id_type || "",
              redacted_id_url: vData.redacted_id_url || "",
            });
            if (vData.company_name) {
              setJobForm((prev) => ({ ...prev, company_name: vData.company_name }));
            }
          }
        } catch (vErr) {
          console.warn("Verification check:", vErr.message);
        }
      } else if (userObj) {
        setVerification({
          status: userObj.verification_status || "unverified",
          role: userObj.role || "user",
          company_name: userObj.company_name || "",
          id_type: userObj.id_type || "",
          redacted_id_url: userObj.id_document_url || "",
        });
      }

      setCurrentUser(userObj);
      if (userObj?.id) {
        fetchJobs(userObj.id);
      } else {
        fetchJobs();
      }
    } catch (err) {
      console.error("Load user error:", err);
    } finally {
      setLoadingUser(false);
    }
  };

  const fetchJobs = async (userId) => {
    setLoadingJobs(true);
    try {
      const token = localStorage.getItem("token");
      let fetched = null;

      // 1. Try backend API for authenticated list
      if (token) {
        try {
          const res = await fetch(`${API}/my/jobs`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            fetched = data.items || [];
          }
        } catch {}
      }

      // 2. Fallback to Supabase
      if (!fetched) {
        let query = supabase.from("jobs").select("*").order("created_at", { ascending: false });
        if (userId) {
          query = query.eq("user_id", userId);
        }
        const { data, error } = await query;
        if (!error && data) {
          fetched = data;
        }
      }

      setJobs(fetched || []);
    } catch (e) {
      console.error("Fetch jobs error:", e);
      setJobs([]);
    } finally {
      setLoadingJobs(false);
    }
  };

  const isVerifiedEmployer =
    verification.role === "employer" &&
    (verification.status === "verified" || verification.status === "approved" || verification.status === "pending");

  const isVerifiedEmployee =
    verification.role === "employee" ||
    (verification.role === "user" && (verification.status === "verified" || verification.status === "approved"));

  // Handle Official ID Submission
  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setVerifyMsg({ type: "", text: "" });

    if (!verifyFile && !verifyUrl.trim()) {
      return setVerifyMsg({ type: "error", text: "Please attach an official ID document file or paste a link." });
    }

    if (verifyRole === "employer" && !verifyCompany.trim()) {
      return setVerifyMsg({ type: "error", text: "Company / Organization name is required for Employer verification." });
    }

    setVerifying(true);
    try {
      let filePath = verifyUrl.trim();

      if (verifyFile) {
        try {
          const fileExt = verifyFile.name.split(".").pop() || "jpg";
          const uid = currentUser?.id || "guest";
          const sPath = `${uid}/${Date.now()}_id.${fileExt}`;

          const { error: uploadErr } = await supabase.storage
            .from("id-documents")
            .upload(sPath, verifyFile, { upsert: true });

          if (!uploadErr) {
            const { data: pubData } = supabase.storage.from("id-documents").getPublicUrl(sPath);
            filePath = pubData?.publicUrl || sPath;
          }
        } catch (err) {
          console.warn("Storage upload notice:", err.message);
        }

        if (!filePath || filePath.startsWith("blob:")) {
          filePath = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => resolve("id_uploaded");
            reader.readAsDataURL(verifyFile);
          });
        }
      }

      // Sync with backend API
      const token = localStorage.getItem("token");
      if (token) {
        await fetch(`${API}/verification/upload`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            role: verifyRole,
            company_name: verifyCompany.trim(),
            id_type: verifyIdType,
            redacted_id_url: filePath,
          }),
        });
      }

      // Also insert into Supabase directly
      if (currentUser?.id) {
        await supabase.from("id_verifications").insert({
          user_id: currentUser.id,
          document_url: filePath,
          status: "pending",
        });
      }

      // Update state
      const updated = {
        ...verification,
        role: verifyRole,
        company_name: verifyCompany.trim(),
        id_type: verifyIdType,
        status: "pending",
        redacted_id_url: filePath,
      };
      setVerification(updated);

      if (verifyCompany.trim()) {
        setJobForm((prev) => ({ ...prev, company_name: verifyCompany.trim() }));
      }

      const cachedUserStr = localStorage.getItem("user");
      if (cachedUserStr) {
        try {
          const u = JSON.parse(cachedUserStr);
          u.role = verifyRole;
          u.company_name = verifyCompany.trim();
          u.verification_status = "pending";
          localStorage.setItem("user", JSON.stringify(u));
          window.dispatchEvent(new Event("profile-updated"));
        } catch {}
      }

      setVerifyMsg({
        type: "success",
        text: `Official ${verifyRole === "employer" ? "Employer" : "Employee"} ID submitted successfully! It is now pending administrator review.`,
      });
      setTimeout(() => {
        setShowVerifyModal(false);
      }, 1500);
    } catch (err) {
      setVerifyMsg({ type: "error", text: err.message || "Failed to submit official ID." });
    } finally {
      setVerifying(false);
    }
  };

  // Validate & Submit Job
  const validateJob = () => {
    if (!jobForm.job_title.trim()) return "Job Title is required.";
    if (!jobForm.company_name.trim()) return "Company / Organization Name is required.";
    if (!jobForm.location.trim()) return "Location is required.";
    if (!jobForm.job_description.trim()) return "Job Description is required.";
    if (!jobForm.apply_link.trim()) {
      return "Application Link is required. Please share a valid Google Form link.";
    }
    if (!GOOGLE_FORM_REGEX.test(jobForm.apply_link.trim())) {
      return "Application Link must be a valid Google Form URL (e.g., https://forms.gle/... or https://docs.google.com/forms/...)";
    }
    return null;
  };

  const submitJob = async (e) => {
    if (e) e.preventDefault();
    setPostMsg({ type: "", text: "" });

    const err = validateJob();
    if (err) {
      setPostMsg({ type: "error", text: err });
      return;
    }

    setPosting(true);
    try {
      const token = localStorage.getItem("token");
      const uid = currentUser?.id;

      // Pack experience & company cleanly into description for universal compatibility
      let enrichedDescription = jobForm.job_description.trim();
      const metaHeader = `Company: ${jobForm.company_name.trim()} | Experience: ${jobForm.experience}`;
      if (!enrichedDescription.includes(metaHeader)) {
        enrichedDescription = `${metaHeader}\n\n${enrichedDescription}`;
      }

      const payload = {
        job_title: jobForm.job_title.trim(),
        company_name: jobForm.company_name.trim(),
        job_type: jobForm.job_type,
        experience: jobForm.experience,
        location: jobForm.location.trim(),
        apply_link: jobForm.apply_link.trim(),
        job_description: enrichedDescription,
      };

      let saved = false;

      // 1. Try authenticated backend API
      if (token) {
        try {
          const res = await fetch(`${API}/my/jobs`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          });
          const resData = await res.json();
          if (res.ok) {
            saved = true;
          } else if (res.status !== 401 && res.status !== 403) {
            throw new Error(resData.message || "Server rejected job posting");
          }
        } catch (apiErr) {
          console.warn("Backend API job submit notice:", apiErr.message);
        }
      }

      // 2. Direct Supabase insert fallback
      if (!saved && uid) {
        const { error: supaErr } = await supabase.from("jobs").insert([
          {
            user_id: uid,
            job_title: payload.job_title,
            job_description: payload.job_description,
            job_type: payload.job_type,
            location: payload.location,
            apply_link: payload.apply_link,
            status: "pending",
          },
        ]);
        if (supaErr) throw supaErr;
        saved = true;
      }

      if (!saved) {
        throw new Error("Unable to save job. Please ensure you are logged in.");
      }

      setPostMsg({
        type: "success",
        text: "Job submitted successfully! It is now pending administrator approval before appearing publicly.",
      });

      setJobForm({
        job_title: "",
        company_name: verification.company_name || "",
        job_type: "Full-time",
        experience: "Junior (1-3 yrs)",
        location: "",
        apply_link: "",
        job_description: "",
      });

      setShowPost(false);
      fetchJobs(uid);
    } catch (submitErr) {
      setPostMsg({ type: "error", text: submitErr.message || "Failed to post job." });
    } finally {
      setPosting(false);
    }
  };

  const deleteJob = async (job) => {
    if (!window.confirm(`Are you sure you want to delete "${job.job_title}"?`)) return;

    try {
      const token = localStorage.getItem("token");
      let deleted = false;

      if (token) {
        try {
          const res = await fetch(`${API}/my/jobs/${job.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) deleted = true;
        } catch {}
      }

      if (!deleted) {
        const { error } = await supabase.from("jobs").delete().eq("id", job.id);
        if (error) throw error;
      }

      setJobs((prev) => prev.filter((j) => j.id !== job.id));
    } catch (delErr) {
      alert("Delete failed: " + delErr.message);
    }
  };

  // Filtered Jobs
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

  const counts = useMemo(() => {
    const c = { total: jobs.length, pending: 0, approved: 0, rejected: 0 };
    for (const j of jobs) {
      const s = (j.status || "").toLowerCase();
      if (s === "approved" || s === "active") c.approved += 1;
      else if (s === "rejected") c.rejected += 1;
      else c.pending += 1;
    }
    return c;
  }, [jobs]);

  return (
    <div className="my-jobs-container">
      {/* HEADER ROW */}
      <div className="my-jobs-header">
        <div>
          <h2>
            <FaBriefcase style={{ color: "#0f766e", marginRight: "10px" }} />
            My Jobs & Recruitment
          </h2>
          <p className="subtext">Post open roles, manage recruitment listings, and track administrator approvals.</p>
        </div>

        <div className="header-actions">
          <button className="btn-secondary" onClick={() => fetchJobs(currentUser?.id)}>
            Refresh
          </button>

          {isVerifiedEmployer ? (
            <button className="btn-primary" onClick={() => setShowPost((prev) => !prev)}>
              <FaPlus /> {showPost ? "Close Post Form" : "Post a New Job"}
            </button>
          ) : (
            <button className="btn-primary" onClick={() => setShowVerifyModal(true)}>
              <FaShieldAlt /> Verify Official ID to Post Job
            </button>
          )}
        </div>
      </div>

      {/* FEEDBACK ALERTS */}
      {postMsg.text && (
        <div className={`alert-box ${postMsg.type}`}>
          {postMsg.text}
        </div>
      )}

      {/* EMPLOYER VERIFICATION GATE BANNER */}
      {verification.role !== "employer" && (
        <div className="verification-employee-banner">
          <FaUserCheck className="status-icon" />
          <div style={{ flex: 1 }}>
            <strong>Job Seeker / Candidate Mode Active</strong>
            <p>
              As an employee or job seeker, <strong>no ID verification is required</strong>! You have full access to explore community opportunities, view verified job openings, and apply directly via recruiters' Google Forms.
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
            <Link to="/jobs" className="btn-browse-jobs">
              Browse Approved Jobs ↗
            </Link>
            <button className="btn-secondary" style={{ fontSize: "12px" }} onClick={() => { setVerifyRole("employer"); setShowVerifyModal(true); }}>
              Are you an Employer? Verify to Post Jobs
            </button>
          </div>
        </div>
      )}

      {/* PENDING EMPLOYER VERIFICATION */}
      {verification.role === "employer" && (verification.status === "pending" || verification.status === "unverified") && (
        <div className="verification-pending-banner">
          <FaClock className="status-icon" />
          <div style={{ flex: 1 }}>
            <strong>Employer Official ID Verification {verification.status === "pending" ? "Pending Administrator Review" : "Required"}</strong>
            <p>
              {verification.status === "pending"
                ? `Your official organization verification for ${verification.company_name || "your company"} has been submitted and is currently being audited by our verification team.`
                : "To post open jobs on CommunityHub, please verify your organization with official company documentation (Business License, Incorporation Certificate, or Tax ID)."}
            </p>
          </div>
          {verification.status !== "pending" && (
            <button className="btn-verify-now" onClick={() => { setVerifyRole("employer"); setShowVerifyModal(true); }}>
              Verify Employer ID
            </button>
          )}
        </div>
      )}

      {/* STATS TILES */}
      <div className="stats-row">
        <div className="stat-tile">
          <span>Total Postings</span>
          <b>{counts.total}</b>
        </div>
        <div className="stat-tile">
          <span>Pending Admin Review</span>
          <b style={{ color: "#d97706" }}>{counts.pending}</b>
        </div>
        <div className="stat-tile">
          <span>Publicly Approved</span>
          <b style={{ color: "#16a34a" }}>{counts.approved}</b>
        </div>
        <div className="stat-tile">
          <span>Rejected / Action Needed</span>
          <b style={{ color: "#dc2626" }}>{counts.rejected}</b>
        </div>
      </div>

      {/* POST A JOB FORM (FOR VERIFIED EMPLOYERS) */}
      {isVerifiedEmployer && showPost && (
        <div className="post-job-card">
          <div className="card-header">
            <h3>Post a New Job Vacancy</h3>
            <span className="notice">
              🛡️ All submitted job postings require administrator approval before becoming visible to public candidates.
            </span>
          </div>

          <form onSubmit={submitJob} className="job-form-grid">
            <div className="form-field">
              <label>Job Title <span className="req">*</span></label>
              <input
                type="text"
                placeholder="e.g. Senior Frontend Engineer"
                value={jobForm.job_title}
                onChange={(e) => setJobForm({ ...jobForm, job_title: e.target.value })}
                required
              />
            </div>

            <div className="form-field">
              <label>Company / Organization Name <span className="req">*</span></label>
              <input
                type="text"
                placeholder="e.g. Acme Tech Solutions"
                value={jobForm.company_name}
                onChange={(e) => setJobForm({ ...jobForm, company_name: e.target.value })}
                required
              />
            </div>

            <div className="form-field">
              <label>Employment Type <span className="req">*</span></label>
              <select
                value={jobForm.job_type}
                onChange={(e) => setJobForm({ ...jobForm, job_type: e.target.value })}
              >
                {JOB_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label>Required Experience Level</label>
              <select
                value={jobForm.experience}
                onChange={(e) => setJobForm({ ...jobForm, experience: e.target.value })}
              >
                {EXPERIENCE_LEVELS.map((exp) => (
                  <option key={exp} value={exp}>{exp}</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label>Job Location (City, State / Remote) <span className="req">*</span></label>
              <input
                type="text"
                placeholder="e.g. San Francisco, CA or Remote"
                value={jobForm.location}
                onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
                required
              />
            </div>

            <div className="form-field">
              <label>
                Application Link (Google Form Required) <span className="req">*</span>
              </label>
              <input
                type="url"
                placeholder="https://forms.gle/... or https://docs.google.com/forms/..."
                value={jobForm.apply_link}
                onChange={(e) => setJobForm({ ...jobForm, apply_link: e.target.value })}
                required
              />
              <span className="field-hint">Candidates will apply directly through your Google Form link.</span>
            </div>

            <div className="form-field full-width">
              <label>Job Description & Requirements <span className="req">*</span></label>
              <textarea
                rows={5}
                placeholder="Detail key responsibilities, qualifications, and benefits..."
                value={jobForm.job_description}
                onChange={(e) => setJobForm({ ...jobForm, job_description: e.target.value })}
                required
              />
            </div>

            <div className="form-actions full-width">
              <button type="submit" className="btn-primary" disabled={posting}>
                {posting ? "Submitting for Approval..." : "Submit Job for Admin Approval"}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowPost(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FILTER CONTROLS */}
      <div className="filter-bar">
        <div className="search-wrap">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search your jobs by title, location, or keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="pending">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>

        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">All Types</option>
          {JOB_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="title">Title A-Z</option>
        </select>
      </div>

      {/* JOBS LIST */}
      {loadingJobs ? (
        <div className="jobs-loading">Loading your posted jobs...</div>
      ) : filteredJobs.length === 0 ? (
        <div className="jobs-empty">
          <FaBriefcase style={{ fontSize: "36px", color: "#cbd5e1", marginBottom: "10px" }} />
          <h3>No Job Postings Found</h3>
          <p>
            {search.trim() || statusFilter !== "all"
              ? "No jobs match your current filter settings."
              : isVerifiedEmployer
              ? "You haven't posted any jobs yet. Click 'Post a New Job' above to submit your first vacancy."
              : "Verify your official ID as an Employer to begin publishing recruitment vacancies."}
          </p>
        </div>
      ) : (
        <div className="jobs-grid">
          {filteredJobs.map((job) => {
            const statusKey = (job.status || "pending").toLowerCase();
            return (
              <div key={job.id} className="job-card">
                <div className="card-top">
                  <div>
                    <h3 className="job-title">{job.job_title}</h3>
                    <div className="job-meta-row">
                      <span className="badge-type">{job.job_type || "Full-time"}</span>
                      <span className="meta-loc">📍 {job.location || "Remote"}</span>
                    </div>
                  </div>

                  <span className={`status-badge ${statusKey}`}>
                    {statusKey === "approved" || statusKey === "active" ? (
                      <>✓ Approved</>
                    ) : statusKey === "rejected" ? (
                      <>✕ Rejected</>
                    ) : (
                      <>⏳ Pending Approval</>
                    )}
                  </span>
                </div>

                <p className="job-snippet">
                  {job.job_description?.length > 150
                    ? `${job.job_description.slice(0, 150)}...`
                    : job.job_description || "No description provided."}
                </p>

                <div className="card-footer">
                  {job.apply_link && (
                    <a
                      href={job.apply_link.startsWith("http") ? job.apply_link : `https://${job.apply_link}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-google-form"
                    >
                      Google Form Application ↗
                    </a>
                  )}

                  <div className="card-btn-group">
                    <button className="btn-delete" onClick={() => deleteJob(job)}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* EMPLOYER ID VERIFICATION MODAL */}
      {showVerifyModal && (
        <div className="modal-backdrop" onClick={() => setShowVerifyModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <FaShieldAlt style={{ color: "#0f766e", marginRight: "8px" }} />
                Employer Organization Verification
              </h3>
              <button className="close-btn" onClick={() => setShowVerifyModal(false)}>✕</button>
            </div>

            <p style={{ margin: "10px 20px 0", fontSize: "13px", color: "#64748b" }}>
              💡 <strong>Note:</strong> Verification is required strictly for <strong>Employers</strong> who wish to post job openings. Employees and job seekers do <em>not</em> need to submit any official ID.
            </p>

            {verifyMsg.text && (
              <div className={`alert-box ${verifyMsg.type}`} style={{ margin: "14px 20px 0" }}>
                {verifyMsg.text}
              </div>
            )}

            <form onSubmit={handleVerifySubmit} className="verify-form">
              <div className="form-group">
                <label className="form-label">
                  Company / Organization Name <span className="req">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Apex Global Innovations Pvt Ltd"
                  value={verifyCompany}
                  onChange={(e) => setVerifyCompany(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Official Document Type:</label>
                <select value={verifyIdType} onChange={(e) => setVerifyIdType(e.target.value)}>
                  <option value="company_registration">Business / Incorporation Registration Document</option>
                  <option value="tax_id">Tax ID / Business PAN / GST Certificate</option>
                  <option value="business_license">Commercial Operating License</option>
                  <option value="employer_hr_id">HR / Recruiter Official Employee ID Card</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Upload Official Employer Document (Image or PDF):</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setVerifyFile(e.target.files?.[0] || null)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Or Paste Document URL / Cloud Storage Link:</label>
                <input
                  type="url"
                  placeholder="https://example.com/company-registration.pdf"
                  value={verifyUrl}
                  onChange={(e) => setVerifyUrl(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn-primary" disabled={verifying}>
                  {verifying ? "Submitting Employer ID..." : "Submit Employer Verification"}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowVerifyModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STYLES */}
      <style>{`
        .my-jobs-container {
          max-width: 1200px;
          margin: 0 auto;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: #0f172a;
        }

        .my-jobs-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          flex-wrap: wrap;
          padding-bottom: 16px;
          border-bottom: 1px solid #e2e8f0;
          margin-bottom: 20px;
        }

        .my-jobs-header h2 {
          margin: 0 0 6px;
          font-size: 26px;
          font-weight: 800;
          display: flex;
          align-items: center;
        }

        .subtext {
          margin: 0;
          color: #64748b;
          font-size: 14px;
        }

        .header-actions {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .btn-primary {
          background: linear-gradient(135deg, #0f766e, #16a34a);
          color: white;
          border: none;
          padding: 10px 18px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: transform 0.15s, box-shadow 0.15s;
        }

        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(15, 118, 110, 0.25);
        }

        .btn-secondary {
          background: #f1f5f9;
          color: #334155;
          border: 1px solid #cbd5e1;
          padding: 10px 16px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
        }

        .btn-secondary:hover {
          background: #e2e8f0;
        }

        /* Banners */
        .verification-gate-banner {
          display: flex;
          align-items: center;
          gap: 16px;
          background: linear-gradient(135deg, #fef3c7, #fffbeb);
          border: 1px solid #fde68a;
          border-radius: 14px;
          padding: 18px 22px;
          margin-bottom: 20px;
          box-shadow: 0 4px 12px rgba(217, 119, 6, 0.08);
        }

        .gate-icon {
          font-size: 32px;
        }

        .gate-text {
          flex: 1;
        }

        .gate-text h4 {
          margin: 0 0 4px;
          color: #92400e;
          font-size: 16px;
          font-weight: 700;
        }

        .gate-text p {
          margin: 0;
          color: #78350f;
          font-size: 13.5px;
        }

        .btn-verify-now {
          background: #d97706;
          color: white;
          border: none;
          padding: 10px 18px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 13.5px;
          cursor: pointer;
          white-space: nowrap;
        }

        .verification-pending-banner {
          display: flex;
          align-items: center;
          gap: 14px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 12px;
          padding: 14px 18px;
          margin-bottom: 20px;
          color: #1e40af;
          font-size: 13.5px;
        }

        .verification-pending-banner p {
          margin: 4px 0 0;
          color: #1d4ed8;
        }

        .verification-employee-banner {
          display: flex;
          align-items: center;
          gap: 14px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 12px;
          padding: 14px 18px;
          margin-bottom: 20px;
          color: #166534;
          font-size: 13.5px;
        }

        .verification-employee-banner p {
          margin: 4px 0 0;
          color: #15803d;
        }

        .btn-browse-jobs {
          background: #16a34a;
          color: white;
          text-decoration: none;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 13px;
          white-space: nowrap;
        }

        .status-icon {
          font-size: 24px;
          flex-shrink: 0;
        }

        /* Stats */
        .stats-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
          margin-bottom: 22px;
        }

        .stat-tile {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.02);
        }

        .stat-tile span {
          font-size: 12px;
          color: #64748b;
          font-weight: 600;
          text-transform: uppercase;
        }

        .stat-tile b {
          font-size: 22px;
          color: #0f172a;
        }

        /* Post Job Card */
        .post-job-card {
          background: white;
          border: 1px solid #cbd5e1;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
        }

        .card-header {
          margin-bottom: 18px;
        }

        .card-header h3 {
          margin: 0 0 6px;
          font-size: 20px;
          font-weight: 800;
        }

        .notice {
          color: #0f766e;
          font-size: 13px;
          font-weight: 600;
        }

        .job-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-field.full-width {
          grid-column: 1 / -1;
        }

        .form-field label {
          font-size: 13.5px;
          font-weight: 700;
          color: #334155;
        }

        .req {
          color: #ef4444;
        }

        .form-field input,
        .form-field select,
        .form-field textarea {
          padding: 11px 14px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.15s;
        }

        .form-field input:focus,
        .form-field select:focus,
        .form-field textarea:focus {
          border-color: #0f766e;
          box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.12);
        }

        .field-hint {
          font-size: 12px;
          color: #0284c7;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 10px;
        }

        /* Filter bar */
        .filter-bar {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 12px;
          margin-bottom: 20px;
        }

        .search-wrap {
          flex: 1;
          display: flex;
          align-items: center;
          position: relative;
          min-width: 220px;
        }

        .search-icon {
          position: absolute;
          left: 14px;
          color: #94a3b8;
        }

        .search-wrap input {
          width: 100%;
          padding: 9px 12px 9px 40px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 13.5px;
          outline: none;
        }

        .filter-bar select {
          padding: 9px 14px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 13.5px;
          outline: none;
          background: white;
        }

        /* Jobs Grid */
        .jobs-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
        }

        .job-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 18px 22px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.03);
          transition: transform 0.15s, box-shadow 0.15s;
        }

        .job-card:hover {
          box-shadow: 0 6px 18px rgba(0,0,0,0.06);
        }

        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 14px;
          margin-bottom: 10px;
        }

        .job-title {
          margin: 0 0 6px;
          font-size: 19px;
          font-weight: 700;
          color: #0f172a;
        }

        .job-meta-row {
          display: flex;
          gap: 10px;
          align-items: center;
          font-size: 13px;
        }

        .badge-type {
          background: #f1f5f9;
          color: #475569;
          padding: 3px 8px;
          border-radius: 6px;
          font-weight: 600;
        }

        .meta-loc {
          color: #64748b;
        }

        .status-badge {
          padding: 5px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
        }

        .status-badge.pending {
          background: #fef3c7;
          color: #92400e;
        }

        .status-badge.approved,
        .status-badge.active {
          background: #dcfce7;
          color: #166534;
        }

        .status-badge.rejected {
          background: #fee2e2;
          color: #b91c1c;
        }

        .job-snippet {
          margin: 0 0 14px;
          color: #475569;
          font-size: 13.5px;
          line-height: 1.5;
        }

        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          border-top: 1px solid #f1f5f9;
          padding-top: 12px;
        }

        .link-google-form {
          color: #2563eb;
          font-weight: 700;
          font-size: 13px;
          text-decoration: none;
        }

        .link-google-form:hover {
          text-decoration: underline;
        }

        .btn-delete {
          background: #fee2e2;
          color: #dc2626;
          border: none;
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-delete:hover {
          background: #fca5a5;
        }

        /* Modal */
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999;
          padding: 16px;
        }

        .modal-card {
          background: white;
          border-radius: 18px;
          max-width: 580px;
          width: 100%;
          box-shadow: 0 20px 40px rgba(0,0,0,0.2);
          overflow: hidden;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 24px;
          border-bottom: 1px solid #e2e8f0;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 18px;
          display: flex;
          align-items: center;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #94a3b8;
        }

        .verify-form {
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .role-radio-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 6px;
        }

        .role-radio-card {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 14px;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
        }

        .role-radio-card.active {
          border-color: #0f766e;
          background: #f0fdfa;
        }

        .role-radio-card div {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .role-radio-card span {
          font-size: 12px;
          color: #64748b;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 8px;
        }

        .alert-box {
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 13.5px;
          margin-bottom: 16px;
        }

        .alert-box.success {
          background: #ecfdf3;
          color: #166534;
          border: 1px solid #bbf7d0;
        }

        .alert-box.error {
          background: #fef2f2;
          color: #b91c1c;
          border: 1px solid #fecaca;
        }

        .jobs-empty,
        .jobs-loading {
          background: white;
          border: 1px dashed #cbd5e1;
          border-radius: 16px;
          padding: 40px 24px;
          text-align: center;
          color: #64748b;
        }

        @media (max-width: 768px) {
          .job-form-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}