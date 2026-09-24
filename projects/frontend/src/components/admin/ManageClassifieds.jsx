import { useEffect, useMemo, useState } from "react";
import { FaTag, FaCheck, FaTimes, FaTrash, FaSearch, FaYoutube, FaImage, FaMapMarkerAlt, FaPhoneAlt, FaDollarSign } from "react-icons/fa";
import supabase from "../../config/supabaseClient";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const ManageClassifieds = () => {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending"); // 'pending', 'approved', 'rejected', 'all'
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState({ msg: "", type: "info" });

  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "info" }), 3500);
  };

  const getToken = () => localStorage.getItem("token");

  const fetchAds = async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (token) {
        const res = await fetch(`${API}/admin/classifieds?status=${activeTab}&q=${encodeURIComponent(search)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setAds(data.classifieds || []);
          setLoading(false);
          return;
        }
      }

      // Supabase direct fallback
      let query = supabase
        .from("classifieds")
        .select("*")
        .order("created_at", { ascending: false });

      if (activeTab !== "all") {
        query = query.eq("status", activeTab);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAds(data || []);
    } catch (err) {
      console.error("Fetch classifieds error:", err);
      showToast(err.message || "Failed to load classifieds", "error");
      setAds([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAds();
  }, [activeTab]);

  const updateStatus = async (id, status) => {
    const confirmMsg = `Confirm to mark this classified ad as '${status.toUpperCase()}'?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const token = getToken();
      if (token) {
        const res = await fetch(`${API}/admin/classifieds/${id}/status`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        });

        if (res.ok) {
          showToast(`Classified marked as ${status} ✅`, "success");
          fetchAds();
          return;
        }
      }

      // Supabase direct fallback
      const payload =
        status === "approved"
          ? { status, approved_at: new Date().toISOString() }
          : { status, rejected_at: new Date().toISOString() };

      const { error } = await supabase.from("classifieds").update(payload).eq("id", id);
      if (error) throw error;

      showToast(`Classified marked as ${status} ✅`, "success");
      fetchAds();
    } catch (err) {
      console.error(err);
      showToast(err.message || "Update failed", "error");
    }
  };

  const deleteAd = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this classified ad?")) return;

    try {
      const token = getToken();
      if (token) {
        const res = await fetch(`${API}/admin/classifieds/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          showToast("Classified ad deleted", "success");
          fetchAds();
          return;
        }
      }

      const { error } = await supabase.from("classifieds").delete().eq("id", id);
      if (error) throw error;
      showToast("Classified ad deleted", "success");
      fetchAds();
    } catch (err) {
      showToast(err.message || "Delete failed", "error");
    }
  };

  const filteredAds = useMemo(() => {
    if (!search.trim()) return ads;
    const term = search.trim().toLowerCase();
    return ads.filter(
      (a) =>
        (a.title || "").toLowerCase().includes(term) ||
        (a.description || "").toLowerCase().includes(term) ||
        (a.category || "").toLowerCase().includes(term) ||
        (a.city || "").toLowerCase().includes(term) ||
        (a.contact_name || "").toLowerCase().includes(term)
    );
  }, [ads, search]);

  return (
    <div className="manage-classifieds-container">
      {/* Toast Notification */}
      {toast.msg && <div className={`admin-toast ${toast.type}`}>{toast.msg}</div>}

      {/* Top Header */}
      <div className="header-row">
        <div>
          <h2 className="title">Classifieds Marketplace Moderation</h2>
          <p className="subtitle">
            Review community postings, approve verified listings, and maintain a trusted marketplace.
          </p>
        </div>
        <button className="btn-refresh" onClick={fetchAds} disabled={loading}>
          ↻ Refresh
        </button>
      </div>

      {/* Controls & Filter Bar */}
      <div className="control-bar">
        <div className="tab-group">
          <button
            className={`tab-btn ${activeTab === "pending" ? "active" : ""}`}
            onClick={() => setActiveTab("pending")}
          >
            Pending Review
          </button>
          <button
            className={`tab-btn ${activeTab === "approved" ? "active" : ""}`}
            onClick={() => setActiveTab("approved")}
          >
            Approved
          </button>
          <button
            className={`tab-btn ${activeTab === "rejected" ? "active" : ""}`}
            onClick={() => setActiveTab("rejected")}
          >
            Rejected
          </button>
          <button
            className={`tab-btn ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            All Classifieds
          </button>
        </div>

        <div className="search-wrap">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search by title, category, city, or seller..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading classifieds...</p>
        </div>
      ) : filteredAds.length === 0 ? (
        <div className="empty-state">
          <FaTag className="empty-icon" />
          <h3>No classified ads found</h3>
          <p>
            {activeTab === "pending"
              ? "All pending community classifieds have been reviewed. Great job!"
              : `There are no ${activeTab} classified ads matching your criteria.`}
          </p>
        </div>
      ) : (
        <div className="ads-grid">
          {filteredAds.map((ad) => {
            const status = (ad.status || "pending").toLowerCase();
            return (
              <div key={ad.id} className="ad-card">
                <div className="ad-card-top">
                  <div className="ad-tags">
                    {ad.category && <span className="cat-pill">{ad.category}</span>}
                    {ad.sub_category && <span className="subcat-pill">{ad.sub_category}</span>}
                  </div>
                  <span className={`status-badge ${status}`}>{status}</span>
                </div>

                <h3 className="ad-title">{ad.title}</h3>

                {ad.price && (
                  <div className="price-tag">
                    <FaDollarSign className="price-icon" />
                    <span>{ad.price}</span>
                  </div>
                )}

                <p className="ad-desc">{ad.description}</p>

                <div className="ad-meta">
                  <div className="meta-item">
                    <FaMapMarkerAlt className="meta-icon" />
                    <span>
                      {[ad.city, ad.region, ad.state, ad.zip_code].filter(Boolean).join(", ") || "Location not provided"}
                    </span>
                  </div>
                  <div className="meta-item">
                    <FaPhoneAlt className="meta-icon" />
                    <span>
                      <strong>{ad.contact_name || "Seller"}</strong>
                      {ad.contact_phone ? ` • ${ad.contact_phone}` : ""}
                      {ad.contact_email ? ` • ${ad.contact_email}` : ""}
                    </span>
                  </div>
                  {ad.media_type === "video" && ad.youtube_url && (
                    <div className="meta-item">
                      <FaYoutube className="meta-icon youtube" />
                      <a href={ad.youtube_url} target="_blank" rel="noreferrer" className="media-link">
                        Watch YouTube Video ↗
                      </a>
                    </div>
                  )}
                  {ad.media_type === "image" && ad.media_url && (
                    <div className="meta-item">
                      <FaImage className="meta-icon" />
                      <a href={ad.media_url} target="_blank" rel="noreferrer" className="media-link">
                        View Attached Photo ↗
                      </a>
                    </div>
                  )}
                </div>

                <div className="ad-actions">
                  {status !== "approved" && (
                    <button
                      className="btn-action approve"
                      onClick={() => updateStatus(ad.id, "approved")}
                    >
                      <FaCheck /> Approve
                    </button>
                  )}
                  {status !== "rejected" && (
                    <button
                      className="btn-action reject"
                      onClick={() => updateStatus(ad.id, "rejected")}
                    >
                      <FaTimes /> Reject
                    </button>
                  )}
                  <button
                    className="btn-action delete"
                    onClick={() => deleteAd(ad.id)}
                    title="Delete permanently"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .manage-classifieds-container {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          max-width: 1300px;
          margin: 0 auto;
        }
        .header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }
        .title {
          font-size: 1.5rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          letter-spacing: -0.4px;
        }
        .subtitle {
          color: #64748b;
          font-size: 0.95rem;
          margin: 4px 0 0;
        }
        .btn-refresh {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #334155;
          padding: 8px 16px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-refresh:hover {
          background: #f8fafc;
          border-color: #94a3b8;
        }
        .control-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .tab-group {
          display: flex;
          background: #e2e8f0;
          padding: 4px;
          border-radius: 12px;
          gap: 4px;
        }
        .tab-btn {
          border: none;
          background: transparent;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 700;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s;
        }
        .tab-btn.active {
          background: #ffffff;
          color: #0f766e;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .search-wrap {
          position: relative;
          min-width: 300px;
          flex: 1;
          max-width: 450px;
        }
        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          font-size: 14px;
        }
        .search-wrap input {
          width: 100%;
          padding: 10px 14px 10px 38px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          font-size: 0.9rem;
          background: #ffffff;
          outline: none;
          box-sizing: border-box;
        }
        .search-wrap input:focus {
          border-color: #0f766e;
          box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.1);
        }
        .ads-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 20px;
        }
        .ad-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .ad-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(15, 23, 42, 0.06);
        }
        .ad-card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .ad-tags {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .cat-pill {
          background: #f0fdf4;
          color: #166534;
          font-size: 11px;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 999px;
        }
        .subcat-pill {
          background: #f1f5f9;
          color: #475569;
          font-size: 11px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 999px;
        }
        .status-badge {
          font-size: 10px;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 999px;
          text-transform: uppercase;
        }
        .status-badge.pending { background: #fef3c7; color: #92400e; }
        .status-badge.approved { background: #dcfce7; color: #166534; }
        .status-badge.rejected { background: #fee2e2; color: #991b1b; }
        .ad-title {
          font-size: 1.1rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 8px;
          line-height: 1.3;
        }
        .price-tag {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          font-size: 1.15rem;
          font-weight: 800;
          color: #0f766e;
          margin-bottom: 10px;
        }
        .price-icon {
          font-size: 0.9rem;
        }
        .ad-desc {
          font-size: 0.88rem;
          color: #475569;
          line-height: 1.5;
          margin: 0 0 16px;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .ad-meta {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 0.82rem;
          color: #64748b;
          border-top: 1px solid #f1f5f9;
          padding-top: 12px;
          margin-bottom: 16px;
        }
        .meta-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .meta-icon {
          color: #94a3b8;
          font-size: 12px;
        }
        .meta-icon.youtube {
          color: #ef4444;
        }
        .media-link {
          color: #2563eb;
          text-decoration: none;
          font-weight: 600;
        }
        .media-link:hover {
          text-decoration: underline;
        }
        .ad-actions {
          display: flex;
          gap: 8px;
          margin-top: auto;
          padding-top: 12px;
          border-top: 1px solid #f1f5f9;
        }
        .btn-action {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }
        .btn-action.approve {
          background: #dcfce7;
          color: #166534;
        }
        .btn-action.approve:hover {
          background: #bbf7d0;
        }
        .btn-action.reject {
          background: #fee2e2;
          color: #991b1b;
        }
        .btn-action.reject:hover {
          background: #fecaca;
        }
        .btn-action.delete {
          flex: 0 0 38px;
          background: #f1f5f9;
          color: #64748b;
        }
        .btn-action.delete:hover {
          background: #fee2e2;
          color: #ef4444;
        }
        .loading-state, .empty-state {
          text-align: center;
          padding: 60px 20px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
        }
        .empty-icon {
          font-size: 3rem;
          color: #cbd5e1;
          margin-bottom: 12px;
        }
        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e2e8f0;
          border-top-color: #0f766e;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 12px;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .admin-toast {
          position: fixed;
          bottom: 24px;
          right: 24px;
          padding: 12px 20px;
          border-radius: 10px;
          font-size: 0.9rem;
          font-weight: 700;
          z-index: 9999;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .admin-toast.success { background: #166534; color: #ffffff; }
        .admin-toast.error { background: #991b1b; color: #ffffff; }
        .admin-toast.info { background: #0f172a; color: #ffffff; }
      `}</style>
    </div>
  );
};

export default ManageClassifieds;
