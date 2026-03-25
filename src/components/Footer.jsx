import { Link } from "react-router-dom";

const Footer = () => {
  const logoUrl = "/community.png";
  const year = new Date().getFullYear();

  return (
    <footer style={s.footer}>
      <div style={s.container} className="footerGrid">
        {/* BRAND */}
        <div style={s.brandCol} className="footerBrand">
          <div style={s.brandTop}>
            <img src={logoUrl} alt="CommunityHub Logo" style={s.logoBig} />
            <div style={s.brandUnder}>
              <div style={s.brandName}>CommunityHub</div>
              <div style={s.brandTag}>Build connections. Grow together.</div>
            </div>
          </div>

          <p style={s.desc}>
            A secure community platform with verified users, jobs, directory, and
            classifieds — designed for speed & trust.
          </p>

          <div style={s.socialRow}>
            <a href="#" style={s.socialBtn} className="socialBtn" aria-label="Facebook" title="Facebook">
              <FacebookIcon />
            </a>
            <a href="#" style={s.socialBtn} className="socialBtn" aria-label="Instagram" title="Instagram">
              <InstagramIcon />
            </a>
            <a href="#" style={s.socialBtn} className="socialBtn" aria-label="WhatsApp" title="WhatsApp">
              <WhatsAppIcon />
            </a>
            <a href="#" style={s.socialBtn} className="socialBtn" aria-label="Google" title="Google">
              <GoogleIcon />
            </a>
            <a href="#" style={s.socialBtn} className="socialBtn" aria-label="LinkedIn" title="LinkedIn">
              <LinkedInIcon />
            </a>
            <a href="#" style={s.socialBtn} className="socialBtn" aria-label="Twitter / X" title="Twitter / X">
              <XIcon />
            </a>
          </div>
        </div>

        {/* LINKS */}
        <div style={s.linksCol}>
          <div style={s.colTitle}>Quick Links</div>

          <div style={s.linksList}>
            <Link to="/" style={s.linkRow}>
              <span style={s.linkIcon}><ArrowIcon /></span>
              <span>Home</span>
            </Link>
            <Link to="/welcome" style={s.linkRow}>
              <span style={s.linkIcon}><ArrowIcon /></span>
              <span>Welcome</span>
            </Link>
            <Link to="/community" style={s.linkRow}>
              <span style={s.linkIcon}><ArrowIcon /></span>
              <span>Community</span>
            </Link>
            <Link to="/directory" style={s.linkRow}>
              <span style={s.linkIcon}><ArrowIcon /></span>
              <span>Directory</span>
            </Link>
            <Link to="/jobs" style={s.linkRow}>
              <span style={s.linkIcon}><ArrowIcon /></span>
              <span>Jobs</span>
            </Link>
            <Link to="/classifieds" style={s.linkRow}>
              <span style={s.linkIcon}><ArrowIcon /></span>
              <span>Classifieds</span>
            </Link>
          </div>

          <div style={s.ctaBox}>
            <div style={s.ctaTitle}>Post something today</div>
            <div style={s.ctaText}>
              Post a job, list a business, or publish classifieds — admin verified.
            </div>

            <div style={s.ctaBtns}>
              <a href="http://localhost:5173/login" style={s.ctaPrimary}>Post a Job</a>
              <a href="http://localhost:5173/login" style={s.ctaGhost}>Post Directory</a>
              <a href="http://localhost:5173/login" style={s.ctaGhost2}>Post Classifieds</a>
            </div>
          </div>
        </div>

        {/* CONTACT */}
        <div style={s.contactCol}>
          <div style={s.colTitle}>Contact</div>

          <div style={s.contactCard}>
            <div style={s.contactRow}>
              <span style={s.iconWrap}><PhoneIcon /></span>
              <div>
                <div style={s.contactLabel}>Call</div>
                <div style={s.contactValue}>+91 98765 43210</div>
              </div>
            </div>

            <div style={s.contactRow}>
              <span style={s.iconWrap}><MailIcon /></span>
              <div>
                <div style={s.contactLabel}>Mail</div>
                <div style={s.contactValue}>support@communityhub.com</div>
              </div>
            </div>

            <div style={s.contactRow}>
              <span style={s.iconWrap}><MapIcon /></span>
              <div>
                <div style={s.contactLabel}>Location</div>
                <div style={s.contactValue}>Hyderabad, Telangana, India</div>
              </div>
            </div>

            <div style={s.newsBox}>
              <div style={s.newsTitle}>Get updates</div>
              <div style={s.newsText}>Monthly community updates & new listings.</div>

              <form
                style={s.newsForm}
                onSubmit={(e) => {
                  e.preventDefault();
                  alert("✅ Thanks! We'll keep you updated.");
                }}
              >
                <input
                  type="email"
                  required
                  placeholder="Enter your email"
                  style={s.newsInput}
                />
                <button type="submit" style={s.newsBtn}>Subscribe</button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div style={s.bottomBar}>
        <div style={s.bottomInner} className="footerBottom">
          <div style={s.copy}>© {year} CommunityHub. All rights reserved.</div>

          <div style={s.bottomLinks}>
            <Link to="/privacy" style={s.bottomLink}>Privacy</Link>
            <span style={s.sep}>•</span>
            <Link to="/terms" style={s.bottomLink}>Terms</Link>
            <span style={s.sep}>•</span>
            <Link to="/contact" style={s.bottomLink}>Support</Link>
          </div>
        </div>
      </div>

      <style>{`
        .footerGrid{
          display:grid;
          grid-template-columns: 1.1fr 1.2fr 1fr;
          gap: 18px;
        }

        a:hover{ opacity: 0.98; }

        .socialBtn:hover{
          transform: translateY(-2px) scale(1.03);
          background: rgba(255,255,255,0.10);
        }

        @media (max-width: 980px){
          .footerGrid{
            grid-template-columns: 1fr 1fr;
          }
          .footerBrand{
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 640px){
          .footerGrid{
            grid-template-columns: 1fr;
          }
          .footerBottom{
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }
        }
      `}</style>
    </footer>
  );
};

