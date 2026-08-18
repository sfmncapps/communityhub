import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import supabase from "../config/supabaseClient";

const ALPHABET = ["All", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""), "#"];

const Directory = () => {
  const [activeTab, setActiveTab] = useState("all"); // 'all', 'directory', 'collectives'
  const [selectedLetter, setSelectedLetter] = useState("All");
  const [search, setSearch] = useState("");
  const [directoryListings, setDirectoryListings] = useState([]);
  const [collectives, setCollectives] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch business directory listings
      const { data: dirData } = await supabase
        .from("directory_listings")
        .select("*")
        .eq("status", "approved")
        .order("business_name", { ascending: true });

      setDirectoryListings(dirData || []);

      // 2. Fetch Collectives from API or Supabase
      try {
        const res = await fetch("http://localhost:5000/api/collectives");
        if (res.ok) {
          const json = await res.json();
          setCollectives(json.collectives || []);
        } else {
          // fallback to Supabase query if table exists
          const { data: colData } = await supabase
            .from("collectives")
            .select("*")
            .eq("status", "approved")
            .order("name", { ascending: true });
          setCollectives(colData || []);
        }
      } catch (err) {
        console.error("Collectives fetch error:", err);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Helper filter function for search + letter filter
  const filterItem = (name = "") => {
    const matchesSearch = name.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (selectedLetter === "All") return true;
    if (selectedLetter === "#") return /^[^a-zA-Z]/.test(name);
    return name.toUpperCase().startsWith(selectedLetter);
  };

  const filteredDirectory = directoryListings.filter((b) => filterItem(b.business_name || ""));
  const filteredCollectives = collectives.filter((c) => filterItem(c.name || ""));

  return (
    <div className="directory-page">
      {/* HERO */}
      <div className="hero">
        <h1>Directory</h1>
        <p>Explore verified community businesses, organizations, and collective profiles</p>

        <div className="search-row">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search by name, category, or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="tab-buttons">
            <button
              className={activeTab === "all" ? "tab-btn active" : "tab-btn"}
              onClick={() => setActiveTab("all")}
            >
              All Directory
            </button>
            <button
              className={activeTab === "collectives" ? "tab-btn active" : "tab-btn"}
              onClick={() => setActiveTab("collectives")}
            >
              Collectives ({filteredCollectives.length})
            </button>
            <button
              className={activeTab === "directory" ? "tab-btn active" : "tab-btn"}
              onClick={() => setActiveTab("directory")}
            >
              Businesses ({filteredDirectory.length})
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
        {loading ? (
          <div className="loading-state">Loading directory listings...</div>
        ) : (
          <>
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
                          src={col.logo_url || col.banner_url || "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&auto=format&fit=crop&q=60"}
                          alt={col.name}
                          className="img"
                        />
                      </div>
                      <div className="cardTop">
                        <h3 className="title">{col.name}</h3>
                        <span className="badge collective-badge">Collective</span>
                      </div>
                      <div className="info">
                        <p className="description">{col.description ? col.description.slice(0, 90) + "..." : "Community Collective profile"}</p>
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
                  <p>Browse local businesses approved by our community administration</p>
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
            {filteredDirectory.length === 0 && filteredCollectives.length === 0 && (
              <div className="empty-state">
                <h3>No directory listings found matching "{selectedLetter !== "All" ? `Letter: ${selectedLetter}` : search}"</h3>
                <p>Try clearing filters or searching for another keyword.</p>
                <button
                  className="reset-btn"
                  onClick={() => {
                    setSearch("");
                    setSelectedLetter("All");
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

      {/* STYLES */}
      <style>{`
        .directory-page {
          font-family: 'Segoe UI', system-ui, sans-serif;
          background: #f8fafc;
          min-height: 100vh;
        }

        .hero {
          background: linear-gradient(135deg, #0f766e, #047857);
          color: white;
          padding: 50px 8% 40px;
        }

        .hero h1 {
          font-size: 36px;
          font-weight: 800;
          margin-bottom: 8px;
        }

        .hero p {
          margin: 0 0 24px;
          font-size: 16px;
          opacity: 0.9;
        }

        .search-row {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          align-items: center;
          margin-bottom: 20px;
        }

        .search-box input {
          padding: 12px 20px;
          width: 380px;
          max-width: 100%;
          border-radius: 30px;
          border: none;
          font-size: 14px;
          outline: none;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }

        .tab-buttons {
          display: flex;
          gap: 8px;
          background: rgba(255,255,255,0.15);
          padding: 4px;
          border-radius: 30px;
        }

        .tab-btn {
          background: transparent;
          border: none;
          color: white;
          padding: 8px 18px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.2s;
        }

        .tab-btn.active {
          background: white;
          color: #047857;
        }

        /* ALPHABET BAR */
        .alphabet-bar {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
          background: rgba(0,0,0,0.18);
          padding: 10px 16px;
          border-radius: 12px;
        }

        .alphabet-label {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          margin-right: 6px;
          letter-spacing: 0.5px;
        }

        .letter-btn {
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          color: white;
          min-width: 28px;
          height: 28px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.2s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .letter-btn:hover, .letter-btn.active {
          background: #f59e0b;
          color: white;
          border-color: #f59e0b;
        }

        .directory-container {
          padding: 30px 8%;
        }

        .section-block {
          margin-bottom: 40px;
        }

        .section-header {
          margin-bottom: 20px;
        }

        .section-header h2 {
          font-size: 22px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 4px;
        }

        .section-header p {
          font-size: 14px;
          color: #64748b;
          margin: 0;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 22px;
        }

        .card {
          background: white;
          border-radius: 14px;
          padding: 16px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.05);
          border: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          transition: 0.3s;
        }

        .card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }

        .imgWrap {
          width: 100%;
          height: 160px;
          border-radius: 10px;
          overflow: hidden;
          margin-bottom: 12px;
          background: #f1f5f9;
        }

        .img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .cardTop {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .title {
          font-size: 16px;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }

        .badge {
          font-size: 11px;
          background: #e0f2fe;
          color: #0284c7;
          padding: 3px 9px;
          border-radius: 20px;
          font-weight: 600;
        }

        .collective-badge {
          background: #fef3c7;
          color: #b45309;
        }

        .info p {
          font-size: 13px;
          margin: 4px 0;
          color: #475569;
        }

        .description {
          line-height: 1.4;
          color: #64748b !important;
          margin-bottom: 10px !important;
        }

        .visit-btn {
          margin-top: auto;
          background: #0f766e;
          color: white;
          text-align: center;
          padding: 10px;
          border-radius: 8px;
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
          transition: 0.2s;
        }

        .profile-btn {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
        }

        .visit-btn:hover {
          opacity: 0.92;
        }

        .loading-state, .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #64748b;
        }

        .reset-btn {
          margin-top: 15px;
          background: #0f766e;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }

        @media (max-width: 768px) {
          .hero { padding: 40px 20px; }
          .hero h1 { font-size: 26px; }
          .search-box input { width: 100%; }
          .directory-container { padding: 20px; }
        }
      `}</style>
    </div>
  );
};

export default Directory;
