import { useState } from "react";
import Sidebar from "../components/admin/Sidebar";
import Topbar from "../components/admin/Topbar";
import DashboardStats from "../components/admin/DashboardStats";
import PendingUsers from "../components/admin/PendingUsers";
import ManageJobs from "../components/admin/ManageJobs";
import ManageDirectory from "../components/admin/ManageDirectory";
import ManageVerifications from "../components/admin/ManageVerifications";
import ManageEvents from "../components/admin/ManageEvents";
import ManageThemeSettings from "../components/admin/ManageThemeSettings";

const AdminPage = () => {
  const [activePage, setActivePage] = useState("dashboard");

  const renderContent = () => {
    switch (activePage) {
      case "verifications":
        return <ManageVerifications />;
      case "users":
        return <PendingUsers />;
      case "events":
        return <ManageEvents />;
      case "jobs":
        return <ManageJobs />;
      case "directory":
        return <ManageDirectory />;
      case "classifieds":
        return <ManageClassifieds />;
      case "theme":
        return <ManageThemeSettings />;
      default:
        return <DashboardStats />;
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      <Sidebar activePage={activePage} setActivePage={setActivePage} />

      <div style={{ flex: 1, background: "#f8fafc", overflowY: "auto" }}>
        <Topbar activePage={activePage} />
        <div style={{ padding: "24px" }}>{renderContent()}</div>
      </div>
    </div>
  );
};

export default AdminPage;
