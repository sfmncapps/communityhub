import { useNavigate } from "react-router-dom";

const Sidebar = ({ activePage = "dashboard", setActivePage }) => {
  const navigate = useNavigate();

  const navItems = [
    { id: "dashboard", label: "Dashboard Overview", icon: "📊" },
    { id: "verifications", label: "ID Verifications", icon: "🆔" },
    { id: "users", label: "Users & RBAC", icon: "👥" },
    { id: "events", label: "Events Moderation", icon: "📅" },
    { id: "jobs", label: "Jobs Moderation", icon: "💼" },
    { id: "directory", label: "Directory Listings", icon: "🏢" },
    { id: "classifieds", label: "Classifieds", icon: "🛒" },
  ];

  return (
    <div className="sidebar">
      {/* Brand Header */}
      <div className="brand">
        <div className="logoBadge">CH</div>
        <div>
          <div className="brandName">CommunityHub</div>
          <div className="brandSub">Admin Console</div>
        </div>
      </div>

      <div className="sectionLabel">Main Menu</div>

      {/* Nav List */}
      <div className="navList">
        {navItems.map((item) => {
          const isActive = activePage === item.id;
          return (
            <div
              key={item.id}
              className={`navItem ${isActive ? "active" : ""}`}
              onClick={() => setActivePage(item.id)}
            >
              <div className="navLeft">
                <div className={`iconBox ${isActive ? "activeIcon" : ""}`}>
                  {item.icon}
                </div>
                <span className="navLabel">{item.label}</span>
              </div>
              <span className="arrow">{isActive ? "●" : "›"}</span>
            </div>
          );
        })}
      </div>

      {/* User Portal Link */}
      <div className="footerSection">
        <div className="userDashLink" onClick={() => navigate("/dashboard")}>
          <div className="navLeft">
            <div className="userIcon">👤</div>
            <span>User Dashboard</span>
          </div>
          <span>→</span>
        </div>
      </div>

      <style>{`
        .sidebar {
          width: 270px;
          background: #ffffff;
          min-height: 100vh;
          border-right: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          user-select: none;
        }
        .brand {
          padding: 24px 20px;
          display: flex;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid #f1f5f9;
        }
        .logoBadge {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: linear-gradient(135deg, #0f766e, #16a34a);
          color: #ffffff;
          font-weight: 800;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(15, 118, 110, 0.25);
        }
        .brandName {
          font-size: 17px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.3px;
        }
        .brandSub {
          font-size: 12px;
          color: #64748b;
          font-weight: 500;
        }
        .sectionLabel {
          padding: 20px 20px 8px;
          font-size: 11px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }
        .navList {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 0 12px;
          flex: 1;
        }
        .navItem {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          border-radius: 10px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: #475569;
          transition: all 0.18s ease;
          border-left: 3px solid transparent;
        }
        .navItem:hover {
          background: #f8fafc;
          color: #0f172a;
        }
        .navItem.active {
          background: #f0fdf4;
          color: #0f766e;
          font-weight: 700;
          border-left-color: #0f766e;
        }
        .navLeft {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .iconBox {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          transition: all 0.18s ease;
        }
        .iconBox.activeIcon {
          background: #dcfce7;
          color: #0f766e;
        }
        .arrow {
          font-size: 14px;
          color: #cbd5e1;
        }
        .navItem.active .arrow {
          color: #16a34a;
          font-size: 10px;
        }
        .footerSection {
          padding: 16px 12px;
          border-top: 1px solid #f1f5f9;
          margin-top: auto;
        }
        .userDashLink {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          border-radius: 10px;
          background: #ecfdf5;
          color: #0f766e;
          font-weight: 600;
          font-size: 13.5px;
          cursor: pointer;
          transition: all 0.18s ease;
          border: 1px solid #a7f3d0;
        }
        .userDashLink:hover {
          background: #d1fae5;
          transform: translateY(-1px);
        }
        .userIcon {
          width: 26px;
          height: 26px;
          border-radius: 6px;
          background: #0f766e;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
};

export default Sidebar;
