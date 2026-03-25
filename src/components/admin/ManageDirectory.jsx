import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabaseClient";

const ManageDirectory = () => {
  const [businesses, setBusinesses] = useState([]);
  const [activeTab, setActiveTab] = useState("approved"); // ✅ default approved

  const fetchData = async () => {
    const { data } = await supabase
      .from("directory_listings")
      .select("*")
      .order("created_at", { ascending: false });

    setBusinesses(data || []);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateStatus = async (id, status) => {
    await supabase.from("directory_listings").update({ status }).eq("id", id);
    fetchData();
  };

  // ✅ DELETE LISTING
  const deleteBusiness = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this listing?"
    );
    if (!confirmDelete) return;

    await supabase.from("directory_listings").delete().eq("id", id);
    fetchData();
  };

  // ✅ filter by tab
  const filteredBusinesses = useMemo(() => {
    return (businesses || []).filter(
      (b) => (b.status || "pending") === activeTab
    );
  }, [businesses, activeTab]);

  // ✅ counts for chips
  const counts = useMemo(() => {
    const c = { approved: 0, pending: 0 };
    (businesses || []).forEach((b) => {
      const s = (b.status || "pending").toLowerCase();
      if (s === "approved") c.approved += 1;
      else if (s === "pending") c.pending += 1;
    });
    return c;
  }, [businesses]);

  return (
    <div style={page}>
      <div style={headerRow}>
        <div>
          <h2 style={title}>Directory Approvals</h2>
          <p style={subtitle}>Manage directory listings by status</p>
        </div>

        {/* ✅ TABS */}
        <div style={tabWrap}>
          <button
            onClick={() => setActiveTab("approved")}
            style={tabBtn(activeTab === "approved")}
          >
            Approved{" "}
            <span style={countPill(activeTab === "approved")}>
              {counts.approved}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("pending")}
            style={tabBtn(activeTab === "pending")}
          >
            Pending{" "}
            <span style={countPill(activeTab === "pending")}>
              {counts.pending}
            </span>
          </button>
        </div>
      </div>

      {/* ✅ EMPTY STATE */}
      {filteredBusinesses.length === 0 ? (
        <div style={emptyBox}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>
            No {activeTab} listings found
          </div>
          <div style={{ marginTop: 6, color: "#6b7280", fontSize: 14 }}>
            Try switching the tab or check again later.
          </div>
        </div>
      ) : (
        <div style={grid}>
          {filteredBusinesses.map((b) => (
            <div key={b.id} style={card}>
              {/* ✅ IMAGE FIRST */}
              {b.business_image_url && (
                <div style={imgWrap}>
                  <img
                    src={b.business_image_url}
                    alt={b.business_name}
                    style={img}
                  />
                </div>
              )}

              {/* ✅ NAME + STATUS BELOW IMAGE */}
              <div style={cardTop}>
                <h3 style={cardTitle}>{b.business_name}</h3>
                <span style={badge(b.status || "pending")}>
                  {b.status || "pending"}
                </span>
              </div>

              <p style={p}>
                {b.category} → {b.sub_category}
              </p>
              <p style={p}>Owner: {b.owner_name}</p>
              <p style={p}>City: {b.city}</p>

              {/* ✅ ACTIONS */}
              <div style={actionRow}>
                {activeTab === "pending" && (
                  <>
                    <button
                      onClick={() => updateStatus(b.id, "approved")}
                      style={approveBtn}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => updateStatus(b.id, "rejected")}
                      style={rejectBtn}
                    >
                      Reject
                    </button>
                  </>
                )}

                {/* ✅ DELETE BUTTON (Always Visible) */}
                <button
                  onClick={() => deleteBusiness(b.id)}
                  style={deleteBtn}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ✅ PAGE WRAPPER */
const page = { padding: 16 };

const headerRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 14,
};

const title = { margin: 0 };
const subtitle = { margin: "6px 0 0", color: "#6b7280", fontSize: 14 };

/* ✅ TABS */
const tabWrap = {
  display: "flex",
  gap: 10,
  background: "#f3f4f6",
  padding: 6,
  borderRadius: 12,
  border: "1px solid #e5e7eb",
};

const tabBtn = (active) => ({
  border: "none",
  cursor: "pointer",
  padding: "10px 14px",
  borderRadius: 10,
  fontWeight: 700,
  fontSize: 14,
  display: "flex",
  alignItems: "center",
  gap: 8,
  background: active ? "#111827" : "transparent",
  color: active ? "#fff" : "#111827",
});

const countPill = (active) => ({
  fontSize: 12,
  fontWeight: 800,
  padding: "2px 8px",
  borderRadius: 999,
  background: active ? "rgba(255,255,255,0.2)" : "#e5e7eb",
  color: active ? "#fff" : "#111827",
});

/* ✅ GRID */
const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 16,
  alignItems: "start",
};

/* ✅ CARD */
const card = {
  background: "#fff",
  padding: 15,
  borderRadius: 14,
  boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
  border: "1px solid #eef2f7",
  width: "100%",
  minWidth: 0,
};

const cardTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  marginTop: 6,
};

const cardTitle = {
  margin: 0,
  fontSize: 16,
  fontWeight: 800,
  color: "#111827",
  lineHeight: 1.2,
};

const p = { margin: "6px 0", fontSize: 14, color: "#111827" };

/* ✅ ACTION BUTTONS */
const actionRow = {
  marginTop: 12,
  display: "flex",
  gap: 8,
};

const approveBtn = {
  flex: 1,
  background: "green",
  color: "#fff",
  padding: "10px 12px",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 700,
};

const rejectBtn = {
  flex: 1,
  background: "red",
  color: "#fff",
  padding: "10px 12px",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 700,
};

const deleteBtn = {
  flex: 1,
  background: "#111827",
  color: "#fff",
  padding: "10px 12px",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 700,
};

const badge = (s) => {
  const status = (s || "pending").toLowerCase();
  const bg =
    status === "approved" ? "green" : status === "pending" ? "orange" : "red";

  return {
    background: bg,
    color: "#fff",
    padding: "4px 10px",
    borderRadius: 999,
    display: "inline-block",
    fontSize: 12,
    fontWeight: 800,
    textTransform: "capitalize",
    whiteSpace: "nowrap",
  };
};

/* ✅ IMAGE */
const imgWrap = {
  width: "100%",
  height: 160,
  borderRadius: 12,
  overflow: "hidden",
  border: "1px solid #e5e7eb",
  marginBottom: 10,
  background: "#f9fafb",
};

const img = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

/* ✅ EMPTY */
const emptyBox = {
  background: "#fff",
  border: "1px dashed #d1d5db",
  borderRadius: 14,
  padding: 22,
  textAlign: "center",
};

export default ManageDirectory;
