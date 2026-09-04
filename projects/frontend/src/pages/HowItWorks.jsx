import React from "react";
import { Link } from "react-router-dom";

export default function HowItWorks() {
  return (
    <div className="static-page">
      <div className="hero">
        <h1>How CommunityHub Works</h1>
        <p>Simple 4-step workflow to verify your identity, post listings, publish collective profiles, and message members.</p>
      </div>

      <div className="content-container">
        <div className="content-card">
          <div className="steps-list">
            <div className="step-card">
              <div className="step-num">1</div>
              <div className="step-text">
                <h3>Register Account</h3>
                <p>Sign up using your email, phone, or WhatsApp OTP authentication with fast password configuration.</p>
              </div>
            </div>

            <div className="step-card">
              <div className="step-num">2</div>
              <div className="step-text">
                <h3>Submit Redacted ID Verification</h3>
                <p>Upload a redacted driver's license or ID (masking sensitive numbers) to obtain an Admin Verified account badge.</p>
              </div>
            </div>

            <div className="step-card">
              <div className="step-num">3</div>
              <div className="step-text">
                <h3>List Businesses & Collectives</h3>
                <p>Create collective profile pages with custom slugs (e.g. <code>/:collectiveSlug</code>), team members, and directory listings.</p>
              </div>
            </div>

            <div className="step-card">
              <div className="step-num">4</div>
              <div className="step-text">
                <h3>Connect via In-App Messaging</h3>
                <p>Communicate directly with users and collectives with automatic Nodemailer email notifications for offline messages.</p>
              </div>
            </div>
          </div>

          <div className="cta-box">
            <Link to="/login" className="primary-btn">Join CommunityHub Today →</Link>
          </div>
        </div>
      </div>

      <style>{`
        .static-page { font-family: 'Segoe UI', system-ui, sans-serif; background: #f8fafc; min-height: 85vh; }
        .hero { background: linear-gradient(135deg, #0f9d58, #0c7c46); color: white; padding: 60px 8% 50px; text-align: center; }
        .hero h1 { font-size: 38px; font-weight: 800; margin-bottom: 12px; }
        .hero p { font-size: 16px; opacity: 0.95; max-width: 650px; margin: 0 auto; }
        .content-container { padding: 50px 8%; display: flex; justify-content: center; }
        .content-card { background: white; border-radius: 16px; padding: 40px; max-width: 750px; width: 100%; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
        .steps-list { display: flex; flex-direction: column; gap: 24px; }
        .step-card { display: flex; gap: 20px; align-items: flex-start; background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; }
        .step-num { width: 44px; height: 44px; border-radius: 50%; background: #0f766e; color: white; font-weight: bold; font-size: 20px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .step-text h3 { margin: 0 0 6px; font-size: 18px; color: #0f172a; }
        .step-text p { margin: 0; font-size: 14px; color: #64748b; line-height: 1.5; }
        .cta-box { text-align: center; margin-top: 30px; }
        .primary-btn { display: inline-block; background: linear-gradient(45deg, #FF6B70, #ff878c); color: white; padding: 12px 24px; border-radius: 30px; text-decoration: none; font-weight: 700; }
      `}</style>
    </div>
  );
}