/* ================== ICONS (SVG) ================== */
const IconBase = ({ children }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ display: "block" }}>
    {children}
  </svg>
);

const ArrowIcon = () => (
  <IconBase>
    <path
      d="M9 18l6-6-6-6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </IconBase>
);

const FacebookIcon = () => (
  <IconBase>
    <path
      d="M14 8.5V7.2c0-.8.5-1.2 1.2-1.2H17V3h-2.2C12.6 3 11 4.4 11 6.9v1.6H9v3h2V21h3v-9.5h2.4l.6-3H14z"
      fill="currentColor"
    />
  </IconBase>
);

const InstagramIcon = () => (
  <IconBase>
    <path
      d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9A3.5 3.5 0 0 0 20 16.5v-9A3.5 3.5 0 0 0 16.5 4h-9z"
      fill="currentColor"
    />
    <path
      d="M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"
      fill="currentColor"
    />
    <path d="M17.7 6.3a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" fill="currentColor" />
  </IconBase>
);

const WhatsAppIcon = () => (
  <IconBase>
    <path
      d="M20.5 11.9a8.5 8.5 0 0 1-12.4 7.6L3 21l1.6-5A8.5 8.5 0 1 1 20.5 11.9zm-8.5-6.5a6.5 6.5 0 0 0-5.6 9.8l.2.3-.9 2.8 2.9-.9.3.2A6.5 6.5 0 1 0 12 5.4z"
      fill="currentColor"
    />
    <path
      d="M15.7 13.7c-.2-.1-1.1-.6-1.3-.6-.2-.1-.3-.1-.5.1-.1.2-.6.6-.7.7-.1.1-.3.1-.5 0a5.4 5.4 0 0 1-1.6-1 6.2 6.2 0 0 1-1.1-1.4c-.1-.2 0-.4.1-.5l.3-.3c.1-.1.2-.3.2-.4 0-.1 0-.3 0-.4 0-.1-.5-1.2-.7-1.6-.2-.4-.4-.4-.5-.4h-.4c-.1 0-.4.1-.6.3-.2.2-.8.7-.8 1.7s.8 2 1 2.2c.1.2 1.6 2.5 3.9 3.5.5.2.9.4 1.2.5.5.1.9.1 1.2.1.4-.1 1.1-.5 1.2-.9.1-.4.1-.8.1-.9 0-.1-.2-.2-.4-.3z"
      fill="currentColor"
    />
  </IconBase>
);

