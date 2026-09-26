import { useEffect, useState, useMemo } from "react";
import { FaTag, FaPlus, FaTrash, FaCheckCircle, FaImage, FaMapMarkerAlt, FaPhoneAlt, FaWhatsapp, FaInfoCircle, FaTimes, FaCamera } from "react-icons/fa";
import supabase from "../config/supabaseClient";
import { getStoredUser, getAuthToken } from "../services/authService";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const CATEGORIES = [
  "Electronics",
  "Vehicles",
  "Furniture",
  "Home Appliances",
  "Fashion",
  "Books & Hobbies",
  "Free / Donation",
];

const CONDITIONS = ["New", "Like New", "Used"];

const MyClassifieds = () => {
  const [activeTab, setActiveTab] = useState("post"); // 'post' | 'myads'
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ msg: "", type: "info" });

  const [currentUser, setCurrentUser] = useState(null);

  // Form State
  const [form, setForm] = useState({
    title: "",
    category: "Electronics",
    condition: "Used",
    price: "",
    is_free: false,
    location_city: "",
    contact_phone: "",
    contact_whatsapp: "",
    contact_name: "",
    description: "",
  });

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);

  // My Ads State
  const [myAds, setMyAds] = useState([]);
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
          contact_name: prev.contact_name || stored.name || "",
          contact_phone: prev.contact_phone || stored.phone || "",
        }));
      }
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        setCurrentUser((prev) => prev || data.session.user);
      }
    };
    initUser();
  }, []);

  const fetchMyAds = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      if (token) {
        const res = await fetch(`${API}/my-listings/classifieds`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setMyAds(data.items || []);
          setLoading(false);
          return;
        }
      }

      // Direct Supabase fallback
      const { data: sess } = await supabase.auth.getSession();
      const userId = sess?.session?.user?.id || currentUser?.id;
      if (!userId) {
        setMyAds([]);
        return;
      }

      const { data, error } = await supabase
        .from("classifieds")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMyAds(data || []);
    } catch (e) {
      console.error("Fetch my ads error:", e);
      showToast(e.message || "Failed to load listings", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "myads") {
      fetchMyAds();
    }
  }, [activeTab]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setForm((prev) => ({
        ...prev,
        [name]: checked,
        price: checked ? "0" : prev.price,
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFilesSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedFiles.length > 5) {
      showToast("Maximum 5 photos allowed per classified ad", "error");
      return;
    }

    const validFiles = [];
    const validPreviews = [];

    files.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        showToast(`Skipped ${file.name}: only images allowed`, "error");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast(`Skipped ${file.name}: exceeds 5MB size limit`, "error");
        return;
      }
      validFiles.push(file);
      validPreviews.push(URL.createObjectURL(file));
    });

    setSelectedFiles((prev) => [...prev, ...validFiles]);
    setPreviewUrls((prev) => [...prev, ...validPreviews]);
  };

  const removeImage = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (userId) => {
    const uploadedUrls = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      try {
        const ext = file.name.split(".").pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const filePath = `${userId}/${fileName}`;

        const { error: upErr } = await supabase.storage
          .from("classifieds-media")
          .upload(filePath, file, { upsert: false });

        if (!upErr) {
          const { data: pubData } = supabase.storage
            .from("classifieds-media")
            .getPublicUrl(filePath);
          if (pubData?.publicUrl) {
            uploadedUrls.push(pubData.publicUrl);
            continue;
          }
        }
      } catch (err) {
        console.warn("Direct storage upload failed, using base64 fallback:", err);
      }

      // Base64 fallback if storage bucket has issue
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
      uploadedUrls.push(base64);
    }

    return uploadedUrls;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return showToast("Product / Item title is required", "error");
    if (!form.location_city.trim()) return showToast("City is required", "error");
    if (!form.contact_phone.trim()) return showToast("Contact phone number is required", "error");
    if (!form.description.trim()) return showToast("Description is required", "error");

    setSubmitting(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const userId = sess?.session?.user?.id || currentUser?.id;
      if (!userId) {
        throw new Error("Please log in to submit a classified listing");
      }

      let imageUrls = [];
      if (selectedFiles.length > 0) {
        imageUrls = await uploadImages(userId);
      }

      const payload = {
        title: form.title.trim(),
        category: form.category,
        condition: form.condition,
        price: form.is_free ? 0 : form.price ? parseFloat(form.price) : 0,
        is_free: form.is_free,
        location_city: form.location_city.trim(),
        city: form.location_city.trim(),
        contact_phone: form.contact_phone.trim(),
        contact_whatsapp: form.contact_whatsapp.trim() || null,
        contact_name: form.contact_name.trim() || currentUser?.name || "Seller",
        description: form.description.trim(),
        images: imageUrls,
        media_url: imageUrls[0] || null,
        media_type: "image",
        status: "pending",
      };

      const token = getAuthToken();
      let saved = false;

      if (token) {
        const res = await fetch(`${API}/my-listings/classifieds`, {
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
        const supaPayload = {
          user_id: userId,
          title: payload.title,
          category: payload.category,
          price: payload.price,
          city: payload.city,
          contact_phone: payload.contact_phone,
          contact_whatsapp: payload.contact_whatsapp,
          contact_name: payload.contact_name,
          description: payload.condition ? `[Condition: ${payload.condition}] ${payload.description}` : payload.description,
          media_url: payload.media_url,
          media_type: payload.media_type,
          status: "pending",
        };
        const { error } = await supabase.from("classifieds").insert([supaPayload]);
        if (error) throw error;
      }

      showToast("Listing submitted! Pending Admin approval before going live.", "success");

      // Reset form
      setForm({
        title: "",
        category: "Electronics",
        condition: "Used",
        price: "",
        is_free: false,
        location_city: "",
        contact_phone: currentUser?.phone || "",
        contact_whatsapp: "",
        contact_name: currentUser?.name || "",
        description: "",
      });
      setSelectedFiles([]);
      setPreviewUrls([]);
      setActiveTab("myads");
    } catch (err) {
      console.error("Submission error:", err);
      showToast(err.message || "Failed to submit classified", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkSold = async (id) => {
    try {
      const token = getAuthToken();
      if (token) {
        const res = await fetch(`${API}/my-listings/classifieds/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: "sold" }),
        });
        if (res.ok) {
          showToast("Listing marked as Sold! 🎉", "success");
          fetchMyAds();
          return;
        }
      }

      const { error } = await supabase
        .from("classifieds")
        .update({ status: "sold" })
        .eq("id", id);

      if (error) throw error;
      showToast("Listing marked as Sold! 🎉", "success");
      fetchMyAds();
    } catch (err) {
      showToast(err.message || "Failed to update listing", "error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this listing?")) return;
    try {
      const token = getAuthToken();
      if (token) {
        const res = await fetch(`${API}/my-listings/classifieds/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          showToast("Listing deleted", "info");
          fetchMyAds();
          return;
        }
      }

      const { error } = await supabase.from("classifieds").delete().eq("id", id);
      if (error) throw error;
      showToast("Listing deleted", "info");
      fetchMyAds();
    } catch (err) {
      showToast(err.message || "Failed to delete listing", "error");
    }
  };

  const filteredAds = useMemo(() => {
    if (statusFilter === "all") return myAds;
    return myAds.filter((ad) => (ad.status || "pending").toLowerCase() === statusFilter);
  }, [myAds, statusFilter]);

  return (
    <div className="my-classifieds-wrap">
      {/* Toast Notification */}
      {toast.msg && <div className={`floating-toast ${toast.type}`}>{toast.msg}</div>}

      {/* Header Banner */}
      <div className="mc-header">
        <div>
          <h2>OLX-Style Classifieds Marketplace</h2>
          <p>Sell pre-owned goods, vehicles, electronics, or give items away for free in your community.</p>
        </div>
        <div className="mc-tabs">
          <button
            className={`mc-tab-btn ${activeTab === "post" ? "active" : ""}`}
            onClick={() => setActiveTab("post")}
          >
            <FaPlus /> Post an Item
          </button>
          <button
            className={`mc-tab-btn ${activeTab === "myads" ? "active" : ""}`}
            onClick={() => setActiveTab("myads")}
          >
            <FaTag /> My Listings ({myAds.length})
          </button>
        </div>
      </div>

      {/* POST AN ITEM TAB */}
      {activeTab === "post" && (
        <div className="mc-post-grid">
          <div className="mc-form-card">
            <div className="form-header">
              <h3>Post Item for Sale / Donation</h3>
              <p>Fill in details about the item. Requires Admin approval before appearing on the public page.</p>
            </div>

            <form onSubmit={handleSubmit} className="post-form">
              {/* Product Title */}
              <div className="form-group">
                <label>Product / Item Title <span className="req">*</span></label>
                <input
                  type="text"
                  name="title"
                  placeholder="e.g. Apple MacBook Air M1 (2020) 256GB Space Grey"
                  value={form.title}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {/* Category & Condition */}
              <div className="form-row">
                <div className="form-group">
                  <label>Category <span className="req">*</span></label>
                  <select name="category" value={form.category} onChange={handleInputChange}>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Condition <span className="req">*</span></label>
                  <select name="condition" value={form.condition} onChange={handleInputChange}>
                    {CONDITIONS.map((cond) => (
                      <option key={cond} value={cond}>{cond}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Price & Is Free */}
              <div className="form-row price-row">
                <div className="form-group">
                  <label>Price ($ USD) {!form.is_free && <span className="req">*</span>}</label>
                  <input
                    type="number"
                    step="0.01"
                    name="price"
                    placeholder={form.is_free ? "0.00 (Free Item)" : "e.g. 350.00"}
                    value={form.price}
                    onChange={handleInputChange}
                    disabled={form.is_free}
                    required={!form.is_free}
                  />
                </div>

                <div className="form-group checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="is_free"
                      checked={form.is_free}
                      onChange={handleInputChange}
                    />
                    <span>Mark as Free / Donation</span>
                  </label>
                  <small>Check if donating this item to community members at $0.</small>
                </div>
              </div>

              {/* Photo Upload Gallery */}
              <div className="form-group">
                <label>Item Photos (Up to 5 Photos)</label>
                <div className="photo-upload-zone">
                  <input
                    type="file"
                    id="classified-photos-input"
                    multiple
                    accept="image/*"
                    onChange={handleFilesSelect}
                  />
                  <label htmlFor="classified-photos-input" className="photo-zone-label">
                    <FaCamera className="camera-icon" />
                    <strong>Click to browse or drop photos</strong>
                    <span>Supports JPG, PNG, WebP (Max 5MB each)</span>
                  </label>
                </div>

                {previewUrls.length > 0 && (
                  <div className="previews-grid">
                    {previewUrls.map((url, idx) => (
                      <div key={idx} className="preview-item">
                        <img src={url} alt={`Preview ${idx + 1}`} />
                        <button
                          type="button"
                          className="btn-remove-img"
                          onClick={() => removeImage(idx)}
                          title="Remove photo"
                        >
                          <FaTimes />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Location & Contact */}
              <div className="form-row">
                <div className="form-group">
                  <label>City / Location <span className="req">*</span></label>
                  <input
                    type="text"
                    name="location_city"
                    placeholder="e.g. Austin, Houston, Dallas"
                    value={form.location_city}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Your Name</label>
                  <input
                    type="text"
                    name="contact_name"
                    placeholder="Seller Name"
                    value={form.contact_name}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Phone Number (Call) <span className="req">*</span></label>
                  <input
                    type="tel"
                    name="contact_phone"
                    placeholder="e.g. +1 (512) 555-0199"
                    value={form.contact_phone}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>WhatsApp Number (Optional)</label>
                  <input
                    type="tel"
                    name="contact_whatsapp"
                    placeholder="e.g. +1 (512) 555-0199"
                    value={form.contact_whatsapp}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="form-group">
                <label>Description <span className="req">*</span></label>
                <textarea
                  name="description"
                  rows="4"
                  placeholder="Describe your item, usage history, specifications, pickup details, and reason for selling..."
                  value={form.description}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <button type="submit" className="btn-submit" disabled={submitting}>
                {submitting ? "Uploading Photos & Submitting..." : "Submit Listing for Admin Approval"}
              </button>
            </form>
          </div>

          {/* Side Tips */}
          <div className="mc-tips-card">
            <h4>💡 OLX Seller Guidelines</h4>
            <ul className="tips-list">
              <li><strong>Photos sell 3x faster:</strong> Upload clear photos from multiple angles in good lighting.</li>
              <li><strong>Accurate Condition:</strong> Transparently disclose any minor scratches, dents, or wear.</li>
              <li><strong>Realistic Pricing:</strong> Compare similar items to set a competitive asking price.</li>
              <li><strong>Admin Moderation:</strong> All ads are reviewed for safety and compliance before going live.</li>
            </ul>

            <div className="safety-note">
              <FaInfoCircle className="info-icon" />
              <div>
                <strong>Community Safety</strong>
                <p>Always meet in public locations for item handoffs and never transfer funds before inspection.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MY ADS TAB */}
      {activeTab === "myads" && (
        <div className="mc-myads-wrap">
          <div className="myads-filter-bar">
            <div className="filter-pills">
              {["all", "pending", "approved", "sold", "rejected"].map((st) => (
                <button
                  key={st}
                  className={`pill-btn ${statusFilter === st ? "active" : ""}`}
                  onClick={() => setStatusFilter(st)}
                >
                  {st.charAt(0).toUpperCase() + st.slice(1)}
                </button>
              ))}
            </div>

            <button className="btn-refresh" onClick={fetchMyAds} disabled={loading}>
              ↻ Refresh
            </button>
          </div>

          {loading ? (
            <div className="loading-box">
              <div className="spinner"></div>
              <p>Loading your listings...</p>
            </div>
          ) : filteredAds.length === 0 ? (
            <div className="empty-box">
              <FaTag className="empty-icon" />
              <h3>No listings found</h3>
              <p>You haven't posted any classified items matching this filter yet.</p>
              <button className="btn-create-first" onClick={() => setActiveTab("post")}>
                Post an Item Now
              </button>
            </div>
          ) : (
            <div className="ads-cards-grid">
              {filteredAds.map((ad) => {
                const status = (ad.status || "pending").toLowerCase();
                const firstImg = (ad.images && ad.images.length > 0) ? ad.images[0] : ad.media_url;

                return (
                  <div key={ad.id} className="ad-card">
                    <div className="ad-card-thumb">
                      {firstImg ? (
                        <img src={firstImg} alt={ad.title} />
                      ) : (
                        <div className="no-thumb">
                          <FaImage />
                          <span>No photo</span>
                        </div>
                      )}
                      <span className={`status-pill ${status}`}>{status}</span>
                      {ad.condition && <span className="cond-pill">{ad.condition}</span>}
                    </div>

                    <div className="ad-card-content">
                      <div className="ad-cat">{ad.category}</div>
                      <h4 className="ad-title">{ad.title}</h4>

                      <div className="price-tag-row">
                        {ad.is_free || !ad.price || parseFloat(ad.price) === 0 ? (
                          <span className="free-badge">FREE / DONATION</span>
                        ) : (
                          <span className="price-val">${parseFloat(ad.price).toFixed(2)}</span>
                        )}
                      </div>

                      <p className="ad-desc-preview">{ad.description}</p>

                      <div className="ad-footer-meta">
                        <span className="city-meta">
                          <FaMapMarkerAlt /> {ad.location_city || ad.city || "Local"}
                        </span>
                        <span className="phone-meta">
                          <FaPhoneAlt /> {ad.contact_phone}
                        </span>
                      </div>

                      <div className="ad-actions-row">
                        {status === "approved" && (
                          <button
                            className="btn-action-sold"
                            onClick={() => handleMarkSold(ad.id)}
                            title="Mark as Sold"
                          >
                            <FaCheckCircle /> Mark Sold
                          </button>
                        )}
                        <button
                          className="btn-action-delete"
                          onClick={() => handleDelete(ad.id)}
                          title="Delete Listing"
                        >
                          <FaTrash /> Delete
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
        .my-classifieds-wrap {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          max-width: 1200px;
          margin: 0 auto;
        }
        .mc-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .mc-header h2 {
          font-size: 1.6rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 6px;
          letter-spacing: -0.4px;
        }
        .mc-header p {
          color: #64748b;
          font-size: 0.95rem;
          margin: 0;
        }
        .mc-tabs {
          display: flex;
          background: #e2e8f0;
          padding: 4px;
          border-radius: 12px;
          gap: 6px;
        }
        .mc-tab-btn {
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
        .mc-tab-btn.active {
          background: #ffffff;
          color: #0f766e;
          box-shadow: 0 2px 6px rgba(0,0,0,0.08);
        }

        /* Post Grid */
        .mc-post-grid {
          display: grid;
          grid-template-columns: 1.6fr 0.9fr;
          gap: 24px;
        }
        @media (max-width: 900px) {
          .mc-post-grid { grid-template-columns: 1fr; }
        }

        .mc-form-card {
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

        .post-form {
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
        .form-group label .req {
          color: #ef4444;
        }
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
        .checkbox-group {
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-weight: 700;
          font-size: 0.88rem;
          color: #0f766e;
        }
        .checkbox-group small {
          font-size: 0.75rem;
          color: #64748b;
          margin-top: 4px;
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
        .photo-zone-label strong {
          font-size: 0.9rem;
          color: #0f172a;
        }
        .photo-zone-label span {
          font-size: 0.78rem;
          color: #64748b;
        }

        .previews-grid {
          display: flex;
          gap: 10px;
          margin-top: 12px;
          flex-wrap: wrap;
        }
        .preview-item {
          position: relative;
          width: 80px;
          height: 80px;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #cbd5e1;
        }
        .preview-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .btn-remove-img {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 22px;
          height: 22px;
          background: rgba(15, 23, 42, 0.75);
          color: #ffffff;
          border: none;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          cursor: pointer;
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
        .btn-submit:hover {
          background: #0d9488;
        }
        .btn-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Side Tips */
        .mc-tips-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 24px;
          height: fit-content;
        }
        .mc-tips-card h4 {
          margin: 0 0 14px;
          font-size: 1.05rem;
          font-weight: 800;
          color: #0f172a;
        }
        .tips-list {
          margin: 0 0 20px;
          padding-left: 18px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          font-size: 0.88rem;
          color: #475569;
          line-height: 1.5;
        }
        .safety-note {
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
        .safety-note strong {
          display: block;
          font-size: 0.88rem;
          color: #166534;
          margin-bottom: 2px;
        }
        .safety-note p {
          margin: 0;
          font-size: 0.8rem;
          color: #14532d;
          line-height: 1.4;
        }

        /* My Ads View */
        .mc-myads-wrap {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .myads-filter-bar {
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
          transition: all 0.2s;
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

        .ads-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }
        .ad-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .ad-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(0,0,0,0.06);
        }
        .ad-card-thumb {
          position: relative;
          width: 100%;
          height: 160px;
          background: #f1f5f9;
        }
        .ad-card-thumb img {
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
        .no-thumb span { font-size: 0.75rem; font-weight: 600; }
        .status-pill {
          position: absolute;
          top: 10px;
          right: 10px;
          font-size: 10px;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 999px;
          text-transform: uppercase;
          backdrop-filter: blur(4px);
        }
        .status-pill.pending { background: rgba(254, 243, 199, 0.95); color: #92400e; }
        .status-pill.approved { background: rgba(220, 252, 231, 0.95); color: #166534; }
        .status-pill.sold { background: rgba(219, 234, 254, 0.95); color: #1e40af; }
        .status-pill.rejected { background: rgba(254, 226, 226, 0.95); color: #991b1b; }
        .cond-pill {
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

        .ad-card-content {
          padding: 16px;
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .ad-cat {
          font-size: 11px;
          font-weight: 700;
          color: #0f766e;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .ad-title {
          font-size: 1rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 8px;
          line-height: 1.3;
        }
        .price-tag-row {
          margin-bottom: 10px;
        }
        .price-val {
          font-size: 1.15rem;
          font-weight: 900;
          color: #0f172a;
        }
        .free-badge {
          background: #dcfce7;
          color: #166534;
          font-size: 11px;
          font-weight: 900;
          padding: 3px 8px;
          border-radius: 6px;
        }
        .ad-desc-preview {
          font-size: 0.82rem;
          color: #64748b;
          line-height: 1.45;
          margin: 0 0 12px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .ad-footer-meta {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          color: #94a3b8;
          border-top: 1px solid #f1f5f9;
          padding-top: 10px;
          margin-bottom: 14px;
        }
        .city-meta, .phone-meta {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .ad-actions-row {
          display: flex;
          gap: 8px;
          margin-top: auto;
        }
        .btn-action-sold {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: #1e40af;
          color: #ffffff;
          border: none;
          padding: 7px 10px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
        }
        .btn-action-delete {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: #fee2e2;
          color: #991b1b;
          border: none;
          padding: 7px 10px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
        }
        .btn-action-delete:hover { background: #fecaca; }

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

export default MyClassifieds;
