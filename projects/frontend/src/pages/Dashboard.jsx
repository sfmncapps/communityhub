import { useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../config/supabaseClient";

import Sidebar from "./Sidebar";
import Profile from "./Profile";
import VerificationUpload from "../components/user/VerificationUpload";
import MessagingCenter from "./MessagingCenter";

import "./dashboard.css";

const Dashboard = () => {
  const [activePage, setActivePage] = useState("profile");
  const navigate = useNavigate();

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