import { useEffect, useState } from "react";
import supabase from "../../config/supabaseClient";

const DashboardStats = () => {
  const [stats, setStats] = useState({
    users: 0,
    jobs: 0,
    directory: 0,
    classifieds: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const { count: users } = await supabase
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

      setStats({ users, jobs, directory, classifieds });
    };

    fetchStats();
  }, []);

  const cardStyle = {
    background: "white",
    padding: "20px",
    borderRadius: "8px",
    width: "200px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  };

  return (
    <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
      <div style={cardStyle}>👤 Users <h2>{stats.users}</h2></div>
      <div style={cardStyle}>💼 Jobs <h2>{stats.jobs}</h2></div>
      <div style={cardStyle}>🏢 Directory <h2>{stats.directory}</h2></div>
      <div style={cardStyle}>🛒 Classifieds <h2>{stats.classifieds}</h2></div>
    </div>
  );
};

export default DashboardStats;
