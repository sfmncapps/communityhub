import { useEffect, useState } from "react";
import supabase from "../config/supabaseClient";

const API = import.meta.env.VITE_API_BASE_URL || "https://communityhub.sunflowerwebtek.com/api";

// Works for both login types: our own JWT (email/phone/whatsapp/password)
// or a live Supabase session (Google/Apple).
const getAuthToken = async () => {
  const localToken = localStorage.getItem("token");
  if (localToken) return localToken;

  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
};

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const [form, setForm] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    full_name: "",
    email: "",
    phone: "",
    street_address: "",
    city: "",
    state: "",
    country: "India",
    zip_code: "",
    company_name: "",
    company_location: "",
    company_address: "",
    business_category: "",
    business_about: "",
    profile_pic: "",
    company_logo: "",
    brand_tagline: "",
  });

  const [profilePreview, setProfilePreview] = useState("");
  const [logoPreview, setLogoPreview] = useState("");
  const [profileFile, setProfileFile] = useState(null);
  const [logoFile, setLogoFile] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  // Load the REAL profile from the backend on mount.
  useEffect(() => {
    (async () => {
      try {
        const token = await getAuthToken();
        if (!token) {
          showToast("Not logged in");
          setLoading(false);
          return;
        }

        const res = await fetch(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (!res.ok) {
          showToast(data.message || "Failed to load profile");
          setLoading(false);
          return;
        }

        const u = data.user || {};

        // Parse legacy full name into first/middle/last if discrete fields not set
        let fName = u.first_name || "";
        let mName = u.middle_name || "";
        let lName = u.last_name || "";

        if (!fName && u.name) {
          const parts = u.name.trim().split(/\s+/);
          fName = parts[0] || "";
          if (parts.length === 2) {
            lName = parts[1];
          } else if (parts.length > 2) {
            mName = parts.slice(1, -1).join(" ");
            lName = parts[parts.length - 1];
          }
        }

        const next = {
          first_name: fName,
          middle_name: mName,
          last_name: lName,
          full_name: u.name || [fName, mName, lName].filter(Boolean).join(" "),
          email: u.email || "",
          phone: u.phone || "",
          street_address: u.street_address || u.company_address || "",
          city: u.city || u.company_location || "",
          state: u.state || "",
          country: u.country || "India",
          zip_code: u.zip_code || "",
          company_name: u.company_name || "",
          company_location: u.company_location || "",
          company_address: u.company_address || "",
          business_category: u.category || "",
          business_about: u.business_about || "",
          profile_pic: u.profile_pic || "",
          company_logo: u.company_logo || "",
          brand_tagline: u.brand_tagline || "",
        };

        setForm(next);
        setProfilePreview(next.profile_pic || "");
        setLogoPreview(next.company_logo || "");
      } catch (err) {
        console.error(err);
        showToast("Failed to load profile ❌");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleImageChange = (e, type) => {
    const f = e.target.files?.[0];
    if (!f) return;

    const maxSize = 2 * 1024 * 1024;
    if (!f.type.startsWith("image/")) return showToast("Select an image file");
    if (f.size > maxSize) return showToast("Image must be under 2MB");

    const localPreview = URL.createObjectURL(f);

    if (type === "profile") {
      setProfileFile(f);
      setProfilePreview(localPreview);
    } else {
      setLogoFile(f);
      setLogoPreview(localPreview);
    }
  };

  const removeImage = (type) => {
    if (type === "profile") {
      setProfileFile(null);
      setProfilePreview("");
      setForm((p) => ({ ...p, profile_pic: "" }));
    } else {
      setLogoFile(null);
      setLogoPreview("");
      setForm((p) => ({ ...p, company_logo: "" }));
    }
  };
  const saveUI = async () => {
    try {
      // 1. Client-side Validation
      if (!form.first_name.trim()) {
        showToast("First name is required ⚠️");
        return;
      }
      if (!form.last_name.trim()) {
        showToast("Last name is required ⚠️");
        return;
      }
      if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        showToast("Valid email address is required ⚠️");
        return;
      }
      if (form.phone && form.phone.trim() && !/^\+?[0-9\s\-()]{7,25}$/.test(form.phone.trim())) {
        showToast("Valid phone number format required (7-25 digits) ⚠️");
        return;
      }
      if (form.zip_code && form.zip_code.trim().length > 20) {
        showToast("ZIP code cannot exceed 20 characters ⚠️");
        return;
      }

      setSaving(true);

      let profilePic = form.profile_pic;
      let companyLogo = form.company_logo;

      if (profileFile) profilePic = await fileToBase64(profileFile);
      if (logoFile) companyLogo = await fileToBase64(logoFile);

      // Auto-construct full name for backward compatibility
      const fullName = [form.first_name.trim(), form.middle_name.trim(), form.last_name.trim()]
        .filter(Boolean)
        .join(" ");

      const payload = {
        ...form,
        full_name: fullName,
        profile_pic: profilePic,
        company_logo: companyLogo,
      };

      const token = await getAuthToken();
      if (!token) {
        showToast("Not logged in ❌");
        return;
      }

      const res = await fetch(`${API}/auth/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          first_name: payload.first_name.trim(),
          middle_name: payload.middle_name.trim(),
          last_name: payload.last_name.trim(),
          name: fullName,
          email: payload.email.trim().toLowerCase(),
          phone: payload.phone.trim(),
          street_address: payload.street_address.trim(),
          city: payload.city.trim(),
          state: payload.state.trim(),
          country: payload.country.trim() || "India",
          zip_code: payload.zip_code.trim(),
          company_name: payload.company_name.trim(),
          company_location: payload.company_location || payload.city.trim(),
          company_address: payload.company_address || payload.street_address.trim(),
          category: payload.business_category,
          business_about: payload.business_about,
          profile_pic: payload.profile_pic,
          company_logo: payload.company_logo,
          brand_tagline: payload.brand_tagline,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.message || "Save failed ❌");
        return;
      }

      setForm(payload);
      setProfilePreview(profilePic || "");
      setLogoPreview(companyLogo || "");

      showToast("Profile updated successfully! ✅");
      window.dispatchEvent(new Event("profile-updated"));
    } catch (err) {
      console.error(err);
      showToast("Save failed ❌");
    } finally {
      setSaving(false);
      setProfileFile(null);
      setLogoFile(null);
    }
  };

  const resetDraft = () => {
    window.location.reload();
  };

  return (
    <>
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
          Loading profile details...
        </div>
      ) : (
      <div className="pf4">
        {/* Top Header */}
        <div className="pf4__top">
          <div>
            <h2 className="pf4__title">Member Profile & Settings</h2>
            <p className="pf4__sub">Manage your personal identification, physical address, and community presence</p>
          </div>

          <div className="pf4__actions">
            <button className="pf4__btn pf4__btnGhost" onClick={resetDraft}>
              Reset
            </button>
            <button className="pf4__btn pf4__btnPrimary" onClick={saveUI} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        <div className="pf4__grid">
          {/* Left Column: Media */}
          <div className="pf4__stack">
            {/* Profile Photo */}
            <div className="pf4__card pf4__anim">
              <div className="pf4__cardTitle">Profile Photo (Current Photo)</div>

              <label className="pf4__drop">
                {profilePreview ? (
                  <img className="pf4__dropImg" src={profilePreview} alt="Profile" />
                ) : (
                  <div className="pf4__dropEmpty">
                    <div className="pf4__dropIcon">👤</div>
                    <div className="pf4__dropText">UPLOAD PHOTO</div>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => handleImageChange(e, "profile")}
                />
              </label>

              <div className="pf4__rowBtns">
                <label className="pf4__btn pf4__btnPrimary pf4__btnSmall">
                  Upload Photo
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => handleImageChange(e, "profile")}
                  />
                </label>
                <button
                  className="pf4__btn pf4__btnDanger pf4__btnSmall"
                  onClick={() => removeImage("profile")}
                  disabled={!profilePreview && !form.profile_pic}
                >
                  Remove
                </button>
              </div>
            </div>

            {/* Logo upload card */}
            <div className="pf4__card pf4__anim">
              <div className="pf4__cardTitle">Organization / Business Logo</div>

              <label className="pf4__logoDrop">
                {logoPreview ? (
                  <img className="pf4__logoImg" src={logoPreview} alt="Company Logo" />
                ) : (
                  <div className="pf4__logoEmpty">
                    <div className="pf4__dropIcon">🏢</div>
                    <div className="pf4__logoText">UPLOAD LOGO</div>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => handleImageChange(e, "logo")}
                />
              </label>

              <div className="pf4__rowBtns pf4__rowBtnsCenter">
                <label className="pf4__btn pf4__btnPrimary pf4__btnSmall">
                  Upload Logo
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => handleImageChange(e, "logo")}
                  />
                </label>
                <button
                  className="pf4__btn pf4__btnDanger pf4__btnSmall"
                  onClick={() => removeImage("logo")}
                  disabled={!logoPreview && !form.company_logo}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Structured Details */}
          <div className="pf4__card pf4__anim">
            <div className="pf4__form">
              {/* SECTION 1: Personal Details */}
              <div className="pf4__sectionHeader">
                <h3>Personal Identification</h3>
                <span>Basic contact and full legal name</span>
              </div>

              <div className="pf4__rowThree">
                <div className="pf4__field">
                  <label>First Name *</label>
                  <input
                    value={form.first_name}
                    onChange={(e) => {
                      const val = e.target.value;
                      const f = { ...form, first_name: val };
                      f.full_name = [val, f.middle_name, f.last_name].filter(Boolean).join(" ");
                      setForm(f);
                    }}
                    placeholder="e.g. Rahul"
                    required
                  />
                </div>
                <div className="pf4__field">
                  <label>Middle Name</label>
                  <input
                    value={form.middle_name}
                    onChange={(e) => {
                      const val = e.target.value;
                      const f = { ...form, middle_name: val };
                      f.full_name = [f.first_name, val, f.last_name].filter(Boolean).join(" ");
                      setForm(f);
                    }}
                    placeholder="e.g. Kumar"
                  />
                </div>
                <div className="pf4__field">
                  <label>Last Name *</label>
                  <input
                    value={form.last_name}
                    onChange={(e) => {
                      const val = e.target.value;
                      const f = { ...form, last_name: val };
                      f.full_name = [f.first_name, f.middle_name, val].filter(Boolean).join(" ");
                      setForm(f);
                    }}
                    placeholder="e.g. Sharma"
                    required
                  />
                </div>
              </div>

              <div className="pf4__row">
                <div className="pf4__field">
                  <label>Primary Email *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="name@example.com"
                    required
                  />
                </div>
                <div className="pf4__field">
                  <label>Primary Phone *</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              {/* SECTION 2: Physical Address */}
              <div className="pf4__sectionHeader">
                <h3>Physical Address</h3>
                <span>Street, city, state, country, and postal code</span>
              </div>

              <div className="pf4__field">
                <label>Street Address</label>
                <input
                  value={form.street_address}
                  onChange={(e) => setForm({ ...form, street_address: e.target.value, company_address: e.target.value })}
                  placeholder="Flat / House No., Street, Landmark"
                />
              </div>

              <div className="pf4__rowFour">
                <div className="pf4__field">
                  <label>City</label>
                  <input
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value, company_location: e.target.value })}
                    placeholder="City"
                  />
                </div>
                <div className="pf4__field">
                  <label>State</label>
                  <input
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    placeholder="State"
                  />
                </div>
                <div className="pf4__field">
                  <label>Country</label>
                  <input
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    placeholder="Country"
                  />
                </div>
                <div className="pf4__field">
                  <label>ZIP / Postal Code</label>
                  <input
                    value={form.zip_code}
                    onChange={(e) => setForm({ ...form, zip_code: e.target.value })}
                    placeholder="500081"
                  />
                </div>
              </div>

              {/* SECTION 3: Business & Collective Info */}
              <div className="pf4__sectionHeader">
                <h3>Business & Professional Profile</h3>
                <span>Details displayed across directories and collective profiles</span>
              </div>

              <div className="pf4__row">
                <div className="pf4__field">
                  <label>Company / Organization Name</label>
                  <input
                    value={form.company_name}
                    onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                    placeholder="Company or Collective name"
                  />
                </div>
                <div className="pf4__field">
                  <label>Business Category</label>
                  <select
                    value={form.business_category}
                    onChange={(e) => setForm({ ...form, business_category: e.target.value })}
                  >
                    <option value="">Select category</option>
                    <option value="IT Services">IT Services</option>
                    <option value="Food & Dining">Food & Dining</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Education">Education</option>
                    <option value="Community Welfare">Community Welfare</option>
                    <option value="Construction">Construction</option>
                    <option value="Interior & Design">Interior & Design</option>
                    <option value="E-commerce">E-commerce</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="pf4__field">
                <label>Brand Tagline</label>
                <input
                  value={form.brand_tagline}
                  onChange={(e) => setForm({ ...form, brand_tagline: e.target.value })}
                  placeholder="Short one-line headline or motto"
                />
              </div>

              <div className="pf4__field">
                <label>About / Bio</label>
                <textarea
                  rows="3"
                  value={form.business_about}
                  onChange={(e) => setForm({ ...form, business_about: e.target.value })}
                  placeholder="Briefly describe your background, business services, or community mission..."
                />
                <div className="pf4__counter">{(form.business_about || "").length}/400</div>
              </div>

              <div className="pf4__footer">
                <button className="pf4__btn pf4__btnGhost" onClick={resetDraft}>
                  Reset
                </button>
                <button className="pf4__btn pf4__btnPrimary" onClick={saveUI} disabled={saving}>
                  {saving ? "Saving Changes..." : "Save Profile"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {toast && <div className="pf4__toast">{toast}</div>}
      </div>
      )}

      {loading && toast && <div className="pf4__toast">{toast}</div>}

      <style>{`
        .pf4{
          max-width: 1180px;
          margin: 16px auto;
          padding: 14px;
          color:#0f172a;
        }

        .pf4__top{
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:12px;
          background:#fff;
          border:1px solid #e5e7eb;
          border-radius:16px;
          padding:14px 16px;
          box-shadow: 0 10px 28px rgba(2,6,23,0.06);
          animation: pf4Fade .35s ease both;
        }
        .pf4__title{ margin:0; font-size:20px; }
        .pf4__sub{ margin:4px 0 0; color:#64748b; font-size:13px; }
        .pf4__actions{ display:flex; gap:10px; }

        .pf4__grid{
          display:grid;
          grid-template-columns: 360px 1fr;
          gap:14px;
          margin-top:14px;
          align-items:start;
        }
        .pf4__stack{ display:flex; flex-direction:column; gap:14px; }

        .pf4__card{
          background:#fff;
          border:1px solid #e5e7eb;
          border-radius:16px;
          padding:16px;
          box-shadow: 0 10px 28px rgba(2,6,23,0.06);
          transition: transform .18s ease, box-shadow .18s ease;
        }
        .pf4__card:hover{
          transform: translateY(-2px);
          box-shadow: 0 16px 38px rgba(2,6,23,0.10);
        }
        .pf4__anim{ animation: pf4Up .45s ease both; }

        .pf4__cardTitle{
          font-weight:900;
          font-size:14px;
          margin-bottom:12px;
        }

        /* Drop areas */
        .pf4__drop{
          width: 140px;
          height: 140px;
          border-radius: 999px;
          margin: 0 auto;
          display:grid;
          place-items:center;
          cursor:pointer;
          border: 2px dashed #d1d5db;
          background: linear-gradient(180deg, #ffffff, #f8fafc);
          transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease;
          overflow:hidden;
        }
        .pf4__drop:hover{
          transform: translateY(-2px);
          border-color: #86efac;
          box-shadow: 0 14px 28px rgba(22,163,74,0.14);
        }
        .pf4__dropImg{ width:100%; height:100%; object-fit:cover; }

        .pf4__dropEmpty{
          text-align:center;
          user-select:none;
        }
        .pf4__dropIcon{
          font-size:22px;
          margin-bottom:6px;
          color:#0f766e;
        }
        .pf4__dropText{
          font-weight:900;
          letter-spacing:1px;
          color:#0f172a;
          font-size:13px;
        }

        .pf4__logoDrop{
          width:100%;
          height: 130px;
          border-radius:14px;
          display:grid;
          place-items:center;
          cursor:pointer;
          border:2px dashed #d1d5db;
          background: linear-gradient(180deg, #ffffff, #f8fafc);
          transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease;
          overflow:hidden;
        }
        .pf4__logoDrop:hover{
          transform: translateY(-2px);
          border-color:#86efac;
          box-shadow: 0 14px 28px rgba(22,163,74,0.14);
        }
        .pf4__logoImg{ width:100%; height:100%; object-fit:contain; padding:10px; }
        .pf4__logoEmpty{ text-align:center; user-select:none; }

        .pf4__rowBtns{
          display:flex;
          gap:10px;
          justify-content:flex-start;
          margin-top:12px;
          flex-wrap:wrap;
        }
        .pf4__rowBtnsCenter{ justify-content:left; }

        /* Buttons */
        .pf4__btn{
          border:none;
          border-radius:12px;
          padding:10px 14px;
          font-weight:900;
          cursor:pointer;
          transition: transform .15s ease, box-shadow .15s ease, filter .15s ease;
        }
        .pf4__btn:active{ transform: translateY(1px) scale(0.99); }
        .pf4__btn:disabled{ opacity:0.6; cursor:not-allowed; }

        .pf4__btnPrimary{
          background: linear-gradient(135deg, #0f766e, #16a34a);
          color:#fff;
          box-shadow: 0 14px 30px rgba(22,163,74,0.18);
          border-radius:5px;
        }
        .pf4__btnPrimary:hover{
          filter: brightness(1.02);
          box-shadow: 0 18px 36px rgba(22,163,74,0.22);
          transform: translateY(-1px);
        }

        .pf4__btnGhost{
          background:#fff;
          border:1px solid #e5e7eb;
          background: linear-gradient(135deg, #0f766e, #16a34a);
          color:white;
          border-radius:5px;
        }
        .pf4__btnGhost:hover{
          box-shadow: 0 10px 24px rgba(2,6,23,0.08);
          transform: translateY(-1px);
        }

        .pf4__btnDanger{
          background:#fff5f5;
          border:1px solid #fecaca;
          color:#b91c1c;
        }
        .pf4__btnDanger:hover{
          box-shadow: 0 10px 24px rgba(239,68,68,0.12);
          transform: translateY(-1px);
        }

        .pf4__btnSmall{ padding:8px 12px; font-size:12px; border-radius:10px; }

        /* Form */
        .pf4__rightTitle{ font-weight:900; font-size:16px; margin-bottom:12px; }
        .pf4__form{ margin-top:2px; }

        .pf4__row{
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap:12px;
        }

        .pf4__field{ margin-bottom:12px; }
        .pf4__field label{
          display:block;
          font-size:12px;
          color:#334155;
          margin-bottom:6px;
          font-weight:800;
        }

        .pf4__field input,
        .pf4__field select,
        .pf4__field textarea{
          width:100%;
          padding:12px 12px;
          border-radius:12px;
          border:1px solid #cbd5e1;
          outline:none;
          background:#ffffff;
          color:#0f172a;
          font-size:14px;
          transition: box-shadow .15s ease, border-color .15s ease, transform .15s ease;
        }
        .pf4__field input::placeholder,
        .pf4__field select::placeholder,
        .pf4__field textarea::placeholder{
          color:#64748b;
          opacity:1;
        }
        .pf4__field input:focus,
        .pf4__field select:focus,
        .pf4__field textarea:focus{
          border-color:#16a34a;
          box-shadow: 0 0 0 4px rgba(22,163,74,0.14);
          transform: translateY(-1px);
        }

        .pf4__field textarea{ min-height:108px; resize:none; }

        .pf4__counter{
          text-align:right;
          font-size:12px;
          color:#94a3b8;
          margin-top:6px;
        }

        .pf4__footer{
          display:flex;
          justify-content:left;
          gap:10px;
          margin-top:8px;
        }

        .pf4__toast{
          position:fixed;
          right:18px;
          bottom:18px;
          background:#0f172a;
          color:#fff;
          padding:12px 14px;
          border-radius:12px;
          box-shadow: 0 18px 40px rgba(15,23,42,0.25);
          z-index:9999;
          font-weight:800;
          animation: pf4Toast .25s ease both;
        }

        @keyframes pf4Fade{
          from{ opacity:0; transform: translateY(-6px); }
          to{ opacity:1; transform: translateY(0); }
        }
        @keyframes pf4Up{
          from{ opacity:0; transform: translateY(10px); }
          to{ opacity:1; transform: translateY(0); }
        }
        @keyframes pf4Toast{
          from{ opacity:0; transform: translateY(10px); }
          to{ opacity:1; transform: translateY(0); }
        }

        .pf4__sectionHeader {
          margin: 18px 0 12px 0;
          padding-bottom: 6px;
          border-bottom: 1px solid #e2e8f0;
        }
        .pf4__sectionHeader h3 {
          margin: 0;
          font-size: 15px;
          font-weight: 800;
          color: #0f172a;
        }
        .pf4__sectionHeader span {
          display: block;
          font-size: 12px;
          color: #64748b;
          margin-top: 2px;
        }

        .pf4__rowThree {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 12px;
        }

        .pf4__rowFour {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 12px;
        }

        @media (max-width: 980px){
          .pf4__grid{ grid-template-columns: 1fr; }
          .pf4__row{ grid-template-columns: 1fr; }
          .pf4__rowThree{ grid-template-columns: 1fr; }
          .pf4__rowFour{ grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
};

export default Profile;