const GoogleIcon = () => (
  <IconBase>
    <path
      d="M21.6 12.3c0-.5-.05-1-.14-1.4H12v2.7h5.4a4.6 4.6 0 0 1-2 3v1.8h3.2c1.9-1.8 3-4.4 3-7.1z"
      fill="currentColor"
      opacity="0.95"
    />
    <path
      d="M12 22c2.7 0 5-0.9 6.7-2.4l-3.2-1.8c-.9.6-2 .9-3.5.9-2.7 0-5-1.8-5.8-4.2H2.9v1.9A10 10 0 0 0 12 22z"
      fill="currentColor"
      opacity="0.85"
    />
    <path
      d="M6.2 14.5A6 6 0 0 1 6 12c0-.9.2-1.7.4-2.5V7.6H2.9A10 10 0 0 0 2 12c0 1.6.4 3.2.9 4.4l3.3-1.9z"
      fill="currentColor"
      opacity="0.75"
    />
    <path
      d="M12 5.3c1.5 0 2.8.5 3.8 1.5l2.9-2.9C17 2.4 14.7 2 12 2A10 10 0 0 0 2.9 7.6l3.3 1.9C7 7.1 9.3 5.3 12 5.3z"
      fill="currentColor"
    />
  </IconBase>
);

const LinkedInIcon = () => (
  <IconBase>
    <path
      d="M6.5 6.8A1.8 1.8 0 1 1 6.5 3a1.8 1.8 0 0 1 0 3.8zM5 21V9h3v12H5zm5-12h2.9v1.6h.1c.4-.8 1.4-1.9 3.2-1.9 3.4 0 4 2.2 4 5.1V21h-3v-5.9c0-1.4 0-3.2-2-3.2s-2.3 1.5-2.3 3.1V21H10V9z"
      fill="currentColor"
    />
  </IconBase>
);

const XIcon = () => (
  <IconBase>
    <path
      d="M18.6 2H21l-6.6 7.6L21.5 22h-5.2l-4.1-6-5.1 6H4.7l7.1-8.2L2.6 2h5.3l3.7 5.3L18.6 2zm-1 18h1.3L8.1 3.9H6.7L17.6 20z"
      fill="currentColor"
    />
  </IconBase>
);

const PhoneIcon = () => (
  <IconBase>
    <path
      d="M6.6 10.8c1.4 2.7 3.9 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.3 1.2.4 2.6.6 3.9.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.9 21 3 13.1 3 3c0-.6.4-1 1-1h3.2c.6 0 1 .4 1 1 0 1.3.2 2.7.6 3.9.1.4 0 .8-.3 1.1L6.6 10.8z"
      fill="currentColor"
    />
  </IconBase>
);

const MailIcon = () => (
  <IconBase>
    <path
      d="M4 6h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zm0 2v.2l8 5 8-5V8H4zm16 10V10.6l-7.5 4.7a1 1 0 0 1-1 0L4 10.6V18h16z"
      fill="currentColor"
    />
  </IconBase>
);

const MapIcon = () => (
  <IconBase>
    <path
      d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7zm0 9.5A2.5 2.5 0 1 0 12 6.5a2.5 2.5 0 0 0 0 5z"
      fill="currentColor"
    />
  </IconBase>
);

