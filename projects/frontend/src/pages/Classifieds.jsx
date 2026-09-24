import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaSearch,
  FaTag,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaWhatsapp,
  FaCamera,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaShareAlt,
} from "react-icons/fa";
import supabase from "../config/supabaseClient";

const CATEGORIES = [
  "All",
  "Electronics",
  "Vehicles",
  "Furniture",
  "Home Appliances",
  "Fashion",
  "Books & Hobbies",
  "Free / Donation",
];

const Classifieds = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [ads, setAds] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Detail Modal State
  const [activeModalAd, setActiveModalAd] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const fetchApprovedAds = async () => {
    setLoading(true);
    try {
      // Direct query for approved ads, without restrictive expires_at filter
      const { data, error } = await supabase
        .from("classifieds")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAds(data || []);
    } catch (err) {
      console.error("Fetch classifieds error:", err);
      // Fallback: empty array
      setAds([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovedAds();
  }, []);

  const filteredAds = useMemo(() => {
    const term = search.trim().toLowerCase();

    return ads.filter((ad) => {
      const matchCategory =
        selectedCategory === "All" ||
        (selectedCategory === "Free / Donation" && (ad.is_free || ad.category === "Free / Donation")) ||
        ad.category === selectedCategory;

      if (!matchCategory) return false;

      if (!term) return true;

      const title = (ad.title || "").toLowerCase();
      const desc = (ad.description || "").toLowerCase();
      const city = (ad.location_city || ad.city || "").toLowerCase();
      const cond = (ad.condition || "").toLowerCase();

      return title.includes(term) || desc.includes(term) || city.includes(term) || cond.includes(term);
    });
  }, [ads, search, selectedCategory]);

  const openDetails = (ad) => {
    setActiveModalAd(ad);
    setActiveImageIndex(0);
  };

  const getAdImages = (ad) => {
    if (!ad) return [];
    if (Array.isArray(ad.images) && ad.images.length > 0) return ad.images;
    if (typeof ad.images === "string") {
      try {
        const parsed = JSON.parse(ad.images);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    if (ad.media_url) return [ad.media_url];
    return [];
  };

  return (
    <div className="classifieds-page">
      {/* HERO SECTION */}
      <section className="cls-hero">
        <div className="cls-hero-inner">
          <span className="hero-badge">🛒 Local Classifieds Marketplace</span>
          <h1>Community Marketplace & Pre-Owned Goods</h1>
          <p>
            Buy, sell, or donate pre-owned electronics, furniture, vehicles, and household essentials directly with trusted community neighbors.
          </p>

          <div className="hero-cta-row">
            <button className="btn-post-ad" onClick={() => navigate("/dashboard?tab=my-classifieds")}>
              + Post an Ad for Free
            </button>
            <div className="hero-search-wrap">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search products, brands, models, or city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className="btn-clear-search" onClick={() => setSearch("")}>
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CONTAINER */}
      <div className="cls-container">
        {/* CATEGORY FILTER PILLS */}
        <div className="category-scroll-bar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`cat-pill-btn ${selectedCategory === cat ? "active" : ""}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* FEED HEADER */}
        <div className="feed-header">
          <div>
            <h2>
              {selectedCategory === "All" ? "Fresh Recommendations" : `${selectedCategory} Listings`}
            </h2>
            <p>
              Showing {filteredAds.length} verified {filteredAds.length === 1 ? "ad" : "ads"}
            </p>
          </div>

          <button className="btn-refresh" onClick={fetchApprovedAds} disabled={loading}>
            ↻ {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* LISTINGS GRID */}
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading classifieds marketplace...</p>
          </div>
        ) : filteredAds.length === 0 ? (
          <div className="empty-state">
            <FaTag className="empty-icon" />
            <h3>No classified listings found</h3>
            <p>
              {search || selectedCategory !== "All"
                ? "Try clearing filters or searching with a different term."
                : "No verified ads currently live. Be the first neighbor to post!"}
            </p>
            <button
              className="btn-primary"
              onClick={() => navigate("/dashboard?tab=my-classifieds")}
            >
              Post Your Item Now
            </button>
          </div>
        ) : (
          <div className="listings-grid">
            {filteredAds.map((ad) => {
              const images = getAdImages(ad);
              const firstImg = images[0];
              const phone = ad.contact_phone;
              const wa = ad.contact_whatsapp || ad.contact_phone;
              const cleanWa = wa ? wa.replace(/[^0-9]/g, "") : "";
              const waLink = cleanWa
                ? `https://wa.me/${cleanWa}?text=${encodeURIComponent(
                    `Hi ${ad.contact_name || "Seller"}, I'm interested in your "${ad.title}" listed on CommunityHub!`
                  )}`
                : null;

              return (
                <div key={ad.id} className="olx-card" onClick={() => openDetails(ad)}>
                  {/* Photo Container */}
                  <div className="card-media">
                    {firstImg ? (
                      <img src={firstImg} alt={ad.title} loading="lazy" />
                    ) : (
                      <div className="no-media-box">
                        <FaCamera />
                        <span>No Photo</span>
                      </div>
                    )}

                    {images.length > 1 && (
                      <span className="photo-count-badge">📷 {images.length}</span>
                    )}

                    {ad.condition && (
                      <span className="cond-tag">{ad.condition}</span>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="card-body">
                    <div className="price-row">
                      {ad.is_free || !ad.price || parseFloat(ad.price) === 0 ? (
                        <span className="price-free">FREE</span>
                      ) : (
                        <span className="price-val">
                          ${parseFloat(ad.price).toLocaleString()}
                        </span>
                      )}
                      <span className="category-tag">{ad.category}</span>
                    </div>

                    <h3 className="card-title" title={ad.title}>
                      {ad.title}
                    </h3>

                    <p className="card-desc">
                      {ad.description || "No description provided."}
                    </p>

                    <div className="card-location">
                      <FaMapMarkerAlt className="loc-icon" />
                      <span>{ad.location_city || ad.city || "Local Community"}</span>
                    </div>

                    {/* Direct Contact Buttons */}
                    <div className="card-contact-row" onClick={(e) => e.stopPropagation()}>
                      {phone && (
                        <a href={`tel:${phone}`} className="contact-btn call">
                          <FaPhoneAlt /> Call
                        </a>
                      )}
                      {waLink && (
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="contact-btn wa"
                        >
                          <FaWhatsapp /> Chat
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      {activeModalAd && (
        <div className="modal-backdrop" onClick={() => setActiveModalAd(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <button className="btn-close-modal" onClick={() => setActiveModalAd(null)}>
              <FaTimes />
            </button>

            {/* Gallery View */}
            {(() => {
              const images = getAdImages(activeModalAd);
              const hasMultiple = images.length > 1;

              return (
                <div className="modal-gallery">
                  {images.length > 0 ? (
                    <div className="main-image-wrap">
                      <img src={images[activeImageIndex] || images[0]} alt={activeModalAd.title} />
                      {hasMultiple && (
                        <>
                          <button
                            className="gal-nav prev"
                            onClick={() =>
                              setActiveImageIndex((prev) =>
                                prev === 0 ? images.length - 1 : prev - 1
                              )
                            }
                          >
                            <FaChevronLeft />
                          </button>
                          <button
                            className="gal-nav next"
                            onClick={() =>
                              setActiveImageIndex((prev) =>
                                prev === images.length - 1 ? 0 : prev + 1
                              )
                            }
                          >
                            <FaChevronRight />
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="modal-no-img">
                      <FaCamera />
                      <span>No photos uploaded for this item</span>
                    </div>
                  )}

                  {hasMultiple && (
                    <div className="thumbnails-bar">
                      {images.map((img, idx) => (
                        <button
                          key={idx}
                          className={`thumb-btn ${activeImageIndex === idx ? "active" : ""}`}
                          onClick={() => setActiveImageIndex(idx)}
                        >
                          <img src={img} alt={`Thumb ${idx + 1}`} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Details Content */}
            <div className="modal-content-panel">
              <div className="modal-tags-row">
                <span className="modal-cat-tag">{activeModalAd.category}</span>
                {activeModalAd.condition && (
                  <span className="modal-cond-tag">Condition: {activeModalAd.condition}</span>
                )}
              </div>

              <h2 className="modal-title">{activeModalAd.title}</h2>

              <div className="modal-price-box">
                {activeModalAd.is_free || !activeModalAd.price || parseFloat(activeModalAd.price) === 0 ? (
                  <span className="modal-free-badge">FREE / DONATION</span>
                ) : (
                  <span className="modal-price">
                    ${parseFloat(activeModalAd.price).toLocaleString()}
                  </span>
                )}
              </div>

              <div className="modal-meta-row">
                <div className="meta-pair">
                  <FaMapMarkerAlt className="meta-icon" />
                  <span>{activeModalAd.location_city || activeModalAd.city || "Location not specified"}</span>
                </div>
                {activeModalAd.contact_name && (
                  <div className="meta-pair">
                    <strong>Seller:</strong> {activeModalAd.contact_name}
                  </div>
                )}
              </div>

              <div className="modal-desc-box">
                <h4>Description</h4>
                <p>{activeModalAd.description}</p>
              </div>

              {/* Action Buttons */}
              <div className="modal-cta-row">
                {activeModalAd.contact_phone && (
                  <a
                    href={`tel:${activeModalAd.contact_phone}`}
                    className="modal-btn call-main"
                  >
                    <FaPhoneAlt /> Call Seller ({activeModalAd.contact_phone})
                  </a>
                )}

                {(() => {
                  const wa = activeModalAd.contact_whatsapp || activeModalAd.contact_phone;
                  const cleanWa = wa ? wa.replace(/[^0-9]/g, "") : "";
                  if (!cleanWa) return null;

                  return (
                    <a
                      href={`https://wa.me/${cleanWa}?text=${encodeURIComponent(
                        `Hi ${activeModalAd.contact_name || "Seller"}, I'm interested in your "${activeModalAd.title}" on CommunityHub!`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="modal-btn wa-main"
                    >
                      <FaWhatsapp /> Chat on WhatsApp
                    </a>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STYLES */}
      <style>{`
        .classifieds-page {
          width: 100%;
          min-height: 100vh;
          background: #f8fafc;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: #0f172a;
        }

        /* Hero */
        .cls-hero {
          background: linear-gradient(135deg, #047857 0%, #065f46 50%, #022c22 100%);
          color: #ffffff;
          padding: 60px 24px 44px;
        }
        .cls-hero-inner {
          max-width: 1080px;
          margin: 0 auto;
          text-align: center;
        }
        .hero-badge {
          display: inline-block;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          background: rgba(255, 255, 255, 0.15);
          color: #a7f3d0;
          padding: 4px 14px;
          border-radius: 999px;
          margin-bottom: 12px;
        }
        .cls-hero h1 {
          font-size: 34px;
          font-weight: 800;
          margin: 0 0 10px;
          letter-spacing: -0.5px;
        }
        .cls-hero p {
          max-width: 680px;
          margin: 0 auto 28px;
          font-size: 15px;
          color: #d1fae5;
          line-height: 1.55;
        }
        .hero-cta-row {
          display: flex;
          gap: 14px;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
        }
        .btn-post-ad {
          background: #10b981;
          color: #ffffff;
          border: none;
          font-size: 14px;
          font-weight: 800;
          padding: 12px 24px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);
        }
        .btn-post-ad:hover {
          background: #059669;
          transform: translateY(-2px);
        }
        .hero-search-wrap {
          position: relative;
          width: 100%;
          max-width: 440px;
          background: #ffffff;
          border-radius: 12px;
          display: flex;
          align-items: center;
          padding: 6px 14px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.12);
        }
        .search-icon {
          color: #94a3b8;
          font-size: 14px;
          margin-right: 8px;
        }
        .hero-search-wrap input {
          border: none;
          outline: none;
          width: 100%;
          font-size: 14px;
          color: #0f172a;
        }
        .btn-clear-search {
          border: none;
          background: transparent;
          color: #94a3b8;
          cursor: pointer;
        }

        /* Container */
        .cls-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 30px 24px 80px;
        }

        /* Category Pills */
        .category-scroll-bar {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 8px;
          margin-bottom: 24px;
        }
        .cat-pill-btn {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #475569;
          padding: 8px 16px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s ease;
        }
        .cat-pill-btn:hover {
          background: #f1f5f9;
        }
        .cat-pill-btn.active {
          background: #047857;
          color: #ffffff;
          border-color: #047857;
        }

        /* Feed Header */
        .feed-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 1px solid #e2e8f0;
        }
        .feed-header h2 {
          margin: 0;
          font-size: 1.35rem;
          font-weight: 800;
          color: #0f172a;
        }
        .feed-header p {
          margin: 4px 0 0;
          font-size: 0.85rem;
          color: #64748b;
        }
        .btn-refresh {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #334155;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.82rem;
          cursor: pointer;
        }

        /* Cards Grid */
        .listings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 20px;
        }
        .olx-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.03);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .olx-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.08);
          border-color: #10b981;
        }

        .card-media {
          position: relative;
          width: 100%;
          height: 180px;
          background: #f1f5f9;
          overflow: hidden;
        }
        .card-media img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }
        .olx-card:hover .card-media img {
          transform: scale(1.04);
        }
        .no-media-box {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          color: #94a3b8;
          font-size: 1.8rem;
        }
        .no-media-box span {
          font-size: 0.75rem;
          font-weight: 600;
        }
        .photo-count-badge {
          position: absolute;
          bottom: 8px;
          right: 8px;
          background: rgba(15, 23, 42, 0.75);
          color: #ffffff;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 4px;
        }
        .cond-tag {
          position: absolute;
          top: 8px;
          left: 8px;
          background: rgba(15, 23, 42, 0.8);
          color: #ffffff;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 4px;
          text-transform: uppercase;
        }

        .card-body {
          padding: 14px;
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .price-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .price-val {
          font-size: 1.15rem;
          font-weight: 900;
          color: #0f172a;
        }
        .price-free {
          background: #dcfce7;
          color: #166534;
          font-size: 11px;
          font-weight: 900;
          padding: 3px 8px;
          border-radius: 4px;
        }
        .category-tag {
          font-size: 11px;
          font-weight: 700;
          color: #047857;
        }
        .card-title {
          font-size: 0.95rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 6px;
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .card-desc {
          font-size: 0.8rem;
          color: #64748b;
          line-height: 1.45;
          margin: 0 0 10px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .card-location {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.78rem;
          color: #94a3b8;
          margin-bottom: 12px;
        }
        .loc-icon {
          color: #ef4444;
          font-size: 11px;
        }

        .card-contact-row {
          display: flex;
          gap: 8px;
          margin-top: auto;
          padding-top: 10px;
          border-top: 1px solid #f1f5f9;
        }
        .contact-btn {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 10px;
          border-radius: 8px;
          font-size: 0.82rem;
          font-weight: 700;
          text-decoration: none;
          transition: background 0.15s;
        }
        .contact-btn.call {
          background: #047857;
          color: #ffffff;
        }
        .contact-btn.call:hover { background: #065f46; }
        .contact-btn.wa {
          background: #25d366;
          color: #ffffff;
        }
        .contact-btn.wa:hover { background: #1eb956; }

        /* Empty / Loading States */
        .loading-state, .empty-state {
          text-align: center;
          padding: 80px 20px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
        }
        .empty-icon {
          font-size: 3.5rem;
          color: #cbd5e1;
          margin-bottom: 14px;
        }
        .empty-state h3 {
          margin: 0 0 8px;
          font-size: 1.25rem;
          color: #0f172a;
        }
        .empty-state p {
          color: #64748b;
          margin: 0 0 20px;
        }
        .btn-primary {
          background: #047857;
          color: #ffffff;
          border: none;
          padding: 10px 22px;
          border-radius: 10px;
          font-weight: 700;
          cursor: pointer;
        }
        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e2e8f0;
          border-top-color: #047857;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 12px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Modal */
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
        }
        .modal-dialog {
          background: #ffffff;
          border-radius: 20px;
          max-width: 680px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
        .btn-close-modal {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: rgba(15, 23, 42, 0.7);
          color: #ffffff;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 10;
        }

        .modal-gallery {
          background: #0f172a;
          position: relative;
        }
        .main-image-wrap {
          position: relative;
          width: 100%;
          height: 340px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .main-image-wrap img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }
        .gal-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(15, 23, 42, 0.6);
          color: #ffffff;
          border: none;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .gal-nav.prev { left: 12px; }
        .gal-nav.next { right: 12px; }

        .modal-no-img {
          height: 200px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          color: #64748b;
        }
        .thumbnails-bar {
          display: flex;
          gap: 8px;
          padding: 10px 16px;
          background: #0f172a;
          overflow-x: auto;
        }
        .thumb-btn {
          width: 60px;
          height: 50px;
          border-radius: 6px;
          overflow: hidden;
          border: 2px solid transparent;
          background: transparent;
          cursor: pointer;
          padding: 0;
        }
        .thumb-btn.active {
          border-color: #10b981;
        }
        .thumb-btn img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .modal-content-panel {
          padding: 24px;
        }
        .modal-tags-row {
          display: flex;
          gap: 8px;
          margin-bottom: 8px;
        }
        .modal-cat-tag {
          background: #ecfdf5;
          color: #065f46;
          font-size: 11px;
          font-weight: 800;
          padding: 3px 10px;
          border-radius: 999px;
        }
        .modal-cond-tag {
          background: #f1f5f9;
          color: #475569;
          font-size: 11px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 999px;
        }
        .modal-title {
          font-size: 1.4rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 12px;
          line-height: 1.3;
        }
        .modal-price-box {
          margin-bottom: 16px;
        }
        .modal-price {
          font-size: 1.6rem;
          font-weight: 900;
          color: #047857;
        }
        .modal-free-badge {
          background: #dcfce7;
          color: #166534;
          font-size: 13px;
          font-weight: 900;
          padding: 4px 12px;
          border-radius: 6px;
        }
        .modal-meta-row {
          display: flex;
          gap: 20px;
          padding: 12px 0;
          border-top: 1px solid #f1f5f9;
          border-bottom: 1px solid #f1f5f9;
          margin-bottom: 16px;
          font-size: 0.88rem;
          color: #475569;
        }
        .meta-pair {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .modal-desc-box h4 {
          margin: 0 0 6px;
          font-size: 0.95rem;
          font-weight: 700;
          color: #0f172a;
        }
        .modal-desc-box p {
          margin: 0 0 20px;
          font-size: 0.9rem;
          color: #475569;
          line-height: 1.6;
          white-space: pre-wrap;
        }

        .modal-cta-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .modal-btn {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 18px;
          border-radius: 10px;
          font-size: 0.92rem;
          font-weight: 800;
          text-decoration: none;
          transition: background 0.2s;
        }
        .modal-btn.call-main {
          background: #047857;
          color: #ffffff;
        }
        .modal-btn.call-main:hover { background: #065f46; }
        .modal-btn.wa-main {
          background: #25d366;
          color: #ffffff;
        }
        .modal-btn.wa-main:hover { background: #1eb956; }
      `}</style>
    </div>
  );
};

export default Classifieds;
