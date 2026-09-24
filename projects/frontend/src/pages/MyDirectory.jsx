import { useEffect, useState, useMemo } from "react";
import {
  FaStore,
  FaPlus,
  FaTrash,
  FaPhoneAlt,
  FaWhatsapp,
  FaMapMarkerAlt,
  FaCamera,
  FaUser,
  FaInfoCircle,
} from "react-icons/fa";
import supabase from "../config/supabaseClient";
import { getStoredUser, getAuthToken } from "../services/authService";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const VENDOR_CATEGORIES = [
  "Groceries",
  "Food & Snacks",
  "Electronics & Repair",
  "Services",
  "Retail",
  "Healthcare & Wellness",
  "Home & Garden",
];

const MyDirectory = () => {
  const [activeTab, setActiveTab] = useState("submit"); // 'submit' | 'mylistings'
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ msg: "", type: "info" });

  const [currentUser, setCurrentUser] = useState(null);

  // Form State
  const [form, setForm] = useState({
    shop_name: "",
    owner_name: "",
    category: "Groceries",
    phone_number: "",
    whatsapp_number: "",
    street_address: "",
    landmark: "",
    city: "",
    description: "",
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  // My Listings State
  const [myShops, setMyShops] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");

  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "info" }), 4000);
  };

  useEffect(() => {
    const initUser = async () => {
      const stored = getStoredUser();
      if (stored) {
        setCurrentUser(stored);
        setForm((prev) => ({
          ...prev,
          owner_name: prev.owner_name || stored.name || "",
          phone_number: prev.phone_number || stored.phone || "",
        }));
      }
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        setCurrentUser((prev) => prev || data.session.user);
      }
    };
    initUser();
  }, []);

  const fetchMyShops = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      if (token) {
        const res = await fetch(`${API}/my-listings/vendor_listings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setMyShops(data.items || []);
          setLoading(false);
          return;
        }
      }

      // Supabase direct fallback
      const { data: sess } = await supabase.auth.getSession();
      const userId = sess?.session?.user?.id || currentUser?.id;
      if (!userId) {
        setMyShops([]);
        return;
      }

      const { data, error } = await supabase
        .from("vendor_listings")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMyShops(data || []);
    } catch (e) {
      console.error("Fetch my shops error:", e);
      showToast(e.message || "Failed to load directory listings", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "mylistings") {
      fetchMyShops();
    }
  }, [activeTab]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please select a valid image file (JPEG, PNG, WebP).", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("Storefront image size must be less than 5MB.", "error");
      return;
    }

    setImageFile(file);

    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.shop_name.trim()) return showToast("Shop Name is required", "error");
    if (!form.owner_name.trim()) return showToast("Owner Name is required", "error");
    if (!form.phone_number.trim()) return showToast("Contact Phone is required", "error");
    if (!form.street_address.trim()) return showToast("Street Address is required", "error");
    if (!form.city.trim()) return showToast("City is required", "error");

    setSubmitting(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const userId = sess?.session?.user?.id || currentUser?.id;
      if (!userId) {
        throw new Error("Please log in to submit a directory listing");
      }

      let storeImageUrl = null;

      // 1. Storage Upload
      if (imageFile) {
        try {
          const safeName = `${Date.now()}_${imageFile.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;
          const filePath = `${userId}/${safeName}`;

          const { error: uploadErr } = await supabase.storage
            .from("vendor-media")
            .upload(filePath, imageFile, { upsert: true });

          if (!uploadErr) {
            const { data: pubData } = supabase.storage
              .from("vendor-media")
              .getPublicUrl(filePath);
            storeImageUrl = pubData?.publicUrl || null;
          }
        } catch (e) {
          console.warn("Storage upload notice:", e);
        }
      }

      if (!storeImageUrl && imagePreview) {
        storeImageUrl = imagePreview;
      }

      const payload = {
        shop_name: form.shop_name.trim(),
        owner_name: form.owner_name.trim(),
        category: form.category,
        phone_number: form.phone_number.trim(),
        whatsapp_number: form.whatsapp_number.trim() || null,
        street_address: form.street_address.trim(),
        landmark: form.landmark.trim() || null,
        city: form.city.trim(),
        description: form.description.trim() || null,
        store_image_url: storeImageUrl,
        status: "pending",
        user_id: userId,
      };

      const token = getAuthToken();
      let saved = false;

      if (token) {
        const res = await fetch(`${API}/my-listings/vendor_listings`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          saved = true;
        }
      }

      if (!saved) {
        const { error } = await supabase.from("vendor_listings").insert([payload]);
        if (error) throw error;
      }

      showToast("Shop listing submitted! Pending Admin verification.", "success");

      // Reset form
      setForm({
        shop_name: "",
        owner_name: currentUser?.name || "",
        category: "Groceries",
        phone_number: currentUser?.phone || "",
        whatsapp_number: "",
        street_address: "",
        landmark: "",
        city: "",
        description: "",
      });
      setImageFile(null);
      setImagePreview("");
      setActiveTab("mylistings");
    } catch (err) {
      console.error("Submission error:", err);
      showToast(err.message || "Failed to submit shop listing", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to remove this shop listing?")) return;
    try {
      const token = getAuthToken();
      if (token) {
        const res = await fetch(`${API}/my-listings/vendor_listings/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          showToast("Listing deleted", "info");
          fetchMyShops();
          return;
        }
      }

      const { error } = await supabase.from("vendor_listings").delete().eq("id", id);
      if (error) throw error;
      showToast("Listing deleted", "info");
      fetchMyShops();
    } catch (err) {
      showToast(err.message || "Failed to delete listing", "error");
    }
  };

  const filteredShops = useMemo(() => {
    if (statusFilter === "all") return myShops;
    return myShops.filter((s) => (s.status || "pending").toLowerCase() === statusFilter);
  }, [myShops, statusFilter]);

  return (
    <div className="my-directory-wrap">
      {/* Toast Notification */}
      {toast.msg && <div className={`floating-toast ${toast.type}`}>{toast.msg}</div>}

      {/* Header Banner */}
      <div className="md-header">
        <div>
          <h2>Community Business & Shop Directory</h2>
          <p>Register your local shop, artisan stall, or neighborhood service for verified community discovery.</p>
        </div>
        <div className="md-tabs">
          <button
            className={`md-tab-btn ${activeTab === "submit" ? "active" : ""}`}
            onClick={() => setActiveTab("submit")}
          >
            <FaPlus /> List New Shop
          </button>
          <button
            className={`md-tab-btn ${activeTab === "mylistings" ? "active" : ""}`}
            onClick={() => setActiveTab("mylistings")}
          >
            <FaStore /> My Submissions ({myShops.length})
          </button>
        </div>
      </div>

      {/* SUBMIT TAB */}
      {activeTab === "submit" && (
        <div className="md-grid">
          <div className="md-form-card">
            <div className="form-header">
              <h3>List Your Local Shop or Business</h3>
              <p>All community submissions are reviewed by an Admin before appearing on the public Directory page.</p>
            </div>

            <form onSubmit={handleSubmit} className="directory-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Shop / Business Name <span className="req">*</span></label>
                  <input
                    type="text"
                    name="shop_name"
                    placeholder="e.g. Sunrise Organic Grocers"
                    value={form.shop_name}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Owner / Manager Name <span className="req">*</span></label>
                  <input
                    type="text"
                    name="owner_name"
                    placeholder="e.g. Rajesh Kumar"
                    value={form.owner_name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category <span className="req">*</span></label>
                  <select name="category" value={form.category} onChange={handleInputChange}>
                    {VENDOR_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>City <span className="req">*</span></label>
                  <input
                    type="text"
                    name="city"
                    placeholder="e.g. Austin, Houston, Dallas"
                    value={form.city}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Contact Phone (Call) <span className="req">*</span></label>
                  <input
                    type="tel"
                    name="phone_number"
                    placeholder="+1 (555) 000-0000"
                    value={form.phone_number}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>WhatsApp Number (Optional)</label>
                  <input
                    type="tel"
                    name="whatsapp_number"
                    placeholder="+1 (555) 000-0000"
                    value={form.whatsapp_number}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Street Address <span className="req">*</span></label>
                <input
                  type="text"
                  name="street_address"
                  placeholder="e.g. 1204 Community Marketplace, Suite 3"
                  value={form.street_address}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Landmark (Optional)</label>
                <input
                  type="text"
                  name="landmark"
                  placeholder="e.g. Opposite Central Station, Gate 1"
                  value={form.landmark}
                  onChange={handleInputChange}
                />
              </div>

              {/* Storefront Photo */}
              <div className="form-group">
                <label>Storefront Photo / Shop Image</label>
                <div className="photo-upload-zone">
                  <input
                    type="file"
                    id="shop-photo-input"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                  <label htmlFor="shop-photo-input" className="photo-zone-label">
                    {imagePreview ? (
                      <div className="preview-wrap">
                        <img src={imagePreview} alt="Storefront preview" />
                        <span>Click to choose a different photo</span>
                      </div>
                    ) : (
                      <>
                        <FaCamera className="camera-icon" />
                        <strong>Upload Storefront Photo</strong>
                        <span>Supports JPG, PNG, WebP (Max 5MB)</span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Description & Services Offered</label>
                <textarea
                  name="description"
                  rows="3"
                  placeholder="Describe your goods, daily specials, opening timings, and services..."
                  value={form.description}
                  onChange={handleInputChange}
                />
              </div>

              <button type="submit" className="btn-submit" disabled={submitting}>
                {submitting ? "Uploading & Submitting..." : "Submit Shop for Admin Verification"}
              </button>
            </form>
          </div>

          {/* Side Info */}
          <div className="md-side-card">
            <h4>🏪 Community Directory Benefits</h4>
            <ul className="benefits-list">
              <li><strong>Local Visibility:</strong> Connect with thousands of community neighbors looking for verified local shops.</li>
              <li><strong>Direct Customer Contact:</strong> Shoppers can directly call you or message on WhatsApp with 1 tap.</li>
              <li><strong>Trust & Authenticity:</strong> Listings are verified by administrators, ensuring a trusted directory.</li>
            </ul>

            <div className="admin-step-box">
              <FaInfoCircle className="info-icon" />
              <div>
                <strong>Verification Timeline</strong>
                <p>New listings are typically reviewed and approved by community admins within 24 to 48 hours.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MY LISTINGS TAB */}
      {activeTab === "mylistings" && (
        <div className="md-mylistings-wrap">
          <div className="mylistings-filter-bar">
            <div className="filter-pills">
              {["all", "pending", "approved", "rejected"].map((st) => (
                <button
                  key={st}
                  className={`pill-btn ${statusFilter === st ? "active" : ""}`}
                  onClick={() => setStatusFilter(st)}
                >
                  {st.charAt(0).toUpperCase() + st.slice(1)}
                </button>
              ))}
            </div>

            <button className="btn-refresh" onClick={fetchMyShops} disabled={loading}>
              ↻ Refresh
            </button>
          </div>

          {loading ? (
            <div className="loading-box">
              <div className="spinner"></div>
              <p>Loading your directory submissions...</p>
            </div>
          ) : filteredShops.length === 0 ? (
            <div className="empty-box">
              <FaStore className="empty-icon" />
              <h3>No directory submissions found</h3>
              <p>Submit your local shop or business to be featured on the community directory!</p>
              <button className="btn-create-first" onClick={() => setActiveTab("submit")}>
                List Your Shop Now
              </button>
            </div>
          ) : (
            <div className="shops-cards-grid">
              {filteredShops.map((shop) => {
                const status = (shop.status || "pending").toLowerCase();

                return (
                  <div key={shop.id} className="shop-card">
                    <div className="shop-thumb-wrap">
                      {shop.store_image_url ? (
                        <img src={shop.store_image_url} alt={shop.shop_name} />
                      ) : (
                        <div className="no-thumb">
                          <FaStore />
                          <span>No Photo</span>
                        </div>
                      )}
                      <span className={`status-pill ${status}`}>{status}</span>
                      <span className="cat-pill">{shop.category}</span>
                    </div>

                    <div className="shop-card-content">
                      <h4 className="shop-title">{shop.shop_name}</h4>
                      <div className="owner-line">
                        <FaUser /> {shop.owner_name}
                      </div>

                      <p className="shop-desc">
                        {shop.description || "Neighborhood community vendor."}
                      </p>

                      <div className="shop-meta">
                        <div className="meta-line">
                          <FaMapMarkerAlt /> {shop.street_address}, {shop.city}
                        </div>
                        <div className="meta-line">
                          <FaPhoneAlt /> {shop.phone_number}
                        </div>
                      </div>

                      <div className="shop-actions">
                        <button
                          className="btn-delete"
                          onClick={() => handleDelete(shop.id)}
                          title="Delete submission"
                        >
                          <FaTrash /> Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* STYLES */}
      <style>{`
        .my-directory-wrap {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          max-width: 1200px;
          margin: 0 auto;
        }
        .md-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .md-header h2 {
          font-size: 1.6rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 6px;
          letter-spacing: -0.4px;
        }
        .md-header p {
          color: #64748b;
          font-size: 0.95rem;
          margin: 0;
        }
        .md-tabs {
          display: flex;
          background: #e2e8f0;
          padding: 4px;
          border-radius: 12px;
          gap: 6px;
        }
        .md-tab-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: none;
          padding: 9px 18px;
          border-radius: 9px;
          font-size: 0.88rem;
          font-weight: 700;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s;
        }
        .md-tab-btn.active {
          background: #ffffff;
          color: #0f766e;
          box-shadow: 0 2px 6px rgba(0,0,0,0.08);
        }

        .md-grid {
          display: grid;
          grid-template-columns: 1.6fr 0.9fr;
          gap: 24px;
        }
        @media (max-width: 900px) {
          .md-grid { grid-template-columns: 1fr; }
        }

        .md-form-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.02);
        }
        .form-header {
          margin-bottom: 20px;
          padding-bottom: 14px;
          border-bottom: 1px solid #f1f5f9;
        }
        .form-header h3 {
          margin: 0 0 4px;
          font-size: 1.25rem;
          font-weight: 800;
          color: #0f172a;
        }
        .form-header p {
          margin: 0;
          font-size: 0.88rem;
          color: #64748b;
        }

        .directory-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        @media (max-width: 550px) {
          .form-row { grid-template-columns: 1fr; }
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-group label {
          font-size: 0.85rem;
          font-weight: 700;
          color: #334155;
        }
        .form-group label .req { color: #ef4444; }
        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 10px 14px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          font-size: 0.92rem;
          background: #ffffff;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          border-color: #0f766e;
          box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.1);
        }

        .photo-upload-zone {
          border: 2px dashed #cbd5e1;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
          background: #f8fafc;
          position: relative;
          cursor: pointer;
        }
        .photo-upload-zone input {
          position: absolute;
          inset: 0;
          opacity: 0;
          cursor: pointer;
          width: 100%;
          height: 100%;
        }
        .photo-zone-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          cursor: pointer;
        }
        .camera-icon {
          font-size: 26px;
          color: #0f766e;
          margin-bottom: 4px;
        }
        .preview-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }
        .preview-wrap img {
          max-height: 120px;
          border-radius: 8px;
          object-fit: cover;
        }
        .preview-wrap span {
          font-size: 0.8rem;
          color: #0f766e;
          font-weight: 600;
        }

        .btn-submit {
          background: #0f766e;
          color: #ffffff;
          border: none;
          padding: 14px 20px;
          border-radius: 10px;
          font-size: 0.95rem;
          font-weight: 800;
          cursor: pointer;
          margin-top: 8px;
          transition: background 0.2s;
        }
        .btn-submit:hover { background: #0d9488; }
        .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }

        .md-side-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 24px;
          height: fit-content;
        }
        .md-side-card h4 {
          margin: 0 0 14px;
          font-size: 1.05rem;
          font-weight: 800;
          color: #0f172a;
        }
        .benefits-list {
          margin: 0 0 20px;
          padding-left: 18px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          font-size: 0.88rem;
          color: #475569;
          line-height: 1.5;
        }
        .admin-step-box {
          display: flex;
          gap: 12px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          padding: 14px;
          border-radius: 10px;
        }
        .info-icon {
          color: #166534;
          font-size: 20px;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .admin-step-box strong {
          display: block;
          font-size: 0.88rem;
          color: #166534;
          margin-bottom: 2px;
        }
        .admin-step-box p {
          margin: 0;
          font-size: 0.8rem;
          color: #14532d;
          line-height: 1.4;
        }

        /* My Listings View */
        .md-mylistings-wrap {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .mylistings-filter-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .filter-pills {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .pill-btn {
          border: 1px solid #cbd5e1;
          background: #ffffff;
          padding: 6px 14px;
          border-radius: 999px;
          font-size: 0.82rem;
          font-weight: 700;
          color: #475569;
          cursor: pointer;
        }
        .pill-btn.active {
          background: #0f766e;
          color: #ffffff;
          border-color: #0f766e;
        }
        .btn-refresh {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #334155;
          padding: 6px 14px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.82rem;
          cursor: pointer;
        }

        .shops-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }
        .shop-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }
        .shop-thumb-wrap {
          position: relative;
          width: 100%;
          height: 160px;
          background: #f1f5f9;
        }
        .shop-thumb-wrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .no-thumb {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          color: #94a3b8;
          font-size: 1.5rem;
        }
        .status-pill {
          position: absolute;
          top: 10px;
          right: 10px;
          font-size: 10px;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 999px;
          text-transform: uppercase;
        }
        .status-pill.pending { background: #fef3c7; color: #92400e; }
        .status-pill.approved { background: #dcfce7; color: #166534; }
        .status-pill.rejected { background: #fee2e2; color: #991b1b; }
        .cat-pill {
          position: absolute;
          bottom: 10px;
          left: 10px;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 4px;
          background: rgba(15, 23, 42, 0.8);
          color: #ffffff;
        }

        .shop-card-content {
          padding: 16px;
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .shop-title {
          font-size: 1.05rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 4px;
        }
        .owner-line {
          font-size: 0.8rem;
          color: #0f766e;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 10px;
        }
        .shop-desc {
          font-size: 0.82rem;
          color: #64748b;
          line-height: 1.45;
          margin: 0 0 12px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .shop-meta {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 0.78rem;
          color: #64748b;
          border-top: 1px solid #f1f5f9;
          padding-top: 10px;
          margin-bottom: 14px;
        }
        .meta-line {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .shop-actions {
          margin-top: auto;
          display: flex;
          justify-content: flex-end;
        }
        .btn-delete {
          background: #fee2e2;
          color: #991b1b;
          border: none;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .btn-delete:hover { background: #fecaca; }

        .loading-box, .empty-box {
          text-align: center;
          padding: 60px 20px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
        }
        .empty-icon {
          font-size: 2.8rem;
          color: #cbd5e1;
          margin-bottom: 12px;
        }
        .btn-create-first {
          margin-top: 16px;
          background: #0f766e;
          color: #ffffff;
          border: none;
          padding: 10px 20px;
          border-radius: 10px;
          font-weight: 700;
          cursor: pointer;
        }
        .spinner {
          width: 30px;
          height: 30px;
          border: 3px solid #e2e8f0;
          border-top-color: #0f766e;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 12px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .floating-toast {
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
        .floating-toast.success { background: #166534; color: #ffffff; }
        .floating-toast.error { background: #991b1b; color: #ffffff; }
        .floating-toast.info { background: #0f172a; color: #ffffff; }
      `}</style>
    </div>
  );
};

export default MyDirectory;
