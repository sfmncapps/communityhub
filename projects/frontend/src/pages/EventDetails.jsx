import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  FaCalendarAlt,
  FaClock,
  FaMapMarkerAlt,
  FaTicketAlt,
  FaUserAlt,
  FaEnvelope,
  FaPhone,
  FaExternalLinkAlt,
  FaArrowLeft,
  FaShareAlt,
  FaCheckCircle,
} from "react-icons/fa";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchEventDetails();
  }, [id]);

  const fetchEventDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await fetch(`${API}/events/${id}`, { headers });
      if (!res.ok) {
        if (res.status === 404) throw new Error("Event not found or has been removed");
        if (res.status === 403) throw new Error("This event is pending approval and only visible to its organizer");
        throw new Error("Failed to load event details");
      }

      const data = await res.json();
      setEvent(data.event);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const formatEventDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="ev-detail-loading">
        <div className="ev-spinner"></div>
        <p>Loading event information...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="ev-detail-error">
        <div className="error-card">
          <h2>Event Unavailable</h2>
          <p>{error || "The event you requested could not be found."}</p>
          <Link to="/events" className="btn-back">
            <FaArrowLeft /> Back to Events Directory
          </Link>
        </div>
      </div>
    );
  }

  const isPending = event.status !== "approved";
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${event.venue_name}, ${event.address || ""}, ${event.city}, ${event.state}`
  )}`;

  return (
    <div className="ev-detail-page">
      {/* TOP NAVIGATION BAR */}
      <div className="ev-top-bar">
        <div className="ev-top-inner">
          <Link to="/events" className="back-link">
            <FaArrowLeft /> Back to Events
          </Link>
          <button className="share-btn" onClick={handleShare}>
            <FaShareAlt /> {copied ? "Link Copied! ✓" : "Share Event"}
          </button>
        </div>
      </div>

      {/* PENDING APPROVAL NOTICE */}
      {isPending && (
        <div className="ev-pending-notice">
          ⚠️ This event has a status of <strong>"{event.status}"</strong> and is awaiting administrator approval before appearing in public listings.
        </div>
      )}

      {/* MAIN CONTAINER */}
      <div className="ev-detail-container">
        {/* LEFT COLUMN: EVENT CONTENT */}
        <div className="ev-main-column">
          {/* BANNER IMAGE */}
          <div className="ev-banner-wrap">
            <img
              src={
                event.banner_url ||
                "https://images.unsplash.com/photo-1511578314322-379afb476865?w=1200&auto=format&fit=crop&q=80"
              }
              alt={event.title}
              onError={(e) => {
                e.target.src =
                  "https://images.unsplash.com/photo-1511578314322-379afb476865?w=1200&auto=format&fit=crop&q=80";
              }}
            />
            <span className={`entry-chip ${event.entry_type === "Paid" ? "paid" : "free"}`}>
              <FaTicketAlt /> {event.entry_type === "Paid" ? event.ticket_price || "Paid Ticket" : "Free Entry"}
            </span>
          </div>

          {/* HEADER INFO */}
          <div className="ev-header-block">
            <div className="ev-badges">
              <span className="badge-category">{event.category}</span>
              {event.subcategory && <span className="badge-sub">{event.subcategory}</span>}
            </div>
            <h1>{event.title}</h1>
            <p className="ev-header-venue">
              <FaMapMarkerAlt /> {event.venue_name}, {event.city}, {event.state}
            </p>
          </div>

          {/* DESCRIPTION SECTION */}
          <div className="ev-section">
            <h2>About This Event</h2>
            <div className="ev-desc-body">
              {event.description.split("\n").map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          </div>

          {/* SCHEDULE SECTION */}
          <div className="ev-section">
            <h2>Date & Time</h2>
            <div className="schedule-cards">
              <div className="schedule-card">
                <FaCalendarAlt className="sched-icon" />
                <div>
                  <h4>Start Date</h4>
                  <p>{formatEventDate(event.event_date)}</p>
                  <span>At {event.event_time?.slice(0, 5) || "TBD"}</span>
                </div>
              </div>
              {event.end_date && (
                <div className="schedule-card">
                  <FaClock className="sched-icon" />
                  <div>
                    <h4>End Date</h4>
                    <p>{formatEventDate(event.end_date)}</p>
                    <span>At {event.end_time?.slice(0, 5) || "TBD"}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* VENUE & LOCATION SECTION */}
          <div className="ev-section">
            <h2>Venue & Location</h2>
            <div className="venue-card">
              <div className="venue-info">
                <h3>{event.venue_name}</h3>
                {event.address && <p>{event.address}</p>}
                <p>
                  {[event.city, event.state, event.zip_code].filter(Boolean).join(", ")}
                </p>
              </div>
              <a href={mapsUrl} target="_blank" rel="noreferrer" className="btn-maps">
                <FaMapMarkerAlt /> Open in Google Maps <FaExternalLinkAlt />
              </a>
            </div>
          </div>

          {/* ORGANIZER SECTION */}
          <div className="ev-section">
            <h2>Organized By</h2>
            <div className="organizer-card">
              <div className="organizer-avatar">
                <FaUserAlt />
              </div>
              <div className="organizer-details">
                <h3>{event.organizer_name || "Community Partner"}</h3>
                <div className="organizer-contacts">
                  {event.organizer_email && (
                    <a href={`mailto:${event.organizer_email}`}>
                      <FaEnvelope /> {event.organizer_email}
                    </a>
                  )}
                  {event.organizer_phone && (
                    <a href={`tel:${event.organizer_phone}`}>
                      <FaPhone /> {event.organizer_phone}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ACTION SIDEBAR */}
        <div className="ev-sidebar-column">
          <div className="ev-action-box">
            <div className="price-tag">
              <span className="price-label">Ticket / Entry</span>
              <span className="price-val">
                {event.entry_type === "Paid" ? event.ticket_price || "Paid" : "Free Admission"}
              </span>
            </div>

            <div className="action-meta">
              <div className="action-row">
                <FaCalendarAlt />
                <span>{formatEventDate(event.event_date)}</span>
              </div>
              <div className="action-row">
                <FaClock />
                <span>Starts at {event.event_time?.slice(0, 5)}</span>
              </div>
              <div className="action-row">
                <FaMapMarkerAlt />
                <span>{event.venue_name}, {event.city}</span>
              </div>
            </div>

            {event.registration_link ? (
              <a
                href={
                  event.registration_link.startsWith("http")
                    ? event.registration_link
                    : `https://${event.registration_link}`
                }
                target="_blank"
                rel="noreferrer"
                className="btn-rsvp-primary"
              >
                Register & RSVP Now <FaExternalLinkAlt />
              </a>
            ) : (
              <button
                className="btn-rsvp-primary"
                onClick={() => alert("Free open entry event! Simply arrive at the scheduled time.")}
              >
                <FaCheckCircle /> Free Admission (Walk-in Welcome)
              </button>
            )}

            <button className="btn-share-alt" onClick={handleShare}>
              <FaShareAlt /> {copied ? "Copied to Clipboard!" : "Share with Friends"}
            </button>

            <div className="sidebar-subtext">
              Organized for CommunityHub verified members and local collectives.
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .ev-detail-page {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          background: #f8fafc;
          min-height: 90vh;
          padding-bottom: 80px;
          color: #0f172a;
        }

        .ev-top-bar {
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          padding: 14px 20px;
        }
        .ev-top-inner {
          max-width: 1140px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #0f766e;
          font-weight: 700;
          font-size: 14px;
          text-decoration: none;
        }
        .share-btn {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          color: #334155;
          font-weight: 700;
          font-size: 13px;
          padding: 6px 14px;
          border-radius: 8px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .ev-pending-notice {
          background: #fffbeb;
          border-bottom: 1px solid #fde68a;
          color: #92400e;
          text-align: center;
          padding: 12px;
          font-size: 14px;
        }

        .ev-detail-container {
          max-width: 1140px;
          margin: 28px auto 0;
          padding: 0 20px;
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 32px;
          align-items: start;
        }

        .ev-main-column {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.04);
        }

        .ev-banner-wrap {
          height: 380px;
          position: relative;
          background: #0f172a;
        }
        .ev-banner-wrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .entry-chip {
          position: absolute;
          top: 20px;
          right: 20px;
          padding: 6px 14px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        .entry-chip.free { background: #10b981; color: white; }
        .entry-chip.paid { background: #f59e0b; color: #1e293b; }

        .ev-header-block {
          padding: 28px 28px 20px;
          border-bottom: 1px solid #f1f5f9;
        }
        .ev-badges {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }
        .badge-category {
          background: #0f766e;
          color: white;
          font-size: 11px;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 6px;
          text-transform: uppercase;
        }
        .badge-sub {
          background: #e2e8f0;
          color: #475569;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 6px;
        }
        .ev-header-block h1 {
          font-size: 28px;
          font-weight: 800;
          margin: 0 0 10px;
          line-height: 1.25;
        }
        .ev-header-venue {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #64748b;
          font-size: 14px;
          margin: 0;
        }

        .ev-section {
          padding: 24px 28px;
          border-bottom: 1px solid #f1f5f9;
        }
        .ev-section:last-child { border-bottom: none; }
        .ev-section h2 {
          font-size: 18px;
          font-weight: 800;
          margin: 0 0 16px;
          color: #0f172a;
        }
        .ev-desc-body {
          color: #334155;
          line-height: 1.7;
          font-size: 15px;
        }
        .ev-desc-body p { margin-bottom: 14px; }

        .schedule-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }
        .schedule-card {
          display: flex;
          gap: 14px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
        }
        .sched-icon {
          font-size: 24px;
          color: #0f766e;
          margin-top: 2px;
        }
        .schedule-card h4 {
          margin: 0 0 4px;
          font-size: 12px;
          text-transform: uppercase;
          color: #64748b;
        }
        .schedule-card p {
          margin: 0 0 2px;
          font-weight: 800;
          font-size: 14px;
        }
        .schedule-card span {
          font-size: 12px;
          color: #475569;
        }

        .venue-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        .venue-info h3 { margin: 0 0 6px; font-size: 16px; font-weight: 800; }
        .venue-info p { margin: 0 0 2px; color: #475569; font-size: 13px; }
        .btn-maps {
          background: white;
          border: 1px solid #cbd5e1;
          color: #0f766e;
          padding: 10px 16px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
        }
        .btn-maps:hover {
          border-color: #0f766e;
        }

        .organizer-card {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .organizer-avatar {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: #e2e8f0;
          color: #64748b;
          display: grid;
          place-items: center;
          font-size: 20px;
        }
        .organizer-details h3 { margin: 0 0 6px; font-size: 16px; font-weight: 800; }
        .organizer-contacts {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }
        .organizer-contacts a {
          color: #0f766e;
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .ev-sidebar-column {
          position: sticky;
          top: 24px;
        }
        .ev-action-box {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.06);
        }
        .price-tag {
          margin-bottom: 20px;
        }
        .price-label {
          display: block;
          font-size: 12px;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .price-val {
          font-size: 26px;
          font-weight: 900;
          color: #0f172a;
        }
        .action-meta {
          border-top: 1px solid #f1f5f9;
          border-bottom: 1px solid #f1f5f9;
          padding: 16px 0;
          margin-bottom: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .action-row {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: #475569;
        }
        .action-row svg { color: #0f766e; }

        .btn-rsvp-primary {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          width: 100%;
          background: linear-gradient(135deg, #0f766e, #16a34a);
          color: white;
          text-decoration: none;
          padding: 14px;
          border-radius: 12px;
          font-weight: 800;
          font-size: 15px;
          border: none;
          cursor: pointer;
          box-shadow: 0 6px 18px rgba(16, 185, 129, 0.3);
          transition: transform .15s, filter .15s;
        }
        .btn-rsvp-primary:hover {
          filter: brightness(1.04);
          transform: translateY(-2px);
        }
        .btn-share-alt {
          width: 100%;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          color: #334155;
          padding: 11px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 13px;
          margin-top: 10px;
          cursor: pointer;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 6px;
        }
        .sidebar-subtext {
          font-size: 11px;
          color: #94a3b8;
          text-align: center;
          margin-top: 16px;
          line-height: 1.4;
        }

        .ev-detail-loading,
        .ev-detail-error {
          text-align: center;
          padding: 100px 20px;
        }
        .ev-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e2e8f0;
          border-top-color: #10b981;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 16px;
        }
        .error-card {
          background: white;
          max-width: 460px;
          margin: 0 auto;
          padding: 40px 24px;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
        }
        .btn-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #0f766e;
          color: white;
          padding: 10px 18px;
          border-radius: 8px;
          font-weight: 700;
          text-decoration: none;
          margin-top: 16px;
        }

        @media (max-width: 860px) {
          .ev-detail-container { grid-template-columns: 1fr; }
          .ev-banner-wrap { height: 260px; }
          .ev-header-block h1 { font-size: 22px; }
        }
      `}</style>
    </div>
  );
}
