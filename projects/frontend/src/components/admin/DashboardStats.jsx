import { useEffect, useState } from "react";
import supabase from "../../config/supabaseClient";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const getAuthToken = async () => {
  const localToken = localStorage.getItem("token");
  if (localToken) return localToken;
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
};

const DashboardStats = ({ setActivePage }) => {
  const [stats, setStats] = useState({
    users: 0,
    jobs: 0,
    directory: 0,
    classifieds: 0,
    events: 0,
    pending_events: 0,
    pending_jobs: 0,
    pending_vendors: 0,
    pending_classifieds: 0,
  });

  const fetchStats = async () => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API}/admin/stats`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        const data = await res.json();
        setStats({
          users: data.users || 0,
          jobs: data.jobs || 0,
          directory: data.directory || 0,
          classifieds: data.classifieds || 0,
          events: data.events || 0,
          pending_events: data.pending_events || 0,
          pending_jobs: data.pending_jobs || 0,
          pending_vendors: data.pending_vendors || 0,
          pending_classifieds: data.pending_classifieds || 0,
        });
        return;
      }
    } catch (err) {
      console.error("Fetch admin stats API error:", err);
    }

    // Fallback to client-side Supabase if API call fails
    try {
      const { count: activeUsers } = await supabase
        .from("users_active")
        .select("*", { count: "exact", head: true });

      const { count: pendingUsers } = await supabase
        .from("users_pending")
        .select("*", { count: "exact", head: true });

      const { count: jobs } = await supabase
        .from("jobs")
        .select("*", { count: "exact", head: true });

      const { count: pJobs } = await supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      const { count: directory } = await supabase
        .from("directory_listings")
        .select("*", { count: "exact", head: true });

      let vendorCount = 0;
      let pVendors = 0;
      try {
        const { count: vc } = await supabase
          .from("vendor_listings")
          .select("*", { count: "exact", head: true });
        vendorCount = vc || 0;
        const { count: pvc } = await supabase
          .from("vendor_listings")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");
        pVendors = pvc || 0;
      } catch {}

      const { count: classifieds } = await supabase
        .from("classifieds")
        .select("*", { count: "exact", head: true });

      const { count: pClassifieds } = await supabase
        .from("classifieds")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      let eventsCount = 0;
      let pendingEvCount = 0;
      try {
        const { count: evs } = await supabase
          .from("events")
          .select("*", { count: "exact", head: true });
        eventsCount = evs || 0;
        const { count: pev } = await supabase
          .from("events")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");
        pendingEvCount = pev || 0;
      } catch {}

      setStats({
        users: (activeUsers || 0) + (pendingUsers || 0),
        jobs: jobs || 0,
        directory: (directory || 0) + vendorCount,
        classifieds: classifieds || 0,
        events: eventsCount,
        pending_events: pendingEvCount,
        pending_jobs: pJobs || 0,
        pending_vendors: pVendors,
        pending_classifieds: pClassifieds || 0,
      });
    } catch (e) {
      console.error("Supabase fallback error:", e);
    }
  };

  useEffect(() => {
    fetchStats();

    // Supabase Realtime Listener for instant live updates
    const channel = supabase
      .channel("admin-stats-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "users_active" }, () => fetchStats())
      .on("postgres_changes", { event: "*", schema: "public", table: "users_pending" }, () => fetchStats())
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, () => fetchStats())
      .on("postgres_changes", { event: "*", schema: "public", table: "directory_listings" }, () => fetchStats())
      .on("postgres_changes", { event: "*", schema: "public", table: "vendor_listings" }, () => fetchStats())
      .on("postgres_changes", { event: "*", schema: "public", table: "classifieds" }, () => fetchStats())
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => fetchStats())
      .subscribe();

    // Interval polling fallback every 10 seconds
    const interval = setInterval(fetchStats, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const totalPending =
    stats.pending_jobs +
    stats.pending_events +
    stats.pending_vendors +
    stats.pending_classifieds;

  const moderationQueues = [
    {
      id: "jobs",
      title: "Pending Jobs",
      count: stats.pending_jobs,
      icon: "💼",
      color: "#2563eb",
      bg: "#eff6ff",
      badgeBg: stats.pending_jobs > 0 ? "#fef3c7" : "#f1f5f9",
      badgeColor: stats.pending_jobs > 0 ? "#b45309" : "#64748b",
      description: "Recruitment listings awaiting employer verification",
    },
    {
      id: "events",
      title: "Pending Events",
      count: stats.pending_events,
      icon: "📅",
      color: "#059669",
      bg: "#ecfdf5",
      badgeBg: stats.pending_events > 0 ? "#fef3c7" : "#f1f5f9",
      badgeColor: stats.pending_events > 0 ? "#b45309" : "#64748b",
      description: "Community gatherings & workshops pending schedule review",
    },
    {
      id: "directory",
      title: "Pending Vendors & Shops",
      count: stats.pending_vendors,
      icon: "🏪",
      color: "#7c3aed",
      bg: "#f5f3ff",
      badgeBg: stats.pending_vendors > 0 ? "#fef3c7" : "#f1f5f9",
      badgeColor: stats.pending_vendors > 0 ? "#b45309" : "#64748b",
      description: "Local shop and artisan submissions awaiting approval",
    },
    {
      id: "classifieds",
      title: "Pending Classifieds",
      count: stats.pending_classifieds,
      icon: "🛒",
      color: "#d97706",
      bg: "#fffbeb",
      badgeBg: stats.pending_classifieds > 0 ? "#fef3c7" : "#f1f5f9",
      badgeColor: stats.pending_classifieds > 0 ? "#b45309" : "#64748b",
      description: "Marketplace listings for goods, vehicles & rentals",
    },
  ];

  const overviewCards = [
    {
      title: "Total Users",
      value: stats.users,
      icon: "👥",
      color: "#0f766e",
      bg: "#f0fdf4",
      sub: "Active & Pending Accounts",
    },
    {
      title: "Community Events",
      value: stats.events,
      icon: "📅",
      color: "#059669",
      bg: "#ecfdf5",
      sub: stats.pending_events > 0 ? `${stats.pending_events} pending approval` : "Active & Concluded",
    },
    {
      title: "Jobs Posted",
      value: stats.jobs,
      icon: "💼",
      color: "#2563eb",
      bg: "#eff6ff",
      sub: stats.pending_jobs > 0 ? `${stats.pending_jobs} pending review` : "Active Recruitment",
    },
    {
      title: "Directory & Vendors",
      value: stats.directory,
      icon: "🏢",
      color: "#7c3aed",
      bg: "#f5f3ff",
      sub: stats.pending_vendors > 0 ? `${stats.pending_vendors} pending shops` : "Community Businesses",
    },
    {
      title: "Classified Items",
      value: stats.classifieds,
      icon: "🛒",
      color: "#d97706",
      bg: "#fffbeb",
      sub: stats.pending_classifieds > 0 ? `${stats.pending_classifieds} pending ads` : "Marketplace Ads",
    },
  ];

  return (
    <div className="statsContainer">
      <div className="welcomeHeader">
        <div>
          <h2 className="headerTitle">Platform Activity Dashboard</h2>
          <p className="headerSub">
            Real-time breakdown of user accounts, moderation queues, and marketplace activity.
          </p>
        </div>
      </div>

      {/* Universal Moderation Queue Alert Banner */}
      <div className="moderationSection">
        <div className="moderationHeader">
          <div className="modHeaderLeft">
            <span className="shieldIcon">🛡️</span>
            <div>
              <h3 className="modTitle">Universal Admin Moderation Queues</h3>
              <p className="modSub">
                Submissions must be approved before appearing publicly across Jobs, Events, Vendors, and Classifieds.
              </p>
            </div>
          </div>
          <div className="totalPendingChip">
            <span className="dot"></span>
            <strong>{totalPending} Items</strong> Pending Review
          </div>
        </div>

        <div className="moderationGrid">
          {moderationQueues.map((queue) => (
            <div
              key={queue.id}
              className={`modCard ${queue.count > 0 ? "hasPending" : ""}`}
              onClick={() => setActivePage && setActivePage(queue.id)}
            >
              <div className="modCardTop">
                <div className="modIconBox" style={{ background: queue.bg, color: queue.color }}>
                  {queue.icon}
                </div>
                <span
                  className="modBadge"
                  style={{ background: queue.badgeBg, color: queue.badgeColor }}
                >
                  {queue.count} PENDING
                </span>
              </div>
              <h4 className="modCardTitle">{queue.title}</h4>
              <p className="modCardDesc">{queue.description}</p>
              <div className="modCardAction">
                <span>Moderate {queue.title.replace("Pending ", "")}</span>
                <span className="arrow">→</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* General Platform Statistics */}
      <h3 className="sectionLabel">Platform Overview Metrics</h3>
      <div className="statsGrid">
        {overviewCards.map((card, idx) => (
          <div key={idx} className="statCard">
            <div className="cardTop">
              <div className="iconContainer" style={{ background: card.bg, color: card.color }}>
                {card.icon}
              </div>
              <span className="liveBadge">LIVE SYNC</span>
            </div>
            <div className="cardValue">{card.value}</div>
            <div className="cardTitle">{card.title}</div>
            <div className="cardSub">{card.sub}</div>
          </div>
        ))}
      </div>

      <style>{`
        .statsContainer {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          margin-bottom: 24px;
        }
        .welcomeHeader {
          margin-bottom: 24px;
        }
        .headerTitle {
          margin: 0;
          font-size: 1.6rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.4px;
        }
        .headerSub {
          margin: 6px 0 0;
          color: #64748b;
          font-size: 0.95rem;
        }
        .sectionLabel {
          font-size: 1.1rem;
          font-weight: 800;
          color: #0f172a;
          margin: 32px 0 16px;
        }

        /* Moderation Section */
        .moderationSection {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
          margin-bottom: 28px;
        }
        .moderationHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .modHeaderLeft {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .shieldIcon {
          font-size: 2rem;
        }
        .modTitle {
          font-size: 1.2rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }
        .modSub {
          font-size: 0.88rem;
          color: #64748b;
          margin: 4px 0 0;
        }
        .totalPendingChip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #fef3c7;
          border: 1px solid #fde68a;
          color: #92400e;
          font-size: 0.85rem;
          font-weight: 700;
          padding: 6px 14px;
          border-radius: 999px;
        }
        .totalPendingChip .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #f59e0b;
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0% { transform: scale(0.9); opacity: 0.8; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(0.9); opacity: 0.8; }
        }
        .moderationGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
        }
        .modCard {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 18px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
        }
        .modCard:hover {
          background: #ffffff;
          border-color: #0f766e;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(15, 118, 110, 0.1);
        }
        .modCard.hasPending {
          border-color: #fde68a;
          background: #fffdf5;
        }
        .modCardTop {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .modIconBox {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
        }
        .modBadge {
          font-size: 10px;
          font-weight: 800;
          padding: 4px 8px;
          border-radius: 999px;
          letter-spacing: 0.5px;
        }
        .modCardTitle {
          font-size: 1rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 4px;
        }
        .modCardDesc {
          font-size: 0.8rem;
          color: #64748b;
          margin: 0 0 16px;
          line-height: 1.4;
          flex: 1;
        }
        .modCardAction {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.82rem;
          font-weight: 700;
          color: #0f766e;
          padding-top: 10px;
          border-top: 1px solid #e2e8f0;
        }
        .modCardAction .arrow {
          transition: transform 0.2s;
        }
        .modCard:hover .modCardAction .arrow {
          transform: translateX(4px);
        }

        /* Overview Stats */
        .statsGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 18px;
        }
        .statCard {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .statCard:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 24px rgba(15, 23, 42, 0.07);
        }
        .cardTop {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }
        .iconContainer {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }
        .liveBadge {
          font-size: 10px;
          font-weight: 800;
          color: #166534;
          background: #dcfce7;
          padding: 3px 8px;
          border-radius: 999px;
          letter-spacing: 0.5px;
        }
        .cardValue {
          font-size: 2.2rem;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.1;
          letter-spacing: -1px;
        }
        .cardTitle {
          font-size: 0.95rem;
          font-weight: 700;
          color: #334155;
          margin-top: 6px;
        }
        .cardSub {
          font-size: 0.8rem;
          color: #94a3b8;
          margin-top: 2px;
        }
      `}</style>
    </div>
  );
};

export default DashboardStats;
