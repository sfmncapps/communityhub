import React from "react";
import { Link } from "react-router-dom";

export default function About() {
  return (
    <div className="static-page">
      <div className="hero">
        <h1>About CommunityHub</h1>
        <p>Connecting verified local businesses, collectives, and professionals under one trusted ecosystem.</p>
      </div>

      <div className="content-container">
        <div className="content-card">
          <h2>Our Mission</h2>
          <p>
            CommunityHub was built to foster digital trust and seamless communication between local enterprises, community collectives, and members.
            Through verified profiles, identity redaction security, and transparent administration, we empower communities to thrive together.
          </p>

          <div className="highlights-grid">
            <div className="highlight-item">
              <div className="icon">🛡️</div>
              <h4>Admin Verified</h4>
              <p>All listings and user verification documents are thoroughly audited by administrative personnel.</p>
            </div>
            <div className="highlight-item">
              <div className="icon">🤝</div>
              <h4>Collective Profiles</h4>
              <p>Dedicated dynamic hubs for community collectives, partners, and member collaborations.</p>
            </div>
            <div className="highlight-item">
              <div className="icon">💬</div>
              <h4>Direct Messaging</h4>
              <p>Integrated in-app communications with email notifications to keep you connected everywhere.</p>
            </div>
          </div>

          <div className="cta-box">
            <h3>Ready to join the ecosystem?</h3>
            <Link to="/login" className="primary-btn">
              Get Started Now →
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        .static-page { font-family: 'Segoe UI', system-ui, sans-serif; background: #f8fafc; min-height: 85vh; }
        .hero { background: linear-gradient(135deg, #0f9d58, #0c7c46); color: white; padding: 60px 8% 50px; text-align: center; }
        .hero h1 { font-size: 38px; font-weight: 800; margin-bottom: 12px; }
        .hero p { font-size: 16px; opacity: 0.95; max-width: 650px; margin: 0 auto; }
        .content-container { padding: 50px 8%; display: flex; justify-content: center; }
        .content-card { background: white; border-radius: 16px; padding: 40px; max-width: 800px; width: 100%; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
        .content-card h2 { font-size: 24px; color: #0f172a; margin-top: 0; }
        .content-card p { color: #475569; line-height: 1.6; font-size: 15px; }
        .highlights-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin: 30px 0; }
        .highlight-item { background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; text-align: center; }
        .highlight-item .icon { font-size: 32px; margin-bottom: 10px; }
        .highlight-item h4 { margin: 0 0 6px; font-size: 16px; color: #0f172a; }
        .highlight-item p { font-size: 13px; color: #64748b; margin: 0; }
        .cta-box { text-align: center; margin-top: 35px; padding-top: 25px; border-top: 1px solid #f1f5f9; }
        .cta-box h3 { margin-bottom: 15px; font-size: 18px; color: #0f172a; }
        .primary-btn { display: inline-block; background: linear-gradient(45deg, #FF6B70, #ff878c); color: white; padding: 12px 24px; border-radius: 30px; text-decoration: none; font-weight: 700; }
      `}</style>
    </div>
  );
}
