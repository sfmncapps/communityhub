import { useEffect, useState } from "react";

const STORAGE_KEY = "profileDraft_v4";

const Profile = () => {
  // ❌ stored email auto-fill remove — manual entry only
  // const stored = JSON.parse(localStorage.getItem("loggedUser") || "null");

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const [form, setForm] = useState({
    full_name: "",
    email: "",
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
    setTimeout(() => setToast(""), 2000);
  };

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    const source = saved || {}; // ✅ only draft (no auto-fill from loggedUser)

    const next = {
      full_name: source.full_name || "",
      email: source.email || "",
      company_name: source.company_name || "",
      company_location: source.company_location || "",
      company_address: source.company_address || "",
      business_category: source.business_category || "",
      business_about: source.business_about || "",
      profile_pic: source.profile_pic || "",
      company_logo: source.company_logo || "",
      brand_tagline: source.brand_tagline || "",
    };

    setForm(next);
    setProfilePreview(next.profile_pic || "");
    setLogoPreview(next.company_logo || "");
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
      setSaving(true);

      let profilePic = form.profile_pic;
      let companyLogo = form.company_logo;

      if (profileFile) profilePic = await fileToBase64(profileFile);
      if (logoFile) companyLogo = await fileToBase64(logoFile);

      const payload = { ...form, profile_pic: profilePic, company_logo: companyLogo };

      setForm(payload);
      setProfilePreview(profilePic || "");
      setLogoPreview(companyLogo || "");
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

      showToast("Saved ✅");
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
    localStorage.removeItem(STORAGE_KEY);
    showToast("Reset ✅");
    window.location.reload();
  };

  return (
    <>
      <div className="pf4">
        {/* Top */}
        <div className="pf4__top">
          <div>
            <h2 className="pf4__title">Business Profile</h2>
            <p className="pf4__sub">Enter your business details</p>
          </div>

          <div className="pf4__actions">
            <button className="pf4__btn pf4__btnGhost" onClick={resetDraft}>
              Reset
            </button>
            <button className="pf4__btn pf4__btnPrimary" onClick={saveUI} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        <div className="pf4__grid">
          {/* Left */}
          <div className="pf4__stack">
            {/* Profile upload card */}
            <div className="pf4__card pf4__anim">
              <div className="pf4__cardTitle">Upload Profile Photo</div>

              <label className="pf4__drop">
                {profilePreview ? (
                  <img className="pf4__dropImg" src={profilePreview} alt="Profile" />
                ) : (
                  <div className="pf4__dropEmpty">
                    <div className="pf4__dropIcon">⬆</div>
                    <div className="pf4__dropText">UPLOAD</div>
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
                  Upload
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
              <div className="pf4__cardTitle">Upload Company Logo</div>

              <label className="pf4__logoDrop">
                {logoPreview ? (
                  <img className="pf4__logoImg" src={logoPreview} alt="Company Logo" />
                ) : (
                  <div className="pf4__logoEmpty">
                    <div className="pf4__dropIcon">⬆</div>
                    <div className="pf4__dropText">UPLOAD</div>
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
                  Upload
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

          {/* Right */}
          <div className="pf4__card pf4__anim">
            <div className="pf4__rightTitle">Enter Your Business Details</div>

            <div className="pf4__form">
              <div className="pf4__row">
                <div className="pf4__field">
                  <label>Full Name</label>
                  <input
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    placeholder="Full name"
                  />
                </div>
                <div className="pf4__field">
                  <label>Email</label>
                  <input
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="Email"
                  />
                </div>
              </div>

              <div className="pf4__row">
                <div className="pf4__field">
                  <label>Company Name</label>
                  <input
                    value={form.company_name}
                    onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                    placeholder="Company name"
                  />
                </div>
                <div className="pf4__field">
                  <label>Company Location</label>
                  <input
                    value={form.company_location}
                    onChange={(e) => setForm({ ...form, company_location: e.target.value })}
                    placeholder="City, State"
                  />
                </div>
              </div>

              <div className="pf4__row">
                <div className="pf4__field">
                  <label>Business Category</label>
                  <select
                    value={form.business_category}
                    onChange={(e) => setForm({ ...form, business_category: e.target.value })}
                  >
                    <option value="">Select category</option>
                    <option value="Interior & Design">Interior & Design</option>
                    <option value="Construction">Construction</option>
                    <option value="IT Services">IT Services</option>
                    <option value="Education">Education</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="E-commerce">E-commerce</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="pf4__field">
                  <label>Brand Tagline</label>
                  <input
                    value={form.brand_tagline}
                    onChange={(e) => setForm({ ...form, brand_tagline: e.target.value })}
                    placeholder="Your tagline"
                  />
                </div>
              </div>

              {/* ✅ Company Address only ONCE */}
              <div className="pf4__field">
                <label>Company Address</label>
                <textarea
                  value={form.company_address}
                  onChange={(e) => setForm({ ...form, company_address: e.target.value })}
                  placeholder="Address"
                />
              </div>

              <div className="pf4__field">
                <label>About Your Business</label>
                <textarea
                  value={form.business_about}
                  onChange={(e) => setForm({ ...form, business_about: e.target.value })}
                  placeholder="Write about your business..."
                />
                <div className="pf4__counter">{(form.business_about || "").length}/400</div>
              </div>

              <div className="pf4__footer">
                <button className="pf4__btn pf4__btnGhost" onClick={resetDraft}>
                  Reset
                </button>
                <button className="pf4__btn pf4__btnPrimary" onClick={saveUI} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {toast && <div className="pf4__toast">{toast}</div>}
      </div>

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
          border:1px solid #e2e8f0;
          outline:none;
          background:#fff;
          font-size:14px;
          transition: box-shadow .15s ease, border-color .15s ease, transform .15s ease;
        }
        .pf4__field input:focus,
        .pf4__field select:focus,
        .pf4__field textarea:focus{
          border-color:#86efac;
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

        @media (max-width: 980px){
          .pf4__grid{ grid-template-columns: 1fr; }
          .pf4__row{ grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
};

export default Profile;
