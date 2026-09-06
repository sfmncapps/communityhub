import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaTicketAlt,
  FaSearch,
  FaPlus,
  FaClock,
  FaUserAlt,
  FaFilter,
} from "react-icons/fa";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const CATEGORIES = [
  "All",
  "Community Event",
  "Business Event",
  "Workshop",
  "Job Fair",
  "Cultural Program",
];

const TIMING_OPTIONS = [
  { id: "upcoming", label: "Upcoming" },
  { id: "today", label: "Today" },
  { id: "this_month", label: "All Upcoming" },
  { id: "all", label: "All Events" },
  { id: "past", label: "Past Events" },
];

export default function Events() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [timing, setTiming] = useState("upcoming");

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append("q", search.trim());
      if (selectedCategory && selectedCategory !== "All") params.append("category", selectedCategory);
      if (timing) params.append("timing", timing);

      const res = await fetch(`${API}/events?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      } else {
        setEvents([]);
      }
    } catch (err) {
      console.error("Failed to load events:", err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [selectedCategory, timing]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchEvents();
  };

  const handleHostEvent = () => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/dashboard?tab=my-events");
    } else {
      navigate("/login");
    }
  };

  const formatEventDate = (dateStr, timeStr) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      const options = { weekday: "short", month: "short", day: "numeric", year: "numeric" };
      const datePart = d.toLocaleDateString("en-US", options);
      if (timeStr) {
        return `${datePart} • ${timeStr.slice(0, 5)}`;
      }
      return datePart;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="ev-page">
      {/* HERO SECTION */}
      <div className="ev-hero">
        <div className="ev-hero-inner">
          <span className="ev-hero-badge">
            <FaCalendarAlt /> Community Happenings
          </span>
          <h1>Events & Gatherings Directory</h1>
          <p>
            Connect with like-minded collectives, attend social workshops, join networking meetups,
            and celebrate grassroots community initiatives.
          </p>
          <div className="ev-hero-actions">
            <button className="btn-host-event" onClick={handleHostEvent}>
              <FaPlus /> Host or Submit an Event
            </button>
            <Link to="/directory" className="btn-explore-directory">
              Explore Collectives
            </Link>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="ev-controls-wrap">
        <div className="ev-controls">
          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="ev-search-form">
            <FaSearch className="ev-search-icon" />
            <input
              type="text"
              placeholder="Search event title, venue, organizer, or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" className="ev-search-btn">
              Search
            </button>
          </form>

          {/* Timing Dropdown */}
          <div className="ev-timing-select">
            <FaClock className="timing-icon" />
            <select value={timing} onChange={(e) => setTiming(e.target.value)}>
              {TIMING_OPTIONS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="ev-categories-pills">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`cat-pill ${selectedCategory === cat ? "active" : ""}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* EVENTS GRID CONTAINER */}
      <div className="ev-content-container">
        <div className="ev-header-row">
          <h2>
            {selectedCategory === "All" ? "Upcoming Events" : selectedCategory}
            <span className="ev-count-badge">{events.length}</span>
          </h2>
          {timing !== "upcoming" && (
            <span className="ev-active-timing-pill">Filter: {timing.replace("_", " ")}</span>
          )}
        </div>

        {loading ? (
          <div className="ev-loading-box">
            <div className="ev-spinner"></div>
            <p>Loading community events...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="ev-empty-card">
            <div className="ev-empty-icon">📅</div>
            <h3>No events found</h3>
            <p>
              {search.trim()
                ? `No events matching "${search}". Try adjusting your keywords or category filters.`
                : "No events are currently scheduled under this filter."}
            </p>
            <div className="ev-empty-actions">
              <button
                className="btn-secondary"
                onClick={() => {
                  setSearch("");
                  setSelectedCategory("All");
                  setTiming("upcoming");
                }}
              >
                Reset Filters
              </button>
              <button className="btn-primary" onClick={handleHostEvent}>
                <FaPlus /> Host the First Event
              </button>
            </div>
          </div>
        ) : (
          <div className="ev-grid">
            {events.map((ev) => (
              <div key={ev.id} className="ev-card">
                <div className="ev-card-media">
                  <img
                    src={
                      ev.banner_url ||
                      "https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&auto=format&fit=crop&q=60"
                    }
                    alt={ev.title}
                    onError={(e) => {
                      e.target.src =
                        "https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&auto=format&fit=crop&q=60";
                    }}
                  />
                  <span className={`ev-entry-badge ${ev.entry_type === "Paid" ? "paid" : "free"}`}>
                    <FaTicketAlt /> {ev.entry_type === "Paid" ? ev.ticket_price || "Paid" : "Free Entry"}
                  </span>
                  <span className="ev-cat-badge">{ev.category}</span>
                </div>

                <div className="ev-card-body">
                  <div className="ev-datetime">
                    <FaCalendarAlt />
                    <span>{formatEventDate(ev.event_date, ev.event_time)}</span>
                  </div>

                  <h3 className="ev-card-title">
                    <Link to={`/events/${ev.id}`}>{ev.title}</Link>
                  </h3>

                  <p className="ev-card-desc">
                    {ev.description?.length > 110
                      ? `${ev.description.substring(0, 110)}...`
                      : ev.description || "No description provided."}
                  </p>

                  <div className="ev-card-meta">
                    <div className="meta-item">
                      <FaMapMarkerAlt />
                      <span>
                        {ev.venue_name}, {ev.city}
                      </span>
                    </div>
                    {ev.organizer_name && (
                      <div className="meta-item organizer">
                        <FaUserAlt />
                        <span>By {ev.organizer_name}</span>
                      </div>
                    )}
                  </div>

                  <div className="ev-card-footer">
                    <Link to={`/events/${ev.id}`} className="btn-view-details">
                      View Details & RSVP →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .ev-page {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          min-height: 90vh;
          background: #f8fafc;
          color: #0f172a;
          padding-bottom: 60px;
        }

        .ev-hero {
          background: linear-gradient(135deg, #064e3b, #0f766e, #16a34a);
          color: white;
          padding: 60px 24px 50px;
          text-align: center;
          position: relative;
        }
        .ev-hero-inner {
          max-width: 820px;
          margin: 0 auto;
        }
        .ev-hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.16);
          backdrop-filter: blur(8px);
          padding: 6px 14px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 16px;
          border: 1px solid rgba(255, 255, 255, 0.25);
        }
        .ev-hero h1 {
          font-size: 38px;
          font-weight: 800;
          letter-spacing: -0.5px;
          margin: 0 0 14px;
          line-height: 1.2;
        }
        .ev-hero p {
          font-size: 16px;
          opacity: 0.92;
          line-height: 1.6;
          margin: 0 0 28px;
        }
        .ev-hero-actions {
          display: flex;
          justify-content: center;
          gap: 14px;
          flex-wrap: wrap;
        }
        .btn-host-event {
          background: #f59e0b;
          color: #1e293b;
          font-weight: 800;
          font-size: 14px;
          padding: 12px 24px;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: transform .15s, box-shadow .15s;
          box-shadow: 0 4px 14px rgba(245, 158, 11, 0.35);
        }
        .btn-host-event:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(245, 158, 11, 0.45);
        }
        .btn-explore-directory {
          background: rgba(255, 255, 255, 0.12);
          color: white;
          font-weight: 700;
          font-size: 14px;
          padding: 12px 24px;
          border-radius: 12px;
          text-decoration: none;
          border: 1px solid rgba(255, 255, 255, 0.3);
          transition: background .15s;
        }
        .btn-explore-directory:hover {
          background: rgba(255, 255, 255, 0.22);
        }

        .ev-controls-wrap {
          max-width: 1200px;
          margin: -24px auto 0;
          padding: 0 20px;
          position: relative;
          z-index: 10;
        }
        .ev-controls {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 12px 16px;
          box-shadow: 0 10px 30px rgba(2, 6, 23, 0.08);
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }
        .ev-search-form {
          flex: 1;
          display: flex;
          align-items: center;
          position: relative;
          min-width: 260px;
        }
        .ev-search-icon {
          position: absolute;
          left: 14px;
          color: #94a3b8;
        }
        .ev-search-form input {
          width: 100%;
          padding: 12px 100px 12px 42px;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          font-size: 14px;
          outline: none;
          transition: border-color .15s;
        }
        .ev-search-form input:focus {
          border-color: #10b981;
        }
        .ev-search-btn {
          position: absolute;
          right: 6px;
          background: #0f766e;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
        }
        .ev-timing-select {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #f1f5f9;
          padding: 8px 14px;
          border-radius: 10px;
        }
        .timing-icon {
          color: #64748b;
        }
        .ev-timing-select select {
          background: transparent;
          border: none;
          font-weight: 700;
          font-size: 13px;
          color: #1e293b;
          outline: none;
          cursor: pointer;
        }

        .ev-categories-pills {
          display: flex;
          gap: 8px;
          margin-top: 14px;
          overflow-x: auto;
          padding-bottom: 4px;
        }
        .cat-pill {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          color: #475569;
          padding: 8px 16px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          transition: all .15s;
        }
        .cat-pill:hover {
          border-color: #cbd5e1;
          background: #f8fafc;
        }
        .cat-pill.active {
          background: #0f766e;
          color: white;
          border-color: #0f766e;
          box-shadow: 0 4px 12px rgba(15, 118, 110, 0.25);
        }

        .ev-content-container {
          max-width: 1200px;
          margin: 32px auto 0;
          padding: 0 20px;
        }
        .ev-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .ev-header-row h2 {
          font-size: 22px;
          font-weight: 800;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .ev-count-badge {
          background: #e2e8f0;
          color: #334155;
          font-size: 13px;
          padding: 2px 10px;
          border-radius: 999px;
          font-weight: 800;
        }
        .ev-active-timing-pill {
          font-size: 12px;
          font-weight: 700;
          text-transform: capitalize;
          background: #fef3c7;
          color: #92400e;
          padding: 4px 10px;
          border-radius: 8px;
        }

        .ev-loading-box {
          text-align: center;
          padding: 60px 0;
          color: #64748b;
        }
        .ev-spinner {
          width: 36px;
          height: 36px;
          border: 3px solid #e2e8f0;
          border-top-color: #10b981;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 12px;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .ev-empty-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 48px 24px;
          text-align: center;
          max-width: 520px;
          margin: 40px auto;
          box-shadow: 0 8px 24px rgba(0,0,0,0.04);
        }
        .ev-empty-icon {
          font-size: 42px;
          margin-bottom: 12px;
        }
        .ev-empty-card h3 {
          font-size: 18px;
          font-weight: 800;
          margin-bottom: 8px;
        }
        .ev-empty-card p {
          color: #64748b;
          font-size: 14px;
          line-height: 1.5;
          margin-bottom: 24px;
        }
        .ev-empty-actions {
          display: flex;
          justify-content: center;
          gap: 12px;
        }
        .btn-primary {
          background: #0f766e;
          color: white;
          border: none;
          padding: 10px 18px;
          border-radius: 10px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .btn-secondary {
          background: #f1f5f9;
          color: #334155;
          border: 1px solid #cbd5e1;
          padding: 10px 18px;
          border-radius: 10px;
          font-weight: 700;
          cursor: pointer;
        }

        .ev-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 24px;
        }

        .ev-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05);
          display: flex;
          flex-direction: column;
          transition: transform .2s ease, box-shadow .2s ease;
        }
        .ev-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 14px 30px rgba(15, 23, 42, 0.1);
        }
        .ev-card-media {
          height: 180px;
          position: relative;
          overflow: hidden;
          background: #0f172a;
        }
        .ev-card-media img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform .3s ease;
        }
        .ev-card:hover .ev-card-media img {
          transform: scale(1.04);
        }
        .ev-entry-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          padding: 5px 12px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.25);
        }
        .ev-entry-badge.free {
          background: #10b981;
          color: white;
        }
        .ev-entry-badge.paid {
          background: #f59e0b;
          color: #1e293b;
        }
        .ev-cat-badge {
          position: absolute;
          bottom: 12px;
          left: 12px;
          background: rgba(15, 23, 42, 0.85);
          color: #e2e8f0;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 6px;
          backdrop-filter: blur(4px);
        }

        .ev-card-body {
          padding: 18px;
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .ev-datetime {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #0f766e;
          font-size: 12px;
          font-weight: 800;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .ev-card-title {
          font-size: 17px;
          font-weight: 800;
          line-height: 1.35;
          margin: 0 0 8px;
        }
        .ev-card-title a {
          color: #0f172a;
          text-decoration: none;
          transition: color .15s;
        }
        .ev-card-title a:hover {
          color: #0f766e;
        }
        .ev-card-desc {
          font-size: 13px;
          color: #64748b;
          line-height: 1.5;
          margin: 0 0 16px;
          flex: 1;
        }
        .ev-card-meta {
          border-top: 1px solid #f1f5f9;
          padding-top: 12px;
          margin-bottom: 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .meta-item {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 12px;
          color: #475569;
        }
        .meta-item.organizer {
          color: #64748b;
        }
        .ev-card-footer {
          margin-top: auto;
        }
        .btn-view-details {
          display: block;
          text-align: center;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          color: #0f766e;
          padding: 10px;
          border-radius: 10px;
          font-weight: 800;
          font-size: 13px;
          text-decoration: none;
          transition: all .15s;
        }
        .btn-view-details:hover {
          background: #0f766e;
          color: white;
          border-color: #0f766e;
        }

        @media (max-width: 768px) {
          .ev-hero h1 { font-size: 28px; }
          .ev-grid { grid-template-columns: 1fr; }
          .ev-controls { flex-direction: column; align-items: stretch; }
          .ev-search-form { width: 100%; }
        }
      `}</style>
    </div>
  );
}
