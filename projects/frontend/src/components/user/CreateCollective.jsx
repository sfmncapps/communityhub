import { useState, useEffect } from "react";
import supabase from "../../config/supabaseClient";

export default function CreateCollective() {
  const [formData, setFormData] = useState({
    name: "",
    category: "IT Services",
    type: "business",
    description: "",
    city: "",
    state: "",
    country: "India",
    address: "",
    zip: "",
    website: "",
    contact_email: "",
    contact_phone: "",
    logo_url: "",
    banner_url: "",
    partners: "",
  });

  const [myCollectives, setMyCollectives] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyCollectives();
  }, []);

  const fetchMyCollectives = async () => {
    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;

      if (user) {
        const { data: colData } = await supabase
          .from("collectives")
          .select("*")
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false });

        setMyCollectives(colData || []);
      }

      // Check backend API as fallback
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const res = await fetch("http://localhost:5000/api/collectives/my", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const json = await res.json();
            if (json.collectives && json.collectives.length > 0) {
              setMyCollectives(json.collectives);
            }
          }
        } catch (apiErr) {
          console.warn("My collectives API query fallback:", apiErr.message);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);

    if (!formData.name.trim()) {
      return setMsg({ type: "error", text: "Collective / Business Name is required" });
    }

    setSubmitting(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;

      // Generate slug from name
      const baseSlug = formData.name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^\w\-]+/g, "");
      const slug = `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`;

      const partnerArray = formData.partners
        ? formData.partners.split(",").map((p) => p.trim()).filter(Boolean)
        : [];

      const payload = {
        name: formData.name,
        slug,
        type: formData.type,
        category: formData.category,
        description: formData.description,
        city: formData.city,
        state: formData.state,
        country: formData.country || "India",
        address: formData.address,
        zip: formData.zip,
        website: formData.website,
        contact_email: formData.contact_email,
        contact_phone: formData.contact_phone,
        logo_url: formData.logo_url,
        banner_url: formData.banner_url,
        partners: partnerArray,
        owner_id: user?.id || null,
        status: "pending", // Default submission status is pending approval by admin
      };

      // 1. Insert into Supabase table
      let insertedItem = null;
      if (user?.id) {
        const { data: newCol, error: insertErr } = await supabase
          .from("collectives")
          .insert([payload])
          .select()
          .single();

        if (insertErr) {
          console.warn("Supabase insert warning:", insertErr.message);
        } else {
          insertedItem = newCol;
        }
      }

      // 2. Submit to Express API if available
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const res = await fetch("http://localhost:5000/api/collectives", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(formData),
          });
          if (res.ok) {
            const apiJson = await res.json();
            if (apiJson.collective) insertedItem = apiJson.collective;
          }
        } catch (apiErr) {
          console.warn("Backend collective creation API warning:", apiErr.message);
        }
      }

      setMsg({
        type: "success",
        text: `Collective profile "${formData.name}" submitted successfully! Status is pending Admin approval.`,
      });

      // Reset form
      setFormData({
        name: "",
        category: "IT Services",
        type: "business",
        description: "",
        city: "",
        state: "",
        country: "India",
        address: "",
        zip: "",
        website: "",
        contact_email: "",
        contact_phone: "",
        logo_url: "",
        banner_url: "",
        partners: "",
      });

      fetchMyCollectives();
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const statusPills = {
    pending: { bg: "#fef3c7", text: "#b45309", label: "⏳ Pending Admin Approval" },
    approved: { bg: "#d1fae5", text: "#047857", label: "✓ Approved & Live" },
    rejected: { bg: "#ffe4e6", text: "#e11d48", label: "✖ Rejected" },
  };

  return (
    <div className="create-collective-page">
      <div className="card-container">
        <h2>🤝 Register New Collective / Business Profile</h2>
        <p className="subtitle">
          Submit your collective or business listing for directory publishing. Submissions are reviewed by Admins before publishing.
        </p>

        {msg && <div className={`alert-box ${msg.type}`}>{msg.text}</div>}

        <form onSubmit={handleSubmit} className="collective-form">
          <div className="form-grid">
            <div className="form-group">
              <label>Collective / Business Name *</label>
              <input
                type="text"
                name="name"
                placeholder="e.g. Sunrise Tech Collective"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Type</label>
              <select name="type" value={formData.type} onChange={handleChange}>
                <option value="business">Business</option>
                <option value="org">Non-Profit Organization</option>
                <option value="family">Family / Community Guild</option>
              </select>
            </div>

            <div className="form-group">
              <label>Category</label>
              <input
                type="text"
                name="category"
                placeholder="e.g. IT Services, Food & Dining, Healthcare"
                value={formData.category}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Website URL</label>
              <input
                type="url"
                name="website"
                placeholder="https://example.com"
                value={formData.website}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Contact Email</label>
              <input
                type="email"
                name="contact_email"
                placeholder="contact@collective.com"
                value={formData.contact_email}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Contact Phone</label>
              <input
                type="text"
                name="contact_phone"
                placeholder="+91 9876543210"
                value={formData.contact_phone}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>City</label>
              <input
                type="text"
                name="city"
                placeholder="e.g. Hyderabad"
                value={formData.city}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>State</label>
              <input
                type="text"
                name="state"
                placeholder="e.g. Telangana"
                value={formData.state}
                onChange={handleChange}
              />
            </div>

            <div className="form-group full-width">
              <label>Address</label>
              <input
                type="text"
                name="address"
                placeholder="Building, Street, Landmark"
                value={formData.address}
                onChange={handleChange}
              />
            </div>

            <div className="form-group full-width">
              <label>Description</label>
              <textarea
                name="description"
                rows="3"
                placeholder="Describe your collective's mission, products, or services..."
                value={formData.description}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Logo Image URL</label>
              <input
                type="url"
                name="logo_url"
                placeholder="https://example.com/logo.jpg"
                value={formData.logo_url}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Banner Image URL</label>
              <input
                type="url"
                name="banner_url"
                placeholder="https://example.com/banner.jpg"
                value={formData.banner_url}
                onChange={handleChange}
              />
            </div>

            <div className="form-group full-width">
              <label>Partners / Affiliates (Comma separated)</label>
              <input
                type="text"
                name="partners"
                placeholder="Partner A, Partner B, Sponsor C"
                value={formData.partners}
                onChange={handleChange}
              />
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting ? "Submitting Collective..." : "Submit Collective Profile"}
          </button>
        </form>
      </div>

      {/* MY SUBMITTED COLLECTIVES SECTION */}
      <div className="card-container" style={{ marginTop: 24 }}>
        <h3>My Submitted Collectives ({myCollectives.length})</h3>

        {loading ? (
          <p>Loading your collectives...</p>
        ) : myCollectives.length === 0 ? (
          <p className="empty-text">You have not submitted any collective profiles yet.</p>
        ) : (
          <div className="my-collectives-list">
            {myCollectives.map((col) => {
              const pill = statusPills[col.status] || statusPills.pending;
              return (
                <div key={col.id} className="my-col-item">
                  <div className="my-col-info">
                    <h4>{col.name}</h4>
                    <p className="meta">{col.category} | {col.city ? `${col.city}, ` : ""}{col.state}</p>
                    <p className="slug-txt">Public Slug: <code>/{col.slug}</code></p>
                  </div>
                  <span className="status-pill" style={{ backgroundColor: pill.bg, color: pill.text }}>
                    {pill.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        .create-collective-page {
          font-family: system-ui, sans-serif;
        }

        .card-container {
          background: white;
          border-radius: 14px;
          padding: 24px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 10px rgba(0,0,0,0.03);
        }

        .card-container h2, .card-container h3 {
          margin-top: 0;
          color: #0f172a;
        }

        .subtitle {
          color: #64748b;
          font-size: 13px;
          margin-bottom: 20px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group.full-width {
          grid-column: span 2;
        }

        .form-group label {
          font-size: 13px;
          font-weight: 600;
          color: #334155;
        }

        .form-group input, .form-group select, .form-group textarea {
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font-size: 14px;
          outline: none;
          font-family: inherit;
        }

        .submit-btn {
          margin-top: 20px;
          background: #0f766e;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s;
        }

        .submit-btn:hover { background: #0d9488; }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .alert-box {
          padding: 12px;
          border-radius: 8px;
          font-size: 13px;
          margin-bottom: 16px;
        }
        .alert-box.success { background: #d1fae5; color: #047857; }
        .alert-box.error { background: #ffe4e6; color: #e11d48; }

        .my-collectives-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 14px;
        }

        .my-col-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f8fafc;
          padding: 14px 18px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
        }

        .my-col-info h4 {
          margin: 0 0 4px;
          font-size: 15px;
        }

        .meta {
          margin: 0;
          font-size: 12px;
          color: #64748b;
        }

        .slug-txt {
          margin: 4px 0 0;
          font-size: 12px;
          color: #0284c7;
        }

        .status-pill {
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
        }

        .empty-text {
          color: #94a3b8;
          font-size: 13px;
        }

        @media (max-width: 768px) {
          .form-grid { grid-template-columns: 1fr; }
          .form-group.full-width { grid-column: span 1; }
        }
      `}</style>
    </div>
  );
}
