import { useNavigate } from "react-router-dom";
import { FaUser, FaIdCard, FaEnvelope, FaBuilding, FaSignOutAlt, FaShieldAlt, FaUsersCog, FaCalendarAlt } from "react-icons/fa";

const Sidebar = ({ activePage, setActivePage, onLogout }) => {
  const navigate = useNavigate();

  let userRole = "user";
  try {
    const cached = localStorage.getItem("user");
    if (cached) {
      const parsed = JSON.parse(cached);
      userRole = (parsed.role || "user").toLowerCase();
    }
  } catch {
    userRole = "user";
  }

  const isAdmin = userRole === "admin" || userRole === "superadmin";
  const isManager = userRole === "manager";

  return (
    <div className="sidebar">
      <ul className="sidebar-menu">
        <li
          className={activePage === "profile" ? "active" : ""}
          onClick={() => setActivePage("profile")}
        >
          <FaUser /> My Profile
        </li>

        <li
          className={activePage === "verification" ? "active" : ""}
          onClick={() => setActivePage("verification")}
        >
          <FaIdCard /> ID Verification
        </li>

        <li
          className={activePage === "create-collective" ? "active" : ""}
          onClick={() => setActivePage("create-collective")}
        >
          <FaBuilding /> My Collectives
        </li>

        <li
          className={activePage === "my-events" ? "active" : ""}
          onClick={() => setActivePage("my-events")}
        >
          <FaCalendarAlt /> My Events
        </li>

        <li
          className={activePage === "messages" ? "active" : ""}
          onClick={() => setActivePage("messages")}
        >
          <FaEnvelope /> Messages
        </li>

        {/* ADMIN PORTAL LINK FOR ADMINS & SUPERADMINS */}
        {isAdmin && (
          <li
            className="admin-portal-link"
            onClick={() => navigate("/admin")}
            style={{
              background: "linear-gradient(135deg, #1e293b, #0f172a)",
              color: "#f59e0b",
              border: "1px solid #f59e0b",
              marginTop: "10px",
              fontWeight: "700",
            }}
          >
            <FaShieldAlt style={{ color: "#f59e0b" }} /> Admin Portal 👑
          </li>
        )}

        {/* MANAGE COLLECTIVE LINK FOR MANAGERS */}
        {isManager && (
          <li
            className="manager-portal-link"
            onClick={() => navigate("/admin")}
            style={{
              background: "linear-gradient(135deg, #0284c7, #0369a1)",
              color: "#ffffff",
              border: "1px solid #38bdf8",
              marginTop: "10px",
              fontWeight: "700",
            }}
          >
            <FaUsersCog style={{ color: "#ffffff" }} /> Manage Collective 🤝
          </li>
        )}

        <li className="logout" onClick={onLogout}>
          <FaSignOutAlt /> Logout
        </li>
      </ul>
    </div>
  );
};

export default Sidebar;