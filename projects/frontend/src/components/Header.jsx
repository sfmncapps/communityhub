import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FaBars, FaTimes, FaEnvelope, FaShieldAlt, FaUsersCog } from "react-icons/fa";
import supabase from "../config/supabaseClient";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const getAuthToken = async () => {
  const localToken = localStorage.getItem("token");
  if (localToken) return localToken;
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
};

const Header = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [checking, setChecking] = useState(true);

  const loadProfile = async () => {
    // 1. Instant check from localStorage
    const cachedUserStr = localStorage.getItem("user");
    if (cachedUserStr) {
      try {
        const parsed = JSON.parse(cachedUserStr);
        if (parsed && (parsed.email || parsed.name)) {
          setProfile(parsed);
          setChecking(false);
        }
      } catch {
        // ignore parse error
      }
    }

    const token = await getAuthToken();
    if (!token) {
      setProfile(null);
      localStorage.removeItem("user");
      setChecking(false);
      return;
    }

    try {
      const res = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setProfile(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
      } else {
        setProfile(null);
      }
    } catch {
      // keep cached profile if network fetch fails
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    loadProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setProfile(null);
        localStorage.removeItem("user");
        setChecking(false);
      } else {
        loadProfile();
      }
    });

    window.addEventListener("profile-updated", loadProfile);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("profile-updated", loadProfile);
    };
  }, []);

  const AuthArea = ({ mobile }) => {
    if (checking && !profile) return null;

    if (profile) {
      const role = (profile.role || "user").toLowerCase();
      const isAdmin = role === "admin" || role === "superadmin";
      const isManager = role === "manager";

      return (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {isAdmin && (
            <Link
              to="/admin"
              className={`adminNavBtn ${mobile ? "mobileBtn" : ""}`}
              onClick={() => setMenuOpen(false)}
              title="Admin Control Panel"
              style={{ textDecoration: "none" }}
            >
              <FaShieldAlt />
              <span>Admin Panel</span>
            </Link>
          )}

          {isManager && (
            <Link
              to="/manager"
              className={`managerNavBtn ${mobile ? "mobileBtn" : ""}`}
              onClick={() => setMenuOpen(false)}
              title="Manage Collective Portal"
              style={{ textDecoration: "none" }}
            >
              <FaUsersCog />
              <span>Manage Collective</span>
            </Link>
          )}

          <Link
            to="/messages"
            className={`msgNavBtn ${mobile ? "mobileBtn" : ""}`}
            onClick={() => setMenuOpen(false)}
            title="In-App Messaging Center"
            style={{ textDecoration: "none" }}
          >
            <FaEnvelope />
            <span>Messages</span>
          </Link>

          <Link
            to="/dashboard"
            className={`authButton profilePill ${mobile ? "mobileBtn" : ""}`}
            onClick={() => setMenuOpen(false)}
            style={{ textDecoration: "none" }}
          >
            {profile.profile_pic ? (
              <img src={profile.profile_pic} alt="" className="profilePillAvatar" />
            ) : (
              <span className="profilePillInitial">
                {(profile.name || profile.email || "?").charAt(0).toUpperCase()}
              </span>
            )}
            <span>{profile.name || "My Profile"}</span>
          </Link>
        </div>
      );
    }

    return (
      <Link
        to="/login"
        className={`authButton ${mobile ? "mobileBtn" : ""}`}
        onClick={() => setMenuOpen(false)}
        style={{ textDecoration: "none" }}
      >
        Login / Register
      </Link>
    );
  };

  return (
    <>
      <header className="header">
        <div className="container">
          {/* Logo */}
          <div className="logoContainer" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
            <img src="/community.png" alt="Logo" className="logo" />
          </div>

          {/* Desktop Navigation */}
          <nav className="nav desktopNav">
            <Link to="/" className="link">Home</Link>
            <Link to="/welcome" className="link">Welcome</Link>
            <Link to="/events" className="link">Events</Link>
            <Link to="/directory" className="link">Directory</Link>
            <Link to="/community" className="link">Community</Link>
            <Link to="/jobs" className="link">Jobs</Link>
            <Link to="/classifieds" className="link">Classifieds</Link>
            <Link to="/contact" className="link">Contact Us</Link>
          </nav>

          {/* Desktop Login */}
          <div className="desktopAuth">
            <AuthArea />
          </div>

          {/* Mobile Menu Icon */}
          <div className="menuIcon" onClick={() => setMenuOpen(true)}>
            <FaBars />
          </div>
        </div>
      </header>

      {/* Overlay */}
      {menuOpen && <div className="overlay" onClick={() => setMenuOpen(false)} />}

      {/* Mobile Drawer */}
      <nav className={`mobileNav ${menuOpen ? "active" : ""}`}>
        <div className="closeIcon" onClick={() => setMenuOpen(false)}>
          <FaTimes />
        </div>

        <Link to="/" className="mobileLink" onClick={() => setMenuOpen(false)}>Home</Link>
        <Link to="/welcome" className="mobileLink" onClick={() => setMenuOpen(false)}>Welcome</Link>
        <Link to="/events" className="mobileLink" onClick={() => setMenuOpen(false)}>Events</Link>
        <Link to="/directory" className="mobileLink" onClick={() => setMenuOpen(false)}>Directory</Link>
        <Link to="/community" className="mobileLink" onClick={() => setMenuOpen(false)}>Community</Link>
        <Link to="/jobs" className="mobileLink" onClick={() => setMenuOpen(false)}>Jobs</Link>
        <Link to="/classifieds" className="mobileLink" onClick={() => setMenuOpen(false)}>Classifieds</Link>
        <Link to="/contact" className="mobileLink" onClick={() => setMenuOpen(false)}>Contact Us</Link>

        <AuthArea mobile />
      </nav>

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; overflow-x: hidden; }

        .header {
          position: sticky;
          top: 0;
          width: 100%;
          background: rgba(255, 255, 255, 0.97);
          backdrop-filter: blur(10px);
          box-shadow: 0 4px 20px rgba(0,0,0,0.05);
          z-index: 1000;
        }

        .container {
          max-width: 1440px;
          margin: auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px clamp(15px, 4vw, 40px);
        }

        .logo {
          height: clamp(55px, 7vw, 85px);
          transition: 0.3s ease;
        }

        .logo:hover { transform: scale(1.04); }

        .nav {
          display: flex;
          gap: clamp(12px, 2vw, 26px);
          align-items: center;
        }

        .link {
          text-decoration: none;
          color: #222;
          font-weight: 600;
          font-size: clamp(14px, 1.05vw, 16px);
          position: relative;
          transition: 0.3s ease;
          white-space: nowrap;
        }

        .link::after {
          content: "";
          position: absolute;
          width: 0%;
          height: 3px;
          bottom: -6px;
          left: 0;
          background: #FF6B70;
          transition: width 0.3s ease;
        }

        .link:hover { color: #FF6B70; }
        .link:hover::after { width: 100%; }

        .adminNavBtn {
          background: linear-gradient(135deg, #1e293b, #0f172a);
          color: #f59e0b;
          border: 1px solid #f59e0b;
          padding: 8px 16px;
          border-radius: 30px;
          cursor: pointer;
          font-weight: 700;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: 0.2s ease;
          box-shadow: 0 2px 10px rgba(245, 158, 11, 0.2);
        }

        .adminNavBtn:hover {
          background: #0f172a;
          transform: translateY(-2px);
          box-shadow: 0 4px 14px rgba(245, 158, 11, 0.35);
        }

        .managerNavBtn {
          background: linear-gradient(135deg, #0284c7, #0369a1);
          color: white;
          border: 1px solid #38bdf8;
          padding: 8px 16px;
          border-radius: 30px;
          cursor: pointer;
          font-weight: 700;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: 0.2s ease;
        }

        .managerNavBtn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 14px rgba(3, 105, 161, 0.3);
        }

        .msgNavBtn {
          background: #f1f5f9;
          color: #2563eb;
          border: 1px solid #cbd5e1;
          padding: 8px 14px;
          border-radius: 30px;
          cursor: pointer;
          font-weight: 700;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: 0.2s;
        }

        .msgNavBtn:hover {
          background: #e0f2fe;
          border-color: #0284c7;
        }

        .authButton {
          background: linear-gradient(45deg, #FF6B70, #ff878c);
          color: white;
          border: none;
          padding: 9px 20px;
          border-radius: 30px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          transition: 0.3s ease;
          white-space: nowrap;
        }

        .authButton:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(255,107,112,0.4);
        }

        .profilePill {
          display: flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #0f766e, #16a34a);
        }

        .profilePillAvatar {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          object-fit: cover;
        }

        .profilePillInitial {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: rgba(255,255,255,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 13px;
        }

        .menuIcon {
          display: none;
          font-size: 26px;
          cursor: pointer;
          color: #FF6B70;
        }

        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.4);
          backdrop-filter: blur(2px);
          z-index: 1500;
        }

        .mobileNav {
          position: fixed;
          top: 0;
          right: -100%;
          height: 100vh;
          width: min(85%, 320px);
          background: white;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 20px;
          padding: 40px 24px;
          box-shadow: -5px 0 25px rgba(0,0,0,0.15);
          transition: 0.4s ease;
          z-index: 2000;
        }

        .mobileNav.active { right: 0; }

        .mobileLink {
          text-decoration: none;
          font-size: 17px;
          font-weight: 600;
          color: #222;
          transition: 0.3s ease;
        }

        .mobileLink:hover { color: #FF6B70; }

        .closeIcon {
          position: absolute;
          top: 20px;
          right: 20px;
          font-size: 24px;
          cursor: pointer;
          color: #FF6B70;
        }

        @media (max-width: 900px) {
          .nav, .desktopAuth { display: none; }
          .menuIcon { display: block; }
        }
      `}</style>
    </>
  );
};

export default Header;