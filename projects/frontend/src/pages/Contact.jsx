import React, { useState } from "react";

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="static-page">
      <div className="hero">
        <h1>Contact Support & Administration</h1>
        <p>Have questions about collective profiles, verifications, or directory listings? Get in touch with our team.</p>
      </div>

      <div className="content-container">
        <div className="content-card">
          {submitted ? (
            <div className="success-box">
              <div className="icon">✅</div>
              <h2>Thank You for Reaching Out!</h2>
              <p>Your message has been dispatched to our support administration. We will reply shortly.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="contact-form">
              <h2>Send us a Message</h2>
              <div className="form-group">
                <label>Your Name:</label>
                <input type="text" placeholder="John Doe" required />
              </div>
              <div className="form-group">
                <label>Email Address:</label>
                <input type="email" placeholder="john@example.com" required />
              </div>
              <div className="form-group">
                <label>Subject:</label>
                <input type="text" placeholder="Inquiry regarding Directory or Verification" required />
              </div>
              <div className="form-group">
                <label>Message:</label>
                <textarea rows="5" placeholder="Write your details here..." required></textarea>
              </div>
              <button type="submit" className="submit-btn">Send Message</button>
            </form>
          )}
        </div>
      </div>

      <style>{`
        .static-page { font-family: 'Segoe UI', system-ui, sans-serif; background: #f8fafc; min-height: 85vh; }
        .hero { background: linear-gradient(135deg, #0f9d58, #0c7c46); color: white; padding: 60px 8% 50px; text-align: center; }
        .hero h1 { font-size: 38px; font-weight: 800; margin-bottom: 12px; }
        .hero p { font-size: 16px; opacity: 0.95; max-width: 650px; margin: 0 auto; }
        .content-container { padding: 50px 8%; display: flex; justify-content: center; }
        .content-card { background: white; border-radius: 16px; padding: 40px; max-width: 650px; width: 100%; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
        .contact-form { display: flex; flex-direction: column; gap: 16px; }
        .contact-form h2 { font-size: 22px; color: #0f172a; margin-top: 0; margin-bottom: 8px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-group label { font-size: 13px; font-weight: 600; color: #334155; }
        .form-group input, .form-group textarea { padding: 12px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 14px; outline: none; }
        .submit-btn { background: linear-gradient(45deg, #FF6B70, #ff878c); color: white; border: none; padding: 12px; border-radius: 24px; font-weight: 700; cursor: pointer; }
        .success-box { text-align: center; padding: 30px 10px; }
        .success-box .icon { font-size: 40px; margin-bottom: 12px; }
      `}</style>
    </div>
  );
}
