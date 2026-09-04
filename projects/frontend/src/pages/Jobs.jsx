import { useEffect, useState } from "react";
import supabase from "../config/supabaseClient";
import { useNavigate } from "react-router-dom";

const DEFAULT_SAMPLE_JOBS = [
  {
    id: "1",
    job_title: "Web developemnt",
    job_description: "Design a websites",
    job_type: "full time",
    location: "Chicago",
    apply_link: "#"
  },
  {
    id: "2",
    job_title: "Manual testing",
    job_description: "Testing",
    job_type: "Part time",
    location: "mangalore",
    apply_link: "#"
  },
  {
    id: "3",
    job_title: "Java developer",
    job_description: "Development",
    job_type: "Full time",
    location: "Hyd",
    apply_link: "#"
  },
  {
    id: "4",
    job_title: "Business Development Executive",
    job_description: "Develop the business",
    job_type: "Full time",
    location: "Chennai",
    apply_link: "#"
  },
  {
    id: "5",
    job_title: "Python Developer",
    job_description: "Backend development and execution",
    job_type: "Full time",
    location: "Mumbai",
    apply_link: "#"
  },
  {
    id: "6",
    job_title: "Java Developer",
    job_description: "Backend development",
    job_type: "Part time",
    location: "Andhra Pradesh",
    apply_link: "#"
  },
  {
    id: "7",
    job_title: "SEO Analyst",
    job_description: "Search Engine Optimization",
    job_type: "Full Time",
    location: "Hyderabad",
    apply_link: "#"
  }
];

