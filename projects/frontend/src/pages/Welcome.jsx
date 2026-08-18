import React from "react";
import { useNavigate } from "react-router-dom";
import { FaEye, FaBullseye } from "react-icons/fa";

const WelcomeOnboarding = () => {
  const navigate = useNavigate();

  return (
    <>
      {/* HERO SECTION */}
      <section className="hero">
        <div className="hero-container">
          <div className="hero-content">
            <h1>Welcome to Community Hub</h1>
            <p>
              A secure and trusted digital platform connecting verified members with real opportunities.
            </p>
            <button
              className="primary-btn"
              onClick={() => navigate("/login")}
            >
              Login / Register
            </button>
          </div>
        </div>
      </section>

      {/* ABOUT SECTION */}
      <section className="about-section">
        <div className="about-wrapper">
          <div className="about-image">
            <img
              src="/communityhubabout.png"
              alt="Community"
            />
          </div>

          <div className="about-content">
            <h2>About Our Platform</h2>
            <p>
              Our platform is designed to empower verified users through a structured
              self-registration process followed by administrative approval. This
              ensures that only genuine and trusted members become part of the
              ecosystem, creating a safe, reliable, and professional environment.
            </p>
            <p>
              After approval, members gain access to a high-speed and intuitive
              homepage that acts as a centralized hub for businesses, jobs,
              classifieds, and community updates. Built with performance,
              security, and simplicity in mind, the platform helps users save time,
              build meaningful relationships, and confidently explore opportunities
              within a trusted digital network.
            </p>
          </div>
        </div>
      </section>

      {/* VISION & MISSION */}
      <section className="vm-section">
        <div className="vm-container">

          <div className="vm-box">
            <FaEye className="vm-icon" />
            <h3>Our Vision</h3>
            <p>
              To build a future-ready digital ecosystem where verified communities
              collaborate securely, exchange opportunities transparently, and grow
              together through trusted digital connections.
            </p>
          </div>

          <div className="vm-box">
            <FaBullseye className="vm-icon" />
            <h3>Our Mission</h3>
            <p>
              To provide a fast, secure, and user-focused platform that bridges
              people, businesses, and services under one streamlined environment —
              ensuring accessibility, trust, and long-term growth for every member.
            </p>
          </div>

        </div>
      </section>

      {/* FEATURES */}
      <section className="features-section">
        <h2>Explore Opportunities After Approval</h2>

        <div className="features-grid">

          <div className="feature-card">
            <img src="Community hub.png" alt="Community" />
            <div className="feature-content">
              <h4>Community</h4>
              <p>Engage with verified members and participate in discussions.</p>
              <button onClick={() => navigate("/community")}>Explore</button>
            </div>
          </div>

          <div className="feature-card">
            <img src="jobs.png" alt="Jobs" />
            <div className="feature-content">
              <h4>Jobs</h4>
              <p>Find or post trusted job opportunities.</p>
              <button onClick={() => navigate("/jobs")}>View Jobs</button>
            </div>
          </div>

          <div className="feature-card">
            <img src="classifieds.png" alt="Classifieds" />
            <div className="feature-content">
              <h4>Classifieds</h4>
              <p>Buy, sell, and promote products safely and efficiently.</p>
              <button onClick={() => navigate("/classifieds")}>Browse</button>
            </div>
          </div>

          <div className="feature-card">
            <img src="directory.png" alt="Directory" />
            <div className="feature-content">
              <h4>Directory</h4>
              <p>Discover verified businesses and essential services instantly.</p>
              <button onClick={() => navigate("/directory")}>Open</button>
            </div>
          </div>

        </div>
      </section>

      <style>{`

      *{box-sizing:border-box;}
      body{margin:0;font-family:Segoe UI, sans-serif;}

      /* HERO */
      .hero{
        background:linear-gradient(135deg, #0f766e, #16a34a);
        padding: 70px 30px 70px 0px;
        color:white;
      }

      .hero-container{
        max-width:1200px;
        margin:auto;
      }

      .hero-content{
        max-width:750px;
      }

      .hero h1{
        font-size: 40px;
        white-space:nowrap;
      }

      .hero p{
        margin-top:15px;
        line-height:1.6;
      }

      .primary-btn{
        margin-top:25px;
        padding:14px 30px;
        border:none;
        border-radius:10px;
        background:white;
        color:#0f766e;
        font-weight:600;
        cursor:pointer;
        transition:.3s;
      }

      .primary-btn:hover{
        transform:translateY(-4px);
        box-shadow:0 10px 25px rgba(0,0,0,0.2);
      }

      /* ABOUT */
      .about-section{
        padding:100px 20px;
      }

      .about-wrapper{
        max-width:1200px;
        margin:auto;
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:60px;
        align-items:stretch;
      }

      .about-image img{
        width:100%;
        height:100%;
        object-fit:cover;
        border-radius:20px;
      }

      .about-content{
        display:flex;
        flex-direction:column;
        justify-content:center;
      }

      .about-content p{
        text-align:justify;
        line-height:1.8;
        margin-bottom:15px;
      }

      /* VISION & MISSION */
      .vm-section{
        background:#0f172a;
        color:white;
        padding:100px 20px;
      }

      .vm-container{
        max-width:1100px;
        margin:auto;
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:40px;
      }

      .vm-box{
        padding:40px;
        border-radius:20px;
        background:linear-gradient(135deg, #0f766e, #16a34a);
        transition:.4s;
      }

      .vm-box:hover{
        transform:translateY(-12px);
      }

      .vm-icon{
        font-size:40px;
        margin-bottom:20px;
      }

      .vm-box p{
        line-height:1.7;
      }

      /* FEATURES */
      .features-section{
        padding:100px 20px;
        text-align:center;
      }

      .features-grid{
        max-width:1300px;
        margin:60px auto 0;
        display:grid;
        grid-template-columns:repeat(4,1fr);
        gap:30px;
      }

      .feature-card{
        background:white;
        border-radius:20px;
        overflow:hidden;
        box-shadow:0 15px 40px rgba(0,0,0,0.08);
        transition:.4s;
      }

      .feature-card:hover{
        transform:translateY(-15px);
      }

      .feature-card img{
        width:100%;
        height:220px;
        object-fit:cover;
      }

      .feature-content{
        padding:25px;
      }

      .feature-content button{
        margin-top:15px;
        padding:10px 20px;
        border:none;
        border-radius:10px;
        background:#FF6B70;
        color:white;
        cursor:pointer;
      }

      /* RESPONSIVE */
      @media(max-width:1100px){
        .features-grid{
          grid-template-columns:repeat(2,1fr);
        }
      }

      @media(max-width:768px){
        .about-wrapper,
        .vm-container{
          grid-template-columns:1fr;
        }

        .hero h1{
          white-space:normal;
        }

        .features-grid{
          grid-template-columns:1fr;
        }
      }

      `}</style>
    </>
  );
};

export default WelcomeOnboarding;
