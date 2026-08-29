import React, { useState } from "react";
import { FaPhoneAlt, FaEnvelope, FaMapMarkerAlt, FaPaperPlane, FaCheckCircle } from "react-icons/fa";

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="contact-page">
      <div className="hero">
        <h1>Contact Us</h1>
        <p>Have questions about collective profiles, verifications, directory listings, or jobs? Get in touch with our team.</p>
      </div>

      <div className="content-container">
        <div className="contact-grid">
          {/* LEFT: CONTACT INFO CARD */}
          <div className="info-card">
            <h2>Get in Touch</h2>
            <p className="info-desc">Reach out to us directly or fill out the form and our support administration will get back to you shortly.</p>

            <div className="info-items">
              <div className="info-item">
                <div className="icon-wrap">
                  <FaPhoneAlt />
                </div>
                <div>
                  <div className="info-label">Call Us</div>
                  <div className="info-val">+1 (832) 736-5643</div>
                </div>
              </div>

              <div className="info-item">
                <div className="icon-wrap">
                  <FaEnvelope />
                </div>
                <div>
                  <div className="info-label">Email Support</div>
                  <div className="info-val">appcommunityhub@gmail.com</div>
                </div>
              </div>

              <div className="info-item">
                <div className="icon-wrap">
                  <FaMapMarkerAlt />
                </div>
                <div>
                  <div className="info-label">Location</div>
                  <div className="info-val">USA</div>
                </div>
              </div>
            </div>

            <div className="info-badge">
              <span>⚡ Fast Response Time</span>
              <p>We typically respond within 24 business hours.</p>
            </div>
          </div>

          {/* RIGHT: FORM CARD */}
          <div className="form-card">
            {submitted ? (
              <div className="success-box">
                <FaCheckCircle className="success-icon" />
                <h2>Thank You for Reaching Out!</h2>
                <p>Your message has been dispatched to our support administration. We will reply shortly.</p>
                <button className="reset-btn" onClick={() => setSubmitted(false)}>Send Another Message</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="contact-form">
                <h2>Send Us a Message</h2>
                <p className="form-sub">Fill out the details below to get quick support.</p>

                <div className="form-row">
                  <div className="form-group">
                    <label>Your Name *</label>
                    <input type="text" placeholder="John Doe" required />
                  </div>
                  <div className="form-group">
                    <label>Email Address *</label>
                    <input type="email" placeholder="john@example.com" required />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Mobile Number</label>
                    <input type="tel" placeholder="+1 (832) 736-5643" />
                  </div>
                  <div className="form-group">
                    <label>Subject *</label>
                    <input type="text" placeholder="Directory inquiry or verification" required />
                  </div>
                </div>

                <div className="form-group">
                  <label>Message *</label>
                  <textarea rows="5" placeholder="Describe your question or issue in detail..." required></textarea>
                </div>

                <button type="submit" className="submit-btn">
                  <FaPaperPlane /> Send Message
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        .contact-page { font-family: 'Segoe UI', system-ui, sans-serif; background: #f8fafc; min-height: 85vh; color: #1e293b; }
        
        .hero {
          background: linear-gradient(135deg, #0f766e, #16a34a);
          color: white;
          padding: 60px 20px 50px;
          text-align: center;
        }
        .hero h1 { font-size: clamp(28px, 4vw, 42px); font-weight: 800; margin-bottom: 12px; }
        .hero p { font-size: clamp(14px, 2vw, 17px); opacity: 0.95; max-width: 680px; margin: 0 auto; line-height: 1.6; }
        
        .content-container { padding: 40px 20px 60px; max-width: 1200px; margin: 0 auto; }
        
        .contact-grid {
          display: grid;
          grid-template-columns: 1fr 1.4fr;
          gap: 30px;
          align-items: start;
        }

        .info-card {
          background: white;
          border-radius: 20px;
          padding: 35px 30px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.05);
          border: 1px solid #e2e8f0;
        }
        .info-card h2 { font-size: 24px; color: #0f172a; margin-top: 0; margin-bottom: 10px; font-weight: 800; }
        .info-desc { font-size: 14px; color: #64748b; line-height: 1.6; margin-bottom: 25px; }

        .info-items { display: flex; flex-direction: column; gap: 20px; margin-bottom: 30px; }
        .info-item { display: flex; align-items: center; gap: 16px; }

        .icon-wrap {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: #e0f2fe;
          color: #0284c7;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          flex-shrink: 0;
        }

        .info-label { font-size: 12px; color: #64748b; font-weight: 700; text-transform: uppercase; }
        .info-val { font-size: 15px; color: #0f172a; font-weight: 700; margin-top: 2px; }

        .info-badge {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 14px;
          padding: 16px;
        }
        .info-badge span { font-size: 13px; font-weight: 800; color: #166534; display: block; margin-bottom: 4px; }
        .info-badge p { font-size: 12px; color: #15803d; margin: 0; }

        .form-card {
          background: white;
          border-radius: 20px;
          padding: 35px 30px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.05);
          border: 1px solid #e2e8f0;
        }
        .contact-form { display: flex; flex-direction: column; gap: 18px; }
        .contact-form h2 { font-size: 24px; color: #0f172a; margin: 0; font-weight: 800; }
        .form-sub { font-size: 14px; color: #64748b; margin-top: -10px; margin-bottom: 6px; }

        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-group label { font-size: 13px; font-weight: 700; color: #334155; }
        .form-group input, .form-group textarea {
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid #cbd5e1;
          font-size: 14px;
          outline: none;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .form-group input:focus, .form-group textarea:focus {
          border-color: #0f766e;
          box-shadow: 0 0 0 3px rgba(15,118,110,0.15);
        }
        
        .submit-btn {
          background: linear-gradient(45deg, #FF6B70, #ff878c);
          color: white;
          border: none;
          padding: 14px;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          margin-top: 6px;
        }
        .submit-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(255,107,112,0.35);
        }

        .success-box {
          text-align: center;
          padding: 40px 20px;
        }
        .success-icon { font-size: 50px; color: #16a34a; margin-bottom: 16px; }
        .success-box h2 { font-size: 22px; color: #0f172a; margin-bottom: 8px; }
        .success-box p { font-size: 15px; color: #64748b; margin-bottom: 24px; }
        .reset-btn {
          background: #0f766e;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 20px;
          font-weight: 700;
          cursor: pointer;
        }

        /* RESPONSIVE BREAKPOINTS */
        @media (max-width: 900px) {
          .contact-grid { grid-template-columns: 1fr; }
          .form-row { grid-template-columns: 1fr; }
        }
        @media (max-width: 480px) {
          .info-card, .form-card { padding: 24px 18px; }
          .hero { padding: 40px 16px 30px; }
        }
      `}</style>
    </div>
  );
}
