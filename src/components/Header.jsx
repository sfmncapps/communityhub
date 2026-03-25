import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FaBars, FaTimes } from "react-icons/fa";

const Header = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="header">
        <div className="container">

          {/* Logo */}
          <div className="logoContainer">
            <img src="/community.png" alt="Logo" className="logo" />
          </div>

          {/* Desktop Navigation */}
          <nav className="nav desktopNav">
            <Link to="/" className="link">Home</Link>
            <Link to="/welcome" className="link">Welcome</Link>
            <Link to="/event" className="link">Events</Link>
            <Link to="/community" className="link">Community</Link>
            <Link to="/directory" className="link">Directory</Link>
            <Link to="/jobs" className="link">Jobs</Link>
            <Link to="/classifieds" className="link">Classifieds</Link>
          </nav>

          {/* Desktop Login */}
          <div className="desktopAuth">
            <button
              className="authButton"
              onClick={() => navigate("/login")}
            >
              Login / Register
            </button>
          </div>

          {/* Mobile Menu Icon */}
          <div className="menuIcon" onClick={() => setMenuOpen(true)}>
            <FaBars />
          </div>

        </div>
      </header>

      {/* Overlay */}
      {menuOpen && (
        <div className="overlay" onClick={() => setMenuOpen(false)} />
      )}

      {/* Mobile Drawer */}
      <nav className={`mobileNav ${menuOpen ? "active" : ""}`}>
        <div className="closeIcon" onClick={() => setMenuOpen(false)}>
          <FaTimes />
        </div>

        <Link to="/" className="mobileLink" onClick={() => setMenuOpen(false)}>Home</Link>
        <Link to="/welcome" className="mobileLink" onClick={() => setMenuOpen(false)}>Welcome</Link>
        <Link to="/community" className="mobileLink" onClick={() => setMenuOpen(false)}>Community</Link>
        <Link to="/directory" className="mobileLink" onClick={() => setMenuOpen(false)}>Directory</Link>
        <Link to="/jobs" className="mobileLink" onClick={() => setMenuOpen(false)}>Jobs</Link>
        <Link to="/classifieds" className="mobileLink" onClick={() => setMenuOpen(false)}>Classifieds</Link>

        <button
          className="authButton mobileBtn"
          onClick={() => {
            navigate("/login");
            setMenuOpen(false);
          }}
        >
          Login / Register
        </button>
      </nav>

      <style>{`

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          overflow-x: hidden;
        }

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
          max-width: 1400px;
          margin: auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px clamp(15px, 4vw, 40px);
        }

        /* Logo */
        .logo {
          height: clamp(65px, 8vw, 110px);
          transition: 0.3s ease;
        }

        .logo:hover {
          transform: scale(1.05);
        }

        /* Desktop Nav */
        .nav {
          display: flex;
          gap: clamp(20px, 3vw, 40px);
          align-items: center;
        }

        .link {
          text-decoration: none;
          color: #222;
          font-weight: 600;
          font-size: clamp(15px, 1.2vw, 18px);
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

        .link:hover {
          color: #FF6B70;
        }

        .link:hover::after {
          width: 100%;
        }

        /* Button */
        .authButton {
          background: linear-gradient(45deg, #FF6B70, #ff878c);
          color: white;
          border: none;
          padding: 9px 22px;
          border-radius: 30px;
          cursor: pointer;
          font-weight: 600;
          font-size: 15px;
          transition: 0.3s ease;
          white-space: nowrap;
        }

        .authButton:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 18px rgba(255,107,112,0.4);
        }

        .menuIcon {
          display: none;
          font-size: 26px;
          cursor: pointer;
          color: #FF6B70;
        }

        /* Overlay */
        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.4);
          backdrop-filter: blur(2px);
          z-index: 1500;
        }

        /* Drawer */
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
          gap: 28px;
          padding: 40px 30px;
          box-shadow: -5px 0 25px rgba(0,0,0,0.15);
          transition: 0.4s ease;
          z-index: 2000;
        }

        .mobileNav.active {
          right: 0;
        }

        .mobileLink {
          text-decoration: none;
          font-size: 18px;
          font-weight: 600;
          color: #222;
          transition: 0.3s ease;
        }

        .mobileLink:hover {
          color: #FF6B70;
        }

        .mobileBtn {
          margin-top: 20px;
        }

        .closeIcon {
          position: absolute;
          top: 20px;
          right: 20px;
          font-size: 24px;
          cursor: pointer;
          color: #FF6B70;
        }

        /* ---------- RESPONSIVE BREAKPOINTS ---------- */

        /* Tablet */
        @media (max-width: 1024px) {
          .nav {
            gap: 20px;
          }
        }

        /* Mobile */
        @media (max-width: 768px) {

          .nav {
            display: none;
          }

          .desktopAuth {
            display: none;
          }

          .menuIcon {
            display: block;
          }
        }

      `}</style>
    </>
  );
};

export default Header;
