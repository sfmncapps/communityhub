import { useNavigate } from "react-router-dom";

const Sidebar = ({ setActivePage }) => {
  const navigate = useNavigate();

  const sidebarStyle = {
    width: "260px",
    backgroundColor: "#ffffff",
    minHeight: "100vh",
    borderRight: "1px solid #e5e7eb",
    fontFamily: "Inter, sans-serif",
  };

  const titleStyle = {
    padding: "20px",
    fontSize: "22px",
    fontWeight: "700",
    letterSpacing: "1px",
    color: "#111827",
  };

  const navTitleStyle = {
    padding: "10px 20px",
    fontSize: "12px",
    color: "#9ca3af",
    textTransform: "uppercase",
  };

  const menuStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 20px",
    cursor: "pointer",
    fontSize: "14px",
    color: "#374151",
  };

  const leftStyle = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  };

  const iconBox = {
    width: "28px",
    height: "28px",
    borderRadius: "6px",
    background: "#f3f4f6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
  };

  return (
    <div style={sidebarStyle}>
      {/* Logo / Title */}
      <div style={titleStyle}>Community Hub</div>

      {/* Navigation */}
      <div style={navTitleStyle}>Admin Portal</div>

      <div style={menuStyle} onClick={() => setActivePage("dashboard")}>
        <div style={leftStyle}>
          <div style={iconBox}>📊</div>
          Dashboard Overview
        </div>
        ▶
      </div>

      <div style={menuStyle} onClick={() => setActivePage("verifications")}>
        <div style={leftStyle}>
          <div style={iconBox}>🆔</div>
          ID Verifications
        </div>
        ▶
      </div>

      <div style={menuStyle} onClick={() => setActivePage("users")}>
        <div style={leftStyle}>
          <div style={iconBox}>👤</div>
          Users & RBAC
        </div>
        ▶
      </div>

      <div style={menuStyle} onClick={() => setActivePage("jobs")}>
        <div style={leftStyle}>
          <div style={iconBox}>💼</div>
          Jobs
        </div>
        ▶
      </div>

      <div style={menuStyle} onClick={() => setActivePage("directory")}>
        <div style={leftStyle}>
          <div style={iconBox}>🏢</div>
          Directory
        </div>
        ▶
      </div>

      <div style={menuStyle} onClick={() => setActivePage("classifieds")}>
        <div style={leftStyle}>
          <div style={iconBox}>🛒</div>
          Classifieds
        </div>
        ▶
      </div>

      <div style={{ marginTop: "30px", borderTop: "1px solid #f3f4f6", paddingTop: "10px" }}>
        <div
          style={{ ...menuStyle, color: "#0f766e", fontWeight: "600" }}
          onClick={() => navigate("/dashboard")}
        >
          <div style={leftStyle}>
            <div style={{ ...iconBox, background: "#e6f4ea", color: "#0f766e" }}>👤</div>
            My User Dashboard
          </div>
          →
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
