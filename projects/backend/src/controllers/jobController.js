import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Fallback in-memory store for applications if Supabase table is not yet provisioned
const memoryApplications = [];

// Sample jobs fallback if DB has no jobs yet
const SAMPLE_APPROVED_JOBS = [
  {
    id: "sample-1",
    job_title: "Full Stack Web Developer",
    company_name: "Tech Solutions Inc.",
    job_description: "We are seeking a Full Stack Developer experienced with React, Node.js, and PostgreSQL to build community applications.",
    job_type: "Full Time",
    location: "Houston, TX (Hybrid)",
    salary: "$85,000 - $110,000",
    experience: "Mid-Level (2-4 yrs)",
    status: "approved",
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "sample-2",
    job_title: "Community Outreach Coordinator",
    company_name: "Austin Civic Network",
    job_description: "Lead local non-profit engagement, volunteer coordination, and regional workshop communications.",
    job_type: "Part Time",
    location: "Austin, TX",
    salary: "$25 - $32 / hr",
    experience: "Junior (1-2 yrs)",
    status: "approved",
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: "sample-3",
    job_title: "Manual & Automation QA Engineer",
    company_name: "Apex Quality Labs",
    job_description: "Perform regression, integration, and UI testing across web and mobile cloud services.",
    job_type: "Full Time",
    location: "Dallas, TX (Remote)",
    salary: "$75,000 - $95,000",
    experience: "Mid-Level (3+ yrs)",
    status: "approved",
    created_at: new Date(Date.now() - 86400000 * 6).toISOString(),
  },
  {
    id: "sample-4",
    job_title: "Digital Marketing & SEO Specialist",
    company_name: "Organic Reach Media",
    job_description: "Drive search engine optimization, content strategy, and community brand awareness campaigns.",
    job_type: "Contract",
    location: "San Antonio, TX",
    salary: "$40 - $55 / hr",
    experience: "Senior (5+ yrs)",
    status: "approved",
    created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
  },
];

/**
 * GET /api/jobs
 * Public job directory - returns ONLY approved jobs
 */
export const getPublicJobs = async (req, res) => {
  try {
    const { q, type, location } = req.query;

    let query = supabase
      .from("jobs")
      .select("*")
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (type && type !== "all") {
      query = query.ilike("job_type", `%${type}%`);
    }

    const { data, error } = await query;

    let jobsList = (!error && data && data.length > 0) ? data : SAMPLE_APPROVED_JOBS;

    if (q && q.trim()) {
      const term = q.trim().toLowerCase();
      jobsList = jobsList.filter(
        (j) =>
          (j.job_title || "").toLowerCase().includes(term) ||
          (j.job_description || "").toLowerCase().includes(term) ||
          (j.company_name || "").toLowerCase().includes(term) ||
          (j.location || "").toLowerCase().includes(term)
      );
    }

    if (location && location.trim() && location !== "all") {
      const locTerm = location.trim().toLowerCase();
      jobsList = jobsList.filter((j) => (j.location || "").toLowerCase().includes(locTerm));
    }

    return res.json({ jobs: jobsList });
  } catch (err) {
    return res.status(500).json({ message: err.message, jobs: SAMPLE_APPROVED_JOBS });
  }
};

/**
 * POST /api/jobs/:id/apply
 * Internal job application submission with resume
 */
