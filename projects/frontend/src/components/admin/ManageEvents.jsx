import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  FaCalendarAlt,
  FaCheck,
  FaTimes,
  FaTrash,
  FaExternalLinkAlt,
  FaSearch,
  FaClock,
  FaMapMarkerAlt,
  FaUserAlt,
} from "react-icons/fa";
import supabase from "../../config/supabaseClient";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const ManageEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending"); // 'pending', 'approved', 'all'
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState({ msg: "", type: "info" });

  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "info" }), 3500);
  };

  const getToken = () => localStorage.getItem("token");

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (token) {
        const res = await fetch(`${API}/admin/events?status=${activeTab}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setEvents(data.events || []);
          setLoading(false);
          return;
        }
      }

      // Fallback to Supabase client directly
      let query = supabase
        .from("events")
        .select("*")
        .order("created_at", { ascending: false });

      if (activeTab !== "all") {
        query = query.eq("status", activeTab);
      }

      const { data, error } = await query;
      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      showToast(err.message || "Failed to load events", "error");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [activeTab]);

  const handleUpdateStatus = async (id, newStatus) => {
    const confirmMsg = `Are you sure you want to mark this event as '${newStatus.toUpperCase()}'?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const token = getToken();
      if (token) {
        const res = await fetch(`${API}/admin/events/${id}/status`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        });

        if (res.ok) {
          showToast(`Event status updated to ${newStatus}`, "success");
          fetchEvents();
          return;
        }
      }

      // Fallback to Supabase directly
      const { error } = await supabase
        .from("events")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      showToast(`Event status updated to ${newStatus}`, "success");
      fetchEvents();
    } catch (err) {
      showToast(err.message || "Update status failed", "error");
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this event? This action cannot be undone.")) {
      return;
    }

    try {
      const token = getToken();
      if (token) {
        const res = await fetch(`${API}/admin/events/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          showToast("Event deleted successfully", "success");
          fetchEvents();
          return;
        }
      }

      // Fallback to Supabase directly
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
      showToast("Event deleted successfully", "success");
      fetchEvents();
    } catch (err) {
      showToast(err.message || "Delete failed", "error");
    }
  };

  const filteredEvents = useMemo(() => {
    if (!search.trim()) return events;
    const q = search.trim().toLowerCase();
    return events.filter(
      (e) =>
        (e.title || "").toLowerCase().includes(q) ||
        (e.venue_name || "").toLowerCase().includes(q) ||
        (e.city || "").toLowerCase().includes(q) ||
        (e.organizer_name || "").toLowerCase().includes(q) ||
        (e.category || "").toLowerCase().includes(q)
    );
  }, [events, search]);

  const pendingCount = events.filter((e) => e.status === "pending").length;

  return (
    <div className="manage-events-page">
      {/* HEADER BAR */}
      <div className="mng-header">
        <div>
          <h2>Community Events Moderation</h2>
          <p>Review, approve, or reject public event submissions and organizer schedules</p>
        </div>
        <button className="btn-refresh" onClick={fetchEvents}>
          ↻ Refresh
        </button>
      </div>

      {toast.msg && <div className={`mng-toast ${toast.type}`}>{toast.msg}</div>}

      {/* TABS & SEARCH */}
      <div className="mng-bar">
        <div className="mng-tabs">
          <button
            className={`mng-tab ${activeTab === "pending" ? "active" : ""}`}
            onClick={() => setActiveTab("pending")}
          >
            Pending Review
            {activeTab === "pending" && pendingCount > 0 && (
              <span className="count-chip">{pendingCount}</span>
            )}
          </button>
          <button
            className={`mng-tab ${activeTab === "approved" ? "active" : ""}`}
            onClick={() => setActiveTab("approved")}
          >
            Approved Events
          </button>
          <button
            className={`mng-tab ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            All Submissions
          </button>
        </div>

        <div className="mng-search-box">
          <FaSearch className="mng-search-icon" />
          <input
            type="text"
            placeholder="Search events by title, venue, or organizer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* EVENT LISTING CONTENT */}
      {loading ? (
        <div className="mng-loading">
          <div className="mng-spinner"></div>
          <p>Loading events...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="mng-empty-state">
          <FaCalendarAlt className="empty-icon" />
          <h3>No events found</h3>
          <p>
            {activeTab === "pending"
              ? "All submitted events have been reviewed! There are no pending events at this time."
              : "No events match the selected criteria."}
          </p>
        </div>
      ) : (
        <div className="mng-grid">
          {filteredEvents.map((item) => (
            <div key={item.id} className="mng-card">
              <div className="card-top">
                <img
                  src={
                    item.banner_url ||
                    "https://images.unsplash.com/photo-1511578314322-379afb476865?w=400&auto=format&fit=crop&q=60"
                  }
                  alt={item.title}
                  className="card-thumb"
                  onError={(e) => {
                    e.target.src =
                      "https://images.unsplash.com/photo-1511578314322-379afb476865?w=400&auto=format&fit=crop&q=60";
                  }}
                />
                <div className="card-top-info">
                  <div className="card-badges">
                    <span className="cat-chip">{item.category}</span>
                    <span className={`status-chip ${item.status}`}>{item.status}</span>
                  </div>
                  <h3 className="card-title">
                    <Link to={`/events/${item.id}`} target="_blank">
                      {item.title} <FaExternalLinkAlt className="external-link" />
                    </Link>
                  </h3>
                  <div className="card-meta-line">
                    <FaCalendarAlt />
                    <span>
                      {item.event_date} at {item.event_time?.slice(0, 5)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="card-details">
                <p className="card-desc">
                  {item.description?.length > 140
                    ? `${item.description.substring(0, 140)}...`
                    : item.description}
                </p>

                <div className="card-loc">
                  <FaMapMarkerAlt />
                  <span>
                    {item.venue_name}, {item.city}, {item.state}
                  </span>
                </div>

                <div className="card-organizer">
                  <FaUserAlt />
                  <span>
                    Organizer: <strong>{item.organizer_name || "Unknown"}</strong>
                    {item.organizer_email && ` (${item.organizer_email})`}
                  </span>
                </div>

                {item.registration_link && (
                  <div className="card-rsvp-link">
                    RSVP Link:{" "}
                    <a href={item.registration_link} target="_blank" rel="noreferrer">
                      {item.registration_link}
                    </a>
                  </div>
                )}
              </div>

              {/* CARD ACTIONS */}
              <div className="card-actions">
                {item.status === "pending" && (
                  <>
                    <button
                      className="btn-action approve"
                      onClick={() => handleUpdateStatus(item.id, "approved")}
                    >
                      <FaCheck /> Approve
                    </button>
                    <button
                      className="btn-action reject"
                      onClick={() => handleUpdateStatus(item.id, "rejected")}
                    >
                      <FaTimes /> Reject
                    </button>
                  </>
                )}

                {item.status === "approved" && (
                  <button
                    className="btn-action reject"
                    onClick={() => handleUpdateStatus(item.id, "rejected")}
                  >
                    <FaTimes /> Revoke Approval
                  </button>
                )}

                {item.status === "rejected" && (
                  <button
                    className="btn-action approve"
                    onClick={() => handleUpdateStatus(item.id, "approved")}
                  >
                    <FaCheck /> Re-Approve
                  </button>
                )}

                <button
                  className="btn-action delete"
                  onClick={() => handleDeleteEvent(item.id)}
                  title="Permanently Delete"
                >
                  <FaTrash /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .manage-events-page {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: #0f172a;
        }

        .mng-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .mng-header h2 {
          font-size: 22px;
          font-weight: 800;
          margin: 0 0 4px;
        }
        .mng-header p {
          color: #64748b;
          font-size: 13px;
          margin: 0;
        }
        .btn-refresh {
          background: white;
          border: 1px solid #cbd5e1;
          color: #334155;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
        }

        .mng-toast {
          padding: 12px 16px;
          border-radius: 10px;
          margin-bottom: 16px;
          font-size: 14px;
          font-weight: 700;
        }
        .mng-toast.success { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
        .mng-toast.error { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
        .mng-toast.info { background: #e0f2fe; color: #075985; border: 1px solid #7dd3fc; }

        .mng-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .mng-tabs {
          display: flex;
          gap: 8px;
          background: #e2e8f0;
          padding: 4px;
          border-radius: 10px;
        }
        .mng-tab {
          border: none;
          background: transparent;
          padding: 8px 14px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 13px;
          color: #475569;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all .15s;
        }
        .mng-tab.active {
          background: white;
          color: #0f172a;
          box-shadow: 0 2px 6px rgba(0,0,0,0.08);
        }
        .count-chip {
          background: #f59e0b;
          color: #1e293b;
          font-size: 11px;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 999px;
        }

        .mng-search-box {
          position: relative;
          min-width: 300px;
        }
        .mng-search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }
        .mng-search-box input {
          width: 100%;
          padding: 10px 14px 10px 36px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          font-size: 13px;
          outline: none;
        }

        .mng-loading, .mng-empty-state {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 60px 20px;
          text-align: center;
        }
        .mng-spinner {
          width: 36px;
          height: 36px;
          border: 3px solid #e2e8f0;
          border-top-color: #0f766e;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 12px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .empty-icon {
          font-size: 38px;
          color: #94a3b8;
          margin-bottom: 12px;
        }

        .mng-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
          gap: 20px;
        }

        .mng-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.04);
          display: flex;
          flex-direction: column;
        }

        .card-top {
          display: flex;
          gap: 12px;
          padding: 14px;
          background: #f8fafc;
          border-bottom: 1px solid #f1f5f9;
        }
        .card-thumb {
          width: 80px;
          height: 80px;
          border-radius: 10px;
          object-fit: cover;
          background: #1e293b;
          flex-shrink: 0;
        }
        .card-top-info {
          flex: 1;
          min-width: 0;
        }
        .card-badges {
          display: flex;
          gap: 6px;
          margin-bottom: 4px;
        }
        .cat-chip {
          background: #0f766e;
          color: white;
          font-size: 10px;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 4px;
          text-transform: uppercase;
        }
        .status-chip {
          font-size: 10px;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 4px;
          text-transform: uppercase;
        }
        .status-chip.pending { background: #fef3c7; color: #92400e; }
        .status-chip.approved { background: #dcfce7; color: #166534; }
        .status-chip.rejected { background: #fee2e2; color: #991b1b; }

        .card-title {
          font-size: 15px;
          font-weight: 800;
          margin: 0 0 6px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .card-title a {
          color: #0f172a;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .external-link { font-size: 11px; color: #64748b; }

        .card-meta-line {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #64748b;
          font-size: 12px;
          font-weight: 600;
        }

        .card-details {
          padding: 14px;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .card-desc {
          font-size: 12px;
          color: #475569;
          line-height: 1.5;
          margin: 0;
        }
        .card-loc, .card-organizer {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #334155;
        }
        .card-rsvp-link {
          font-size: 11px;
          color: #64748b;
          word-break: break-all;
        }
        .card-rsvp-link a { color: #0f766e; }

        .card-actions {
          padding: 12px 14px;
          background: #f8fafc;
          border-top: 1px solid #f1f5f9;
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }
        .btn-action {
          padding: 7px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          border: none;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .btn-action.approve {
          background: #10b981;
          color: white;
        }
        .btn-action.reject {
          background: #f1f5f9;
          color: #b91c1c;
          border: 1px solid #fca5a5;
        }
        .btn-action.delete {
          background: #fff5f5;
          color: #ef4444;
          border: 1px solid #fecaca;
        }
        .btn-action:hover {
          filter: brightness(0.96);
        }
      `}</style>
    </div>
  );
};

export default ManageEvents;
