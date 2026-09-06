import { useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

export default function Home() {
  const { homepageWidgets } = useTheme();
  const [contactSent, setContactSent] = useState(false);

  return (
    <div className="home">
      {/* INTERNAL CSS */}
      <style>{`
        .home {
          font-family: "Segoe UI", sans-serif;
          color: #222;
        }

        /* HERO */
        .hero {
          background: var(--theme-banner-gradient, linear-gradient(135deg, #0f766e, #16a34a));
          color: #fff;
          padding: 90px 0px 50px 70px;
          text-align: left;
        }

        .hero h1 {
          font-size: 40px;
          margin-bottom: 15px;
          padding-right: 20px;
          opacity: 0;
          transform: translateY(30px);
          animation: slideUp 0.8s ease-out forwards;
        }

        .hero h3 {
          width: 195px;
          font-size: 20px;
          margin-bottom: 15px;
          padding: 0px 0px 0px 20px;
          border-radius: 5px;
          background-color: rgb(255, 107, 107);
          opacity: 0;
          transform: translateY(30px);
          animation: slideUp 0.8s ease-out forwards;
        }

        @keyframes slideUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .hero p {
          max-width: 700px;
          font-size: 18px;
          line-height: 1.6;
          text-align: left;
        }

        .hero-links {
          margin-top: 30px;
          padding: 0px 20px 0px 0px;
          opacity: 0;
          transform: translateY(30px);
          animation: slideUp 0.8s ease-out forwards;
        }

        .hero-links a {
          margin: 0px 8px 8px 0px;
          padding: 10px 20px;
          background: #fff;
          color: #0f766e;
          border-radius: 5px;
          text-decoration: none;
          font-weight: 600;
          display: inline-block;
          transition: 0.3s ease;
        }

        .hero-links a:hover {
          background: #e6fffa;
          transform: translateY(-2px);
        }

        /* ABOUT */
        .about {
          display: flex;
          gap: 40px;
          padding: 70px 60px;
          align-items: center;
        }

        .about img {
          max-width: 550px;
          width: 100%;
          border-radius: 12px;
        }

        .about-content h2 {
          font-size: 28px;
          color: #FF6B70;
          margin-bottom: 15px;
          font-weight: 700;
        }

        .about-content p {
          line-height: 1.7;
          margin-bottom: 12px;
          color: #334155;
          text-align: justify;
          font-size: 16px;
        }

        /* PLATFORM FEATURES - VERTICAL POSITIONING */
        .features {
          background: #f8fafc;
          padding: 70px 60px;
        }

        .features-container {
          max-width: 1140px;
          margin: 0 auto;
        }

        .section-title {
          text-align: left;
          font-size: 28px;
          margin-bottom: 40px;
          font-weight: 700;
          color: #0f172a;
          position: relative;
          display: inline-block;
        }

        .section-title::after {
          content: "";
          position: absolute;
          bottom: -8px;
          left: 0;
          width: 60px;
          height: 4px;
          background: #FF6B70;
          border-radius: 2px;
        }

        /* VERTICAL FEATURE LIST */
        .feature-list {
          display: flex;
          flex-direction: column;
          gap: 36px;
        }

        /* FEATURE CARD ROW */
        .feature-card {
          display: flex;
          flex-direction: row;
          align-items: center;
          background: #ffffff;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
          border: 1px solid #e2e8f0;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .feature-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(15, 118, 110, 0.12);
        }

        .feature-card:nth-child(even) {
          flex-direction: row-reverse;
        }

        .feature-img {
          flex: 0 0 45%;
          height: 290px;
          overflow: hidden;
        }

        .feature-img img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.5s ease;
        }

        .feature-card:hover .feature-img img {
          transform: scale(1.05);
        }

        .feature-content {
          flex: 1;
          padding: 40px 45px;
          text-align: left;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: flex-start;
        }

        .feature-content h3 {
          font-size: 24px;
          margin-bottom: 12px;
          color: #0f172a;
          font-weight: 700;
        }

        .feature-content p {
          font-size: 15.5px;
          text-align: justify;
          line-height: 1.7;
          color: #475569;
          margin-bottom: 22px;
        }

        .feature-btn {
          padding: 11px 22px;
          border: none;
          background: #FF6B70;
          color: white;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14.5px;
          text-decoration: none;
          display: inline-block;
          transition: 0.3s ease;
        }

        .feature-btn:hover {
          background: linear-gradient(135deg, #0f766e, #16a34a);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(15, 118, 110, 0.25);
          color: white;
        }

        /* CONTACT SECTION */
        .contact {
          padding: 70px 50px;
          background: linear-gradient(135deg, #f0fdfa, #ecfeff);
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .contact-wrapper {
          width: 100%;
          max-width: 1000px;
        }

        .contact-card {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(20px);
          padding: 60px;
          border-radius: 30px;
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.08);
          text-align: center;
          animation: fadeUp 0.8s ease;
        }

        .contact-card h2 {
          font-size: 2.3rem;
          margin-bottom: 10px;
          color: #0f172a;
        }

        .contact-card p {
          margin-bottom: 40px;
          color: #555;
          font-size: 15px;
        }

        .contact-form {
          width: 100%;
        }

        .input-row {
          display: flex;
          gap: 20px;
          margin-bottom: 20px;
        }

        .input-row input {
          flex: 1;
        }

        .contact-form input,
        .contact-form textarea {
          width: 100%;
          padding: 16px;
          border-radius: 14px;
          border: 1px solid #e5e7eb;
          font-size: 15px;
          transition: all 0.3s ease;
          outline: none;
          background: #fff;
        }

        .contact-form input:focus,
        .contact-form textarea:focus {
          border-color: #0f766e;
          box-shadow: 0 0 0 4px rgba(15, 118, 110, 0.15);
          transform: translateY(-2px);
        }

        .contact-form button {
          margin-top: 20px;
          width: 100%;
          padding: 16px;
          border: none;
          border-radius: 14px;
          background: linear-gradient(135deg, #0f766e, #16a34a);
          color: #fff;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .contact-form button:hover {
          transform: translateY(-3px);
          box-shadow: 0 20px 40px rgba(15, 118, 110, 0.3);
        }

        .contact-form button:active {
          transform: scale(0.98);
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* RESPONSIVE STYLES */
        @media (max-width: 1200px) {
          .hero {
            padding: 70px 40px;
          }

          .about {
            padding: 50px 40px;
          }

          .features {
            padding: 50px 40px;
          }
        }

        @media (max-width: 1024px) {
          .hero h1 {
            font-size: 32px;
          }

          .hero p {
            font-size: 16px;
          }

          .about {
            flex-direction: column;
            text-align: center;
          }

          .about img {
            max-width: 100%;
          }

          .about-content {
            text-align: center;
          }
        }

        @media (max-width: 768px) {
          .hero {
            padding: 60px 20px;
            text-align: center;
          }

          .hero h3 {
            margin: 0 auto 15px;
          }

          .hero h1 {
            font-size: 26px;
          }

          .hero p {
            font-size: 15px;
          }

          .hero-links {
            text-align: center;
          }

          .about {
            padding: 40px 20px;
          }

          .features {
            padding: 40px 20px;
          }

          .feature-card,
          .feature-card:nth-child(even) {
            flex-direction: column;
          }

          .feature-img {
            flex: none;
            width: 100%;
            height: 220px;
          }

          .feature-content {
            padding: 25px 20px;
          }

          .contact {
            padding: 40px 20px;
          }

          .contact-card {
            padding: 35px 20px;
          }

          .input-row {
            flex-direction: column;
          }
        }

        @media (max-width: 480px) {
          .hero h1 {
            font-size: 22px;
          }

          .hero h3 {
            font-size: 16px;
            width: auto;
            padding: 8px 15px;
          }

          .section-title {
            font-size: 22px;
          }

          .contact-card h2 {
            font-size: 1.6rem;
          }
        }
      `}</style>

      {/* HOMEPAGE DYNAMIC WIDGETS (RFP §4f) */}
      {(() => {
        const activeWidgets = (homepageWidgets || [])
          .filter((w) => w.is_enabled)
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

        const widgetMap = {
          hero: (
            <section key="hero" className="hero">
              <h3>Community Hub</h3>
              <h1>Your Gateway to Trusted Businesses, Jobs & Community Resources</h1>
              <p>
                A secure community platform with self-registration, admin approval,
                directories, jobs, and classifieds — designed for speed and simplicity.
              </p>
              <div className="hero-links">
                <Link to="/directory">Directory</Link>
                <Link to="/jobs">Jobs</Link>
                <Link to="/classifieds">Classifieds</Link>
              </div>
            </section>
          ),
          about: (
            <section key="about" className="about">
              <img src="/Community about us.png" alt="Community" />
              <div className="about-content">
                <h2 className="sam1">Welcome Community Hub</h2>
                <p>
                  This platform is designed to empower verified users by offering a secure and structured
                  self-registration process, followed by admin approval. This two-step verification ensures
                  that only genuine and trusted members become part of the community, creating a safe and
                  reliable environment for everyone. Once approved, users gain access to a fast-loading and
                  user-friendly homepage that serves as a central hub for opportunities, resources, and
                  connections. The prominently displayed links directory enables users to quickly discover
                  businesses, services, jobs, classifieds, and community updates without confusion or delays.
                </p>
                <p>
                  With a strong focus on speed, security, and ease of use, the platform helps users save time,
                  build meaningful connections, and confidently explore opportunities—all within a trusted
                  digital ecosystem.
                </p>
              </div>
            </section>
          ),
          services: (
            <section key="services" className="features">
              <div className="features-container">
                <h2 className="section-title">Platform Features</h2>
                <div className="feature-list">
                  <div className="feature-card">
                    <div className="feature-img">
                      <img src="/Community hub.png" alt="Community" />
                    </div>
                    <div className="feature-content">
                      <h3>Community</h3>
                      <p>Connect with trusted members and grow strong relationships inside a safe, private community space.</p>
                      <Link to="/community" className="feature-btn">View Community</Link>
                    </div>
                  </div>
                  <div className="feature-card">
                    <div className="feature-img">
                      <img src="/directory.png" alt="Directory" />
                    </div>
                    <div className="feature-content">
                      <h3>Directory</h3>
                      <p>Browse verified listings quickly and reach members or businesses easily with smooth, simple navigation.</p>
                      <Link to="/directory" className="feature-btn">View Directory</Link>
                    </div>
                  </div>
                  <div className="feature-card">
                    <div className="feature-img">
                      <img src="/jobs.png" alt="Jobs" />
                    </div>
                    <div className="feature-content">
                      <h3>Jobs</h3>
                      <p>Explore approved job posts shared by members and access opportunities available only to verified users.</p>
                      <Link to="/jobs" className="feature-btn">View More Jobs</Link>
                    </div>
                  </div>
                  <div className="feature-card">
                    <div className="feature-img">
                      <img src="/classifieds.png" alt="Classifieds" />
                    </div>
                    <div className="feature-content">
                      <h3>Classifieds</h3>
                      <p>Post, buy, sell, or promote services fast with clean listings and quick responses inside the platform.</p>
                      <Link to="/classifieds" className="feature-btn">View Classifieds</Link>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ),
          contact: (
            <section key="contact" className="contact">
              <div className="contact-wrapper">
                <div className="contact-card">
                  <h2>Contact Us</h2>
                  <p>Have questions or need support? We’d love to hear from you.</p>
                  {contactSent ? (
                    <div style={{ padding: "30px", background: "#f0fdf4", borderRadius: "16px", color: "#166534" }}>
                      <h3 style={{ margin: "0 0 10px", fontSize: "20px" }}>✅ Thank You!</h3>
                      <p style={{ margin: 0, color: "#15803d" }}>Your message has been sent to our administration. We will get back to you shortly.</p>
                    </div>
                  ) : (
                    <form className="contact-form" onSubmit={(e) => { e.preventDefault(); setContactSent(true); }}>
                      <div className="input-row">
                        <input type="text" placeholder="Your Name" required />
                        <input type="email" placeholder="Your Email" required />
                      </div>
                      <div className="input-row">
                        <input type="tel" placeholder="Mobile Number" />
                        <input type="text" placeholder="Subject" required />
                      </div>
                      <textarea rows="5" placeholder="Your Message" required></textarea>
                      <button type="submit">Send Message</button>
                    </form>
                  )}
                </div>
              </div>
            </section>
          ),
        };

        return activeWidgets.map((w) => widgetMap[w.key] || null);
      })()}
    </div>
  );
}
