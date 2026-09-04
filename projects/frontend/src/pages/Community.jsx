import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const PAGE_SIZE = 20;

const Community = () => {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // ✅ Texas Temples list (from your message)
  // 👉 For exact GMB profile:
  // Add placeUrl: "https://maps.app.goo.gl/...." (Google Maps share link)
  // If placeUrl not provided, it will fall back to a Maps search link.
  // 👉 For images:
  // Replace image: heroImg(n) with your own "/temples/xxx.jpg" or URL later.
  const temples = useMemo(
    () => [
      // 🔹 Houston & Nearby
      { name: "BAPS Shri Swaminarayan Mandir", city: "Houston / Stafford, TX", image: "/temples/BAPS Shri Swaminarayan Mandir, Houston.png", placeUrl: "" },
      { name: "Sri Meenakshi Devasthanam Temple", city: "Pearland, TX", image: "/temples/Sri Meenakshi Devasthanam.png", placeUrl: "" },
      { name: "ISKCON of Houston (Hare Krishna Temple)", city: "Houston, TX", image: "/temples/ISKCON of Houston - Temple and Cultural Center.png", placeUrl: "" },
      { name: "Sanatan Shiv Shakti Mandir", city: "Houston, TX", image: "/temples/Sanatan Shiv Shakti Mandir of Houston.png", placeUrl: "" },
      { name: "Hindu Worship Society Temple", city: "Houston, TX", image: "/temples/Hindu Worship Society Temple.png", placeUrl: "" },
      { name: "Houston Durga Bari Society", city: "Houston, TX", image: "/temples/Houston Durga Bari Society.png", placeUrl: "" },
      { name: "Sri Guruvayurappan Temple", city: "Houston, TX", image: "/temples/Sri Guruvayurappan Temple Dallas.png", placeUrl: "" },
      { name: "Lakshmi Narayan Mandir", city: "Houston, TX", image: "/temples/Lakshmi Narayan Mandir.png", placeUrl: "" },
      { name: "Aishwarya Srinivasa Perumal Temple", city: "Houston, TX", image: "/temples/Aishwarya Srinivasa Perumal Temple.png", placeUrl: "" },
      { name: "Shri Omkarnath Temple", city: "Navasota / Houston region, TX", image: "/temples/Shri Omkarnath Temple.png", placeUrl: "" },

      // 🔹 Dallas – Fort Worth (DFW)
      { name: "Karya Siddhi Hanuman Temple", city: "Frisco, TX", image: "/temples/Karya Siddhi Hanuman Temple.png", placeUrl: "" },
      { name: "Radha Krishna Temple", city: "Allen, TX", image: "/temples/Radha Krishna Temple of Dallas.png", placeUrl: "" },
      { name: "North Texas Hindu Temple", city: "Dallas, TX", image: "/temples/North Texas Hindu Mandir.png", placeUrl: "" },
      { name: "Kapardi Shirdi Sai Baba Temple", city: "Plano, TX", image: "/temples/Kapardi Shirdi Sai Temple.png", placeUrl: "" },
      { name: "Sri Ganesha Temple", city: "Plano, TX", image: "/temples/Sri Ganesha Temple.png", placeUrl: "" },
      { name: "Sri Shirdi Sai Baba Temple of DFW", city: "Plano, TX", image: "/temples/Sri Shirdi Sai Baba Temple of DFW.png", placeUrl: "" },
      { name: "Shri Swaminarayan Mandir", city: "Grand Prairie, TX", image: "/temples/Shree Swaminarayan Hindu Mandir (Vadtal Sansthan) Dallas.png", placeUrl: "" },
      { name: "DFW Hindu Temple", city: "Irving, TX", image: "/temples/DFW Hindu Temple.png", placeUrl: "" },
      { name: "Sri Sri Radha Kalachandji Mandir", city: "Dallas, TX", image: "/temples/Radha Kalachandji Temple.png", placeUrl: "" },
      { name: "Shri Ram Mandir", city: "Plano, TX", image: "/temples/Shri Ram Mandir Plano.png", placeUrl: "" },

      // 🔹 Austin & Central Texas
      { name: "Radha Madhav Dham", city: "Near Austin, TX", image: "/temples/Radha Madhav Dham.png", placeUrl: "" },
      { name: "Austin Hindu Temple", city: "Austin, TX", image: "/temples/Austin Hindu Temple.png", placeUrl: "" },
      { name: "Sri Venkateswara Temple of Austin (Balaji Temple)", city: "Cedar Park (Austin), TX", image: "/temples/Sri Venkateswara Temple of Austin.png", placeUrl: "" },
      { name: "Hindu Temple of Central Texas", city: "Temple, TX", image: "/temples/Hindu Temple of Central Texas temple.png", placeUrl: "" },
      { name: "Austin Gurukulam (Spiritual Center)", city: "Austin, TX", image: "/temples/Austin Gurukulam.png", placeUrl: "" },

      // 🔹 San Antonio Region
      { name: "The Hindu Temple of San Antonio", city: "Helotes, TX", image: "/temples/Hindu Temple of San Antonio.png", placeUrl: "" },

      // 🔹 Other Texas Cities
      { name: "Hindu Temple of Amarillo", city: "Amarillo, TX", image: "/temples/Hindu Temple of Amarillo.png", placeUrl: "" },
      { name: "Flower Mound Hindu Temple", city: "Flower Mound, TX", image: "/temples/Flower Mound Hindu Temple2.png", placeUrl: "" },
      { name: "Chinmaya Mission", city: "Beaumont, TX", image: "/temples/Chinmaya Mission DFW.png", placeUrl: "" },
      { name: "Sri Venkateswara Temple", city: "Corpus Christi, TX", image: "/temples/Sri Venkateswara Temple.png", placeUrl: "" },
      { name: "Chinmaya Mission DFW – Saaket", city: "Dallas, TX", image: "/temples/Chinmaya Mission DFW.png", placeUrl: "" },
      { name: "Sri Guruvayurappan Temple of Dallas", city: "Carrollton / Dallas, TX", image: "/temples/Sri Guruvayurappan Temple Dallas.png", placeUrl: "" },
    ],
    []
  );

  // ✅ Filter
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return temples;
    return temples.filter(
      (t) =>
        (t.name || "").toLowerCase().includes(s) ||
        (t.city || "").toLowerCase().includes(s)
    );
  }, [q, temples]);

  // ✅ Pagination
  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  const loadMore = () =>
    setVisibleCount((v) => Math.min(v + PAGE_SIZE, filtered.length));

  const showAll = () => setVisibleCount(filtered.length);
  const resetDefault = () => setVisibleCount(PAGE_SIZE);

  // ✅ Maps link
  // If placeUrl provided -> exact business profile
  // else -> search (usually opens profile, but exact guarantee only with placeUrl)
  const gmbUrl = (t) => {
    if (t?.placeUrl && t.placeUrl.trim()) return t.placeUrl.trim();
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${t.name}, ${t.city}`
    )}`;
  };

  const open = (url) => window.open(url, "_blank", "noopener,noreferrer");

  return (
    <>
      <div className="cthx">
        {/* HERO */}
        <section className="cthx__hero">
          <div className="cthx__heroInner">
            <div className="cthx__heroLeft">
              <span className="cthx__pill">Public Community</span>
              <h1 className="cthx__h1">Hindu Temples in Texas</h1>
              <p className="cthx__p">
                Texas lo popular Hindu temples/mandirs. <b>Directions</b> click chesthe
                Google Maps business profile open avuthundi (reviews + photos Google lo ne).
              </p>

              <div className="cthx__heroActions">
                <button className="cthx__btn cthx__btnPrimary" onClick={() => navigate("/login")}>
                  Login / Register
                </button>
                <button
                  className="cthx__btn cthx__btnGhost"
                  onClick={() => document.getElementById("temples")?.scrollIntoView({ behavior: "smooth" })}
                >
                  View Temples
                </button>
              </div>
            </div>

            <div className="cthx__heroRight">
              <div className="cthx__glass">
                <div className="cthx__glassTitle">Search Temples (Texas)</div>

                <div className="cthx__searchRow">
                  <input
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value);
                      setVisibleCount(PAGE_SIZE);
                    }}
                    placeholder="Search by temple name or city..."
                    className="cthx__search"
                  />
                  <button
                    className="cthx__iconBtn"
                    onClick={() => {
                      setQ("");
                      setVisibleCount(PAGE_SIZE);
                    }}
                    title="Clear"
                  >
                    ✕
                  </button>
                </div>

                <div className="cthx__stats">
                  <div className="cthx__stat">
                    <div className="cthx__statBig">{visible.length}</div>
                    <div className="cthx__statSmall">Showing</div>
                  </div>
                  <div className="cthx__stat">
                    <div className="cthx__statBig">{filtered.length}</div>
                    <div className="cthx__statSmall">Total</div>
                  </div>
                  <div className="cthx__stat">
                    <div className="cthx__statBig">Texas</div>
                    <div className="cthx__statSmall">State</div>
                  </div>
                </div>

                <div className="cthx__hint">
                  Best result: each temple ki <b>placeUrl</b> add cheyyandi (Google Maps Share link).
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* GRID */}
        <section className="cthx__section" id="temples">
          <div className="cthx__sectionHead">
            <h2 className="cthx__h2">Temples</h2>
            <div className="cthx__smallMuted">
              Default {PAGE_SIZE} • Read More click chesthe remaining show avuthayi
            </div>
          </div>

          <div className="cthx__grid">
            {visible.map((t, idx) => (
              <div className="cthx__card" key={`${t.name}-${idx}`} style={{ animationDelay: `${idx * 18}ms` }}>
                <div className="cthx__imgWrap">
                  <img src={t.image} alt={t.name} loading="lazy" />
                  <div className="cthx__imgShade" />
                  <div className="cthx__tag">{t.city}</div>
                </div>

                <div className="cthx__cardBody">
                  <div className="cthx__name">{t.name}</div>

                  <div className="cthx__cardBtns">
                    {/* ✅ Main action */}
                    <button className="cthx__btnSmall cthx__btnPrimary" onClick={() => open(gmbUrl(t))}>
                      View Temple
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="cthx__empty">No temples found. Try a different keyword.</div>
          )}

          {/* ✅ Read More controls */}
          {filtered.length > visible.length && (
            <div className="cthx__moreRow">
              <button className="cthx__btn cthx__btnPrimary" onClick={loadMore}>
                Read More (+{Math.min(PAGE_SIZE, filtered.length - visible.length)})
              </button>
            </div>
          )}

          {filtered.length <= visible.length && filtered.length > PAGE_SIZE && (
            <div className="cthx__moreRow">
              <button className="cthx__btn cthx__btnGhost" onClick={resetDefault}>
                Back to Default ({PAGE_SIZE})
              </button>
            </div>
          )}
        </section>

        {/* MAP (Texas) */}
        <section className="cthx__mapSection">
          <div className="cthx__mapHead">
            <h2 className="cthx__h2">Map</h2>
            <div className="cthx__smallMuted">Browse Hindu temples across Texas on Google Map</div>
          </div>

          <div className="cthx__mapBox">
            <iframe
              title="Hindu Temples in Texas Map"
              src="https://www.google.com/maps?q=Hindu%20Temples%20in%20Texas&output=embed"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </section>
      </div>

      {/* ✅ Styles (your same scoped styles) */}
      <style>{`
        *{ box-sizing:border-box; }

        .cthx{
  max-width: 1400px;
  margin: 0 auto;
  color:#0f172a;
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;

  /* ✅ add padding for below sections */
  padding: 0 22px 28px;
}

        /* HERO */
        .cthx__hero{
  margin-top: 0;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
  width: 100vw;
  border-radius: 0;
  overflow: hidden;
  background:
    radial-gradient(900px 420px at 18% 10%, rgba(22,163,74,0.18), transparent),
    radial-gradient(700px 400px at 85% 20%, rgba(15,118,110,0.20), transparent),
    linear-gradient(135deg, #0f766e, #16a34a);
  box-shadow: 0 22px 60px rgba(2,6,23,0.16);
  animation: cthxFade .5s ease both;
}

        .cthx__heroInner{
          padding: 70px 30px 70px 70px;
          display:grid;
          grid-template-columns: 1.3fr 0.9fr;
          align-items:center;
        }

        .cthx__pill{
          display:inline-flex;
          width: fit-content;
          padding: 6px 12px;
          border-radius: 999px;
          font-weight: 900;
          font-size: 12px;
          color: rgba(255,255,255,0.92);
          background: rgba(255,255,255,0.18);
          border: 1px solid rgba(255,255,255,0.22);
          backdrop-filter: blur(10px);
        }

        .cthx__h1{
          margin: 12px 0 0;
          font-size: clamp(26px, 3.2vw, 44px);
          line-height: 1.08;
          color:#fff;
          letter-spacing: 0.2px;
          text-shadow: 0 16px 40px rgba(0,0,0,0.22);
        }

        .cthx__p{
          margin: 12px 0 0;
          color: rgba(255,255,255,0.86);
          max-width: 680px;
          line-height: 1.7;
          font-weight: 600;
        }

        .cthx__heroActions{
          margin-top: 18px;
          display:flex;
          gap:12px;
          flex-wrap:wrap;
        }

        .cthx__btn{
          border:none;
          cursor:pointer;
          border-radius: 14px;
          padding: 12px 16px;
          font-weight: 900;
          transition: transform .18s ease, box-shadow .18s ease, filter .18s ease;
        }
        .cthx__btn:active{ transform: translateY(1px) scale(0.99); }

        .cthx__btnPrimary{
          background: linear-gradient(135deg, #0f766e, #16a34a);
          color:#fff;
          box-shadow: 0 18px 38px rgba(2,6,23,0.18);
        }
        .cthx__btnPrimary:hover{
          filter: brightness(1.02);
          transform: translateY(-2px);
          box-shadow: 0 22px 46px rgba(2,6,23,0.22);
        }

        .cthx__btnGhost{
          background: linear-gradient(135deg, #0f766e, #16a34a);
          color:#fff;
          backdrop-filter: blur(10px);
        }
        .cthx__btnGhost:hover{ transform: translateY(-2px); }

        /* Right glass card */
        .cthx__glass{
          background: rgba(255,255,255,0.16);
          border: 1px solid rgba(255,255,255,0.24);
          border-radius: 20px;
          padding: 18px;
          backdrop-filter: blur(14px);
          box-shadow: 0 22px 60px rgba(0,0,0,0.18);
          transition: transform .2s ease;
          animation: cthxUp .55s ease both;
        }
        .cthx__glass:hover{ transform: translateY(-2px); }

        .cthx__glassTitle{
          font-weight: 1000;
          color:#fff;
          letter-spacing: .2px;
          margin-bottom: 10px;
        }

        .cthx__searchRow{
          display:flex;
          gap:10px;
          align-items:center;
        }

        .cthx__search{
          flex:1;
          padding: 12px 12px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.24);
          background: rgba(255,255,255,0.14);
          outline:none;
          color:#fff;
          font-weight: 800;
        }
        .cthx__search::placeholder{ color: rgba(255,255,255,0.70); }

        .cthx__iconBtn{
          width:44px;
          height:44px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.22);
          background: rgba(255,255,255,0.14);
          color:#fff;
          cursor:pointer;
          font-weight: 900;
          transition: transform .18s ease;
        }
        .cthx__iconBtn:hover{ transform: translateY(-2px); }

        .cthx__stats{
          margin-top: 14px;
          display:grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        .cthx__stat{
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.20);
          border-radius: 16px;
          padding: 10px 12px;
        }
        .cthx__statBig{
          font-weight: 1000;
          color:#fff;
          font-size: 16px;
        }
        .cthx__statSmall{
          margin-top: 4px;
          color: rgba(255,255,255,0.78);
          font-size: 12px;
          font-weight: 800;
        }

        .cthx__hint{
          margin-top: 12px;
          color: rgba(255,255,255,0.82);
          font-size: 12px;
          font-weight: 700;
        }

        /* SECTION */
        .cthx__section{
          padding: 26px 0 0;
          animation: cthxFade .5s ease both;
        }

        .cthx__sectionHead{
          margin-top: 18px;
          display:flex;
          align-items:flex-end;
          justify-content:space-between;
          gap:12px;
        }

        .cthx__h2{
          margin:0;
          font-size: 22px;
          font-weight: 1000;
          letter-spacing: .2px;
        }

        .cthx__smallMuted{
          color:#64748b;
          font-size: 12px;
          font-weight: 800;
        }

        /* GRID */
        .cthx__grid{
          margin-top: 14px;
          display:grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .cthx__card{
          background:#fff;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          overflow:hidden;
          box-shadow: 0 12px 34px rgba(2,6,23,0.08);
          transition: transform .2s ease, box-shadow .2s ease;
          animation: cthxCard .45s ease both;
        }
        .cthx__card:hover{
          transform: translateY(-4px);
          box-shadow: 0 18px 44px rgba(2,6,23,0.12);
        }

        .cthx__imgWrap{
          position:relative;
          height: 150px;
          overflow:hidden;
        }
        .cthx__imgWrap img{
          width:100%;
          height:100%;
          object-fit: cover;
          transform: scale(1.02);
          transition: transform .35s ease;
        }
        .cthx__card:hover .cthx__imgWrap img{
          transform: scale(1.08);
        }

        .cthx__imgShade{
          position:absolute;
          inset:0;
          background: linear-gradient(180deg, rgba(2,6,23,0.0), rgba(2,6,23,0.45));
        }

        .cthx__tag{
          position:absolute;
          left: 10px;
          bottom: 10px;
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(255,255,255,0.92);
          color:#0f172a;
          font-size: 12px;
          font-weight: 1000;
          box-shadow: 0 12px 26px rgba(2,6,23,0.16);
        }

        .cthx__cardBody{
          padding: 25px;
        }

        .cthx__name{
          font-weight: 1000;
          color:#0f172a;
          font-size: 14px;
          line-height: 1.3;
          min-height: 36px;
          text-align: center;
        }

        .cthx__cardBtns{
          margin-top: 10px;
          display:flex;
          gap:10px;
        }

        .cthx__btnSmall{
          flex:1;
          border:none;
          cursor:pointer;
          border-radius: 12px;
          padding: 10px 10px;
          font-weight: 1000;
          font-size: 12px;
          transition: transform .18s ease, box-shadow .18s ease, filter .18s ease;
        }
        .cthx__btnSmall:active{ transform: translateY(1px) scale(0.99); }

        .cthx__empty{
          margin-top: 12px;
          padding: 14px;
          border-radius: 14px;
          border:1px dashed #cbd5e1;
          color:#64748b;
          font-weight: 800;
          background:#fff;
        }

        .cthx__moreRow{
          margin-top: 14px;
          display:flex;
          gap:12px;
          justify-content:center;
          flex-wrap:wrap;
        }

        /* MAP */
        .cthx__mapSection{
  margin-top: 28px;   /* was 18px */
  padding-top: 12px;
}
        .cthx__mapHead{
          display:flex;
          align-items:flex-end;
          justify-content:space-between;
          gap:12px;
          margin-bottom: 12px;
        }
        .cthx__mapBox{
          border-radius: 18px;
          overflow:hidden;
          border: 1px solid #e5e7eb;
          box-shadow: 0 14px 40px rgba(2,6,23,0.08);
          background:#fff;
        }
        .cthx__mapBox iframe{
          width:100%;
          height: 420px;
          border:0;
          display:block;
        }

        /* Animations */
        @keyframes cthxFade{ from{ opacity:0; } to{ opacity:1; } }
        @keyframes cthxUp{ from{ opacity:0; transform: translateY(10px); } to{ opacity:1; transform: translateY(0); } }
        @keyframes cthxCard{ from{ opacity:0; transform: translateY(10px); } to{ opacity:1; transform: translateY(0); } }

        /* Responsive */
        @media(max-width: 1100px){
          .cthx__heroInner{ grid-template-columns: 1fr; }
          .cthx__grid{ grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media(max-width: 640px){
          .cthx{ padding: 0 12px 22px; }
          .cthx__heroInner{ padding: 26px 16px; }
          .cthx__grid{ grid-template-columns: 1fr; }
          .cthx__mapBox iframe{ height: 320px; }
        }

        @media (prefers-reduced-motion: reduce){
          .cthx__hero, .cthx__glass, .cthx__card { animation: none !important; }
          .cthx__card, .cthx__btn, .cthx__btnSmall { transition: none !important; }
        }
          @media(max-width: 640px){
  .cthx{ padding: 0 14px 22px; }  /* was 0 12px 22px */
}
      `}</style>
    </>
  );
};

// ✅ helper images (temporary). Replace later with your temple images.
function heroImg(seed) {
  const imgs = [
    "https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1526779259212-939e64788e3c?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1500043357865-c6b8827edf7f?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1519337265831-281ec6cc8514?auto=format&fit=crop&w=1400&q=80",
  ];
  return imgs[(seed - 1) % imgs.length];
}

export default Community;