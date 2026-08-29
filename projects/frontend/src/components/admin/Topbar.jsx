import { useEffect, useState } from "react";
import supabase from "../../config/supabaseClient";

const Topbar = ({ activePage = "dashboard" }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch {
      // ignore JSON parse error
    }
  }, []);

  const getTitle = () => {
    switch (activePage) {
      case "verifications":
        return "ID & Identity Verifications";
      case "users":
        return "Users & Role-Based Access Control (RBAC)";
      case "jobs":
        return "Jobs Moderation & Postings";
      case "directory":
        return "Directory Listings Management";
      case "classifieds":
        return "Classifieds Marketplace Moderation";
      default:
        return "Dashboard Overview & Platform Analytics";
    }
  };

  return (
    <div className="topbar">
      <div className="left">
        <div className="breadcrumb">
          <span>Admin Portal</span>
          <span className="sep">/</span>
          <span className="current">{getTitle()}</span>
        </div>
      </div>

      <div className="right">
        <div className="livePill">
          <span className="dot"></span>
          <span>Live Sync</span>
        </div>

        {user && (
          <div className="userBadge">
            <div className="userAvatar">
              {(user.name || user.username || "A")[0].toUpperCase()}
            </div>
            <div className="userInfo">
              <span className="userName">{user.name || user.username || "Administrator"}</span>
              <span className="userRole">{(user.role || "admin").toUpperCase()}</span>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .topbar {
          height: 64px;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          border-bottom: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }
        .breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 500;
          color: #64748b;
        }
        .sep {
          color: #cbd5e1;
        }
        .current {
          color: #0f172a;
          font-weight: 700;
        }
        .right {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .livePill {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #166534;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
        }
        .dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 8px #22c55e;
          animation: pulse 1.8s infinite;
        }
        @keyframes pulse {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.8; }
        }
        .userBadge {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 4px 12px 4px 6px;
          border-radius: 999px;
        }
        .userAvatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #0f766e;
          color: #ffffff;
          font-weight: 700;
          font-size: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .userInfo {
          display: flex;
          flex-direction: column;
          line-height: 1.1;
        }
        .userName {
          font-size: 12.5px;
          font-weight: 700;
          color: #0f172a;
        }
        .userRole {
          font-size: 9.5px;
          font-weight: 800;
          color: #0f766e;
          letter-spacing: 0.5px;
        }
      `}</style>
    </div>
  );
};

export default Topbar;
