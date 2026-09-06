import { useEffect, useState } from "react";
import supabase from "../../config/supabaseClient";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const getAuthToken = async () => {
  const localToken = localStorage.getItem("token");
  if (localToken) return localToken;
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
};

const DashboardStats = () => {
  const [stats, setStats] = useState({
    users: 0,
    jobs: 0,
    directory: 0,
    classifieds: 0,
    events: 0,
    pending_events: 0,
  });

  useEffect(() => {
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
          });
          return;
        }
      } catch (err) {
        console.error("Fetch admin stats API error:", err);
      }

      // Fallback to client-side Supabase if API call fails
      const { count: activeUsers } = await supabase
        .from("users_active")
        .select("*", { count: "exact", head: true });

      const { count: pendingUsers } = await supabase
        .from("users_pending")
        .select("*", { count: "exact", head: true });

      const { count: jobs } = await supabase
        .from("jobs")
        .select("*", { count: "exact", head: true });

      const { count: directory } = await supabase
        .from("directory_listings")
        .select("*", { count: "exact", head: true });

      const { count: classifieds } = await supabase
        .from("classifieds")
        .select("*", { count: "exact", head: true });

      let eventsCount = 0;
      let pendingEvCount = 0;
      try {
        const { count: evs } = await supabase.from("events").select("*", { count: "exact", head: true });
        eventsCount = evs || 0;
        const { count: pev } = await supabase.from("events").select("*", { count: "exact", head: true }).eq("status", "pending");
        pendingEvCount = pev || 0;
      } catch {
        // Table may be empty
      }

      setStats({
        users: (activeUsers || 0) + (pendingUsers || 0),
        jobs: jobs || 0,
        directory: directory || 0,
        classifieds: classifieds || 0,
        events: eventsCount,
        pending_events: pendingEvCount,
      });
    };

    fetchStats();

    // 1. Supabase Realtime Listener for instant live updates
    const channel = supabase
      .channel("admin-stats-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "users_active" }, () => fetchStats())
      .on("postgres_changes", { event: "*", schema: "public", table: "users_pending" }, () => fetchStats())
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, () => fetchStats())
      .on("postgres_changes", { event: "*", schema: "public", table: "directory_listings" }, () => fetchStats())
      .on("postgres_changes", { event: "*", schema: "public", table: "classifieds" }, () => fetchStats())
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => fetchStats())
      .subscribe();

    // 2. Interval polling fallback every 10 seconds
    const interval = setInterval(fetchStats, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const cards = [
    { title: "Total Users", value: stats.users, icon: "👥", color: "#0f766e", bg: "#f0fdf4", sub: "Registered & Pending" },
    { title: "Community Events", value: stats.events, icon: "📅", color: "#059669", bg: "#ecfdf5", sub: stats.pending_events > 0 ? `${stats.pending_events} pending approval` : "Active & Scheduled" },
    { title: "Jobs Posted", value: stats.jobs, icon: "💼", color: "#2563eb", bg: "#eff6ff", sub: "Approved & Pending" },
    { title: "Directory Listings", value: stats.directory, icon: "🏢", color: "#7c3aed", bg: "#f5f3ff", sub: "Business Collectives" },
    { title: "Classified Items", value: stats.classifieds, icon: "🛒", color: "#d97706", bg: "#fffbeb", sub: "Community Marketplace" },
  ];

  return (
    <div className="statsContainer">
      <div className="welcomeHeader">
        <div>
          <h2 className="headerTitle">Platform Activity Dashboard</h2>
          <p className="headerSub">Real-time breakdown of user accounts, moderation queues, and marketplace activity.</p>
        </div>
      </div>

      <div className="statsGrid">
        {cards.map((card, idx) => (
          <div key={idx} className="statCard">
            <div className="cardTop">
              <div className="iconContainer" style={{ background: card.bg, color: card.color }}>
                {card.icon}
              </div>
              <span className="liveBadge">REAL-TIME</span>
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
          margin-bottom: 20px;
        }
        .headerTitle {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.4px;
        }
        .headerSub {
          margin: 6px 0 0;
          color: #64748b;
          font-size: 0.95rem;
        }
        .statsGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
          gap: 18px;
        }
        .statCard {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          position: relative;
          overflow: hidden;
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
