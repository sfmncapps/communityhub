import { useMemo, useState } from "react";

const DashboardHome = () => {
  // ✅ Replace this with your real API response later
  const sampleData = {
    totals: {
      jobs: 4,
      listings: 2,
      classifieds: 1,
      posts: 3,
    },
    trends: {
      jobs: 12, // +12%
      listings: -5,
      classifieds: 25,
      posts: 8,
    },
    // monthly activity (12 months)
    monthly: [
      { m: "Jan", jobs: 1, listings: 0, classifieds: 0, posts: 1 },
      { m: "Feb", jobs: 0, listings: 1, classifieds: 0, posts: 0 },
      { m: "Mar", jobs: 2, listings: 0, classifieds: 1, posts: 1 },
      { m: "Apr", jobs: 1, listings: 0, classifieds: 0, posts: 2 },
      { m: "May", jobs: 0, listings: 0, classifieds: 0, posts: 1 },
      { m: "Jun", jobs: 0, listings: 1, classifieds: 0, posts: 0 },
      { m: "Jul", jobs: 1, listings: 0, classifieds: 0, posts: 1 },
      { m: "Aug", jobs: 0, listings: 0, classifieds: 0, posts: 0 },
      { m: "Sep", jobs: 0, listings: 0, classifieds: 0, posts: 0 },
      { m: "Oct", jobs: 1, listings: 0, classifieds: 0, posts: 1 },
      { m: "Nov", jobs: 0, listings: 0, classifieds: 0, posts: 0 },
      { m: "Dec", jobs: 1, listings: 0, classifieds: 0, posts: 1 },
    ],
    recent: [
      { type: "Job", title: "Driver Required", date: "Today" },
      { type: "Classified", title: "Used Bike for Sale", date: "Yesterday" },
      { type: "Post", title: "Community Meetup", date: "2 days ago" },
      { type: "Listing", title: "Home Tuition", date: "4 days ago" },
    ],
  };

  const [range, setRange] = useState("this_month"); // this_month | last_30 | this_year
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM (custom)

  // ✅ In future: use range/month to call API and update data
  const headerText = useMemo(() => {
    if (range === "this_month") return "This Month Overview";
    if (range === "last_30") return "Last 30 Days Overview";
    return "This Year Overview";
  }, [range]);

  const cards = useMemo(() => {
    return [
      {
        key: "jobs",
        label: "My Jobs",
        value: sampleData.totals.jobs,
        trend: sampleData.trends.jobs,
        hint: "Job posts created",
      },
      {
        key: "listings",
        label: "My Listings",
        value: sampleData.totals.listings,
        trend: sampleData.trends.listings,
        hint: "Directory listings",
      },
      {
        key: "classifieds",
        label: "My Classifieds",
        value: sampleData.totals.classifieds,
        trend: sampleData.trends.classifieds,
        hint: "Items & services",
      },
      {
        key: "posts",
        label: "Community Posts",
        value: sampleData.totals.posts,
        trend: sampleData.trends.posts,
        hint: "Community updates",
      },
    ];
  }, [sampleData]);

  // Sparkline points (simple, based on monthly sum for each card)
  const sparkFor = (key) => {
    const values = sampleData.monthly.map((x) => x[key] || 0);
    const max = Math.max(...values, 1);
    const w = 120, h = 32, pad = 2;
    const step = w / (values.length - 1);

    return values
      .map((v, i) => {
        const x = i * step;
        const y = h - pad - (v / max) * (h - pad * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  };

  // Total activity line chart (sum of all types)
  const linePoints = useMemo(() => {
    const values = sampleData.monthly.map(
      (x) => (x.jobs || 0) + (x.listings || 0) + (x.classifieds || 0) + (x.posts || 0)
    );
    const max = Math.max(...values, 1);
    const w = 560, h = 160, pad = 10;
    const step = w / (values.length - 1);

    const pts = values.map((v, i) => {
      const x = i * step;
      const y = h - pad - (v / max) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return { pts: pts.join(" "), max, values };
  }, [sampleData]);

  const barData = useMemo(() => {
    return [
      { k: "Jobs", v: sampleData.totals.jobs },
      { k: "Listings", v: sampleData.totals.listings },
      { k: "Classifieds", v: sampleData.totals.classifieds },
      { k: "Posts", v: sampleData.totals.posts },
    ];
  }, [sampleData]);

  const barMax = Math.max(...barData.map((b) => b.v), 1);

  const TrendPill = ({ trend }) => {
    const up = trend >= 0;
    return (
      <span className={`dbx__trend ${up ? "dbx__trendUp" : "dbx__trendDown"}`}>
        {up ? "▲" : "▼"} {Math.abs(trend)}%
      </span>
    );
  };

  return (
    <>
      <div className="dbx">
        {/* TOP HEADER */}
        <div className="dbx__top">
          <div>
            <h2 className="dbx__title">My Dashboard</h2>
            <div className="dbx__subtitle">{headerText}</div>
          </div>

          <div className="dbx__filters">
            <div className="dbx__seg">
              <button
                className={`dbx__segBtn ${range === "this_month" ? "isActive" : ""}`}
                onClick={() => setRange("this_month")}
              >
                This Month
              </button>
              <button
                className={`dbx__segBtn ${range === "last_30" ? "isActive" : ""}`}
                onClick={() => setRange("last_30")}
              >
                Last 30 Days
              </button>
              <button
                className={`dbx__segBtn ${range === "this_year" ? "isActive" : ""}`}
                onClick={() => setRange("this_year")}
              >
                This Year
              </button>
            </div>

            <div className="dbx__month">
              <span className="dbx__monthLabel">Month</span>
              <input
                type="month"
                className="dbx__monthInput"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                title="Custom month (UI)"
              />
            </div>
          </div>
        </div>

        {/* STAT CARDS */}
        <div className="dbx__cards">
          {cards.map((c) => (
            <div key={c.key} className="dbx__card">
              <div className="dbx__cardTop">
                <div>
                  <div className="dbx__cardLabel">{c.label}</div>
                  <div className="dbx__cardValue">{c.value}</div>
                </div>
                <TrendPill trend={c.trend} />
              </div>

              <div className="dbx__cardBottom">
                <div className="dbx__hint">{c.hint}</div>
                <svg className="dbx__spark" viewBox="0 0 120 32" preserveAspectRatio="none">
                  <polyline points={sparkFor(c.key)} fill="none" strokeWidth="2" />
                </svg>
              </div>
            </div>
          ))}
        </div>

        {/* MAIN GRID */}
        <div className="dbx__grid">
          {/* Left: Activity Chart */}
          <div className="dbx__panel dbx__panelBig">
            <div className="dbx__panelHead">
              <div>
                <div className="dbx__panelTitle">Activity (Monthly)</div>
                <div className="dbx__panelSub">Jobs + Listings + Classifieds + Posts</div>
              </div>

              <div className="dbx__legend">
                <span className="dbx__dot" />
                <span>Total Activity</span>
              </div>
            </div>

            <div className="dbx__chartWrap">
              <svg className="dbx__line" viewBox="0 0 560 160" preserveAspectRatio="none">
                <polyline points={linePoints.pts} fill="none" strokeWidth="3" />
              </svg>

              <div className="dbx__xlabels">
                {sampleData.monthly.map((x) => (
                  <span key={x.m}>{x.m}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Breakdown + Quick actions */}
          <div className="dbx__side">
            <div className="dbx__panel">
              <div className="dbx__panelHead">
                <div className="dbx__panelTitle">Breakdown</div>
                <div className="dbx__panelSub">Totals</div>
              </div>

              <div className="dbx__bars">
                {barData.map((b) => (
                  <div key={b.k} className="dbx__barRow">
                    <div className="dbx__barLabel">{b.k}</div>
                    <div className="dbx__barTrack">
                      <div
                        className="dbx__barFill"
                        style={{ width: `${(b.v / barMax) * 100}%` }}
                      />
                    </div>
                    <div className="dbx__barVal">{b.v}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="dbx__panel">
              <div className="dbx__panelHead">
                <div className="dbx__panelTitle">Quick Actions</div>
                <div className="dbx__panelSub">Create new</div>
              </div>

              <div className="dbx__actionsGrid">
                <button className="dbx__qa">+ Post Job</button>
                <button className="dbx__qa">+ Add Listing</button>
                <button className="dbx__qa">+ Add Classified</button>
                <button className="dbx__qa">+ Create Post</button>
              </div>
            </div>
          </div>

          {/* Recent Activity full row */}
          <div className="dbx__panel dbx__panelFull">
            <div className="dbx__panelHead">
              <div className="dbx__panelTitle">Recent Activity</div>
              <div className="dbx__panelSub">Latest updates</div>
            </div>

            <div className="dbx__list">
              {sampleData.recent.map((r, idx) => (
                <div key={idx} className="dbx__item">
                  <div className="dbx__badge">{r.type}</div>
                  <div className="dbx__itemTitle">{r.title}</div>
                  <div className="dbx__itemDate">{r.date}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        /* ✅ Scoped dashboard styles */
        .dbx{
          padding: 18px;
          max-width: 1180px;
        }

        .dbx__top{
          display:flex;
          justify-content:space-between;
          align-items:flex-end;
          gap:14px;
          margin-bottom: 14px;
        }
        .dbx__title{ margin:0; font-size:26px; }
        .dbx__subtitle{ color:#64748b; margin-top:6px; font-size:13px; }

        .dbx__filters{
          display:flex;
          gap:12px;
          align-items:center;
          flex-wrap:wrap;
        }
        .dbx__seg{
          display:flex;
          background:#fff;
          border:1px solid #e5e7eb;
          border-radius:12px;
          padding:4px;
          box-shadow: 0 10px 26px rgba(2,6,23,0.06);
        }
        .dbx__segBtn{
          border:none;
          background:transparent;
          padding:8px 12px;
          border-radius:10px;
          cursor:pointer;
          font-weight:800;
          color:#0f172a;
          transition: transform .15s ease, background .15s ease;
          font-size:12px;
        }
        .dbx__segBtn:hover{ transform: translateY(-1px); background:#f8fafc; }
        .dbx__segBtn.isActive{
          color:#fff;
          background: linear-gradient(135deg, #0f766e, #16a34a);
          box-shadow: 0 14px 30px rgba(22,163,74,0.18);
        }

        .dbx__month{
          display:flex;
          align-items:center;
          gap:8px;
          background:#fff;
          border:1px solid #e5e7eb;
          border-radius:12px;
          padding:8px 10px;
          box-shadow: 0 10px 26px rgba(2,6,23,0.06);
        }
        .dbx__monthLabel{ font-size:12px; color:#64748b; font-weight:800; }
        .dbx__monthInput{
          border:1px solid #e5e7eb;
          border-radius:10px;
          padding:6px 8px;
          outline:none;
          font-weight:800;
          font-size:12px;
          background:#fff;
        }

        /* Cards */
        .dbx__cards{
          display:grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap:14px;
          margin-bottom: 14px;
        }
        .dbx__card{
          background:#fff;
          border:1px solid #e5e7eb;
          border-radius:16px;
          padding:14px;
          box-shadow: 0 10px 28px rgba(2,6,23,0.06);
          transition: transform .18s ease, box-shadow .18s ease;
          animation: dbxUp .35s ease both;
        }
        .dbx__card:hover{
          transform: translateY(-2px);
          box-shadow: 0 16px 38px rgba(2,6,23,0.10);
        }
        .dbx__cardTop{
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          gap:10px;
        }
        .dbx__cardLabel{ color:#64748b; font-size:13px; font-weight:800; }
        .dbx__cardValue{ font-size:28px; font-weight:900; margin-top:6px; }
        .dbx__trend{
          font-size:12px;
          font-weight:900;
          padding:6px 10px;
          border-radius:999px;
          border:1px solid transparent;
          white-space:nowrap;
        }
        .dbx__trendUp{ background:#ecfdf5; color:#166534; border-color:#bbf7d0; }
        .dbx__trendDown{ background:#fff1f2; color:#9f1239; border-color:#fecdd3; }

        .dbx__cardBottom{
          display:flex;
          justify-content:space-between;
          align-items:flex-end;
          margin-top: 10px;
          gap:10px;
        }
        .dbx__hint{ color:#94a3b8; font-size:12px; font-weight:700; }
        .dbx__spark{
          width:120px;
          height:32px;
        }
        .dbx__spark polyline{
          stroke: url(#none);
          stroke: #16a34a;
          opacity: 0.9;
        }

        /* Main grid */
        .dbx__grid{
          display:grid;
          grid-template-columns: 1.6fr 1fr;
          gap:14px;
        }
        .dbx__side{
          display:flex;
          flex-direction:column;
          gap:14px;
        }

        .dbx__panel{
          background:#fff;
          border:1px solid #e5e7eb;
          border-radius:16px;
          padding:14px;
          box-shadow: 0 10px 28px rgba(2,6,23,0.06);
          animation: dbxUp .35s ease both;
        }
        .dbx__panelBig{ min-height: 260px; }
        .dbx__panelFull{ grid-column: 1 / -1; }

        .dbx__panelHead{
          display:flex;
          justify-content:space-between;
          align-items:flex-end;
          margin-bottom: 10px;
          gap:10px;
        }
        .dbx__panelTitle{ font-weight:900; }
        .dbx__panelSub{ color:#64748b; font-size:12px; margin-top:4px; font-weight:700; }

        .dbx__legend{
          display:flex;
          align-items:center;
          gap:8px;
          color:#64748b;
          font-size:12px;
          font-weight:800;
        }
        .dbx__dot{
          width:10px;
          height:10px;
          border-radius:999px;
          background: linear-gradient(135deg, #0f766e, #16a34a);
          display:inline-block;
        }

        .dbx__chartWrap{ margin-top: 8px; }
        .dbx__line{ width:100%; height:160px; }
        .dbx__line polyline{
          stroke: #16a34a;
          fill: none;
          stroke-linecap: round;
          stroke-linejoin: round;
          filter: drop-shadow(0 10px 18px rgba(22,163,74,0.18));
        }
        .dbx__xlabels{
          display:grid;
          grid-template-columns: repeat(12, 1fr);
          margin-top: 8px;
          color:#94a3b8;
          font-size:11px;
          font-weight:800;
        }
        .dbx__xlabels span{ text-align:center; }

        /* Bars */
        .dbx__bars{ display:flex; flex-direction:column; gap:10px; margin-top: 10px; }
        .dbx__barRow{
          display:grid;
          grid-template-columns: 90px 1fr 36px;
          gap:10px;
          align-items:center;
        }
        .dbx__barLabel{ font-size:12px; font-weight:900; color:#0f172a; }
        .dbx__barTrack{
          height:10px;
          background:#f1f5f9;
          border-radius:999px;
          overflow:hidden;
          border:1px solid #e5e7eb;
        }
        .dbx__barFill{
          height:100%;
          border-radius:999px;
          background: linear-gradient(135deg, #0f766e, #16a34a);
          box-shadow: 0 12px 26px rgba(22,163,74,0.14);
          animation: dbxGrow .55s ease both;
        }
        .dbx__barVal{ text-align:right; font-weight:900; color:#0f172a; }

        /* Quick actions */
        .dbx__actionsGrid{
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap:10px;
          margin-top: 10px;
        }
        .dbx__qa{
          border:none;
          cursor:pointer;
          border-radius:14px;
          padding:12px 12px;
          font-weight:900;
          background: linear-gradient(135deg, #0f766e, #16a34a);
          color:#fff;
          box-shadow: 0 14px 30px rgba(22,163,74,0.18);
          transition: transform .15s ease, box-shadow .15s ease, filter .15s ease;
        }
        .dbx__qa:hover{
          transform: translateY(-2px);
          filter: brightness(1.02);
          box-shadow: 0 18px 36px rgba(22,163,74,0.22);
        }
        .dbx__qa:active{ transform: translateY(1px) scale(0.99); }

        /* Recent list */
        .dbx__list{
          display:flex;
          flex-direction:column;
          gap:10px;
          margin-top: 10px;
        }
        .dbx__item{
          display:grid;
          grid-template-columns: 120px 1fr 110px;
          gap:12px;
          align-items:center;
          padding:12px;
          border:1px solid #e5e7eb;
          border-radius:14px;
          background:#fff;
          transition: transform .15s ease, box-shadow .15s ease;
        }
        .dbx__item:hover{
          transform: translateY(-1px);
          box-shadow: 0 12px 26px rgba(2,6,23,0.06);
        }
        .dbx__badge{
          width: fit-content;
          padding:6px 10px;
          border-radius:999px;
          font-size:12px;
          font-weight:900;
          background:#ecfdf5;
          color:#166534;
          border:1px solid #bbf7d0;
        }
        .dbx__itemTitle{ font-weight:900; color:#0f172a; }
        .dbx__itemDate{ text-align:right; color:#64748b; font-size:12px; font-weight:800; }

        @keyframes dbxUp{
          from{ opacity:0; transform: translateY(8px); }
          to{ opacity:1; transform: translateY(0); }
        }
        @keyframes dbxGrow{
          from{ width:0%; }
        }

        @media(max-width: 1100px){
          .dbx__cards{ grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .dbx__grid{ grid-template-columns: 1fr; }
          .dbx__panelFull{ grid-column: auto; }
        }
        @media(max-width: 640px){
          .dbx__top{ align-items:flex-start; flex-direction:column; }
          .dbx__actionsGrid{ grid-template-columns: 1fr; }
          .dbx__item{ grid-template-columns: 1fr; gap:8px; }
          .dbx__itemDate{ text-align:left; }
        }
      `}</style>
    </>
  );
};

export default DashboardHome;