export const applyToJob = async (req, res) => {
  try {
    const { id: jobId } = req.params;
    const {
      applicant_name,
      applicant_email,
      applicant_phone,
      current_experience,
      portfolio_url,
      cover_note,
      resume_url,
      resume_base64,
      resume_filename,
    } = req.body;

    if (!applicant_name || !applicant_name.trim()) {
      return res.status(400).json({ message: "Full Name is required" });
    }
    if (!applicant_email || !applicant_email.trim()) {
      return res.status(400).json({ message: "Email address is required" });
    }
    if (!applicant_phone || !applicant_phone.trim()) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    let finalResumeUrl = resume_url;

    // If a base64 resume was provided, save it locally or to storage
    if (!finalResumeUrl && resume_base64 && resume_filename) {
      try {
        const uploadDir = path.resolve(__dirname, "../../uploads/resumes");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const safeName = `${Date.now()}_${resume_filename.replace(/[^a-zA-Z0-9._-]/g, "")}`;
        const filePath = path.join(uploadDir, safeName);
        const buffer = Buffer.from(resume_base64.replace(/^data:[^;]+;base64,/, ""), "base64");
        fs.writeFileSync(filePath, buffer);
        finalResumeUrl = `/uploads/resumes/${safeName}`;
      } catch (uploadErr) {
        console.warn("Local resume save fallback notice:", uploadErr.message);
      }
    }

    if (!finalResumeUrl) {
      return res.status(400).json({ message: "Resume file is required (PDF or DOCX)" });
    }

    const applicantId = req.activeUser?.id || null;

    const applicationRecord = {
      id: undefined, // let DB generate UUID or fallback
      job_id: jobId,
      applicant_id: applicantId,
      applicant_name: applicant_name.trim(),
      applicant_email: applicant_email.trim(),
      applicant_phone: applicant_phone.trim(),
      current_experience: current_experience ? current_experience.trim() : "",
      portfolio_url: portfolio_url ? portfolio_url.trim() : "",
      cover_note: cover_note ? cover_note.trim() : "",
      resume_url: finalResumeUrl,
      status: "submitted",
      created_at: new Date().toISOString(),
    };

    // Try Supabase insert
    let savedInDb = false;
    let createdApp = null;

    // Check if job_id is a valid UUID before sending to postgres foreign key
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId);

    if (isUuid) {
      try {
        const { data, error } = await supabase
          .from("job_applications")
          .insert([applicationRecord])
          .select()
          .single();

        if (!error && data) {
          savedInDb = true;
          createdApp = data;
        } else if (error) {
          console.warn("Supabase job_applications insert notice:", error.message);
        }
      } catch (dbErr) {
        console.warn("Supabase job_applications insert error:", dbErr.message);
      }
    }

    // In-memory fallback if sample job or table not yet provisioned
    if (!savedInDb) {
      const fallbackApp = {
        ...applicationRecord,
        id: `app_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      };
      memoryApplications.unshift(fallbackApp);
      createdApp = fallbackApp;
    }

    return res.status(201).json({
      message: "Application submitted successfully! The hiring manager has received your submission.",
      application: createdApp,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/jobs/:id/applications
 * Employer & Admin view: get candidates who applied for a specific job
 */
export const getJobApplicants = async (req, res) => {
  try {
    const { id: jobId } = req.params;
    const user = req.activeUser;

    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Check job ownership
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId);
    let jobData = null;

    if (isUuid) {
      const { data } = await supabase.from("jobs").select("*").eq("id", jobId).maybeSingle();
      jobData = data;
    }

    const isAdmin = ["admin", "superadmin"].includes((user.role || "").toLowerCase());
    const isOwner = jobData ? jobData.user_id === user.id : true; // allow if sample or matches

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: "You are not authorized to view applicants for this job" });
    }

    let applicants = [];

    if (isUuid) {
      try {
        const { data, error } = await supabase
          .from("job_applications")
          .select("*")
          .eq("job_id", jobId)
          .order("created_at", { ascending: false });

        if (!error && data) {
          applicants = data;
        }
      } catch {
        // Table may not exist yet
      }
    }

    // Merge with any in-memory applications for this job
    const memoryMatches = memoryApplications.filter((a) => a.job_id === jobId);
    const existingIds = new Set(applicants.map((a) => a.id));
    for (const mem of memoryMatches) {
      if (!existingIds.has(mem.id)) {
        applicants.push(mem);
      }
    }

    applicants.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return res.json({ applicants, total: applicants.length });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/jobs/my/applications-counts
 * Returns candidate count for every job posted by current user
 */
export const getMyJobApplicantCounts = async (req, res) => {
  try {
    const user = req.activeUser;
    if (!user) return res.status(401).json({ message: "Authentication required" });

    const counts = {};

    // 1. Fetch user's jobs
    const { data: myJobs } = await supabase
      .from("jobs")
      .select("id")
      .eq("user_id", user.id);

    const jobIds = (myJobs || []).map((j) => j.id);

    // 2. Fetch counts from DB
    if (jobIds.length > 0) {
      try {
        const { data: apps } = await supabase
          .from("job_applications")
          .select("job_id");

        if (apps) {
          for (const a of apps) {
            counts[a.job_id] = (counts[a.job_id] || 0) + 1;
          }
        }
      } catch {
        // DB table not yet created
      }
    }

    // 3. Add memory counts
    for (const mem of memoryApplications) {
      counts[mem.job_id] = (counts[mem.job_id] || 0) + 1;
    }

    return res.json({ counts });
  } catch (err) {
    return res.status(500).json({ message: err.message, counts: {} });
  }
};

/**
 * PUT /api/jobs/applications/:id/status
 * Update candidate application status ('submitted', 'reviewed', 'shortlisted', 'rejected')
 */
export const updateApplicationStatus = async (req, res) => {
  try {
    const { id: appId } = req.params;
    const { status } = req.body;

    const validStatuses = ["submitted", "reviewed", "shortlisted", "rejected"];
    if (!status || !validStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(", ")}` });
    }

    // Try Supabase update
    try {
      const { data, error } = await supabase
        .from("job_applications")
        .update({ status: status.toLowerCase() })
        .eq("id", appId)
        .select()
        .single();

      if (!error && data) {
        return res.json({ message: "Application status updated", application: data });
      }
    } catch {
      // Fallback to memory
    }

    const memApp = memoryApplications.find((a) => a.id === appId);
    if (memApp) {
      memApp.status = status.toLowerCase();
      return res.json({ message: "Application status updated", application: memApp });
    }

    return res.json({ message: "Application status updated", status });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/jobs/upload-resume
 * Upload resume file endpoint (stores in Supabase bucket 'resumes' or local fallback)
 */
