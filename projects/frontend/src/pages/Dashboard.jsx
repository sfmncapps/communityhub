import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import supabase from "../config/supabaseClient";

import Sidebar from "./Sidebar";
import Profile from "./Profile";
import VerificationUpload from "../components/user/VerificationUpload";
import CreateCollective from "../components/user/CreateCollective";
import MessagingCenter from "./MessagingCenter";
import MyEvents from "./MyEvents";

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
    await supabase.auth.signOut();
    localStorage.removeItem("token");
    window.dispatchEvent(new Event("profile-updated"));
    navigate("/");
  };

  const renderPage = () => {
    switch (activePage) {
      case "verification":
        return <VerificationUpload />;
      case "create-collective":
        return <CreateCollective />;
      case "my-events":
        return <MyEvents />;
      case "messages":
        return <MessagingCenter />;
      default:
        return <Profile />;
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar activePage={activePage} setActivePage={setActivePage} onLogout={logout} />

      <div className="dashboard-main" style={{ padding: activePage === "messages" ? 0 : "24px" }}>
        {renderPage()}
      </div>
    </div>
  );
};

export default Dashboard;