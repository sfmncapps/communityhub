import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import supabase from "../../config/supabaseClient";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const ManageDirectory = () => {
  // Main view toggle: 'collectives' or 'businesses'
  const [section, setSection] = useState("collectives");

  // Collectives state
  const [collectives, setCollectives] = useState([]);
  const [colTab, setColTab] = useState("pending"); // 'pending', 'approved', 'all'
  const [colSearch, setColSearch] = useState("");

  // Directory Listings state
  const [businesses, setBusinesses] = useState([]);
  const [activeTab, setActiveTab] = useState("pending"); // 'pending', 'approved'
  const [bizSearch, setBizSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ msg: "", type: "info" });

  // Verification Modal State
  const [verifyModal, setVerifyModal] = useState({
    isOpen: false,
    collective: null,
    stateRecordId: "",
    notes: "",
    verificationStatus: "verified",
    autoApprove: true,
  });
  const [verifying, setVerifying] = useState(false);

  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "info" }), 3500);
  };

  const getToken = () => localStorage.getItem("token");

  // Fetch Collectives
  const fetchCollectives = async () => {
    try {
      const token = getToken();
      if (token) {
        const res = await fetch(`${API}/collectives`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setCollectives(data.collectives || []);
          return;
        }
      }

      // Supabase direct fallback
      const { data, error } = await supabase
        .from("collectives")
        .select("*, owner:owner_id(id, name, email)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCollectives(data || []);
    } catch (err) {
      console.error("Fetch collectives error:", err);
      showToast("Could not load collectives: " + err.message, "error");
    }
  };

  // Fetch Directory Listings
  const fetchBusinesses = async () => {
    try {
      const { data, error } = await supabase
        .from("directory_listings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBusinesses(data || []);
    } catch (err) {
      console.error("Fetch directory error:", err);
    }
  };

  const reloadAll = async () => {
    setLoading(true);
    await Promise.all([fetchCollectives(), fetchBusinesses()]);
    setLoading(false);
  };

  useEffect(() => {
    reloadAll();
  }, []);

  // --- COLLECTIVE ACTIONS ---
  const handleOpenVerifyModal = (col) => {
    setVerifyModal({
      isOpen: true,
      collective: col,
      stateRecordId: col.state_record_id || "",
      notes: col.state_record_notes || "",
      verificationStatus: "verified",
      autoApprove: true,
    });
  };

  const handleCloseVerifyModal = () => {
    setVerifyModal({
      isOpen: false,
      collective: null,
      stateRecordId: "",
      notes: "",
      verificationStatus: "verified",
      autoApprove: true,
    });
  };

  const handleSaveVerification = async (e) => {
    e.preventDefault();
    if (!verifyModal.collective) return;

    if (verifyModal.verificationStatus === "verified" && !verifyModal.stateRecordId.trim()) {
      return alert("Please enter the State / Corporate Registration ID.");
    }

    setVerifying(true);
    try {
      const token = getToken();
      if (token) {
        const res = await fetch(`${API}/collectives/${verifyModal.collective.id}/verify-state`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            state_record_id: verifyModal.stateRecordId.trim(),
            state_record_notes: verifyModal.notes.trim(),
            verification_status: verifyModal.verificationStatus,
            auto_approve: verifyModal.autoApprove,
          }),
        });

        if (res.ok) {
          showToast("State record verification saved successfully! ✅", "success");
          handleCloseVerifyModal();
          fetchCollectives();
          return;
        }
      }

      // Fallback directly to Supabase client
      const updates = {
        state_record_id: verifyModal.stateRecordId.trim() || null,
        state_record_notes: verifyModal.notes.trim() || null,
        verification_status: verifyModal.verificationStatus,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (verifyModal.verificationStatus === "verified" && verifyModal.autoApprove) {
        updates.status = "approved";
      }

      const { error } = await supabase
        .from("collectives")
        .update(updates)
        .eq("id", verifyModal.collective.id);

      if (error) throw error;
      showToast("State record verification recorded! ✅", "success");
      handleCloseVerifyModal();
      fetchCollectives();
    } catch (err) {
      showToast("Verification failed: " + err.message, "error");
    } finally {
      setVerifying(false);
    }
  };

  const updateCollectiveStatus = async (id, status) => {
    const ok = window.confirm(`Confirm to ${status.toUpperCase()} this collective?`);
    if (!ok) return;

    try {
      const token = getToken();
      if (token) {
        const endpoint = status === "approved" ? "approve" : "reject";
        const res = await fetch(`${API}/collectives/${id}/${endpoint}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          showToast(`Collective marked as ${status}`, "success");
          fetchCollectives();
          return;
        }
      }

      await supabase
        .from("collectives")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);

      showToast(`Collective marked as ${status}`, "success");
      fetchCollectives();
    } catch (err) {
      showToast("Failed to update status: " + err.message, "error");
    }
  };

  const deleteCollective = async (id) => {
    const ok = window.confirm("Are you sure you want to permanently delete this collective?");
    if (!ok) return;

    try {
      const token = getToken();
      if (token) {
        const res = await fetch(`${API}/collectives/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          showToast("Collective deleted", "success");
          fetchCollectives();
          return;
        }
      }

      await supabase.from("collectives").delete().eq("id", id);
      showToast("Collective deleted", "success");
      fetchCollectives();
    } catch (err) {
      showToast("Delete failed: " + err.message, "error");
    }
  };

  // --- DIRECTORY LISTINGS ACTIONS ---
  const updateBusinessStatus = async (id, status) => {
    await supabase.from("directory_listings").update({ status }).eq("id", id);
    fetchBusinesses();
  };

  const deleteBusiness = async (id) => {
    const ok = window.confirm("Are you sure you want to delete this listing?");
    if (!ok) return;

    await supabase.from("directory_listings").delete().eq("id", id);
    fetchBusinesses();
  };

  // Filtered lists
  const filteredCollectives = useMemo(() => {
    return collectives.filter((c) => {
      const matchesTab = colTab === "all" || (c.status || "pending") === colTab;
      const q = colSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (c.name || "").toLowerCase().includes(q) ||
        (c.city || "").toLowerCase().includes(q) ||
        (c.state_record_id || "").toLowerCase().includes(q);
      return matchesTab && matchesSearch;
    });
  }, [collectives, colTab, colSearch]);

  const filteredBusinesses = useMemo(() => {
    return businesses.filter((b) => {
      const matchesTab = (b.status || "pending") === activeTab;
      const q = bizSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (b.business_name || "").toLowerCase().includes(q) ||
        (b.category || "").toLowerCase().includes(q) ||
        (b.city || "").toLowerCase().includes(q);
      return matchesTab && matchesSearch;
    });
  }, [businesses, activeTab, bizSearch]);

  // Counts
  const colCounts = useMemo(() => {
    const c = { pending: 0, approved: 0, verified: 0 };
    collectives.forEach((item) => {
      if ((item.status || "pending").toLowerCase() === "pending") c.pending += 1;
      if ((item.status || "pending").toLowerCase() === "approved") c.approved += 1;
      if (item.verification_status === "verified") c.verified += 1;
    });
    return c;
  }, [collectives]);

  const bizCounts = useMemo(() => {
    const c = { approved: 0, pending: 0 };
    businesses.forEach((b) => {
      const s = (b.status || "pending").toLowerCase();
      if (s === "approved") c.approved += 1;
      else if (s === "pending") c.pending += 1;
    });
    return c;
  }, [businesses]);

  return (
    <div className="manage-dir-page">
      {/* TOP HEADER */}
      <div className="dir-header-row">
        <div>
          <h2>Directory & Collectives Moderation</h2>
          <p>Verify organizations against official state records and moderate business directory listings</p>
        </div>

        <button className="btn-refresh" onClick={reloadAll}>
          ↻ Refresh All
        </button>
      </div>

      {toast.msg && <div className={`dir-toast ${toast.type}`}>{toast.msg}</div>}

      {/* PRIMARY SECTION TOGGLE (Collectives vs Listings) */}
      <div className="primary-section-toggle">
        <button
          className={`sec-toggle-btn ${section === "collectives" ? "active" : ""}`}
          onClick={() => setSection("collectives")}
        >
          🛡️ Collectives & Organizations (State Verification)
          <span className="pill-badge">{collectives.length}</span>
        </button>

        <button
          className={`sec-toggle-btn ${section === "businesses" ? "active" : ""}`}
          onClick={() => setSection("businesses")}
        >
          🏢 Business Yellow Pages Listings
          <span className="pill-badge">{businesses.length}</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: COLLECTIVES & ORGANIZATIONS WITH STATE VERIFICATION           */}
      {/* ========================================================================= */}
      {section === "collectives" && (
        <div className="section-content">
          <div className="sub-control-bar">
            <div className="tab-group">
              <button
                className={`tab-btn ${colTab === "pending" ? "active" : ""}`}
                onClick={() => setColTab("pending")}
              >
                Pending Review <span className="tab-count">{colCounts.pending}</span>
              </button>
              <button
                className={`tab-btn ${colTab === "approved" ? "active" : ""}`}
                onClick={() => setColTab("approved")}
              >
                Approved <span className="tab-count">{colCounts.approved}</span>
              </button>
              <button
                className={`tab-btn ${colTab === "all" ? "active" : ""}`}
                onClick={() => setColTab("all")}
              >
                All Collectives ({collectives.length})
              </button>
            </div>

            <div className="search-wrap">
              <input
                type="text"
                placeholder="Search collective name, city, or state ID..."
                value={colSearch}
                onChange={(e) => setColSearch(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="dir-loading">Loading collectives...</div>
          ) : filteredCollectives.length === 0 ? (
            <div className="dir-empty">
              <h3>No collectives found</h3>
              <p>There are no collectives matching the selected tab or search query.</p>
            </div>
          ) : (
            <div className="collectives-grid">
              {filteredCollectives.map((c) => {
                const isVerified = c.verification_status === "verified";
                const isRejected = c.verification_status === "rejected";

                return (
                  <div key={c.id} className="collective-admin-card">
                    <div className="col-card-header">
                      <img
                        src={
                          c.logo_url ||
                          "https://images.unsplash.com/photo-1577495508048-b635879837f1?w=200&auto=format&fit=crop&q=60"
                        }
                        alt={c.name}
                        className="col-logo-thumb"
                        onError={(e) => {
                          e.target.src =
                            "https://images.unsplash.com/photo-1577495508048-b635879837f1?w=200&auto=format&fit=crop&q=60";
                        }}
                      />
                      <div className="col-header-text">
                        <div className="badge-row">
                          <span className={`status-badge ${c.status || "pending"}`}>
                            {c.status || "pending"}
                          </span>
                          <span className="cat-badge">{c.category || "Collective"}</span>
                        </div>
                        <h3 className="col-name">
                          <Link to={`/${c.slug}`} target="_blank" title="View Public Profile">
                            {c.name} ↗
                          </Link>
                        </h3>
                        <span className="col-slug-text">/{c.slug}</span>
                      </div>
                    </div>

                    <div className="col-card-body">
                      {/* STATE RECORD VERIFICATION AUDIT BOX */}
                      <div className={`state-record-box ${c.verification_status || "unverified"}`}>
                        <div className="state-box-header">
                          <span className="state-box-title">State Corporation Records (RFP §7e):</span>
                          {isVerified && <span className="verified-chip">✓ State Verified</span>}
                          {isRejected && <span className="rejected-chip">✕ Rejected</span>}
                          {!isVerified && !isRejected && <span className="unverified-chip">⚠️ Unverified</span>}
                        </div>

                        {c.state_record_id ? (
                          <div className="state-box-detail">
                            <strong>Entity / Reg ID:</strong> <code>{c.state_record_id}</code>
                          </div>
                        ) : (
                          <div className="state-box-detail muted">No corporate registration ID recorded yet.</div>
                        )}

                        {c.state_record_notes && (
                          <div className="state-box-notes">
                            <strong>Audit Notes:</strong> {c.state_record_notes}
                          </div>
                        )}

                        {c.verified_at && (
                          <div className="state-box-date">
                            Verified on: {new Date(c.verified_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>

                      <div className="col-meta-item">
                        <strong>📍 Location:</strong>{" "}
                        {[c.city, c.state, c.country].filter(Boolean).join(", ") || "Unspecified"}
                      </div>
                      <div className="col-meta-item">
                        <strong>👤 Owner:</strong> {c.owner?.name || c.owner?.email || "Manager Assigned"}
                      </div>
                      {c.contact_phone && (
                        <div className="col-meta-item">
                          <strong>📞 Phone:</strong> {c.contact_phone}
                        </div>
                      )}
                      {c.website && (
                        <div className="col-meta-item">
                          <strong>🌐 Website:</strong>{" "}
                          <a
                            href={c.website.startsWith("http") ? c.website : `https://${c.website}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {c.website}
                          </a>
                        </div>
                      )}
                    </div>

                    {/* ACTIONS BAR */}
                    <div className="col-card-actions">
                      <button
                        className="btn-verify-state"
                        onClick={() => handleOpenVerifyModal(c)}
                      >
                        🛡️ Verify State Record
                      </button>

                      {c.status === "pending" && (
                        <>
                          <button
                            className="btn-approve-col"
                            onClick={() => updateCollectiveStatus(c.id, "approved")}
                          >
                            Approve
                          </button>
                          <button
                            className="btn-reject-col"
                            onClick={() => updateCollectiveStatus(c.id, "rejected")}
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {c.status === "approved" && (
                        <button
                          className="btn-reject-col"
                          onClick={() => updateCollectiveStatus(c.id, "rejected")}
                        >
                          Revoke
                        </button>
                      )}

                      {c.status === "rejected" && (
                        <button
                          className="btn-approve-col"
                          onClick={() => updateCollectiveStatus(c.id, "approved")}
                        >
                          Re-Approve
                        </button>
                      )}

                      <button
                        className="btn-delete-col"
                        onClick={() => deleteCollective(c.id)}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: BUSINESS DIRECTORY LISTINGS (PRESERVED COMPLETE)               */}
      {/* ========================================================================= */}
      {section === "businesses" && (
        <div className="section-content">
          <div className="sub-control-bar">
            <div className="tab-group">
              <button
                className={`tab-btn ${activeTab === "approved" ? "active" : ""}`}
                onClick={() => setActiveTab("approved")}
              >
                Approved Listings <span className="tab-count">{bizCounts.approved}</span>
              </button>
              <button
                className={`tab-btn ${activeTab === "pending" ? "active" : ""}`}
                onClick={() => setActiveTab("pending")}
              >
                Pending Listings <span className="tab-count">{bizCounts.pending}</span>
              </button>
            </div>

            <div className="search-wrap">
              <input
                type="text"
                placeholder="Search business listings..."
                value={bizSearch}
                onChange={(e) => setBizSearch(e.target.value)}
              />
            </div>
          </div>

          {filteredBusinesses.length === 0 ? (
            <div className="dir-empty">
              <h3>No {activeTab} listings found</h3>
              <p>Try switching the tab or adjusting your search keywords.</p>
            </div>
          ) : (
            <div className="business-grid">
              {filteredBusinesses.map((b) => (
                <div key={b.id} className="biz-card">
                  {b.business_image_url && (
                    <div className="biz-img-wrap">
                      <img src={b.business_image_url} alt={b.business_name} />
                    </div>
                  )}

                  <div className="biz-header">
                    <h3>{b.business_name}</h3>
                    <span className={`status-badge ${b.status || "pending"}`}>
                      {b.status || "pending"}
                    </span>
                  </div>

                  <p className="biz-category">
                    {b.category} → {b.sub_category}
                  </p>
                  <p className="biz-detail"><strong>Owner:</strong> {b.owner_name}</p>
                  <p className="biz-detail"><strong>City:</strong> {b.city}</p>

                  <div className="biz-actions">
                    {activeTab === "pending" && (
                      <>
                        <button
                          onClick={() => updateBusinessStatus(b.id, "approved")}
                          className="btn-approve-col"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => updateBusinessStatus(b.id, "rejected")}
                          className="btn-reject-col"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => deleteBusiness(b.id)}
                      className="btn-delete-col"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STATE RECORD VERIFICATION MODAL (RFP §7e)                                 */}
      {/* ========================================================================= */}
      {verifyModal.isOpen && (
        <div className="modal-overlay">
          <div className="verify-modal">
            <div className="modal-header">
              <h3>🛡️ Verify State Record (RFP §7e)</h3>
              <button className="close-x" onClick={handleCloseVerifyModal}>
                ×
              </button>
            </div>

            <form onSubmit={handleSaveVerification}>
              <div className="modal-body">
                <p className="modal-lead">
                  Verify <strong>{verifyModal.collective?.name}</strong> against state corporate registries,
                  Secretary of State records, or non-profit incorporation databases.
                </p>

                <div className="modal-field">
                  <label>State Corporate Registration / Entity ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SOS-2026-98124, CIN-U72200TG2020PTC, NGO-DARPAN-12345"
                    value={verifyModal.stateRecordId}
                    onChange={(e) =>
                      setVerifyModal({ ...verifyModal, stateRecordId: e.target.value })
                    }
                  />
                  <span className="field-hint">
                    Official state entity number or non-profit registration charter ID.
                  </span>
                </div>

                <div className="modal-field">
                  <label>Verification Findings & Source Notes</label>
                  <textarea
                    rows="3"
                    placeholder="e.g. Corporate filing verified via Secretary of State portal. Entity is in good standing and registered to primary owner."
                    value={verifyModal.notes}
                    onChange={(e) =>
                      setVerifyModal({ ...verifyModal, notes: e.target.value })
                    }
                  />
                </div>

                <div className="modal-field">
                  <label>Verification Decision</label>
                  <select
                    value={verifyModal.verificationStatus}
                    onChange={(e) =>
                      setVerifyModal({ ...verifyModal, verificationStatus: e.target.value })
                    }
                  >
                    <option value="verified">✅ Verified (Record Valid & Authenticated)</option>
                    <option value="rejected">❌ Rejected (Invalid / Fraudulent / Missing Record)</option>
                    <option value="unverified">⚠️ Unverified (Reset to Pending Investigation)</option>
                  </select>
                </div>

                {verifyModal.verificationStatus === "verified" && (
                  <div className="modal-checkbox">
                    <input
                      type="checkbox"
                      id="auto-appr"
                      checked={verifyModal.autoApprove}
                      onChange={(e) =>
                        setVerifyModal({ ...verifyModal, autoApprove: e.target.checked })
                      }
                    />
                    <label htmlFor="auto-appr">
                      Automatically mark collective listing as <strong>Approved</strong> upon verification
                    </label>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={handleCloseVerifyModal}
                  disabled={verifying}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-confirm-verify" disabled={verifying}>
                  {verifying ? "Saving Verification..." : "Save State Verification"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .manage-dir-page {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: #0f172a;
        }

        .dir-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .dir-header-row h2 {
          font-size: 22px;
          font-weight: 800;
          margin: 0 0 4px;
        }
        .dir-header-row p {
          color: #64748b;
          font-size: 13px;
          margin: 0;
        }
        .btn-refresh {
          background: white;
          border: 1px solid #cbd5e1;
          color: #334155;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
        }

        .dir-toast {
          padding: 12px 16px;
          border-radius: 10px;
          margin-bottom: 16px;
          font-size: 14px;
          font-weight: 700;
        }
        .dir-toast.success { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
        .dir-toast.error { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }

        .primary-section-toggle {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
        }
        .sec-toggle-btn {
          flex: 1;
          padding: 14px 18px;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 800;
          color: #475569;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all .15s ease;
        }
        .sec-toggle-btn:hover {
          border-color: #cbd5e1;
        }
        .sec-toggle-btn.active {
          background: #f0fdf4;
          border-color: #0f766e;
          color: #0f766e;
          box-shadow: 0 4px 14px rgba(15, 118, 110, 0.1);
        }
        .pill-badge {
          background: #e2e8f0;
          color: #1e293b;
          font-size: 12px;
          padding: 3px 10px;
          border-radius: 999px;
          font-weight: 800;
        }
        .sec-toggle-btn.active .pill-badge {
          background: #0f766e;
          color: white;
        }

        .sub-control-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .tab-group {
          display: flex;
          gap: 8px;
          background: #e2e8f0;
          padding: 4px;
          border-radius: 10px;
        }
        .tab-btn {
          border: none;
          background: transparent;
          padding: 8px 14px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 13px;
          color: #475569;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .tab-btn.active {
          background: white;
          color: #0f172a;
          box-shadow: 0 2px 6px rgba(0,0,0,0.08);
        }
        .tab-count {
          background: #f1f5f9;
          font-size: 11px;
          padding: 2px 6px;
          border-radius: 999px;
        }

        .search-wrap input {
          width: 320px;
          padding: 10px 14px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          font-size: 13px;
          outline: none;
        }

        .dir-loading, .dir-empty {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 60px 20px;
          text-align: center;
          color: #64748b;
        }

        .collectives-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
          gap: 20px;
        }

        .collective-admin-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.04);
          display: flex;
          flex-direction: column;
        }

        .col-card-header {
          display: flex;
          gap: 14px;
          padding: 16px;
          background: #f8fafc;
          border-bottom: 1px solid #f1f5f9;
        }
        .col-logo-thumb {
          width: 64px;
          height: 64px;
          border-radius: 10px;
          object-fit: cover;
          background: white;
          border: 1px solid #e2e8f0;
        }
        .col-header-text {
          flex: 1;
          min-width: 0;
        }
        .badge-row {
          display: flex;
          gap: 6px;
          margin-bottom: 4px;
        }
        .status-badge {
          font-size: 10px;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 4px;
          text-transform: uppercase;
        }
        .status-badge.pending { background: #fef3c7; color: #92400e; }
        .status-badge.approved { background: #dcfce7; color: #166534; }
        .status-badge.rejected { background: #fee2e2; color: #991b1b; }
        .cat-badge {
          background: #e2e8f0;
          color: #334155;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 4px;
        }
        .col-name {
          font-size: 16px;
          font-weight: 800;
          margin: 0 0 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .col-name a {
          color: #0f172a;
          text-decoration: none;
        }
        .col-slug-text {
          font-size: 11px;
          color: #64748b;
        }

        .col-card-body {
          padding: 16px;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .state-record-box {
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          border-radius: 10px;
          padding: 10px 12px;
          margin-bottom: 6px;
          font-size: 12px;
        }
        .state-record-box.verified {
          background: #f0fdf4;
          border-color: #bbf7d0;
        }
        .state-record-box.rejected {
          background: #fef2f2;
          border-color: #fecaca;
        }
        .state-box-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .state-box-title {
          font-weight: 800;
          color: #334155;
        }
        .verified-chip {
          background: #10b981;
          color: white;
          font-size: 10px;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .rejected-chip {
          background: #ef4444;
          color: white;
          font-size: 10px;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .unverified-chip {
          background: #fef3c7;
          color: #92400e;
          font-size: 10px;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .state-box-detail code {
          background: rgba(0,0,0,0.06);
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 700;
          color: #0f172a;
        }
        .state-box-detail.muted { color: #94a3b8; font-style: italic; }
        .state-box-notes {
          margin-top: 4px;
          color: #475569;
          line-height: 1.4;
        }
        .state-box-date {
          margin-top: 4px;
          font-size: 11px;
          color: #64748b;
        }

        .col-meta-item {
          font-size: 12px;
          color: #334155;
        }
        .col-meta-item a { color: #0f766e; }

        .col-card-actions {
          padding: 12px 16px;
          background: #f8fafc;
          border-top: 1px solid #f1f5f9;
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .btn-verify-state {
          background: #0f766e;
          color: white;
          border: none;
          padding: 7px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          flex: 1;
        }
        .btn-approve-col {
          background: #10b981;
          color: white;
          border: none;
          padding: 7px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }
        .btn-reject-col {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fca5a5;
          padding: 7px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }
        .btn-delete-col {
          background: white;
          border: 1px solid #cbd5e1;
          padding: 7px 10px;
          border-radius: 8px;
          cursor: pointer;
        }

        /* BUSINESS CARDS */
        .business-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 16px;
        }
        .biz-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
        }
        .biz-img-wrap {
          height: 120px;
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 10px;
        }
        .biz-img-wrap img { width: 100%; height: 100%; object-fit: cover; }
        .biz-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .biz-header h3 { margin: 0; font-size: 16px; font-weight: 800; }
        .biz-category { font-size: 13px; color: #64748b; margin: 0 0 6px; }
        .biz-detail { font-size: 13px; margin: 0 0 4px; }
        .biz-actions {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }

        /* MODAL */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          display: grid;
          place-items: center;
          z-index: 9999;
          padding: 20px;
        }
        .verify-modal {
          background: white;
          border-radius: 18px;
          max-width: 540px;
          width: 100%;
          overflow: hidden;
          box-shadow: 0 20px 50px rgba(0,0,0,0.25);
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 24px;
          border-bottom: 1px solid #f1f5f9;
        }
        .modal-header h3 { margin: 0; font-size: 18px; font-weight: 800; color: #0f172a; }
        .close-x {
          background: transparent;
          border: none;
          font-size: 24px;
          color: #94a3b8;
          cursor: pointer;
        }
        .modal-body {
          padding: 20px 24px;
        }
        .modal-lead {
          font-size: 14px;
          color: #475569;
          line-height: 1.5;
          margin: 0 0 16px;
        }
        .modal-field {
          margin-bottom: 16px;
        }
        .modal-field label {
          display: block;
          font-size: 12px;
          font-weight: 800;
          color: #334155;
          margin-bottom: 6px;
        }
        .modal-field input, .modal-field select, .modal-field textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          font-size: 14px;
          outline: none;
        }
        .modal-field input:focus, .modal-field select:focus, .modal-field textarea:focus {
          border-color: #0f766e;
        }
        .field-hint {
          display: block;
          font-size: 11px;
          color: #64748b;
          margin-top: 4px;
        }
        .modal-checkbox {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #334155;
          margin-top: 10px;
        }
        .modal-checkbox input { width: 16px; height: 16px; cursor: pointer; }
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding: 16px 24px;
          background: #f8fafc;
          border-top: 1px solid #f1f5f9;
        }
        .btn-cancel {
          background: white;
          border: 1px solid #cbd5e1;
          color: #475569;
          padding: 10px 18px;
          border-radius: 10px;
          font-weight: 700;
          cursor: pointer;
        }
        .btn-confirm-verify {
          background: linear-gradient(135deg, #0f766e, #16a34a);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 10px;
          font-weight: 800;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default ManageDirectory;
