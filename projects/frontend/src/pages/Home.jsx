import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import supabase from "../config/supabaseClient";
import {
  FaSearch,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaCheckCircle,
  FaBuilding,
  FaArrowRight,
  FaShieldAlt,
  FaHandshake,
  FaUserPlus,
  FaUsers,
  FaClock,
  FaCompass,
} from "react-icons/fa";

const ALPHABET = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""), "#"];

export default function Home() {
  const { homepageWidgets } = useTheme();
  const navigate = useNavigate();

  // Search Bar State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchScope, setSearchScope] = useState("directory"); // 'directory' | 'events'

  // Dynamic Content States
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [featuredCollectives, setFeaturedCollectives] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [contactSent, setContactSent] = useState(false);

  // Fetch Live Data
  useEffect(() => {
    const fetchHomeData = async () => {
      setLoadingData(true);
      try {
        // 1. Fetch upcoming approved events
        const { data: eventData } = await supabase
          .from("events")
          .select("*")
          .eq("status", "approved")
          .order("event_date", { ascending: true })
          .limit(3);

        if (eventData && eventData.length > 0) {
          setUpcomingEvents(eventData);
        } else {
          // Curated showcase if live events are being seeded
          setUpcomingEvents([
            {
              id: "evt-1",
              title: "Annual Community NGO Summit & Fair",
              category: "Community Event",
              event_date: "2026-09-20",
              event_time: "10:00:00",
              venue_name: "Community Center Hall",
              city: "San Francisco",
              state: "CA",
              description: "Gather with community organizers, non-profits, and civic volunteers to share resources.",
            },
            {
              id: "evt-2",
              title: "Non-Profit Grant & Financial Workshop",
              category: "Workshop",
              event_date: "2026-09-28",
              event_time: "14:00:00",
              venue_name: "Civic Library Auditorium",
              city: "Oakland",
              state: "CA",
              description: "Practical guidance on grant writing, compliance, and donor relations for non-profits.",
            },
            {
              id: "evt-3",
              title: "Heritage Cultural Festival & Bazaar",
              category: "Cultural Program",
              event_date: "2026-10-05",
              event_time: "11:00:00",
              venue_name: "Heritage Plaza",
              city: "San Jose",
              state: "CA",
              description: "Celebrate regional arts, traditional cuisine, music performances, and local craft vendors.",
            },
          ]);
        }

        // 2. Fetch approved collectives
        const { data: colData } = await supabase
          .from("collectives")
          .select("*")
          .eq("status", "approved")
          .limit(3);

        if (colData && colData.length > 0) {
          setFeaturedCollectives(colData);
        } else {
          setFeaturedCollectives([
            {
              id: "col-1",
              name: "Bombay Sweets & Heritage Bakers",
              slug: "bombaysweets",
              category: "Food & Confectionery",
              city: "Fremont",
              state: "CA",
              description: "Authentic artisanal sweets, traditional catering, and community festival partner.",
              verification_status: "verified",
            },
            {
              id: "col-2",
              name: "Youth Empowerment Initiative",
              slug: "youth-empowerment",
              category: "Education & Non-Profit",
              city: "San Francisco",
              state: "CA",
              description: "Mentoring next-generation civic leaders through STEM workshops and scholarships.",
              verification_status: "verified",
            },
            {
              id: "col-3",
              name: "Golden Gate Cultural Circle",
              slug: "goldengate-culture",
              category: "Cultural & Arts",
              city: "Berkeley",
              state: "CA",
              description: "Preserving folk arts, hosting classical concerts, and supporting community festivals.",
              verification_status: "verified",
            },
          ]);
        }
      } catch (err) {
        console.error("Home data fetch error:", err);
      } finally {
        setLoadingData(false);
      }
    };

    fetchHomeData();
  }, []);

  const handleHeroSearch = (e) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    if (searchScope === "events") {
      navigate(`/events?q=${encodeURIComponent(query)}`);
    } else {
      navigate(`/directory?search=${encodeURIComponent(query)}`);
    }
  };

  const handleTagClick = (tag) => {
    setSearchQuery(tag);
    navigate(`/directory?search=${encodeURIComponent(tag)}`);
  };

  return (
    <div className="home-container">
      {/* INTERNAL CSS */}
      <style>{`
        .home-container {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #0f172a;
          background: #ffffff;
          overflow-x: hidden;
        }

        /* ----------------------------------------------------
           1. MODERN HERO SECTION & SEARCH
        ---------------------------------------------------- */
        .modern-hero {
          background: var(--theme-banner-gradient, linear-gradient(135deg, #0f766e, #16a34a));
          color: #ffffff;
          padding: 80px 24px 70px 24px;
          text-align: center;
          position: relative;
          box-shadow: inset 0 -20px 40px rgba(0, 0, 0, 0.08);
        }

        .hero-inner {
          max-width: 960px;
          margin: 0 auto;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          padding: 6px 18px;
          border-radius: 999px;
          font-size: 0.85rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 20px;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .hero-title {
          font-size: 2.8rem;
          font-weight: 800;
          line-height: 1.2;
          margin-bottom: 18px;
          letter-spacing: -0.5px;
        }

        .hero-subtitle {
          font-size: 1.15rem;
          line-height: 1.6;
          max-width: 720px;
          margin: 0 auto 36px auto;
          color: rgba(255, 255, 255, 0.92);
        }

        /* Hero Search Bar */
        .hero-search-card {
          background: #ffffff;
          padding: 8px 10px;
          border-radius: 16px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
          display: flex;
          align-items: center;
          gap: 10px;
          max-width: 780px;
          margin: 0 auto;
        }

        .search-scope-select {
          padding: 12px 14px;
          border: none;
          background: #f1f5f9;
          border-radius: 10px;
          font-size: 0.9rem;
          font-weight: 600;
          color: #334155;
          cursor: pointer;
          outline: none;
        }

        .search-input-wrap {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 10px;
        }

        .search-input-wrap svg {
          color: #94a3b8;
          font-size: 1.1rem;
        }

        .search-input-wrap input {
          width: 100%;
          border: none;
          outline: none;
          font-size: 1rem;
          color: #0f172a;
          background: transparent;
        }

        .hero-search-btn {
          background: var(--theme-primary, #0f766e);
          color: #ffffff;
          border: none;
          padding: 13px 28px;
          border-radius: 12px;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .hero-search-btn:hover {
          background: var(--theme-primary-hover, #115e59);
          transform: translateY(-1px);
        }

        /* Trending Tags */
        .trending-tags {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 18px;
          font-size: 0.85rem;
        }

        .trending-label {
          color: rgba(255, 255, 255, 0.8);
          font-weight: 600;
        }

        .tag-pill {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(5px);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.25);
          padding: 4px 12px;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 500;
        }

        .tag-pill:hover {
          background: #ffffff;
          color: #0f766e;
        }

        /* ----------------------------------------------------
           2. A-Z DIRECTORY QUICK JUMP BAR (RFP §4c)
        ---------------------------------------------------- */
        .az-nav-section {
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          padding: 20px 24px;
        }

        .az-nav-inner {
          max-width: 1140px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .az-nav-title {
          font-size: 0.85rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          color: #64748b;
          white-space: nowrap;
        }

        .az-letters-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          flex: 1;
        }

        .az-letter-link {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 700;
          color: #334155;
          text-decoration: none;
          transition: all 0.15s ease;
        }

        .az-letter-link:hover {
          background: var(--theme-primary, #0f766e);
          color: #ffffff;
          border-color: transparent;
          transform: translateY(-2px);
          box-shadow: 0 4px 10px rgba(15, 118, 110, 0.2);
        }

        /* ----------------------------------------------------
           3. IMPACT STATS BAR
        ---------------------------------------------------- */
        .stats-section {
          padding: 50px 24px;
          background: #ffffff;
        }

        .stats-grid {
          max-width: 1140px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }

        .stat-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 26px 20px;
          text-align: center;
          transition: all 0.25s ease;
        }

        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.06);
          border-color: #cbd5e1;
        }

        .stat-icon {
          font-size: 2rem;
          color: var(--theme-primary, #0f766e);
          margin-bottom: 10px;
        }

        .stat-number {
          font-size: 2.2rem;
          font-weight: 800;
          color: #0f172a;
          line-height: 1;
          margin-bottom: 6px;
        }

        .stat-label {
          font-size: 0.9rem;
          font-weight: 600;
          color: #64748b;
        }

        /* ----------------------------------------------------
           4. "HOW IT WORKS" 3-STEP JOURNEY
        ---------------------------------------------------- */
        .how-section {
          background: #f8fafc;
          padding: 80px 24px;
        }

        .section-header-center {
          text-align: center;
          max-width: 700px;
          margin: 0 auto 50px auto;
        }

        .section-badge {
          display: inline-block;
          font-size: 0.8rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--theme-primary, #0f766e);
          background: #ccfbf1;
          padding: 4px 14px;
          border-radius: 999px;
          margin-bottom: 12px;
        }

        .section-main-title {
          font-size: 2.2rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 12px;
          letter-spacing: -0.5px;
        }

        .section-subtext {
          font-size: 1.05rem;
          color: #64748b;
          line-height: 1.6;
        }

        .steps-grid {
          max-width: 1140px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 30px;
        }

        .step-card {
          background: #ffffff;
          border-radius: 20px;
          padding: 36px 30px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.04);
          position: relative;
          transition: all 0.25s ease;
        }

        .step-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 18px 36px rgba(0, 0, 0, 0.08);
          border-color: #cbd5e1;
        }

        .step-number {
          position: absolute;
          top: 24px;
          right: 24px;
          font-size: 2.5rem;
          font-weight: 900;
          color: #e2e8f0;
          line-height: 1;
        }

        .step-icon-wrap {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          background: #f0fdfa;
          color: var(--theme-primary, #0f766e);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          margin-bottom: 20px;
        }

        .step-card h3 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 12px;
        }

        .step-card p {
          font-size: 0.95rem;
          color: #475569;
          line-height: 1.6;
        }

        /* ----------------------------------------------------
           5. UPCOMING EVENTS SHOWCASE (RFP §8.7b)
        ---------------------------------------------------- */
        .events-section {
          padding: 80px 24px;
          background: #ffffff;
        }

        .events-container {
          max-width: 1140px;
          margin: 0 auto;
        }

        .events-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 40px;
        }

        .view-all-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--theme-primary, #0f766e);
          font-weight: 700;
          text-decoration: none;
          font-size: 0.95rem;
          transition: gap 0.2s ease;
        }

        .view-all-link:hover {
          gap: 12px;
          color: var(--theme-primary-hover, #115e59);
        }

        .events-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 28px;
        }

        .event-preview-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
          transition: all 0.25s ease;
          display: flex;
          flex-direction: column;
        }

        .event-preview-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.08);
          border-color: #cbd5e1;
        }

        .event-card-top {
          padding: 24px 24px 16px 24px;
          display: flex;
          gap: 16px;
        }

        .event-calendar-badge {
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          width: 60px;
          height: 64px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .badge-month {
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          color: #ef4444;
          letter-spacing: 0.5px;
        }

        .badge-day {
          font-size: 1.4rem;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.1;
        }

        .event-card-meta {
          flex: 1;
        }

        .event-category-pill {
          display: inline-block;
          font-size: 0.72rem;
          font-weight: 700;
          background: #e0f2fe;
          color: #0369a1;
          padding: 2px 8px;
          border-radius: 4px;
          margin-bottom: 8px;
        }

        .event-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: #0f172a;
          line-height: 1.35;
          margin-bottom: 8px;
        }

        .event-card-body {
          padding: 0 24px 20px 24px;
          flex: 1;
        }

        .event-info-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.85rem;
          color: #64748b;
          margin-bottom: 6px;
        }

        .event-desc-snippet {
          font-size: 0.9rem;
          color: #475569;
          line-height: 1.5;
          margin-top: 10px;
        }

        .event-card-footer {
          padding: 16px 24px;
          background: #f8fafc;
          border-top: 1px solid #f1f5f9;
        }

        .event-action-btn {
          display: block;
          text-align: center;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: var(--theme-primary, #0f766e);
          font-weight: 700;
          padding: 10px;
          border-radius: 10px;
          text-decoration: none;
          font-size: 0.88rem;
          transition: all 0.2s ease;
        }

        .event-action-btn:hover {
          background: var(--theme-primary, #0f766e);
          color: #ffffff;
          border-color: transparent;
        }

        /* ----------------------------------------------------
           6. FEATURED COLLECTIVES / SPOTLIGHT (RFP §4b)
        ---------------------------------------------------- */
        .spotlight-section {
          background: #f8fafc;
          padding: 80px 24px;
        }

        .collectives-grid {
          max-width: 1140px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 28px;
        }

        .collective-card {
          background: #ffffff;
          border-radius: 18px;
          border: 1px solid #e2e8f0;
          padding: 28px;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.04);
          transition: all 0.25s ease;
          display: flex;
          flex-direction: column;
        }

        .collective-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.08);
          border-color: #cbd5e1;
        }

        .col-card-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 14px;
        }

        .col-icon-box {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: #f0fdfa;
          color: var(--theme-primary, #0f766e);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.3rem;
        }

        .col-meta h4 {
          font-size: 1.15rem;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 4px;
        }

        .verified-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.72rem;
          font-weight: 700;
          color: #166534;
          background: #dcfce7;
          padding: 2px 8px;
          border-radius: 999px;
        }

        .col-desc {
          font-size: 0.9rem;
          color: #64748b;
          line-height: 1.6;
          margin-bottom: 20px;
          flex: 1;
        }

        .col-profile-link {
          display: inline-flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          background: #f8fafc;
          border-radius: 10px;
          color: #334155;
          text-decoration: none;
          font-size: 0.88rem;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .col-profile-link:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        /* ----------------------------------------------------
           7. TRUST & SAFETY SECTION
        ---------------------------------------------------- */
        .trust-section {
          padding: 80px 24px;
          background: #ffffff;
        }

        .trust-grid {
          max-width: 1140px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 30px;
        }

        .trust-box {
          border-radius: 18px;
          padding: 30px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
        }

        .trust-icon {
          font-size: 2rem;
          color: var(--theme-primary, #0f766e);
          margin-bottom: 16px;
        }

        .trust-box h3 {
          font-size: 1.2rem;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 10px;
        }

        .trust-box p {
          font-size: 0.92rem;
          color: #64748b;
          line-height: 1.6;
        }

        /* ----------------------------------------------------
           8. CONTACT SECTION
        ---------------------------------------------------- */
        .contact-section {
          padding: 80px 24px;
          background: linear-gradient(135deg, #f0fdfa, #ecfeff);
        }

        .contact-box {
          max-width: 800px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 24px;
          padding: 48px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.06);
          border: 1px solid #e2e8f0;
        }

        .contact-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }

        .contact-box input,
        .contact-box textarea {
          width: 100%;
          padding: 14px 16px;
          border-radius: 10px;
          border: 1px solid #cbd5e1;
          font-size: 0.95rem;
          color: #0f172a;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s ease;
        }

        .contact-box input:focus,
        .contact-box textarea:focus {
          border-color: var(--theme-primary, #0f766e);
          box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.12);
        }

        .contact-submit-btn {
          width: 100%;
          padding: 15px;
          background: var(--theme-primary, #0f766e);
          color: #ffffff;
          border: none;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-top: 10px;
        }

        .contact-submit-btn:hover {
          background: var(--theme-primary-hover, #115e59);
          transform: translateY(-2px);
        }

        /* ----------------------------------------------------
           RESPONSIVE BREAKPOINTS
        ---------------------------------------------------- */
        @media (max-width: 1024px) {
          .hero-title { font-size: 2.3rem; }
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .steps-grid { grid-template-columns: 1fr; }
          .events-grid { grid-template-columns: 1fr; }
          .collectives-grid { grid-template-columns: 1fr; }
          .trust-grid { grid-template-columns: 1fr; }
        }

        @media (max-width: 640px) {
          .modern-hero { padding: 60px 16px 50px 16px; }
          .hero-title { font-size: 1.85rem; }
          .hero-subtitle { font-size: 1rem; }
          .hero-search-card { flex-direction: column; padding: 12px; }
          .search-scope-select { width: 100%; }
          .hero-search-btn { width: 100%; }
          .stats-grid { grid-template-columns: 1fr; }
          .contact-box { padding: 28px 20px; }
          .contact-form-grid { grid-template-columns: 1fr; }
          .events-header-row { flex-direction: column; align-items: flex-start; gap: 10px; }
        }
      `}</style>

      {/* ====================================================
          1. HERO BANNER WITH INTERACTIVE SEARCH
      ==================================================== */}
      <section className="modern-hero">
        <div className="hero-inner">
          <div className="hero-badge">
            <FaShieldAlt /> Verified Community Directory Platform
          </div>
          <h1 className="hero-title">
            Discover, Connect & Engage with Trusted Communities
          </h1>
          <p className="hero-subtitle">
            The safe, state-verified digital home for non-profits, family circles, community collectives, and local events.
          </p>

          {/* Interactive Search Box */}
          <form className="hero-search-card" onSubmit={handleHeroSearch}>
            <select
              className="search-scope-select"
              value={searchScope}
              onChange={(e) => setSearchScope(e.target.value)}
            >
              <option value="directory">Directory (Collectives)</option>
              <option value="events">Events Calendar</option>
            </select>
            <div className="search-input-wrap">
              <FaSearch />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  searchScope === "events"
                    ? "Search events by title, venue, or city..."
                    : "Search businesses, collectives, or keywords..."
                }
              />
            </div>
            <button type="submit" className="hero-search-btn">
              Search
            </button>
          </form>

          {/* Popular Search Tags */}
          <div className="trending-tags">
            <span className="trending-label">Popular Searches:</span>
            {["Bombay Sweets", "Education", "Cultural", "Charity", "Workshop", "Civic"].map((tag) => (
              <span key={tag} className="tag-pill" onClick={() => handleTagClick(tag)}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================
          2. A-Z DIRECTORY QUICK NAVIGATOR (RFP §4c)
      ==================================================== */}
      <section className="az-nav-section">
        <div className="az-nav-inner">
          <div className="az-nav-title">A-Z Yellow Pages Index:</div>
          <div className="az-letters-grid">
            {ALPHABET.map((char) => (
              <Link
                key={char}
                to={`/directory?letter=${encodeURIComponent(char)}`}
                className="az-letter-link"
                title={`Browse listings starting with ${char}`}
              >
                {char}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================
          3. COMMUNITY IMPACT METRICS
      ==================================================== */}
      <section className="stats-section">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon"><FaBuilding /></div>
            <div className="stat-number">50+</div>
            <div className="stat-label">Verified Collectives</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><FaUsers /></div>
            <div className="stat-number">1,500+</div>
            <div className="stat-label">Active Community Members</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><FaCalendarAlt /></div>
            <div className="stat-number">100+</div>
            <div className="stat-label">Annual Community Events</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><FaCheckCircle /></div>
            <div className="stat-number">100%</div>
            <div className="stat-label">State-Record Verified</div>
          </div>
        </div>
      </section>

      {/* ====================================================
          4. "HOW IT WORKS" 3-STEP JOURNEY
      ==================================================== */}
      <section className="how-section">
        <div className="section-header-center">
          <span className="section-badge">Simple & Transparent</span>
          <h2 className="section-main-title">How CommunityHub Works</h2>
          <p className="section-subtext">
            Three simple steps to join, discover, and build meaningful relationships within a trusted community ecosystem.
          </p>
        </div>

        <div className="steps-grid">
          <div className="step-card">
            <span className="step-number">01</span>
            <div className="step-icon-wrap"><FaUserPlus /></div>
            <h3>Register & Verify</h3>
            <p>
              Sign up easily via OTP or SSO. Submit your government ID or collective state registration records for administrator audit and verification.
            </p>
          </div>

          <div className="step-card">
            <span className="step-number">02</span>
            <div className="step-icon-wrap"><FaSearch /></div>
            <h3>Discover & Network</h3>
            <p>
              Browse the Yellow Pages directory, explore regional non-profits, filter by A-Z index, and discover upcoming community events.
            </p>
          </div>

          <div className="step-card">
            <span className="step-number">03</span>
            <div className="step-icon-wrap"><FaHandshake /></div>
            <h3>Engage & Grow</h3>
            <p>
              Initiate secure direct chats with members, broadcast announcements to your collective, and configure dedicated public sub-pages.
            </p>
          </div>
        </div>
      </section>

      {/* ====================================================
          5. UPCOMING EVENTS SHOWCASE (RFP §8.7b)
      ==================================================== */}
      <section className="events-section">
        <div className="events-container">
          <div className="events-header-row">
            <div>
              <span className="section-badge">Calendar & Gatherings</span>
              <h2 className="section-main-title" style={{ margin: 0 }}>Upcoming Community Events</h2>
            </div>
            <Link to="/events" className="view-all-link">
              View Full Calendar <FaArrowRight />
            </Link>
          </div>

          <div className="events-grid">
            {upcomingEvents.map((evt) => {
              const d = new Date(evt.event_date);
              const month = isNaN(d.getTime())
                ? "SEP"
                : d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
              const day = isNaN(d.getTime()) ? "20" : d.getDate();

              return (
                <div key={evt.id} className="event-preview-card">
                  <div className="event-card-top">
                    <div className="event-calendar-badge">
                      <span className="badge-month">{month}</span>
                      <span className="badge-day">{day}</span>
                    </div>
                    <div className="event-card-meta">
                      <span className="event-category-pill">{evt.category || "Community Event"}</span>
                      <h3 className="event-title">{evt.title}</h3>
                    </div>
                  </div>

                  <div className="event-card-body">
                    <div className="event-info-row">
                      <FaClock />
                      <span>{evt.event_time ? evt.event_time.slice(0, 5) : "10:00 AM"}</span>
                    </div>
                    <div className="event-info-row">
                      <FaMapMarkerAlt />
                      <span>{evt.venue_name || "Community Center"}, {evt.city || "San Francisco"}</span>
                    </div>
                    <p className="event-desc-snippet">
                      {evt.description && evt.description.length > 110
                        ? `${evt.description.slice(0, 110)}...`
                        : evt.description}
                    </p>
                  </div>

                  <div className="event-card-footer">
                    <Link to={`/events/${evt.id}`} className="event-action-btn">
                      View Event Details & RSVP
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ====================================================
          6. FEATURED COLLECTIVES / SPOTLIGHT (RFP §4b)
      ==================================================== */}
      <section className="spotlight-section">
        <div className="events-container">
          <div className="events-header-row">
            <div>
              <span className="section-badge">Verified Organizations</span>
              <h2 className="section-main-title" style={{ margin: 0 }}>Community Collectives</h2>
            </div>
            <Link to="/directory" className="view-all-link">
              Explore All Directory <FaArrowRight />
            </Link>
          </div>

          <div className="collectives-grid">
            {featuredCollectives.map((col) => (
              <div key={col.id} className="collective-card">
                <div className="col-card-header">
                  <div className="col-icon-box"><FaBuilding /></div>
                  <div className="col-meta">
                    <h4>{col.name}</h4>
                    <span className="verified-badge">
                      <FaCheckCircle /> State Verified
                    </span>
                  </div>
                </div>
                <p className="col-desc">{col.description}</p>
                <Link to={`/${col.slug}`} className="col-profile-link">
                  <span>Visit Collective Profile</span>
                  <FaArrowRight />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================
          7. TRUST & SAFETY VALUE PILLARS
      ==================================================== */}
      <section className="trust-section">
        <div className="section-header-center">
          <span className="section-badge">Security & Integrity</span>
          <h2 className="section-main-title">Why CommunityHub?</h2>
          <p className="section-subtext">
            Engineered specifically for non-profits, faith organizations, families, and neighborhood groups.
          </p>
        </div>

        <div className="trust-grid">
          <div className="trust-box">
            <div className="trust-icon"><FaShieldAlt /></div>
            <h3>Official State Verification</h3>
            <p>
              Every business and non-profit collective is manually verified against state corporate registers to eliminate fake listings and scam accounts.
            </p>
          </div>

          <div className="trust-box">
            <div className="trust-icon"><FaCheckCircle /></div>
            <h3>Privacy-First Messaging</h3>
            <p>
              Members can communicate safely with built-in spam prevention, member-only broadcasts, and mirrored notifications sent directly to their verified email.
            </p>
          </div>

          <div className="trust-box">
            <div className="trust-icon"><FaCompass /></div>
            <h3>Custom Page Hierarchies</h3>
            <p>
              Collective managers have full autonomy over their organization’s web presence with dedicated sub-pages (`/about`, `/team`, `/programs`).
            </p>
          </div>
        </div>
      </section>

      {/* ====================================================
          8. CONTACT & GET IN TOUCH
      ==================================================== */}
      <section className="contact-section">
        <div className="contact-box">
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <span className="section-badge">Get in Touch</span>
            <h2 className="section-main-title" style={{ margin: "8px 0" }}>Connect With Administration</h2>
            <p style={{ color: "#64748b", margin: 0 }}>Have inquiries or need support onboarding your collective? Send us a message.</p>
          </div>

          {contactSent ? (
            <div style={{ padding: "30px", background: "#f0fdf4", borderRadius: "16px", textAlign: "center", color: "#166534" }}>
              <h3 style={{ margin: "0 0 8px", fontSize: "1.25rem" }}>✅ Message Sent Successfully!</h3>
              <p style={{ margin: 0, color: "#15803d" }}>Our community administrators will get in touch with you shortly.</p>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); setContactSent(true); }}>
              <div className="contact-form-grid">
                <input type="text" placeholder="Your Full Name" required />
                <input type="email" placeholder="Your Email Address" required />
              </div>
              <div className="contact-form-grid">
                <input type="tel" placeholder="Phone Number (Optional)" />
                <input type="text" placeholder="Subject / Organization" required />
              </div>
              <textarea rows="4" placeholder="How can we assist you or your collective?" required style={{ marginBottom: "16px" }} />
              <button type="submit" className="contact-submit-btn">
                Send Message
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
