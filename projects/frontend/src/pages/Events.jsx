import React from "react";
import { Link } from "react-router-dom";

const Events = () => {
  return (
    <div className="events-page">
      {/* HERO */}
      <div className="hero">
        <h1>Community Events & Gatherings</h1>
        <p>Discover local meetups, workshops, corporate webinars, and cultural celebrations</p>

        <div className="cta-row">
          <Link to="/directory" className="hero-cta-btn">
            Explore Directory & Collectives
          </Link>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="events-container">
        <div className="empty-events-card">
          <div className="icon-wrapper">🎉</div>
          <h2>Upcoming Events Calendar</h2>
          <p>
            We are currently curating and verifying new community events and collective workshops.
            Stay tuned for upcoming schedules and RSVP links!
          </p>
          <div className="action-row">
            <Link to="/messages" className="contact-btn">
              💬 Suggest an Event to Admin
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        .events-page {
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          min-height: 85vh;
          background: #f8fafc;
        }

        .hero {
          background: linear-gradient(135deg, #0f9d58, #0c7c46);
          color: white;
          padding: 60px 8% 50px;
          text-align: center;
        }

        .hero h1 {
          font-size: 38px;
          font-weight: 800;
          margin-bottom: 12px;
          letter-spacing: -0.5px;
        }

        .hero p {
          font-size: 16px;
          opacity: 0.95;
          margin: 0 0 24px;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }

        .cta-row {
          display: flex;
          justify-content: center;
          gap: 12px;
        }

        .hero-cta-btn {
          background: linear-gradient(45deg, #FF6B70, #ff878c);
          color: white;
          text-decoration: none;
          padding: 12px 24px;
          border-radius: 30px;
          font-weight: 700;
          font-size: 14px;
          transition: 0.3s ease;
          box-shadow: 0 4px 15px rgba(255,107,112,0.3);
        }

        .hero-cta-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(255,107,112,0.4);
        }

        .events-container {
          padding: 60px 8%;
          display: flex;
          justify-content: center;
        }

        .empty-events-card {
          background: white;
          border-radius: 16px;
          padding: 48px 36px;
          text-align: center;
          max-width: 540px;
          width: 100%;
          box-shadow: 0 4px 20px rgba(0,0,0,0.06);
          border: 1px solid #e2e8f0;
        }

        .icon-wrapper {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: #e6f4ea;
          color: #0f9d58;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          margin: 0 auto 20px;
        }

        .empty-events-card h2 {
          font-size: 22px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 10px;
        }

        .empty-events-card p {
          color: #64748b;
          font-size: 14px;
          line-height: 1.6;
          margin: 0 0 24px;
        }

        .contact-btn {
          display: inline-block;
          background: #0f766e;
          color: white;
          text-decoration: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          transition: 0.2s;
        }

        .contact-btn:hover {
          background: #0d9488;
        }

        @media (max-width: 768px) {
          .hero { padding: 40px 20px; }
          .hero h1 { font-size: 26px; }
          .events-container { padding: 40px 20px; }
        }
      `}</style>
    </div>
  );
};

export default Events;
