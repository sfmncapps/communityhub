import { useState, useEffect } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
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
  FaTimes,
  FaUsers,
} from "react-icons/fa";
import supabase from "../config/supabaseClient";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Native RSVP State
  const [showRsvpModal, setShowRsvpModal] = useState(false);
  const [rsvpSuccess, setRsvpSuccess] = useState(false);
  const [rsvpSubmitting, setRsvpSubmitting] = useState(false);
  const [rsvpError, setRsvpError] = useState("");
  const [rsvpForm, setRsvpForm] = useState({
    attendee_name: "",
    attendee_email: "",
    attendee_phone: "",
    number_of_guests: 1,
    notes: "",
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const u = JSON.parse(stored);
        setRsvpForm((prev) => ({
          ...prev,
          attendee_name: u.name || u.username || prev.attendee_name,
          attendee_email: u.email || prev.attendee_email,
          attendee_phone: u.phone || prev.attendee_phone,
        }));
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (searchParams.get("rsvp") === "true") {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate(`/login?redirect=${encodeURIComponent(`/events/${id}?rsvp=true`)}`);
      } else {
        setShowRsvpModal(true);
      }
    }
  }, [searchParams, id]);

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
  const isConcluded = (() => {
    if (!event || !event.event_date) return false;
    try {
      const datePart = event.end_date || event.event_date;
      const timePart = event.end_time || event.event_time || "23:59:59";
      const parsedTime = timePart.length === 5 ? `${timePart}:00` : timePart;
      const eventEnd = new Date(`${datePart}T${parsedTime}`);
      if (isNaN(eventEnd.getTime())) {
        return new Date(datePart).setHours(23, 59, 59, 999) < Date.now();
      }
      return eventEnd.getTime() < Date.now();
    } catch {
      return false;
    }
  })();

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${event.venue_name}, ${event.address || ""}, ${event.city}, ${event.state}`
  )}`;

  const handleOpenRsvpModal = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate(`/login?redirect=${encodeURIComponent(`/events/${id}?rsvp=true`)}`);
      return;
    }
    setShowRsvpModal(true);
  };

  const handleRsvpSubmit = async (e) => {
    e.preventDefault();
    setRsvpError("");
    setRsvpSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const res = await fetch(`${API}/events/${id}/register`, {
        method: "POST",
        headers,
        body: JSON.stringify(rsvpForm),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || "Registration failed");
      }

      setRsvpSuccess(true);
      setShowRsvpModal(false);
    } catch (err) {
      setRsvpError(err.message || "Failed to submit registration");
    } finally {
      setRsvpSubmitting(false);
    }
  };

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

      {/* CONCLUDED NOTICE */}
      {isConcluded && (
        <div className="ev-pending-notice" style={{ background: "#f1f5f9", borderColor: "#cbd5e1", color: "#475569" }}>
          ⏰ <strong>This event has concluded.</strong> It has been automatically archived into Previous Events, and registration is now closed.
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

            {isConcluded ? (
              <button
                className="btn-rsvp-primary"
                disabled
                style={{ background: "#94a3b8", cursor: "not-allowed", opacity: 0.85 }}
              >
                Event Concluded (Closed)
              </button>
            ) : rsvpSuccess ? (
              <div
                style={{
                  background: "#dcfce7",
                  color: "#166534",
                  padding: "14px",
                  borderRadius: "12px",
                  fontWeight: "700",
                  textAlign: "center",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  border: "1px solid #bbf7d0",
                }}
              >
                <FaCheckCircle style={{ color: "#16a34a", fontSize: "18px" }} />
                <span>You're Registered for this Event!</span>
              </div>
            ) : (
              <button
                className="btn-rsvp-primary"
                onClick={handleOpenRsvpModal}
              >
                <FaTicketAlt /> Register for Event / RSVP
              </button>
            )}

            <button className="btn-share-alt" onClick={handleShare}>
              <FaShareAlt /> {copied ? "Copied to Clipboard!" : "Share with Friends"}
            </button>

            <div className="sidebar-subtext">
              100% native platform registration. Confirmation stored in Supabase.
            </div>
          </div>
        </div>
      </div>

      {/* NATIVE EVENT REGISTRATION / RSVP MODAL */}
      {showRsvpModal && (
        <div className="rsvp-modal-overlay" onClick={() => setShowRsvpModal(false)}>
          <div className="rsvp-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="rsvp-modal-header">
              <div>
                <h3>RSVP / Event Registration</h3>
                <p>{event.title}</p>
              </div>
              <button className="rsvp-close-btn" onClick={() => setShowRsvpModal(false)}>
                <FaTimes />
              </button>
            </div>

            {rsvpError && (
              <div className="rsvp-error-banner">
                {rsvpError}
              </div>
            )}

            <form onSubmit={handleRsvpSubmit} className="rsvp-form">
              <div className="rsvp-field">
                <label>Attendee Full Name <span style={{ color: "#ef4444" }}>*</span></label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={rsvpForm.attendee_name}
                  onChange={(e) => setRsvpForm({ ...rsvpForm, attendee_name: e.target.value })}
                  required
                />
              </div>

              <div className="rsvp-field">
                <label>Email Address <span style={{ color: "#ef4444" }}>*</span></label>
                <input
                  type="email"
                  placeholder="john@example.com"
                  value={rsvpForm.attendee_email}
                  onChange={(e) => setRsvpForm({ ...rsvpForm, attendee_email: e.target.value })}
                  required
                />
              </div>

              <div className="rsvp-field">
                <label>Phone / WhatsApp Number <span style={{ color: "#ef4444" }}>*</span></label>
                <input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={rsvpForm.attendee_phone}
                  onChange={(e) => setRsvpForm({ ...rsvpForm, attendee_phone: e.target.value })}
                  required
                />
              </div>

              <div className="rsvp-field">
                <label>Number of Guests (including you):</label>
                <select
                  value={rsvpForm.number_of_guests}
                  onChange={(e) => setRsvpForm({ ...rsvpForm, number_of_guests: e.target.value })}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? "Person" : "People"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rsvp-field">
                <label>Special Requests / Notes (Optional):</label>
                <textarea
                  rows="3"
                  placeholder="Any accessibility requirements or questions for the organizer..."
                  value={rsvpForm.notes}
                  onChange={(e) => setRsvpForm({ ...rsvpForm, notes: e.target.value })}
                />
              </div>

              <div className="rsvp-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowRsvpModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-confirm-rsvp"
                  disabled={rsvpSubmitting}
                >
                  {rsvpSubmitting ? "Confirming Registration..." : "Confirm RSVP & Attend"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

        /* RSVP Modal Styles */
        .rsvp-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
        }
        .rsvp-modal-content {
          background: #ffffff;
          border-radius: 16px;
          max-width: 480px;
          width: 100%;
          box-shadow: 0 20px 40px rgba(0,0,0,0.2);
          overflow: hidden;
          animation: modalPop 0.2s ease-out;
        }
        @keyframes modalPop {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .rsvp-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }
        .rsvp-modal-header h3 {
          margin: 0;
          font-size: 18px;
          color: #0f172a;
          font-weight: 700;
        }
        .rsvp-modal-header p {
          margin: 4px 0 0;
          font-size: 13px;
          color: #64748b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 380px;
        }
        .rsvp-close-btn {
          background: none;
          border: none;
          color: #94a3b8;
          font-size: 16px;
          cursor: pointer;
          padding: 4px;
        }
        .rsvp-close-btn:hover { color: #0f172a; }
        .rsvp-form {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .rsvp-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .rsvp-field label {
          font-size: 13px;
          font-weight: 600;
          color: #334155;
        }
        .rsvp-field input, .rsvp-field select, .rsvp-field textarea {
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font-size: 14px;
          outline: none;
          font-family: inherit;
        }
        .rsvp-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 8px;
        }
        .btn-cancel {
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          color: #475569;
          padding: 10px 16px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
        }
        .btn-confirm-rsvp {
          background: #0f766e;
          border: none;
          color: #ffffff;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(15, 118, 110, 0.25);
        }
        .btn-confirm-rsvp:hover { background: #0d9488; }
        .btn-confirm-rsvp:disabled { opacity: 0.7; cursor: not-allowed; }
        .rsvp-error-banner {
          background: #fef2f2;
          border-left: 4px solid #ef4444;
          color: #b91c1c;
          padding: 10px 16px;
          font-size: 13px;
          margin: 16px 24px 0;
        }
      `}</style>
    </div>
  );
}