const Jobs = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState(DEFAULT_SAMPLE_JOBS);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        setJobs(data);
      } else {
        setJobs(DEFAULT_SAMPLE_JOBS);
      }
    } catch (err) {
      console.error("Error fetching jobs, displaying fallback jobs:", err);
      setJobs(DEFAULT_SAMPLE_JOBS);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const filteredJobs = jobs.filter((job) =>
    (job.job_title || "")
      .toLowerCase()
      .includes(searchTerm.toLowerCase()) ||
    (job.job_description || "")
      .toLowerCase()
      .includes(searchTerm.toLowerCase()) ||
    (job.location || "")
      .toLowerCase()
      .includes(searchTerm.toLowerCase()) ||
    (job.job_type || "")
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <div className="jobs-wrapper">
      {/* GREEN HERO BANNER */}
      <div className="jobs-hero">
        <h1>Find Your Dream Job</h1>
        <p>
          Explore verified opportunities, filter by title, and apply instantly from our trusted job portal.
        </p>
        <button
          className="hero-auth-btn"
          onClick={() => navigate("/login")}
        >
          Login
        </button>
      </div>

      {/* DARK SECTION WITH SEARCH BAR & CARDS */}
      <div className="jobs-dark-section">
        <div className="jobs-container">
          {/* SEARCH BAR */}
          <div className="jobs-search">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input
              type="text"
              placeholder="Search jobs by title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* JOBS GRID */}
          <div className="jobs-grid">
            {filteredJobs.map((job) => (
              <div key={job.id} className="job-card">
                {/* Job Title */}
                <div className="card-row">
                  <i className="fa-solid fa-briefcase icon"></i>
                  <div className="row-content">
                    <span className="field-label">JOB TITLE</span>
                    <h4 className="job-title-text">{job.job_title}</h4>
                  </div>
                </div>

                {/* Description */}
                <div className="card-row">
                  <i className="fa-solid fa-file-lines icon"></i>
                  <div className="row-content">
                    <span className="field-label">DESCRIPTION</span>
                    <p className="field-value desc-text">{job.job_description}</p>
                  </div>
                </div>

                {/* Job Type */}
                <div className="card-row">
                  <i className="fa-solid fa-clock icon"></i>
                  <div className="row-content">
                    <span className="field-label">JOB TYPE</span>
                    <p className="field-value">{job.job_type}</p>
                  </div>
                </div>

                {/* Location */}
                <div className="card-row">
                  <i className="fa-solid fa-location-dot icon"></i>
                  <div className="row-content">
                    <span className="field-label">LOCATION</span>
                    <p className="field-value">{job.location}</p>
                  </div>
                </div>

                {/* Apply Now Button */}
                <a
                  href={job.apply_link && job.apply_link !== "#" ? job.apply_link : "#"}
                  target={job.apply_link && job.apply_link !== "#" ? "_blank" : "_self"}
                  rel="noopener noreferrer"
                  className="apply-now-btn"
                  onClick={(e) => {
                    if (!job.apply_link || job.apply_link === "#") {
                      e.preventDefault();
                      alert(`Applying for position: ${job.job_title}`);
                    }
                  }}
                >
                  <i className="fa-solid fa-paper-plane"></i> Apply Now
                </a>
              </div>
            ))}
          </div>

          {filteredJobs.length === 0 && (
            <div className="no-jobs">
              <i className="fa-solid fa-briefcase"></i>
              <p>No jobs found matching your search.</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .jobs-wrapper {
          width: 100%;
          font-family: inherit;
        }

        /* GREEN HERO BANNER (exact match to screenshot) */
        .jobs-hero {
          width: 100%;
          background: #169b59;
          color: #ffffff;
          padding: 60px 80px;
          text-align: left;
          box-sizing: border-box;
        }

        .jobs-hero h1 {
          font-size: 2.6rem;
          font-weight: 700;
          margin: 0 0 12px 0;
          color: #ffffff;
        }

        .jobs-hero p {
          font-size: 1.05rem;
          margin: 0 0 24px 0;
          color: rgba(255, 255, 255, 0.95);
          max-width: 700px;
          line-height: 1.5;
        }

        .hero-auth-btn {
          padding: 10px 24px;
          border: none;
          border-radius: 8px;
          background: #ffffff;
          color: #0f766e;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .hero-auth-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(0,0,0,0.2);
        }

        /* DARK SECTION WITH SEARCH BAR & CARDS GRID */
        .jobs-dark-section {
          background-color: #242221;
          min-height: calc(100vh - 350px);
          padding: 30px 40px 60px 40px;
          box-sizing: border-box;
        }

        .jobs-container {
          max-width: 1440px;
          margin: 0 auto;
        }

        /* SEARCH BAR */
        .jobs-search {
          display: flex;
          align-items: center;
          gap: 12px;
          max-width: 380px;
          background: #ffffff;
          padding: 10px 16px;
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.2);
          margin-bottom: 30px;
        }

        .jobs-search i {
          color: #2563eb;
          font-size: 1rem;
        }

        .jobs-search input {
          border: none;
          outline: none;
          width: 100%;
          font-size: 0.95rem;
          color: #1f2937;
        }

        /* 4-COLUMN CARDS GRID */
        .jobs-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }

        /* CARD */
        .job-card {
          background: #ffffff;
          border-radius: 20px;
          padding: 24px 20px 20px 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          position: relative;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
          border-top: 4px solid #ff6b70;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .job-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 14px 30px rgba(0, 0, 0, 0.3);
        }

        .card-row {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .card-row .icon {
          color: #2563eb;
          font-size: 1.1rem;
          margin-top: 2px;
          width: 20px;
          text-align: center;
          flex-shrink: 0;
        }

        .row-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .field-label {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          color: #6b7280;
          letter-spacing: 0.5px;
        }

        .job-title-text {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 700;
          color: #000000;
          line-height: 1.3;
        }

        .field-value {
          margin: 0;
          font-size: 0.95rem;
          color: #374151;
          font-weight: 400;
          line-height: 1.4;
        }

        .desc-text {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .apply-now-btn {
          margin-top: auto;
          background: #ff6b70;
          color: #ffffff;
          padding: 12px 18px;
          border-radius: 12px;
          font-size: 0.95rem;
          font-weight: 700;
          text-decoration: none;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background-color 0.2s ease, transform 0.2s ease;
          box-shadow: 0 4px 12px rgba(255, 107, 112, 0.3);
        }

        .apply-now-btn:hover {
          background: #ff5257;
          transform: translateY(-2px);
          color: #ffffff;
        }

        .apply-now-btn i {
          font-size: 1rem;
        }

        .no-jobs {
          text-align: center;
          color: #9ca3af;
          padding: 60px 20px;
          font-size: 1.1rem;
        }

        .no-jobs i {
          font-size: 2.5rem;
          margin-bottom: 12px;
          display: block;
        }

        @media (max-width: 1280px) {
          .jobs-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 900px) {
          .jobs-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .jobs-hero {
            padding: 40px 30px;
          }
          .jobs-dark-section {
            padding: 20px;
          }
        }

        @media (max-width: 600px) {
          .jobs-grid {
            grid-template-columns: 1fr;
          }
          .jobs-hero h1 {
            font-size: 1.8rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Jobs;