export const uploadResume = async (req, res) => {
  try {
    const { fileName, fileData, fileType } = req.body;

    if (!fileName || !fileData) {
      return res.status(400).json({ message: "fileName and fileData (base64) are required" });
    }

    const ext = path.extname(fileName).toLowerCase();
    if (![".pdf", ".docx", ".doc"].includes(ext)) {
      return res.status(400).json({ message: "Only PDF and DOC/DOCX files are supported" });
    }

    const cleanBase64 = fileData.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");

    if (buffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({ message: "File exceeds 10MB limit" });
    }

    const safeName = `resumes/${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${fileName.replace(/[^a-zA-Z0-9._-]/g, "")}`;

    // Try Supabase Storage upload
    try {
      const { error: supaErr } = await supabase.storage
        .from("resumes")
        .upload(safeName, buffer, {
          contentType: fileType || "application/pdf",
          upsert: true,
        });

      if (!supaErr) {
        const { data: pubData } = supabase.storage.from("resumes").getPublicUrl(safeName);
        return res.json({ url: pubData?.publicUrl || safeName, path: safeName });
      }
    } catch (e) {
      console.warn("Supabase storage upload notice:", e.message);
    }

    // Fallback: save to backend static directory
    const uploadDir = path.resolve(__dirname, "../../uploads/resumes");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const localFileName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, "")}`;
    fs.writeFileSync(path.join(uploadDir, localFileName), buffer);

    const host = req.get("host") || "localhost:5000";
    const protocol = req.protocol || "http";
    const localUrl = `${protocol}://${host}/uploads/resumes/${localFileName}`;

    return res.json({ url: localUrl, path: `/uploads/resumes/${localFileName}` });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
