import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";

export default function CollectiveProfile() {
  const { collectiveSlug } = useParams();
  const navigate = useNavigate();
  const [collective, setCollective] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCollective();
  }, [collectiveSlug]);

  const fetchCollective = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:5000/api/collectives/slug/${collectiveSlug}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Collective profile not found");
        throw new Error("Failed to load collective profile");
      }
      const data = await res.json();
      setCollective(data.collective);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartConversation = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/messages/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          collective_id: collective.id,
          initial_message: `Hello ${collective.name}, I am reaching out regarding your collective profile.`,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        navigate("/messages", { state: { conversationId: json.conversation_id } });
      } else {
        const errJson = await res.json();
        alert(errJson.message || "Could not initiate message");
      }
    } catch (e) {
      alert("Error starting conversation: " + e.message);
    }
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="spinner"></div>
        <p>Loading collective profile...</p>
        <style>{`
          .profile-loading { text-align: center; padding: 100px 20px; font-family: sans-serif; color: #64748b; }
          .spinner { width: 40px; height: 40px; border: 4px solid #e2e8f0; border-top-color: #0f766e; border-radius: 50%; animation: spin 1s infinite linear; margin: 0 auto 16px; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (error || !collective) {
    return (
      <div className="profile-error">
        <h2>Collective Not Found</h2>
        <p>{error || "The requested collective profile does not exist."}</p>
        <Link to="/directory" className="back-btn">
          ← Back to Yellow Pages Directory
        </Link>
        <style>{`
          .profile-error { text-align: center; padding: 100px 20px; font-family: sans-serif; }
          .profile-error h2 { color: #e11d48; margin-bottom: 8px; }
          .back-btn { display: inline-block; margin-top: 16px; background: #0f766e; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="collective-page">
      {/* BANNER */}
      <div
        className="banner"
        style={{
          backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.6), rgba(15, 23, 42, 0.8)), url(${collective.banner_url || "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1200&auto=format&fit=crop&q=80"})`,
        }}
      >
        <div className="banner-content">
          <div className="logo-box">
            <img
              src={collective.logo_url || "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=300&auto=format&fit=crop&q=80"}
              alt={collective.name}
            />
          </div>
          <div className="banner-info">
            <div className="badge-row">
              <span className="collective-tag">Collective Profile</span>
              {collective.status === "approved" && <span className="verified-tag">✓ Verified Profile</span>}
            </div>
            <h1>{collective.name}</h1>
            <p className="location-text">
              📍 {[collective.address, collective.city, collective.state, collective.zip].filter(Boolean).join(", ") || "Community Collective"}
            </p>
          </div>
          <div className="banner-actions">
            <button className="cta-msg-btn" onClick={handleStartConversation}>
              💬 Contact / Message Collective
            </button>
            {collective.website && (
              <a
                href={collective.website.startsWith("http") ? collective.website : `https://${collective.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="cta-web-btn"
              >
                🌐 Visit Official Website
              </a>
            )}
          </div>
        </div>
      </div>

      {/* BODY CONTENT */}
      <div className="profile-container">
        <div className="main-col">
          {/* ABOUT */}
          <div className="card-box">
            <h3>About {collective.name}</h3>
            <p className="description-body">
              {collective.description || "No description provided yet for this collective."}
            </p>
          </div>

          {/* PARTNERS */}
          {collective.partners && collective.partners.length > 0 && (
            <div className="card-box">
              <h3>🤝 Partners & Affiliates</h3>
              <div className="partners-grid">
                {collective.partners.map((partner, idx) => (
                  <div key={idx} className="partner-chip">
                    {typeof partner === "string" ? partner : partner.name || "Partner"}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MEMBERS */}
          {collective.members && collective.members.length > 0 && (
            <div className="card-box">
              <h3>👥 Team & Community Members ({collective.members.length})</h3>
              <div className="members-list">
                {collective.members.map((m) => (
                  <div key={m.id} className="member-item">
                    <div className="avatar-placeholder">
                      {(m.user?.name || "M").charAt(0).toUpperCase()}
                    </div>
                    <div className="member-details">
                      <strong>{m.user?.name || "Member"}</strong>
                      <span className="member-role">{m.role || "Member"}</span>
                      {m.user?.company_name && <small>{m.user.company_name}</small>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="side-col">
          {/* CONTACT INFO CARD */}
          <div className="card-box side-card">
            <h3>Contact Information</h3>
            <div className="info-list">
              {collective.contact_email && (
                <p>
                  <strong>Email:</strong> {collective.contact_email}
                </p>
              )}
              {collective.contact_phone && (
                <p>
                  <strong>Phone:</strong> {collective.contact_phone}
                </p>
              )}
              {collective.address && (
                <p>
                  <strong>Address:</strong> {collective.address}
                </p>
              )}
              {collective.owner && (
                <p>
                  <strong>Owner / Lead:</strong> {collective.owner.name} ({collective.owner.email})
                </p>
              )}
            </div>
            <button className="cta-msg-btn full-width" onClick={handleStartConversation}>
              💬 Send Direct Message
            </button>
          </div>

          <Link to="/directory" className="back-link">
            ← Return to Directory
          </Link>
        </div>
      </div>

      <style>{`
        .collective-page {
          font-family: 'Segoe UI', system-ui, sans-serif;
          background: #f8fafc;
          min-height: 100vh;
        }

        .banner {
          background-size: cover;
          background-position: center;
          color: white;
          padding: 60px 8% 40px;
        }

        .banner-content {
          display: flex;
          flex-wrap: wrap;
          gap: 24px;
          align-items: center;
        }

        .logo-box {
          width: 110px;
          height: 110px;
          border-radius: 16px;
          overflow: hidden;
          background: white;
          padding: 6px;
          box-shadow: 0 4px 14px rgba(0,0,0,0.3);
        }

        .logo-box img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 10px;
        }

        .banner-info {
          flex: 1;
          min-width: 260px;
        }

        .badge-row {
          display: flex;
          gap: 8px;
          margin-bottom: 8px;
        }

        .collective-tag {
          background: #f59e0b;
          color: white;
          font-size: 12px;
          padding: 4px 10px;
          border-radius: 20px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .verified-tag {
          background: #10b981;
          color: white;
          font-size: 12px;
          padding: 4px 10px;
          border-radius: 20px;
          font-weight: 700;
        }

        .banner-info h1 {
          font-size: 34px;
          font-weight: 800;
          margin: 4px 0 8px;
        }

        .location-text {
          font-size: 15px;
          opacity: 0.92;
          margin: 0;
        }

        .banner-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .cta-msg-btn {
          background: #2563eb;
          color: white;
          border: none;
          padding: 12px 22px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s;
        }

        .cta-msg-btn:hover {
          background: #1d4ed8;
        }

        .cta-web-btn {
          background: rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.4);
          color: white;
          text-align: center;
          padding: 10px 18px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
          transition: 0.2s;
        }

        .cta-web-btn:hover {
          background: rgba(255,255,255,0.3);
        }

        .profile-container {
          padding: 40px 8%;
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 30px;
        }

        .card-box {
          background: white;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 14px rgba(0,0,0,0.04);
          border: 1px solid #e2e8f0;
          margin-bottom: 24px;
        }

        .card-box h3 {
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
          margin-top: 0;
          margin-bottom: 16px;

        }

        .description-body {
          font-size: 15px;
          line-height: 1.6;
          color: #334155;
          white-space: pre-line;
        }

        .partners-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .partner-chip {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          color: #334155;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
        }

        .members-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 14px;
        }

        .member-item {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #f8fafc;
          padding: 10px 14px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
        }

        .avatar-placeholder {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: #2563eb;
          color: white;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        }

        .member-details {
          display: flex;
          flex-direction: column;
          font-size: 13px;
        }

        .member-role {
          font-size: 11px;
          color: #64748b;
          text-transform: capitalize;
        }

        .info-list p {
          font-size: 14px;
          margin: 10px 0;
          color: #334155;
        }

        .full-width {
          width: 100%;
          margin-top: 14px;
        }

        .back-link {
          display: block;
          text-align: center;
          color: #0f766e;
          font-weight: 600;
          text-decoration: none;
          margin-top: 10px;
        }

        @media (max-width: 900px) {
          .profile-container { grid-template-columns: 1fr; }
          .banner-content { flex-direction: column; text-align: center; }
          .badge-row { justify-content: center; }
        }
      `}</style>
    </div>
  );
}
