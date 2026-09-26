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

import { insertRecord, readStore, updateRecord } from "../db/localStore.js";

/**
 * GET /api/jobs
 * Public job directory - returns ONLY approved jobs from database
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

    let jobsList = (!error && Array.isArray(data)) ? data : [];

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
    return res.status(500).json({ message: err.message, jobs: [] });
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

    // Persist to localStore as well
    const fallbackApp = {
      ...applicationRecord,
      id: createdApp?.id || `app_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };
    insertRecord("job_applications.json", createdApp || fallbackApp);
    if (!createdApp) createdApp = fallbackApp;

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
    const isOwner = jobData ? jobData.user_id === user.id : true; // allow if matches

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

    // Merge with localStore applications for this job
    const localMatches = readStore("job_applications.json").filter((a) => a.job_id === jobId);
    const existingIds = new Set(applicants.map((a) => a.id));
    for (const loc of localMatches) {
      if (!existingIds.has(loc.id)) {
        applicants.push(loc);
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

    // 3. Add localStore counts
    const localApps = readStore("job_applications.json");
    for (const loc of localApps) {
      if (jobIds.includes(loc.job_id) || !isUuid(loc.job_id)) {
        counts[loc.job_id] = (counts[loc.job_id] || 0) + 1;
      }
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

    let updated = null;
    // Try Supabase update
    try {
      const { data, error } = await supabase
        .from("job_applications")
        .update({ status: status.toLowerCase() })
        .eq("id", appId)
        .select()
        .single();

      if (!error && data) {
        updated = data;
      }
    } catch {
      // Fallback
    }

    updateRecord("job_applications.json", (a) => a.id === appId, {
      status: status.toLowerCase(),
      updated_at: new Date().toISOString(),
    });

    return res.json({ message: "Application status updated", application: updated || { id: appId, status: status.toLowerCase() } });
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

/**
 * GET /api/jobs/applications/:id/resume/download
 * Direct attachment download for applicant resumes
 */
export const downloadApplicantResume = async (req, res) => {
  try {
    const { id } = req.params;
    let appRecord = null;

    // 1. Check localStore
    const localApps = readStore("job_applications.json");
    appRecord = localApps.find((a) => String(a.id) === String(id));

    // 2. Check Supabase
    if (!appRecord) {
      try {
        const { data } = await supabase
          .from("job_applications")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (data) appRecord = data;
      } catch {}
    }

    if (!appRecord || !appRecord.resume_url) {
      return res.status(404).json({ message: "Resume document not found for this applicant." });
    }

    const resumeUrl = appRecord.resume_url;
    const applicantName = (appRecord.applicant_name || "Applicant").replace(/[^a-zA-Z0-9_-]/g, "_");
    const downloadFilename = `${applicantName}_Resume.pdf`;

    // Local static file
    if (resumeUrl.startsWith("/uploads/")) {
      const localFilePath = path.resolve(__dirname, "../../", resumeUrl.replace(/^\//, ""));
      if (fs.existsSync(localFilePath)) {
        res.setHeader("Content-Disposition", `attachment; filename="${downloadFilename}"`);
        res.setHeader("Content-Type", "application/pdf");
        return res.sendFile(localFilePath);
      }
    }

    // Direct filesystem path
    if (!resumeUrl.startsWith("http") && fs.existsSync(resumeUrl)) {
      res.setHeader("Content-Disposition", `attachment; filename="${downloadFilename}"`);
      res.setHeader("Content-Type", "application/pdf");
      return res.sendFile(resumeUrl);
    }

    // Remote HTTP/HTTPS URL (e.g. Supabase storage or server URL)
    if (resumeUrl.startsWith("http")) {
      // If it points to localhost:5000/uploads/...
      if (resumeUrl.includes("/uploads/resumes/")) {
        const urlObj = new URL(resumeUrl);
        const localFilePath = path.resolve(__dirname, "../../", urlObj.pathname.replace(/^\//, ""));
        if (fs.existsSync(localFilePath)) {
          res.setHeader("Content-Disposition", `attachment; filename="${downloadFilename}"`);
          res.setHeader("Content-Type", "application/pdf");
          return res.sendFile(localFilePath);
        }
      }

      try {
        const fileRes = await fetch(resumeUrl);
        if (fileRes.ok) {
          const contentType = fileRes.headers.get("content-type") || "application/pdf";
          res.setHeader("Content-Disposition", `attachment; filename="${downloadFilename}"`);
          res.setHeader("Content-Type", contentType);
          const arrayBuffer = await fileRes.arrayBuffer();
          return res.send(Buffer.from(arrayBuffer));
        }
      } catch (fErr) {
        console.warn("Remote resume fetch notice:", fErr.message);
      }
      return res.redirect(resumeUrl);
    }

    return res.status(404).json({ message: "Resume file not found on server." });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