/* ================== STYLES ================== */
const s = {
  footer: {
    background:
      "radial-gradient(1200px 500px at 10% 0%, rgba(37,99,235,0.25), transparent 60%), radial-gradient(900px 380px at 90% 20%, rgba(255,107,112,0.25), transparent 55%), #0b1220",
    color: "#e5e7eb",
    width: "100%",
    boxSizing: "border-box",
    borderTop: "1px solid rgba(255,255,255,0.08)",
  },

  container: {
    maxWidth: "1550px",
    margin: "0 auto",
    padding: "42px 20px 26px 20px",
  },

  brandCol: {
    padding: "18px",
    borderRadius: "18px",
    border: "1px solid rgba(255,255,255,0.06)",
    backdropFilter: "blur(8px)",
    background: "transparent",
  },
  brandTop: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "10px" },
  logoBig: {
    width: "240px",
    maxWidth: "100%",
    height: "auto",
    borderRadius: "0px",
    background: "transparent",
    padding: "0px",
    objectFit: "contain",
  },
  brandUnder: { paddingLeft: "2px" },
  brandName: { fontSize: "20px", fontWeight: 900, color: "#fff", lineHeight: 1.15 },
  brandTag: { fontSize: "12px", color: "rgba(229,231,235,0.85)", marginTop: "4px" },
  desc: { margin: "14px 0 0 0", fontSize: "13px", lineHeight: 1.7, color: "rgba(229,231,235,0.85)" },

  socialRow: { display: "flex", gap: "10px", marginTop: "14px", flexWrap: "wrap" },
  socialBtn: {
    width: "40px",
    height: "40px",
    borderRadius: "12px",
    display: "grid",
    placeItems: "center",
    textDecoration: "none",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#fff",
    transition: "transform 0.2s ease, background 0.2s ease",
  },

  linksCol: {
    padding: "18px",
    borderRadius: "18px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.06)",
    backdropFilter: "blur(8px)",
  },

  // ✅ change headings font-size to 20px (Quick Links + Contact)
  colTitle: { fontSize: "20px", fontWeight: 900, color: "#fff", marginBottom: "12px" },

  linksList: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "10px",
    marginBottom: "14px",
  },
  linkRow: {
    textDecoration: "none",
    color: "rgba(229,231,235,0.9)",
    fontSize: "13px",
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "6px 2px",
    transition: "transform 0.2s ease, opacity 0.2s ease",
  },
  linkIcon: {
    width: "22px",
    height: "22px",
    borderRadius: "8px",
    display: "grid",
    placeItems: "center",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#fff",
  },

  ctaBox: {
    marginTop: "6px",
    padding: "14px",
    borderRadius: "16px",
    background: "linear-gradient(135deg, rgba(37,99,235,0.22), rgba(255,107,112,0.14))",
    border: "1px solid rgba(255,255,255,0.10)",
  },
  ctaTitle: { fontWeight: 900, color: "#fff", fontSize: "13px" },
  ctaText: { marginTop: "6px", fontSize: "12px", color: "rgba(229,231,235,0.85)", lineHeight: 1.6 },
  ctaBtns: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "10px",
    marginTop: "12px",
  },
  ctaPrimary: {
    textDecoration: "none",
    background: "#FF6B70",
    color: "#0b1220",
    fontWeight: 900,
    fontSize: "12px",
    padding: "10px 10px",
    borderRadius: "12px",
    textAlign: "center",
  },
  ctaGhost: {
    textDecoration: "none",
    background: "rgba(255,255,255,0.08)",
    color: "#fff",
    fontWeight: 900,
    fontSize: "12px",
    padding: "10px 10px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.10)",
    textAlign: "center",
  },
  ctaGhost2: {
    textDecoration: "none",
    background: "rgba(255,255,255,0.08)",
    color: "#fff",
    fontWeight: 900,
    fontSize: "12px",
    padding: "10px 10px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.10)",
    textAlign: "center",
  },

  contactCol: {
    padding: "18px",
    borderRadius: "18px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.06)",
    backdropFilter: "blur(8px)",
  },
  contactCard: { display: "flex", flexDirection: "column", gap: "12px" },
  contactRow: { display: "flex", gap: "10px", alignItems: "flex-start" },

  iconWrap: {
    width: "38px",
    height: "38px",
    borderRadius: "12px",
    display: "grid",
    placeItems: "center",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#fff",
    flex: "0 0 auto",
    marginTop: "2px",
  },

  contactLabel: { fontSize: "11px", color: "rgba(229,231,235,0.7)", fontWeight: 800 },
  contactValue: { fontSize: "13px", color: "#fff", fontWeight: 800, marginTop: "2px" },

  newsBox: {
    marginTop: "6px",
    padding: "14px",
    borderRadius: "16px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
  },
  newsTitle: { color: "#fff", fontWeight: 900, fontSize: "13px" },
  newsText: { marginTop: "6px", fontSize: "12px", color: "rgba(229,231,235,0.85)", lineHeight: 1.6 },

  newsForm: { display: "flex", gap: "10px", marginTop: "10px" },
  newsInput: {
    flex: 1,
    padding: "10px 12px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.25)",
    outline: "none",
    color: "#fff",
    fontSize: "12px",
  },
  newsBtn: {
    padding: "10px 12px",
    borderRadius: "12px",
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: "12px",
    whiteSpace: "nowrap",
  },

  bottomBar: {
    borderTop: "1px solid rgba(255,255,255,0.08)",
    padding: "14px 0",
    background: "rgba(0,0,0,0.22)",
  },
  bottomInner: {
    maxWidth: "1150px",
    margin: "0 auto",
    padding: "0 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  copy: { fontSize: "12px", color: "rgba(229,231,235,0.85)", fontWeight: 700 },
  bottomLinks: { display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" },
  bottomLink: { textDecoration: "none", color: "rgba(229,231,235,0.85)", fontSize: "12px", fontWeight: 800 },
  sep: { opacity: 0.5 },
};

export default Footer;
