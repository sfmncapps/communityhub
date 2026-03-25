import { useEffect, useMemo, useState } from "react";
import supabase from "../config/supabaseClient";

/** ✅ City → Zip + Region mapping (sample).
 *  You can expand this list later.
 */
const CITY_META = {
  Houston: { zip: "77001", region: "South" },
  Dallas: { zip: "75201", region: "North" },
  Austin: { zip: "73301", region: "Central" },
  "San Antonio": { zip: "78205", region: "South" },
  "Fort Worth": { zip: "76102", region: "North" },
  "El Paso": { zip: "79901", region: "West" },
  Arlington: { zip: "76010", region: "North" },
  Plano: { zip: "75023", region: "North" },
  Irving: { zip: "75060", region: "North" },
  Lubbock: { zip: "79401", region: "West" },
};

const CATEGORIES = {
  "Real Estate": [
    "Apartments for Rent",
    "Houses for Sale",
    "Land / Plots",
    "Commercial Property",
    "PG / Shared Housing",
  ],
  Vehicles: ["Cars", "Motorcycles", "Trucks", "RVs / Caravans", "Auto Parts"],
  Jobs: ["Full-time", "Part-time", "Freelance", "Internships"],
  Services: [
    "Home Cleaning",
    "Plumbing",
    "Electrical",
    "AC Repair",
    "Landscaping",
    "Pest Control",
  ],
  "Buy & Sell": ["Electronics", "Furniture", "Appliances", "Mobile Phones", "Computers"],
  Fashion: ["Clothing", "Footwear", "Accessories"],
  Pets: ["Dogs", "Cats", "Birds", "Pet Services"],
  Education: ["Coaching", "Tutors", "Online Courses"],
  "Business & Industrial": ["Machinery", "Office Equipment", "Wholesale"],
  Events: ["Event Services", "Party Supplies", "Photography"],
};

const TEXAS_CITIES = Object.keys(CITY_META);

const MyClassifieds = () => {
  const [activeTab, setActiveTab] = useState("post");
  const [loading, setLoading] = useState(false);

  const [sessionUser, setSessionUser] = useState(null);

  const [form, setForm] = useState({
    category: "",
    sub_category: "",
    title: "",
    description: "",

    price: "",

    city: "",
    zip_code: "",
    region: "",
    state: "Texas",
    expires_in_days: 30,

    contact_name: "",
    contact_phone: "",
    contact_email: "",
    contact_whatsapp: "",

    media_type: "image", // image | video
    image_file: null,
    youtube_url: "",
  });

  const [myAds, setMyAds] = useState([]);
  const [myAdsStatus, setMyAdsStatus] = useState("all");

  const subcategories = useMemo(() => {
    return form.category ? CATEGORIES[form.category] || [] : [];
  }, [form.category]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      setSessionUser(data?.session?.user || null);
    };
    load();
  }, []);

  const fetchMyAds = async () => {
  setLoading(true);
  try {
    const { data: sess } = await supabase.auth.getSession();
    const userId = sess?.session?.user?.id;

    if (!userId) throw new Error("Please login first");

    const { data, error } = await supabase
      .from("classifieds")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    setMyAds(data || []);
  } catch (e) {
    console.error(e);
    alert(e.message || "Failed to load ads");
  } finally {
    setLoading(false);
  }
};


  useEffect(() => {
    if (activeTab === "myads") fetchMyAds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, sessionUser?.id]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "category") {
      setForm((p) => ({ ...p, category: value, sub_category: "" }));
      return;
    }

    if (name === "city") {
      const meta = CITY_META[value];
      setForm((p) => ({
        ...p,
        city: value,
        zip_code: meta?.zip || "",
        region: meta?.region || "",
        state: "Texas",
      }));
      return;
    }

    if (name === "media_type") {
      setForm((p) => ({
        ...p,
        media_type: value,
        image_file: null,
        youtube_url: "",
      }));
      return;
    }

    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0] || null;
    setForm((p) => ({ ...p, image_file: file }));
  };

    const validate = () => {
    if (!form.category) return "Please select Category";
    if (!form.sub_category) return "Please select Sub-Category";
    if (!form.title.trim()) return "Title is required";
    if (!form.description.trim()) return "Description is required";

    if (!form.city.trim()) return "City is required";
    if (!form.zip_code.trim()) return "Zip Code is required";
    if (!form.region.trim()) return "Region is required";

    if (!form.contact_name.trim()) return "Name is required";
    if (!form.contact_phone.trim()) return "Mobile Number is required";

    if (form.media_type === "image" && !form.image_file) return "Please upload an image";
    if (form.media_type === "video" && !form.youtube_url.trim()) return "Please enter YouTube URL";

    return null;
  };

  // ✅ put this helper ABOVE submitAd (inside component)
