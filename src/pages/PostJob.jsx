import { useState } from "react";
import supabase from "../config/supabaseClient";

const PostJob = ({ onJobPosted }) => {
  const user = JSON.parse(localStorage.getItem("loggedUser"));

  // 🔥 Form always visible
  const [showForm] = useState(true);

  const [job, setJob] = useState({
    job_title: "",
    job_description: "",
    job_type: "",
    location: "",
    apply_link: ""
  });

  const submitJob = async () => {
    const { error } = await supabase.from("jobs").insert([
      {
        user_id: user.id,
        job_title: job.job_title,
        job_description: job.job_description,
        job_type: job.job_type,
        location: job.location,
        apply_link: job.apply_link,
        status: "active"
      }
    ]);

    if (error) {
      alert("Failed to post job");
      console.error(error);
      return;
    }

    alert("Job Posted Successfully");

    setJob({
      job_title: "",
      job_description: "",
      job_type: "",
      location: "",
      apply_link: ""
    });

    if (onJobPosted) onJobPosted();
  };

  return (
    <div className="post-job-wrapper">
      {showForm && (
        <div className="job-form">
          <h3>Post a Job</h3>

          <input
            placeholder="Job Title"
            value={job.job_title}
            onChange={e => setJob({ ...job, job_title: e.target.value })}
          />

          <textarea
            placeholder="Job Description"
            value={job.job_description}
            onChange={e => setJob({ ...job, job_description: e.target.value })}
          />

          <input
            placeholder="Job Type (Full-time / Part-time)"
            value={job.job_type}
            onChange={e => setJob({ ...job, job_type: e.target.value })}
          />

          <input
            placeholder="Location"
            value={job.location}
            onChange={e => setJob({ ...job, location: e.target.value })}
          />

          <input
            placeholder="Apply Link (Google Sheet / LinkedIn / Website)"
            value={job.apply_link}
            onChange={e => setJob({ ...job, apply_link: e.target.value })}
          />

          <div className="actions">
            <button className="submit-btn" onClick={submitJob}>
              Submit Job
            </button>
          </div>
        </div>
      )}

      {/* CSS — UNCHANGED */}
      <style>{`
        .post-job-wrapper {
          max-width: 600px;
          margin-left:140px;
        }

        .post-btn {
          padding: 12px 20px;
          background: #2563eb;
          color: #fff;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }

        .job-form {
          margin-top: 20px;
          background: #fff;
          padding: 25px;
          border-radius: 12px;
          box-shadow: 0 8px 20px rgba(0,0,0,0.08);
          border: 1px solid Blue;
        }

        .job-form h3 {
          margin-bottom: 15px;
        }

        .job-form input,
        .job-form textarea {
          width: 100%;
          padding: 10px;
          margin-bottom: 12px;
          border-radius: 6px;
          border: 1px solid #ccc;
        }

        .job-form textarea {
          min-height: 90px;
        }

        .actions {
          display: flex;
          gap: 10px;
        }

        .submit-btn {
          background: #16a34a;
          color: #fff;
          padding: 10px 18px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }

        .cancel-btn {
          background: #e5e7eb;
          padding: 10px 18px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default PostJob;
