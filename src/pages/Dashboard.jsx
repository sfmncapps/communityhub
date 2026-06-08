import { useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../config/supabaseClient";

import Sidebar from "./Sidebar";
import Profile from "./Profile";
import MyJobs from "./MyJobs";
import PostJob from "./PostJob";
import DashboardHome from "./DashboardHome";
import MyDirectory from "./MyDirectory";
import MyClassifieds from "./MyClassifieds";
import MyCommunity from "./MyEvents";

import "./dashboard.css";

const Dashboard = () => {
  const [activePage, setActivePage] = useState("profile");

  const navigate = useNavigate();

  // ✅ LOGOUT
  const logout = async () => {
    await supabase.auth.signOut();

    navigate("/");
  };

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        return <DashboardHome />;
      case "profile":
        return <Profile />;
      case "jobs":
        return <MyJobs />;
      case "postjob":
        return <PostJob />;
      case "mydirectory":
        return <MyDirectory />;
      case "myclassifieds":
        return <MyClassifieds />;
      case "mycommunity":
        return <MyCommunity />;
      default:
        return <Profile />;
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />

      <div className="dashboard-main">

        <button
          onClick={logout}
          style={{
            padding: "10px 16px",
            border: "none",
            borderRadius: "8px",
            background: "#dc2626",
            color: "#fff",
            cursor: "pointer",
            marginBottom: "20px",
          }}
        >
          Logout
        </button>

        {renderPage()}
      </div>
    </div>
  );
};

export default Dashboard;