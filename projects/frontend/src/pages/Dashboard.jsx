import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import supabase from "../config/supabaseClient";
import { clearAuthSession } from "../services/authService";

import Sidebar from "./Sidebar";
import Profile from "./Profile";
import VerificationUpload from "../components/user/VerificationUpload";
import MyEvents from "./MyEvents";
import MyJobs from "./MyJobs";
import MyClassifieds from "./MyClassifieds";
import MyDirectory from "./MyDirectory";

import "./dashboard.css";

const Dashboard = () => {
  const location = useLocation();
  const [activePage, setActivePage] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get("tab") || "profile";
  });
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab && tab !== activePage) {
      setActivePage(tab);
    }
  }, [location.search]);

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    clearAuthSession();
    navigate("/");
  };

  const renderPage = () => {
    switch (activePage) {
      case "verification":
        return <VerificationUpload />;
      case "my-jobs":
      case "create-collective":
        return <MyJobs />;
      case "my-events":
        return <MyEvents />;
      case "my-classifieds":
        return <MyClassifieds />;
      case "my-directory":
        return <MyDirectory />;
      default:
        return <Profile />;
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar activePage={activePage} setActivePage={setActivePage} onLogout={logout} />

      <div className="dashboard-main" style={{ padding: "24px" }}>
        {renderPage()}
      </div>
    </div>
  );
};

export default Dashboard;