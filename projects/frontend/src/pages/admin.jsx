import { useState } from "react";
import Sidebar from "../components/admin/Sidebar";
import Topbar from "../components/admin/Topbar";
import DashboardStats from "../components/admin/DashboardStats";
import PendingUsers from "../components/admin/PendingUsers";
import ManageJobs from "../components/admin/ManageJobs";
import ManageDirectory from "../components/admin/ManageDirectory";
import ManageClassifieds from "../components/admin/ManageClassifieds";
import ManageVerifications from "../components/admin/ManageVerifications";

const AdminPage = () => {
  const [activePage, setActivePage] = useState("dashboard");

  const renderContent = () => {
    switch (activePage) {
      case "verifications":
        return <ManageVerifications />;
      case "users":
        return <PendingUsers />;
      case "jobs":
        return <ManageJobs />;
      case "directory":
        return <ManageDirectory />;
      case "classifieds":
        return <ManageClassifieds />;
      default:
        return <DashboardStats />;
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "sans-serif" }}>
      <Sidebar setActivePage={setActivePage} />

      <div style={{ flex: 1, background: "#f4f6f9", overflowY: "auto" }}>
        <Topbar />
        <div style={{ padding: "20px" }}>{renderContent()}</div>
      </div>
    </div>
  );
};

export default AdminPage;
