import React from "react";
import { Link } from "react-router-dom";

export default function JoinUs() {
  return (
    <div className="static-page">
      <div className="hero">
        <h1>Join the CommunityHub Network</h1>
        <p>Whether you're an individual member, business owner, or collective leader, register today to unlock community features.</p>
      </div>

      <div className="content-container">
        <div className="content-card">
          <div className="roles-grid">
            <div className="role-box">
              <div className="icon">👤</div>
              <h3>Community Member</h3>
              <p>Explore directory listings, apply for job posts, buy/sell classified items, and message verified collectives.</p>
              <Link to="/login" className="role-btn">Join as Member</Link>
            </div>

            <div className="role-box">
              <div className="icon">🏢</div>
              <h3>Business & Enterprise</h3>
              <p>Publish directory listings, post job openings, and gain customer trust through ID document verification badges.</p>
              <Link to="/login" className="role-btn">Register Business</Link>
            </div>

            <div className="role-box">
              <div className="icon">🤝</div>
              <h3>Collective Leader</h3>
              <p>Create a dedicated collective profile page, showcase partners, invite members, and manage collective communications.</p>
              <Link to="/login" className="role-btn">Create Collective</Link>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .static-page { font-family: 'Segoe UI', system-ui, sans-serif; background: #f8fafc; min-height: 85vh; }
        .hero { background: linear-gradient(135deg, #0f9d58, #0c7c46); color: white; padding: 60px 8% 50px; text-align: center; }
        .hero h1 { font-size: 38px; font-weight: 800; margin-bottom: 12px; }
        .hero p { font-size: 16px; opacity: 0.95; max-width: 650px; margin: 0 auto; }
        .content-container { padding: 50px 8%; display: flex; justify-content: center; }
        .content-card { background: white; border-radius: 16px; padding: 40px; max-width: 850px; width: 100%; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
        .roles-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; }
        .role-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 24px; border-radius: 14px; text-align: center; display: flex; flex-direction: column; }
        .role-box .icon { font-size: 36px; margin-bottom: 12px; }
        .role-box h3 { margin: 0 0 8px; font-size: 18px; color: #0f172a; }
        .role-box p { font-size: 13px; color: #64748b; line-height: 1.5; margin-bottom: 20px; flex: 1; }
        .role-btn { background: #0f766e; color: white; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; font-size: 13px; }
        .role-btn:hover { background: #0d9488; }
      `}</style>
    </div>
  );
}