const uploadMediaToStorage = async (file, userId) => {
  const ext = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
  const filePath = `${userId}/${fileName}`;

  const { error: upErr } = await supabase
    .storage
    .from("classifieds")
    .upload(filePath, file, { upsert: false });

  if (upErr) throw upErr;

  const { data } = supabase
    .storage
    .from("classifieds")
    .getPublicUrl(filePath);

  return { publicUrl: data.publicUrl, filePath };
};

const submitAd = async () => {
  const err = validate();
  if (err) return alert(err);

  setLoading(true);
  try {
    // ✅ MUST: use Supabase session only
    const { data: sess } = await supabase.auth.getSession();
    const userId = sess?.session?.user?.id;
    if (!userId) throw new Error("Please login first (Supabase session missing)");

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Number(form.expires_in_days || 30));

    let mediaUrl = null;
    let mediaPath = null;

    // ✅ upload only for image
    if (form.media_type === "image" && form.image_file) {
      const uploaded = await uploadMediaToStorage(form.image_file, userId);
      mediaUrl = uploaded.publicUrl;
      mediaPath = uploaded.filePath;
    }

    const payload = {
      user_id: userId,

      category: form.category,
      sub_category: form.sub_category,
      title: form.title,
      description: form.description,

      price: form.price ? Number(form.price) : null,

      city: form.city,
      zip_code: form.zip_code,
      region: form.region,
      state: "Texas",

      contact_name: form.contact_name,
      contact_phone: form.contact_phone,
      contact_email: form.contact_email || null,
      contact_whatsapp: form.contact_whatsapp || null,

      media_type: form.media_type,
      youtube_url: form.media_type === "video" ? form.youtube_url : null,

      // ✅ keep original name if you want
      image_name: form.media_type === "image" ? form.image_file?.name : null,

      // ✅ If you added columns in DB (Option A)
      media_url: mediaUrl,
      media_path: mediaPath,

      status: "pending",
      expires_at: expiresAt.toISOString(),
    };

    const { error } = await supabase.from("classifieds").insert([payload]);
    if (error) throw error;

    alert("✅ Ad submitted! Waiting for admin approval.");

    // reset
    setForm({
      category: "",
      sub_category: "",
      title: "",
      description: "",
      price: "",
      city: "",
      zip_code: "",
      region: "",
      state: "Texas",
      expires_in_days: 30,
      contact_name: "",
      contact_phone: "",
      contact_email: "",
      contact_whatsapp: "",
      media_type: "image",
      image_file: null,
      youtube_url: "",
    });

    setActiveTab("myads");
  } catch (e) {
    console.error(e);
    alert(e.message || "Error submitting ad");
  } finally {
    setLoading(false);
  }
};



  const deleteAd = async (id) => {
    if (!window.confirm("Delete this ad?")) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("classifieds").delete().eq("id", id);
      if (error) throw error;
      fetchMyAds();
    } catch (e) {
      console.error(e);
      alert(e.message || "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  const markSold = async (id) => {
    setLoading(true);
    try {
      const { error } = await supabase.from("classifieds").update({ status: "sold" }).eq("id", id);
      if (error) throw error;
      fetchMyAds();
    } catch (e) {
      console.error(e);
      alert(e.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const filteredMyAds = useMemo(() => {
    if (myAdsStatus === "all") return myAds;
    return myAds.filter((a) => a.status === myAdsStatus);
  }, [myAds, myAdsStatus]);

  return (
    <>
      <div className="cls-wrap">
        <div className="cls-header">
          <div>
            <h1>Texas Classifieds</h1>
            <p>Post your ad in minutes — admin will verify before it goes public.</p>
          </div>

          <div className="cls-tabs">
            <button
              className={activeTab === "post" ? "tab active" : "tab"}
              onClick={() => setActiveTab("post")}
              type="button"
            >
              Post Ad
            </button>
            <button
              className={activeTab === "myads" ? "tab active" : "tab"}
              onClick={() => setActiveTab("myads")}
              type="button"
            >
              My Ads
            </button>
          </div>
        </div>

        {activeTab === "post" && (
          <div className="grid2">
            <div className="card">
              <div className="card-title">
                <h2>Post Classified Ad</h2>
              </div>

              {/* Category */}
              <div className="section">
                <h3>1) Category</h3>
                <div className="row2">
                  <div className="field">
                    <label>Category *</label>
                    <select name="category" value={form.category} onChange={handleChange}>
                      <option value="">Select Category</option>
                      {Object.keys(CATEGORIES).map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label>Sub-Category *</label>
                    <select
                      name="sub_category"
                      value={form.sub_category}
                      onChange={handleChange}
                      disabled={!form.category}
                    >
                      <option value="">
                        {form.category ? "Select Sub-Category" : "Select Category first"}
                      </option>
                      {subcategories.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="section">
                <h3>2) Ad Details</h3>
                <div className="field">
                  <label>Title *</label>
                  <input
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    placeholder='Example: "Honda Civic 2018 - Good condition"'
                  />
                </div>

                <div className="field">
                  <label>Description *</label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows={5}
                    placeholder="Write details like condition, reason, included items, delivery/pickup..."
                  />
                </div>

                <div className="row2">
                  <div className="field">
                    <label>Price (optional)</label>
                    <input
                      name="price"
                      value={form.price}
                      onChange={handleChange}
                      placeholder="Example: 250"
                      inputMode="numeric"
                    />
                  </div>

                  <div className="field">
                    <label>Ad Expiry</label>
                    <select
                      name="expires_in_days"
                      value={form.expires_in_days}
                      onChange={handleChange}
                    >
                      <option value={7}>7 Days</option>
                      <option value={15}>15 Days</option>
                      <option value={30}>30 Days (Recommended)</option>
                      <option value={60}>60 Days</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="section">
                <h3>3) Location</h3>
                <div className="row3">
                  <div className="field">
                    <label>City *</label>
                    <select name="city" value={form.city} onChange={handleChange}>
                      <option value="">Select City</option>
                      {TEXAS_CITIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label>Zip Code *</label>
                    <input name="zip_code" value={form.zip_code} onChange={handleChange} />
                  </div>

                  <div className="field">
                    <label>Region *</label>
                    <input name="region" value={form.region} onChange={handleChange} />
                  </div>
                </div>

                <div className="row2">
                  <div className="field">
                    <label>State</label>
                    <input value="Texas" disabled />
                  </div>
                </div>
              </div>

              {/* Media */}
              <div className="section">
                <h3>4) Media</h3>

                <div className="row2">
                  <div className="field">
                    <label>Media Type *</label>
                    <select name="media_type" value={form.media_type} onChange={handleChange}>
                      <option value="image">Image</option>
                      <option value="video">Video</option>
                    </select>
                  </div>

                  <div className="field">
                    {form.media_type === "image" ? (
                      <>
                        <label>Upload Image *</label>
                        <input type="file" accept="image/*" onChange={handleFile} />
                      </>
                    ) : (
                      <>
                        <label>YouTube URL *</label>
                        <input
                          name="youtube_url"
                          value={form.youtube_url}
                          onChange={handleChange}
                          placeholder="https://youtube.com/..."
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div className="section">
                <h3>5) Contact</h3>

                <div className="row2">
                  <div className="field">
                    <label>Name *</label>
                    <input
                      name="contact_name"
                      value={form.contact_name}
                      onChange={handleChange}
                      placeholder="Your Name"
                    />
                  </div>

                  <div className="field">
                    <label>Mobile Number *</label>
                    <input
                      name="contact_phone"
                      value={form.contact_phone}
                      onChange={handleChange}
                      placeholder="+1 / +91 ..."
                    />
                  </div>
                </div>

                <div className="row2">
                  <div className="field">
                    <label>Email (optional)</label>
                    <input
                      name="contact_email"
                      value={form.contact_email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                    />
                  </div>

                  <div className="field">
                    <label>WhatsApp (optional)</label>
                    <input
                      name="contact_whatsapp"
                      value={form.contact_whatsapp}
                      onChange={handleChange}
                      placeholder="+1 / +91 ..."
                    />
                  </div>
                </div>
              </div>

              <button className="primary" type="button" onClick={submitAd} disabled={loading}>
                {loading ? "Submitting..." : "Submit for Admin Approval"}
              </button>
            </div>

            <div className="card side">
              <h3>Posting Tips</h3>
              <ul className="tips">
                <li>Strong title = more clicks (brand + year + condition).</li>
                <li>Write clear description (what, where, why selling).</li>
                <li>Correct city selection auto-fills zip & region.</li>
                <li>Status will be <b>Pending</b> until admin approves.</li>
              </ul>

              <div className="infoBox">
                <div className="infoTitle">Admin Approval Flow</div>
                <div className="infoText">
                  Submit → Pending → Admin approves → Public listing page shows it.
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "myads" && (
          <div className="card">
            <div className="card-title">
              <h2>My Ads</h2>
              <div className="filters">
                <select value={myAdsStatus} onChange={(e) => setMyAdsStatus(e.target.value)}>
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="sold">Sold</option>
                  <option value="expired">Expired</option>
                </select>
                <button type="button" className="ghost" onClick={fetchMyAds} disabled={loading}>
                  {loading ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            </div>

            <div className="adsGrid">
              {filteredMyAds.length === 0 && (
                <div className="empty">
                  <h3>No ads found</h3>
                  <p>Post your first classified ad from “Post Ad”.</p>
                </div>
              )}

              {filteredMyAds.map((ad) => (
                <div className="adCard" key={ad.id}>
                  <div className="adTop">
                    <div>
                      <div className="adTitle">{ad.title}</div>
                      <div className="adMeta">
                        <span className="tag">{ad.category}</span>
                        <span className="tag">{ad.sub_category}</span>
                        <span className="tag muted">{ad.city} • {ad.zip_code}</span>
                      </div>
                    </div>

                    <span className={`status ${ad.status}`}>{ad.status}</span>
                  </div>

                  <div className="adDesc">{ad.description}</div>

                  <div className="adBottom">
                    <div className="price">{ad.price ? `$${ad.price}` : "Price: NA"}</div>

                    <div className="actions">
                      <button className="danger" onClick={() => deleteAd(ad.id)} disabled={loading}>
                        Delete
                      </button>

                      {ad.status === "approved" && (
                        <button className="secondary" onClick={() => markSold(ad.id)} disabled={loading}>
                          Mark Sold
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{styles}</style>
    </>
  );
};

const styles = `
  .cls-wrap{
    padding: 22px;
    background:#f4f6f9;
    min-height: 100vh;
    font-family: "Segoe UI", sans-serif;
  }

  .cls-header{
    display:flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 14px;
    margin-bottom: 16px;
  }

  .cls-header h1{
    margin:0;
    font-size: 28px;
    color:#111827;
  }

  .cls-header p{
    margin:6px 0 0 0;
    color:#6b7280;
  }

  .cls-tabs{
    display:flex;
    gap:10px;
  }

  .tab{
    border:1px solid #e5e7eb;
    background:white;
    padding:10px 14px;
    border-radius: 10px;
    cursor:pointer;
    font-weight:600;
  }
  .tab.active{
    background:#111827;
    color:white;
    border-color:#111827;
  }

  .grid2{
    display:grid;
    grid-template-columns: 1.3fr 0.7fr;
    gap: 16px;
  }

  .card{
    background:#fff;
    border:1px solid #e5e7eb;
    border-radius: 14px;
    padding: 16px;
    box-shadow: 0 10px 26px rgba(0,0,0,0.06);
  }

  .card.side{
    position: sticky;
    top: 14px;
    height: fit-content;
  }

  .card-title{
    display:flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
  }

  .card-title h2{
    margin:0;
    font-size: 18px;
    color:#111827;
  }

  .section{
    border:1px solid #eef2f7;
    border-radius: 12px;
    padding: 12px;
    margin-bottom: 12px;
    background: #fbfdff;
  }

  .section h3{
    margin: 0 0 10px 0;
    font-size: 14px;
    color:#111827;
  }

  .row2{
    display:grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .row3{
    display:grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 12px;
    align-items: end;
  }

  .field label{
    display:block;
    font-size: 12px;
    font-weight: 700;
    color:#374151;
    margin-bottom: 6px;
  }

  .field input, .field select, .field textarea{
    width:100%;
    padding: 11px 12px;
    border-radius: 10px;
    border:1px solid #d1d5db;
    outline: none;
    font-size: 14px;
    background:white;
  }

  .field input:focus, .field select:focus, .field textarea:focus{
    border-color:#2563eb;
  }

  .primary{
    width:100%;
    margin-top: 8px;
    padding: 12px 14px;
    border: none;
    border-radius: 12px;
    background:#2563eb;
    color:white;
    font-weight: 800;
    cursor: pointer;
  }
  .primary:disabled{ opacity: 0.6; cursor:not-allowed; }

  .tips{
    margin: 10px 0 0 18px;
    color:#374151;
    line-height: 1.6;
    font-size: 14px;
  }

  .infoBox{
    margin-top: 14px;
    border-radius: 12px;
    background:#111827;
    color:white;
    padding: 14px;
  }
  .infoTitle{ font-weight: 900; margin-bottom: 6px; }
  .infoText{ color: #cbd5e1; font-size: 13px; }

  .filters{
    display:flex;
    gap: 10px;
    align-items:center;
  }
  .filters select{
    padding: 10px 12px;
    border-radius: 10px;
    border:1px solid #d1d5db;
    background:white;
  }

  .ghost{
    padding: 10px 12px;
    border-radius: 10px;
    border:1px solid #d1d5db;
    background:white;
    cursor:pointer;
    font-weight:700;
  }

  .adsGrid{
    display:grid;
    grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
    gap: 12px;
    margin-top: 12px;
  }

  .adCard{
    border:1px solid #e5e7eb;
    border-radius: 14px;
    padding: 14px;
    background:white;
  }

  .adTop{
    display:flex;
    justify-content: space-between;
    gap: 12px;
    align-items:flex-start;
  }

  .adTitle{
    font-weight: 900;
    color:#111827;
  }

  .adMeta{
    margin-top: 6px;
    display:flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .tag{
    font-size: 11px;
    padding: 5px 8px;
    border-radius: 999px;
    background:#f3f4f6;
    color:#111827;
    font-weight: 800;
  }
  .tag.muted{
    background:#eef2ff;
    color:#3730a3;
  }

  .status{
    font-size: 11px;
    padding: 6px 10px;
    border-radius: 999px;
    font-weight: 900;
    text-transform: uppercase;
  }
  .status.pending{ background:#f3f4f6; color:#374151; }
  .status.approved{ background:#ecfdf5; color:#065f46; }
  .status.sold{ background:#eff6ff; color:#1d4ed8; }
  .status.expired{ background:#fef2f2; color:#991b1b; }

  .adDesc{
    margin-top: 10px;
    font-size: 13px;
    color:#374151;
    line-height: 1.5;
    min-height: 58px;
  }

  .adBottom{
    display:flex;
    justify-content: space-between;
    align-items:center;
    gap: 10px;
    margin-top: 12px;
  }

  .price{
    font-weight: 900;
    color:#111827;
  }

  .actions{
    display:flex;
    gap: 8px;
  }

  .danger{
    background:#ef4444;
    color:white;
    border:none;
    padding: 9px 10px;
    border-radius: 10px;
    font-weight: 900;
    cursor:pointer;
  }

  .secondary{
    background:#111827;
    color:white;
    border:none;
    padding: 9px 10px;
    border-radius: 10px;
    font-weight: 900;
    cursor:pointer;
  }

  .empty{
    grid-column: 1 / -1;
    text-align:center;
    padding: 30px 10px;
    color:#6b7280;
  }

  @media (max-width: 900px){
    .grid2{ grid-template-columns: 1fr; }
    .card.side{ position: static; }
  }
`;

export default MyClassifieds;
