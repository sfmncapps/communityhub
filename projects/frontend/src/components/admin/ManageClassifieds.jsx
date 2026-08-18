import { useEffect, useState } from "react";
import supabase from "../../config/supabaseClient";

const ManageClassifieds = () => {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("classifieds")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAds(data || []);
    } catch (e) {
      console.error(e);
      alert(e.message || "Failed to load pending ads");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    setLoading(true);
    try {
      const payload =
        status === "approved"
          ? { status, approved_at: new Date().toISOString() }
          : { status, rejected_at: new Date().toISOString() };

      const { error } = await supabase.from("classifieds").update(payload).eq("id", id);
      if (error) throw error;

      fetchAds();
    } catch (e) {
      console.error(e);
      alert(e.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={box}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <h2 style={{ margin: 0 }}>Pending Classified Ads</h2>
        <button style={refreshBtn} onClick={fetchAds} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {ads.length === 0 && <p style={{ color: "#666" }}>No pending classifieds</p>}

      {ads.map((ad) => (
        <div key={ad.id} style={item}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <div>
              <h3 style={{ margin: "0 0 6px 0" }}>{ad.title}</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                <span style={tag}>{ad.category}</span>
                <span style={tag}>{ad.sub_category}</span>
                <span style={tagMuted}>
                  {ad.city} • {ad.zip_code} • {ad.region} • {ad.state}
                </span>
              </div>
            </div>
            <span style={statusPill}>PENDING</span>
          </div>

          <p style={{ marginTop: 6 }}>{ad.description}</p>

          <p style={metaLine}>
            <b>Price:</b> {ad.price ? `$${ad.price}` : "NA"}
          </p>

          <p style={metaLine}>
            <b>Contact:</b> {ad.contact_name} • {ad.contact_phone}
            {ad.contact_email ? ` • ${ad.contact_email}` : ""}
          </p>

          <p style={metaLine}>
            <b>Media:</b>{" "}
            {ad.media_type === "video"
              ? `YouTube: ${ad.youtube_url || "NA"}`
              : `Image: ${ad.image_name || "NA"}`}
          </p>

          <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
            <button
              style={approveBtn}
              onClick={() => updateStatus(ad.id, "approved")}
              disabled={loading}
            >
              Approve
            </button>
            <button
              style={rejectBtn}
              onClick={() => updateStatus(ad.id, "rejected")}
              disabled={loading}
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

const box = {
  border: "1px solid #e5e7eb",
  padding: 16,
  borderRadius: 12,
  background: "#fff",
};

const item = {
  border: "1px solid #eef2f7",
  borderRadius: 12,
  padding: 14,
  marginTop: 12,
  background: "#fbfdff",
};

const tag = {
  fontSize: 12,
  padding: "4px 10px",
  borderRadius: 999,
  background: "#f3f4f6",
  fontWeight: 800,
};

const tagMuted = {
  ...tag,
  background: "#eef2ff",
  color: "#3730a3",
};

const statusPill = {
  fontSize: 12,
  padding: "6px 10px",
  borderRadius: 999,
  background: "#f3f4f6",
  fontWeight: 900,
  height: "fit-content",
};

const metaLine = { margin: "6px 0", color: "#374151" };

const approveBtn = {
  background: "#16a34a",
  color: "#fff",
  border: "none",
  padding: "10px 12px",
  borderRadius: 10,
  fontWeight: 900,
  cursor: "pointer",
};

const rejectBtn = {
  background: "#ef4444",
  color: "#fff",
  border: "none",
  padding: "10px 12px",
  borderRadius: 10,
  fontWeight: 900,
  cursor: "pointer",
};

const refreshBtn = {
  background: "#111827",
  color: "#fff",
  border: "none",
  padding: "10px 12px",
  borderRadius: 10,
  fontWeight: 900,
  cursor: "pointer",
};

export default ManageClassifieds;
