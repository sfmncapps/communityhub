import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../config/supabaseClient";

const Classifieds = () => {
  const nav = useNavigate();

  const [loading, setLoading] = useState(false);
  const [ads, setAds] = useState([]);

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");

  const fetchApproved = async () => {
    setLoading(true);
    try {
      const nowIso = new Date().toISOString();

      const { data, error } = await supabase
        .from("classifieds")
        .select("*")
        .eq("status", "approved")
        .gt("expires_at", nowIso)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAds(data || []);
    } catch (e) {
      console.error(e);
      alert(e.message || "Failed to load listings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApproved();
  }, []);

  const categories = useMemo(() => {
    const set = new Set(ads.map((a) => a.category).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [ads]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();

    return ads.filter((a) => {
      const matchTerm =
        !term ||
        (a.title || "").toLowerCase().includes(term) ||
        (a.description || "").toLowerCase().includes(term) ||
        (a.city || "").toLowerCase().includes(term);

      const matchCat = category === "all" || a.category === category;
      return matchTerm && matchCat;
    });
  }, [ads, q, category]);

  // ✅ helper: YouTube embed url (normal link -> embed)
  const toEmbedUrl = (url = "") => {
    try {
      const u = new URL(url);
      const vid = u.searchParams.get("v");
      if (vid) return `https://www.youtube.com/embed/${vid}`;
      if (u.hostname.includes("youtu.be")) {
        const id = u.pathname.replace("/", "");
        return id ? `https://www.youtube.com/embed/${id}` : url;
      }
      return url;
    } catch {
      return url;
    }
  };

  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="heroInner">
          <h1>Community Classifieds</h1>
          <p>Post your ad in minutes. Listings go live after admin approval.</p>

          <div className="heroBtns">
            <button className="btnPrimary" onClick={() => nav("/my-classifieds")}>
              Post a Classified
            </button>
            <button
              className="btnGhost"
              onClick={() =>
                document.getElementById("listings")?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Browse Listings
            </button>
          </div>
        </div>
      </section>

      {/* LISTINGS */}
      <section className="wrap" id="listings">
        <div className="topRow">
          <h2>Approved Listings</h2>

          <div className="controls">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search title, city, description..."
            />

            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === "all" ? "All Categories" : c}
                </option>
              ))}
            </select>

            <button className="btnSmall" onClick={fetchApproved} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {loading && <p className="muted">Loading listings...</p>}

        {!loading && filtered.length === 0 && (
          <div className="empty">
            <h3>No approved listings yet</h3>
            <p>Once admin approves ads, they will appear here automatically.</p>
          </div>
        )}

        {/* ✅ Card Grid */}
        <div className="grid">
          {filtered.map((ad) => {
            const showImage = ad.media_type === "image" && ad.media_url;
            const showVideo = ad.media_type === "video" && ad.youtube_url;

            return (
              <div className="adCard" key={ad.id}>
                {/* ✅ ONLY ONE MEDIA BOX */}
                <div className="mediaBox">
                  {showImage ? (
                    <img src={ad.media_url} alt={ad.title || "Classified"} />
                  ) : showVideo ? (
                    <iframe
                      src={toEmbedUrl(ad.youtube_url)}
                      title={ad.title || "Video"}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <div className="mediaFallback">
                      <div className="fallbackTitle">{ad.category || "Classified"}</div>
                      <div className="fallbackSub">No media uploaded</div>
                    </div>
                  )}

                  <div className="mediaBadges">
                    <span className="badge">{ad.category}</span>
                    {ad.sub_category ? (
                      <span className="badge ghost">{ad.sub_category}</span>
                    ) : null}
                  </div>
                </div>

                {/* BODY */}
                <div className="body">
                  <div className="rowTop">
                    <div className="title">{ad.title}</div>
                    <div className="price">{ad.price ? `$${ad.price}` : "NA"}</div>
                  </div>

                  <div className="meta">
                    <span className="metaTag">
                      {ad.city} • {ad.zip_code}
                    </span>
                    <span className="metaTag">
                      {ad.region} • {ad.state}
                    </span>
                  </div>

                  <div className="desc">{ad.description}</div>

                  <div className="bottom">
                    <div className="contact">
                      <div className="contactTitle">Contact</div>
                      <div className="contactLine">
                        <b>{ad.contact_name}</b> • {ad.contact_phone}
                      </div>
                      {ad.contact_email ? (
                        <div className="contactLine">{ad.contact_email}</div>
                      ) : null}
                      {ad.contact_whatsapp ? (
                        <div className="contactLine">WhatsApp: {ad.contact_whatsapp}</div>
                      ) : null}
                    </div>

                    {showVideo ? (
                      <a className="cta" href={ad.youtube_url} target="_blank" rel="noreferrer">
                        Watch on YouTube →
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* STYLES */}
      <style>{`
        .hero{
          padding:70px 30px 70px 0px ;
          background: linear-gradient(135deg, #0f9d58, #0c7c46);
          color: #fff;
        }
        .heroInner{
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 15px;   /* ✅ add this */
}

        .hero h1{
          margin: 0;
          font-size: 40px;
          letter-spacing: -0.5px;
        }
        .hero p{
          margin: 10px 0 0 0;
          opacity: 0.95;
          font-size: 16px;
        }
        .heroBtns{
          margin-top: 22px;
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .btnPrimary{
          border: none;
          padding: 12px 18px;
          border-radius: 12px;
          background: #fff;
          color: #111827;
          font-weight: 900;
          cursor: pointer;
        }
        .btnGhost{
          border: 2px solid rgba(255,255,255,0.9);
          padding: 12px 18px;
          border-radius: 12px;
          background: transparent;
          color: #fff;
          font-weight: 900;
          cursor: pointer;
        }

        .wrap{
          padding: 22px;
          background: #f4f6f9;
          min-height: 60vh;
        }
        .topRow{
          max-width: 1100px;
          margin: 0 auto 12px auto;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .topRow h2{ margin: 0; color: #111827; }

        .controls{
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
        }
        .controls input, .controls select{
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid #d1d5db;
          background: #fff;
          outline: none;
          min-width: 220px;
        }
        .btnSmall{
          border: none;
          padding: 10px 12px;
          border-radius: 12px;
          background: #111827;
          color: #fff;
          font-weight: 900;
          cursor: pointer;
        }
        .btnSmall:disabled{ opacity: 0.6; cursor: not-allowed; }

        .grid{
  max-width: 1100px;
  margin: 14px auto 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); /* ✅ 320 -> 300 */
  gap: 14px;
}


        .adCard{
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 26px rgba(0,0,0,0.06);
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .adCard:hover{
          transform: translateY(-4px);
          box-shadow: 0 18px 40px rgba(0,0,0,0.12);
        }

        .mediaBox{
          position: relative;
          width: 100%;
          height: 190px;
          background: #111827;
        }
        .mediaBox img{
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .mediaBox iframe{
          width: 100%;
          height: 100%;
          border: 0;
          display: block;
        }

        .mediaFallback{
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          color: #e5e7eb;
          background: linear-gradient(135deg,#111827,#374151);
        }
        .fallbackTitle{ font-weight: 900; }
        .fallbackSub{ opacity: 0.8; font-size: 12px; margin-top: 6px; }

        .mediaBadges{
          position: absolute;
          left: 12px;
          bottom: 12px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .badge{
          font-size: 11px;
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(255,255,255,0.92);
          color: #111827;
          font-weight: 900;
        }
        .badge.ghost{
          background: rgba(17,24,39,0.78);
          color: #fff;
        }

        .body{ padding: 14px; }

        .rowTop{
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 10px;
        }
        .title{
          font-weight: 900;
          color: #111827;
          font-size: 15px;
          line-height: 1.2;
        }
        .price{
          font-weight: 900;
          color: #111827;
          white-space: nowrap;
        }

        .meta{
          margin-top: 10px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .metaTag{
          font-size: 11px;
          padding: 6px 10px;
          border-radius: 999px;
          background: #f3f4f6;
          color: #111827;
          font-weight: 800;
        }

        .desc{
          margin-top: 10px;
          font-size: 13px;
          color: #374151;
          line-height: 1.55;
          min-height: 52px;
          white-space: pre-wrap;
        }

        .bottom{
          margin-top: 12px;
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-end;
          flex-wrap: wrap;
          padding-top: 12px;
          border-top: 1px solid #eef2f7;
        }

        .contactTitle{
          font-size: 11px;
          font-weight: 900;
          color: #111827;
          margin-bottom: 4px;
        }
        .contactLine{
          font-size: 12px;
          color: #374151;
          line-height: 1.4;
        }

        .cta{
          font-size: 12px;
          font-weight: 900;
          color: #2563eb;
          text-decoration: none;
          white-space: nowrap;
        }

        .muted{ color: #6b7280; }

        .empty{
          max-width: 1100px;
          margin: 18px auto;
          padding: 24px;
          border: 1px dashed #cbd5e1;
          background: #fff;
          border-radius: 14px;
          text-align: center;
          color: #6b7280;
        }

        @media (max-width: 560px){
          .controls input, .controls select{ min-width: 100%; }
          .hero h1{ font-size: 34px; }
          .mediaBox{ height: 175px; }
        }

        /* ================= RESPONSIVE ================= */

/* Large Tablets */
@media (max-width: 1024px){
  .hero h1{
    font-size: 38px;
  }

  .grid{
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); /* ✅ auto-fit */
  }
}

/* Tablets */
@media (max-width: 768px){

  .hero{
    padding: 60px 20px;
  }

  .heroInner{
    text-align: center;
  }

  .heroBtns{
    justify-content: center;
  }

  .wrap{
    padding: 18px;
  }

  .topRow{
    flex-direction: column;
    align-items: stretch;
  }

  .controls{
    width: 100%;
  }

  .controls input,
  .controls select,
  .btnSmall{
    width: 100%;
  }

  /* ✅ mobile lo squeeze avvakunda auto manage */
  .grid{
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  }

  .bottom{
    flex-direction: column;
    align-items: stretch;
  }

  .cta{
    width: 100%;
    text-align: center;
  }
}

/* Small Phones */
@media (max-width: 480px){

  .hero{
    padding: 50px 16px;
  }

  .hero h1{
    font-size: 28px;
  }

  .hero p{
    font-size: 14px;
  }

  .btnPrimary,
  .btnGhost{
    width: 100%;
  }

  .wrap{
    padding: 14px;
  }

  /* ✅ 480 below always single column */
  .grid{
    grid-template-columns: 1fr;
  }

  .mediaBox{
    height: 160px;
  }

  .title{
    font-size: 14px;
  }

  .price{
    font-size: 14px;
  }

  .desc{
    font-size: 12px;
  }

  .contactLine{
    font-size: 11px;
  }
}


      `}</style>
    </>
  );
};

export default Classifieds;
