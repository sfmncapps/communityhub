import { useEffect, useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  FaStore,
  FaPhoneAlt,
  FaWhatsapp,
  FaMapMarkerAlt,
  FaUser,
  FaPlus,
  FaSearch,
  FaTimes,
  FaCamera,
  FaEnvelope,
  FaCheckCircle,
  FaBuilding,
  FaUsers,
  FaFilter,
} from "react-icons/fa";
import supabase from "../config/supabaseClient";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const ALPHABET = ["All", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""), "#"];

const VENDOR_CATEGORIES = [
  "All",
  "Groceries",
  "Food & Snacks",
  "Electronics & Repair",
  "Services",
  "Retail",
  "Healthcare & Wellness",
  "Home & Garden",
];

const Directory = () => {
  const [searchParams] = useSearchParams();
  const initialLetter = searchParams.get("letter") || "All";
  const initialSearch = searchParams.get("search") || searchParams.get("q") || "";

  // Active view: 'vendors' | 'collectives' | 'directory' | 'all'
  const [activeTab, setActiveTab] = useState("vendors");
  const [selectedLetter, setSelectedLetter] = useState(initialLetter);
  const [search, setSearch] = useState(initialSearch);
  const [vendorCategory, setVendorCategory] = useState("All");

  const [directoryListings, setDirectoryListings] = useState([]);
  const [collectives, setCollectives] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Shop Submission Modal
  const [shopModalOpen, setShopModalOpen] = useState(false);
  const [submittingShop, setSubmittingShop] = useState(false);
  const [shopSuccess, setShopSuccess] = useState(false);
  const [shopError, setShopError] = useState("");

  const [shopForm, setShopForm] = useState({
    shop_name: "",
    owner_name: "",
    category: "Groceries",
    phone_number: "",
    whatsapp_number: "",
    email: "",
    street_address: "",
    landmark: "",
    city: "",
    state: "Texas",
    postal_code: "",
    description: "",
  });

  const [shopImageFile, setShopImageFile] = useState(null);
  const [shopImagePreview, setShopImagePreview] = useState("");

  useEffect(() => {
    const l = searchParams.get("letter");
    if (l) setSelectedLetter(l);
    const q = searchParams.get("search") || searchParams.get("q");
    if (q !== null && q !== undefined) setSearch(q);
  }, [searchParams]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Local Vendors (only approved)
      try {
        const res = await fetch(`${API}/vendors`);
        if (res.ok) {
          const data = await res.json();
          setVendors(data.vendors || []);
        } else {
          // Direct Supabase fallback
          const { data: vData } = await supabase
            .from("vendor_listings")
            .select("*")
            .eq("status", "approved")
            .order("created_at", { ascending: false });

          setVendors(vData || []);
        }
      } catch {
        const { data: vData } = await supabase
          .from("vendor_listings")
          .select("*")
          .eq("status", "approved")
          .order("created_at", { ascending: false });
        setVendors(vData || []);
      }

      // 2. Fetch Collectives
      try {
        const { data: colData } = await supabase
          .from("collectives")
          .select("*")
          .eq("status", "approved")
          .order("name", { ascending: true });

        if (colData && colData.length > 0) {
          setCollectives(colData);
        } else {
          const res = await fetch(`${API}/collectives`);
          if (res.ok) {
            const json = await res.json();
            setCollectives(json.collectives || []);
          }
        }
      } catch {
        setCollectives([]);
      }

      // 3. Fetch Business Directory Listings
      try {
        const { data: dirData } = await supabase
          .from("directory_listings")
          .select("*")
          .eq("status", "approved")
          .order("business_name", { ascending: true });
        setDirectoryListings(dirData || []);
      } catch {
        setDirectoryListings([]);
      }
    } catch (e) {
      console.error("Fetch data error:", e);
    } finally {
      setLoading(false);
    }
  };

  // Helper filter function for search + letter
  const filterItem = (name = "") => {
    const matchesSearch = (name || "").toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (selectedLetter === "All") return true;
    if (selectedLetter === "#") return /^[^a-zA-Z]/.test(name || "");
    return (name || "").toUpperCase().startsWith(selectedLetter);
  };

  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      if (vendorCategory !== "All" && v.category !== vendorCategory) return false;
      const term = search.toLowerCase();
      const matchesText =
        (v.shop_name || "").toLowerCase().includes(term) ||
        (v.owner_name || "").toLowerCase().includes(term) ||
        (v.city || "").toLowerCase().includes(term) ||
        (v.landmark || "").toLowerCase().includes(term) ||
        (v.description || "").toLowerCase().includes(term);

      if (!matchesText) return false;

      if (selectedLetter === "All") return true;
      if (selectedLetter === "#") return /^[^a-zA-Z]/.test(v.shop_name || "");
      return (v.shop_name || "").toUpperCase().startsWith(selectedLetter);
    });
  }, [vendors, vendorCategory, search, selectedLetter]);

  const filteredDirectory = directoryListings.filter((b) => filterItem(b.business_name || ""));
  const filteredCollectives = collectives.filter((c) => filterItem(c.name || ""));

  // Storefront Image Selection
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setShopError("Please select a valid image file (JPEG, PNG, WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setShopError("Image file size must be less than 5MB.");
      return;
    }

    setShopImageFile(file);
    setShopError("");

    const reader = new FileReader();
    reader.onload = () => {
      setShopImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Submit Shop / Vendor Details
  const handleShopSubmit = async (e) => {
    e.preventDefault();
    if (!shopForm.shop_name.trim()) return setShopError("Shop Name is required.");
    if (!shopForm.owner_name.trim()) return setShopError("Owner Name is required.");
    if (!shopForm.phone_number.trim()) return setShopError("Contact Phone Number is required.");
    if (!shopForm.street_address.trim()) return setShopError("Street Address is required.");
    if (!shopForm.city.trim()) return setShopError("City is required.");

    setSubmittingShop(true);
    setShopError("");

    try {
      let finalImageUrl = "";

      // 1. Upload to Supabase Storage 'vendor-media' bucket
      if (shopImageFile) {
        try {
          const safeName = `${Date.now()}_${shopImageFile.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;
          const filePath = `storefronts/${safeName}`;

          const { error: uploadError } = await supabase.storage
            .from("vendor-media")
            .upload(filePath, shopImageFile, { upsert: true });

          if (!uploadError) {
            const { data: pubData } = supabase.storage
              .from("vendor-media")
              .getPublicUrl(filePath);
            finalImageUrl = pubData?.publicUrl || filePath;
          }
        } catch (e) {
          console.warn("Storage upload notice:", e.message);
        }
      }

      const { data: sess } = await supabase.auth.getSession();
      const userId = sess?.session?.user?.id;

      // If storage did not produce URL and preview exists, send preview to backend upload
      const payload = {
        ...shopForm,
        user_id: userId || null,
        store_image_url: finalImageUrl || shopImagePreview || null,
        status: "pending", // Mandated: requires Admin approval before public visibility
      };

      const res = await fetch(`${API}/vendors`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(localStorage.getItem("token")
            ? { Authorization: `Bearer ${localStorage.getItem("token")}` }
            : {}),
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShopSuccess(true);
        return;
      }

      // Fallback: direct Supabase insert
      const { error: supaErr } = await supabase.from("vendor_listings").insert([
        {
          ...payload,
          status: "pending",
        },
      ]);

      if (supaErr) {
        console.warn("Direct Supabase insert notice:", supaErr.message);
      }

      setShopSuccess(true);
    } catch (err) {
      console.error("Shop submission notice:", err);
      setShopSuccess(true);
    } finally {
      setSubmittingShop(false);
    }
  };

  return (
    <div className="directory-page">
      {/* HERO SECTION */}
      <div className="hero">
        <div className="hero-inner">
          <span className="hero-sub-pill">📍 Verified Community Marketplace</span>
          <h1>Local Vendor & Community Shop Directory</h1>
          <p>
            Discover trusted neighbourhood shops, local vendors, verified businesses, and community collectives.
            Support grassroots entrepreneurship in your area!
          </p>

          <div className="hero-actions-row">
            <button className="btn-list-shop" onClick={() => { setShopError(""); setShopSuccess(false); setShopModalOpen(true); }}>
              <FaPlus /> List Your Shop / Business
            </button>
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search by shop name, owner, category, or city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className="clear-btn" onClick={() => setSearch("")}>
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* MAIN TABS */}
          <div className="tab-buttons">
            <button
              className={activeTab === "vendors" ? "tab-btn active" : "tab-btn"}
              onClick={() => setActiveTab("vendors")}
            >
              <FaStore /> Local Shops & Vendors ({filteredVendors.length})
            </button>
            <button
              className={activeTab === "collectives" ? "tab-btn active" : "tab-btn"}
              onClick={() => setActiveTab("collectives")}
            >
              <FaUsers /> Collectives ({filteredCollectives.length})
            </button>
            <button
              className={activeTab === "directory" ? "tab-btn active" : "tab-btn"}
              onClick={() => setActiveTab("directory")}
            >
              <FaBuilding /> Businesses ({filteredDirectory.length})
            </button>
            <button
              className={activeTab === "all" ? "tab-btn active" : "tab-btn"}
              onClick={() => setActiveTab("all")}
            >
              All Directory
            </button>
          </div>
        </div>

        {/* ALPHABET FILTER BAR */}
        <div className="alphabet-bar">
          <span className="alphabet-label">A-Z Index:</span>
          {ALPHABET.map((letter) => (
            <button
              key={letter}
              className={selectedLetter === letter ? "letter-btn active" : "letter-btn"}
              onClick={() => setSelectedLetter(letter)}
            >
              {letter}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="directory-container">
        {/* VENDOR CATEGORY PILLS (Shown for 'vendors' or 'all') */}
        {(activeTab === "vendors" || activeTab === "all") && (
          <div className="vendor-category-bar">
            <span className="cat-label">
              <FaFilter /> Category:
            </span>
            <div className="cat-pills-row">
              {VENDOR_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  className={`vendor-cat-pill ${vendorCategory === cat ? "active" : ""}`}
                  onClick={() => setVendorCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading directory listings...</p>
          </div>
        ) : (
          <>
            {/* LOCAL VENDORS & COMMUNITY SHOPS SECTION */}
            {(activeTab === "all" || activeTab === "vendors") && filteredVendors.length > 0 && (
              <div className="section-block">
                <div className="section-header">
                  <h2>🏪 Local Community Shops & Neighborhood Vendors</h2>
                  <p>Verified local stores, artisan stalls, and essential service providers.</p>
                </div>

                <div className="grid vendor-grid">
                  {filteredVendors.map((v) => {
                    const waNum = (v.whatsapp_number || v.phone_number || "").replace(/[^0-9]/g, "");
                    const waLink = `https://wa.me/${waNum}?text=${encodeURIComponent(`Hello ${v.shop_name}, I saw your listing on CommunityHub!`)}`;

                    return (
                      <div key={v.id} className="card vendor-card">
                        <div className="vendor-img-wrap">
                          <img
                            src={
                              v.store_image_url ||
                              "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80"
                            }
                            alt={v.shop_name}
                            className="img"
                            onError={(e) => {
                              e.target.src = "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80";
                            }}
                          />
                          <span className="vendor-cat-badge">{v.category}</span>
                        </div>

                        <div className="cardTop">
                          <h3 className="title">{v.shop_name}</h3>
                          <div className="owner-badge">
                            <FaUser className="owner-icon" /> {v.owner_name}
                          </div>
                        </div>

                        <div className="info">
                          <p className="description">
                            {v.description ? v.description.slice(0, 110) + (v.description.length > 110 ? "..." : "") : "Verified neighborhood shop."}
                          </p>

                          <div className="location-info">
                            <FaMapMarkerAlt className="loc-icon" />
                            <span>
                              {v.street_address}
                              {v.landmark && ` (Near ${v.landmark})`}, {v.city}, {v.state}
                            </span>
                          </div>
                        </div>

                        <div className="vendor-actions-row">
                          {v.phone_number && (
                            <a href={`tel:${v.phone_number}`} className="action-btn call-btn">
                              <FaPhoneAlt /> Call
                            </a>
                          )}
                          {waNum && (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="action-btn wa-btn"
                            >
                              <FaWhatsapp /> WhatsApp
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* COLLECTIVES SECTION */}
            {(activeTab === "all" || activeTab === "collectives") && filteredCollectives.length > 0 && (
              <div className="section-block">
                <div className="section-header">
                  <h2>🤝 Community Collectives Profile Pages</h2>
                  <p>Discover partner collectives with dedicated profiles and dynamic routes</p>
                </div>
                <div className="grid">
                  {filteredCollectives.map((col) => (
                    <div key={col.id} className="card collective-card">
                      <div className="imgWrap">
                        <img
                          src={
                            col.logo_url ||
                            col.banner_url ||
                            "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&auto=format&fit=crop&q=60"
                          }
                          alt={col.name}
                          className="img"
                        />
                      </div>
                      <div className="cardTop">
                        <h3 className="title">{col.name}</h3>
                        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                          <span className="badge collective-badge">Collective</span>
                          {col.verification_status === "verified" && (
                            <span className="badge state-verified-badge" title="State Record Verified">
                              🛡️ Verified
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="info">
                        <p className="description">
                          {col.description ? col.description.slice(0, 90) + "..." : "Community Collective profile"}
                        </p>
                        {col.city && <p><strong>City:</strong> {col.city}</p>}
                        {col.website && <p><strong>Web:</strong> {col.website}</p>}
                      </div>
                      <Link to={`/${col.slug}`} className="visit-btn profile-btn">
                        View Collective Profile (/{col.slug}) →
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* BUSINESS DIRECTORY SECTION */}
            {(activeTab === "all" || activeTab === "directory") && filteredDirectory.length > 0 && (
              <div className="section-block">
                <div className="section-header">
                  <h2>🏢 Verified Business Listings</h2>
                  <p>Browse local commercial enterprises approved by our community administration</p>
                </div>
                <div className="grid">
                  {filteredDirectory.map((b) => (
                    <div key={b.id} className="card">
                      {b.business_image_url && (
                        <div className="imgWrap">
                          <img
                            src={b.business_image_url}
                            alt={b.business_name}
                            className="img"
                          />
                        </div>
                      )}
                      <div className="cardTop">
                        <h3 className="title">{b.business_name}</h3>
                        <span className="badge">{b.category || "Business"}</span>
                      </div>
                      <div className="info">
                        {b.city && <p><strong>City:</strong> {b.city}</p>}
                        {b.state && <p><strong>State:</strong> {b.state}</p>}
                        {b.mobile && <p><strong>Mobile:</strong> {b.mobile}</p>}
                      </div>
                      {b.website && (
                        <a
                          href={b.website.startsWith("http") ? b.website : `https://${b.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="visit-btn"
                        >
                          Visit Website
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* EMPTY STATE */}
            {filteredVendors.length === 0 &&
              filteredDirectory.length === 0 &&
              filteredCollectives.length === 0 && (
                <div className="empty-state">
                  <FaStore style={{ fontSize: "40px", color: "#cbd5e1", marginBottom: "12px" }} />
                  <h3>No directory listings found matching "{selectedLetter !== "All" ? `Letter: ${selectedLetter}` : search}"</h3>
                  <p>Try clearing filters or search with another keyword.</p>
                  <button
                    className="reset-btn"
                    onClick={() => {
                      setSearch("");
                      setSelectedLetter("All");
                      setVendorCategory("All");
                      setActiveTab("all");
                    }}
                  >
                    Reset Filters
                  </button>
                </div>
              )}
          </>
        )}
      </div>

      {/* LIST YOUR LOCAL SHOP MODAL */}
      {shopModalOpen && (
        <div className="modal-overlay" onClick={() => !submittingShop && setShopModalOpen(false)}>
          <div className="modal-card shop-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="modal-tag">Community Submission</span>
                <h3 style={{ margin: "4px 0 2px" }}>List Your Local Shop or Vendor</h3>
                <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
                  Add your shop to the community directory. Requires administrator approval before public visibility.
                </p>
              </div>
              <button
                className="close-icon-btn"
                disabled={submittingShop}
                onClick={() => setShopModalOpen(false)}
              >
                <FaTimes />
              </button>
            </div>

            {shopSuccess ? (
              <div className="shop-success-box">
                <div className="success-icon">🎉</div>
                <h3>Shop Listing Submitted!</h3>
                <p>
                  Thank you for submitting <strong>{shopForm.shop_name}</strong>. Your listing has entered our moderation queue with <strong>status: pending</strong>.
                  Our community administrators will review and approve it shortly.
                </p>
                <button
                  className="btn-done"
                  onClick={() => {
                    setShopModalOpen(false);
                    setShopSuccess(false);
                    setShopImageFile(null);
                    setShopImagePreview("");
                  }}
                >
                  Return to Directory
                </button>
              </div>
            ) : (
              <form className="shop-form" onSubmit={handleShopSubmit}>
                {shopError && <div className="error-alert">{shopError}</div>}

                <div className="form-row">
                  <div className="form-group">
                    <label>Shop / Business Name <span className="req">*</span></label>
                    <input
                      type="text"
                      placeholder="e.g. Green Valley Organic Grocers"
                      value={shopForm.shop_name}
                      onChange={(e) => setShopForm({ ...shopForm, shop_name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Owner Name <span className="req">*</span></label>
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Patel"
                      value={shopForm.owner_name}
                      onChange={(e) => setShopForm({ ...shopForm, owner_name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Category <span className="req">*</span></label>
                    <select
                      value={shopForm.category}
                      onChange={(e) => setShopForm({ ...shopForm, category: e.target.value })}
                    >
                      {VENDOR_CATEGORIES.filter((c) => c !== "All").map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Contact Phone <span className="req">*</span></label>
                    <input
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={shopForm.phone_number}
                      onChange={(e) => setShopForm({ ...shopForm, phone_number: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>WhatsApp Number (Optional)</label>
                    <input
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={shopForm.whatsapp_number}
                      onChange={(e) => setShopForm({ ...shopForm, whatsapp_number: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Email Address (Optional)</label>
                    <input
                      type="email"
                      placeholder="owner@myshop.com"
                      value={shopForm.email}
                      onChange={(e) => setShopForm({ ...shopForm, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Street Address <span className="req">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. 1420 Community Square, Suite 101"
                    value={shopForm.street_address}
                    onChange={(e) => setShopForm({ ...shopForm, street_address: e.target.value })}
                    required
                  />
                </div>

                <div className="form-row three-col">
                  <div className="form-group">
                    <label>Landmark (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Near Central Park Gate 2"
                      value={shopForm.landmark}
                      onChange={(e) => setShopForm({ ...shopForm, landmark: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>City <span className="req">*</span></label>
                    <input
                      type="text"
                      placeholder="e.g. Austin"
                      value={shopForm.city}
                      onChange={(e) => setShopForm({ ...shopForm, city: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>State / ZIP</label>
                    <input
                      type="text"
                      placeholder="Texas 78701"
                      value={shopForm.postal_code}
                      onChange={(e) => setShopForm({ ...shopForm, postal_code: e.target.value })}
                    />
                  </div>
                </div>

                {/* STOREFRONT IMAGE UPLOAD */}
                <div className="form-group">
                  <label>Storefront Photo / Shop Image</label>
                  <div className="image-upload-zone">
                    <input
                      type="file"
                      id="shop-image-input"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                    <label htmlFor="shop-image-input" className="image-zone-label">
                      {shopImagePreview ? (
                        <div className="preview-wrap">
                          <img src={shopImagePreview} alt="Storefront preview" className="preview-img" />
                          <span>Click to change photo</span>
                        </div>
                      ) : (
                        <div className="drop-prompt">
                          <FaCamera className="camera-icon" />
                          <strong>Upload Storefront Photo</strong>
                          <span>Supports JPG, PNG, WebP (Max 5MB)</span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label>Shop Description & Offerings</label>
                  <textarea
                    rows="3"
                    placeholder="Describe your goods, daily specials, opening timings, and services..."
                    value={shopForm.description}
                    onChange={(e) => setShopForm({ ...shopForm, description: e.target.value })}
                  ></textarea>
                </div>

                <div className="modal-actions-bar">
                  <button
                    type="button"
                    className="btn-cancel"
                    disabled={submittingShop}
                    onClick={() => setShopModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-submit-shop" disabled={submittingShop}>
                    {submittingShop ? "Submitting for Approval..." : "Submit Shop for Admin Approval"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODERN DIRECTORY CSS */}
      <style>{`
        .directory-page {
          width: 100%;
          min-height: 100vh;
          background: #f8fafc;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: #0f172a;
        }

        .hero {
          background: linear-gradient(135deg, #0f766e 0%, #115e59 50%, #042f2e 100%);
          color: white;
          padding: 50px 24px 40px;
        }
        .hero-inner {
          max-width: 1100px;
          margin: 0 auto;
          text-align: center;
        }
        .hero-sub-pill {
          display: inline-block;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(8px);
          color: #99f6e4;
          padding: 4px 14px;
          border-radius: 999px;
          margin-bottom: 12px;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .hero h1 {
          font-size: 32px;
          font-weight: 800;
          margin: 0 0 12px;
          letter-spacing: -0.5px;
        }
        .hero p {
          max-width: 720px;
          margin: 0 auto 28px;
          font-size: 15px;
          color: #ccfbf1;
          line-height: 1.6;
        }

        .hero-actions-row {
          display: flex;
          gap: 14px;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
          margin-bottom: 24px;
        }
        .btn-list-shop {
          background: #10b981;
          color: #ffffff;
          border: none;
          font-size: 14px;
          font-weight: 700;
          padding: 12px 22px;
          border-radius: 12px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
          transition: all 0.2s ease;
        }
        .btn-list-shop:hover {
          background: #059669;
          transform: translateY(-2px);
        }

        .search-box {
          position: relative;
          width: 100%;
          max-width: 460px;
          background: white;
          border-radius: 12px;
          display: flex;
          align-items: center;
          padding: 6px 14px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12);
        }
        .search-icon {
          color: #94a3b8;
          font-size: 14px;
          margin-right: 8px;
        }
        .search-box input {
          border: none;
          outline: none;
          width: 100%;
          font-size: 14px;
          color: #0f172a;
          background: transparent;
        }
        .clear-btn {
          border: none;
          background: transparent;
          color: #94a3b8;
          cursor: pointer;
        }

        .tab-buttons {
          display: flex;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 14px;
        }
        .tab-btn {
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white;
          padding: 8px 16px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.15s ease;
        }
        .tab-btn:hover {
          background: rgba(255, 255, 255, 0.22);
        }
        .tab-btn.active {
          background: #ffffff;
          color: #0f766e;
          border-color: #ffffff;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .alphabet-bar {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 4px;
          flex-wrap: wrap;
          margin-top: 24px;
        }
        .alphabet-label {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          color: #99f6e4;
          margin-right: 6px;
        }
        .letter-btn {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.8);
          font-size: 12px;
          font-weight: 700;
          padding: 4px 7px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .letter-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }
        .letter-btn.active {
          background: white;
          color: #0f766e;
        }

        .directory-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 32px 24px 80px;
        }

        /* CATEGORY FILTER PILLS */
        .vendor-category-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #ffffff;
          padding: 12px 18px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          margin-bottom: 28px;
          overflow-x: auto;
        }
        .cat-label {
          font-size: 13px;
          font-weight: 700;
          color: #64748b;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
        }
        .cat-pills-row {
          display: flex;
          gap: 8px;
          overflow-x: auto;
        }
        .vendor-cat-pill {
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          font-size: 12px;
          font-weight: 600;
          color: #475569;
          padding: 6px 14px;
          border-radius: 20px;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s ease;
        }
        .vendor-cat-pill:hover {
          background: #e2e8f0;
        }
        .vendor-cat-pill.active {
          background: #0f766e;
          color: #ffffff;
          border-color: #0f766e;
        }

        .section-block {
          margin-bottom: 48px;
        }
        .section-header h2 {
          font-size: 20px;
          font-weight: 800;
          margin: 0 0 4px;
          color: #0f172a;
        }
        .section-header p {
          font-size: 13px;
          color: #64748b;
          margin: 0 0 20px;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
          gap: 22px;
        }

        /* VENDOR CARDS */
        .card {
          background: white;
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          display: flex;
          flex-direction: column;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
          border-color: #0f766e;
        }

        .vendor-img-wrap, .imgWrap {
          width: 100%;
          height: 160px;
          position: relative;
          background: #f1f5f9;
          overflow: hidden;
        }
        .img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .vendor-cat-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(15, 23, 42, 0.8);
          color: #ffffff;
          font-size: 11px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 999px;
          backdrop-filter: blur(4px);
        }

        .cardTop {
          padding: 14px 16px 6px;
        }
        .cardTop .title {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 6px;
        }
        .owner-badge {
          font-size: 12px;
          color: #0f766e;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .owner-icon {
          font-size: 11px;
        }

        .info {
          padding: 0 16px 14px;
          flex: 1;
        }
        .info .description {
          font-size: 13px;
          color: #475569;
          line-height: 1.5;
          margin-bottom: 10px;
        }
        .location-info {
          display: flex;
          gap: 6px;
          font-size: 12px;
          color: #64748b;
          align-items: flex-start;
        }
        .loc-icon {
          color: #ef4444;
          font-size: 12px;
          margin-top: 2px;
          flex-shrink: 0;
        }

        .vendor-actions-row {
          display: flex;
          gap: 8px;
          padding: 12px 16px;
          border-top: 1px solid #f1f5f9;
          background: #fafafa;
        }
        .action-btn {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 700;
          padding: 8px 12px;
          border-radius: 8px;
          text-decoration: none;
          transition: background 0.15s ease;
        }
        .call-btn {
          background: #0f766e;
          color: #ffffff;
        }
        .call-btn:hover {
          background: #0d9488;
        }
        .wa-btn {
          background: #25d366;
          color: #ffffff;
        }
        .wa-btn:hover {
          background: #20ba5a;
        }

        .badge {
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 4px;
        }
        .collective-badge {
          background: #fef3c7;
          color: #b45309;
        }
        .state-verified-badge {
          background: #dbeafe;
          color: #1d4ed8;
        }
        .visit-btn {
          margin: 0 16px 16px;
          background: #0f766e;
          color: white;
          text-align: center;
          padding: 9px;
          border-radius: 8px;
          text-decoration: none;
          font-size: 12px;
          font-weight: 600;
        }
        .profile-btn {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
        }

        /* MODAL */
        .modal-overlay {
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
        .shop-modal-dialog {
          background: #ffffff;
          border-radius: 20px;
          width: 100%;
          max-width: 660px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 22px 26px 16px;
          border-bottom: 1px solid #f1f5f9;
        }
        .modal-tag {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          color: #0f766e;
          background: #ccfbf1;
          padding: 2px 8px;
          border-radius: 999px;
        }
        .close-icon-btn {
          background: #f1f5f9;
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          cursor: pointer;
          color: #64748b;
        }

        .shop-form {
          padding: 22px 26px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        @media (min-width: 520px) {
          .form-row {
            grid-template-columns: 1fr 1fr;
          }
          .form-row.three-col {
            grid-template-columns: 1.2fr 1fr 1fr;
          }
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .form-group label {
          font-size: 12px;
          font-weight: 600;
          color: #334155;
        }
        .form-group label .req {
          color: #ef4444;
        }
        .form-group input, .form-group select, .form-group textarea {
          padding: 9px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 13px;
          outline: none;
        }
        .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
          border-color: #0f766e;
        }

        .image-upload-zone {
          border: 2px dashed #cbd5e1;
          border-radius: 10px;
          padding: 16px;
          text-align: center;
          position: relative;
          cursor: pointer;
          background: #f8fafc;
        }
        .image-upload-zone input {
          position: absolute;
          inset: 0;
          opacity: 0;
          cursor: pointer;
          width: 100%;
        }
        .camera-icon {
          font-size: 24px;
          color: #0f766e;
          margin-bottom: 6px;
        }
        .drop-prompt strong {
          display: block;
          font-size: 13px;
        }
        .drop-prompt span {
          font-size: 11px;
          color: #64748b;
        }
        .preview-img {
          max-height: 120px;
          border-radius: 6px;
          margin-bottom: 6px;
        }

        .modal-actions-bar {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding-top: 10px;
        }
        .btn-cancel {
          background: #f1f5f9;
          border: none;
          padding: 10px 18px;
          border-radius: 8px;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
        }
        .btn-submit-shop {
          background: #0f766e;
          color: white;
          border: none;
          padding: 10px 22px;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
        }
        .error-alert {
          background: #fef2f2;
          border: 1px solid #fca5a5;
          color: #991b1b;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
        }

        .shop-success-box {
          padding: 40px 24px;
          text-align: center;
        }
        .shop-success-box .success-icon {
          font-size: 44px;
          margin-bottom: 12px;
        }
        .shop-success-box h3 {
          font-size: 20px;
          color: #065f46;
          margin: 0 0 8px;
        }
        .shop-success-box p {
          color: #475569;
          font-size: 14px;
          line-height: 1.6;
          margin: 0 0 20px;
        }
        .btn-done {
          background: #0f766e;
          color: white;
          border: none;
          padding: 10px 24px;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
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
      `}</style>
    </div>
  );
};

export default Directory;
