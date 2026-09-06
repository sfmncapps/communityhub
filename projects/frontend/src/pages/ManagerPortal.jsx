import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaBuilding,
  FaUsers,
  FaBullhorn,
  FaEdit,
  FaExternalLinkAlt,
  FaPlus,
  FaTrash,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaFileAlt,
  FaGlobe,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export default function ManagerPortal() {
  const navigate = useNavigate();
  const [collectives, setCollectives] = useState([]);
  const [selectedCol, setSelectedCol] = useState(null);
  const [activeTab, setActiveTab] = useState("overview"); // 'overview', 'edit', 'members', 'pages', 'broadcast'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ msg: "", type: "info" });

  // Page Hierarchy Form State
  const [pages, setPages] = useState([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [showPageModal, setShowPageModal] = useState(false);
  const [editingPage, setEditingPage] = useState(null);
  const [pageForm, setPageForm] = useState({
    page_slug: "",
    title: "",
    content: "",
    page_order: 0,
    is_published: true,
  });
  const [savingPage, setSavingPage] = useState(false);

  // Edit Form State
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    category: "",
    address: "",
    city: "",
    state: "",
    country: "India",
    zip: "",
    website: "",
    contact_email: "",
    contact_phone: "",
    logo_url: "",
    banner_url: "",
    partners: "",
  });

  // Member Form State
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("member");
  const [addingMember, setAddingMember] = useState(false);

  // Broadcast Form State
  const [broadcastContent, setBroadcastContent] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);

  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "info" }), 3500);
  };

  const getToken = () => localStorage.getItem("token");

  const fetchManagedCollectives = async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) {
        navigate("/login");
        return;
      }

      const res = await fetch(`${API}/collectives/manager/managed`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 403) {
          showToast("Access restricted: You do not have manager privileges.", "error");
          navigate("/dashboard");
          return;
        }
        throw new Error("Failed to load managed collectives");
      }

      const data = await res.json();
      const list = data.collectives || [];
      setCollectives(list);

      if (list.length > 0) {
        const current = selectedCol
          ? list.find((c) => c.id === selectedCol.id) || list[0]
          : list[0];
        setSelectedCol(current);
        syncEditForm(current);
        fetchCollectivePages(current.id);
      }
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const syncEditForm = (col) => {
    if (!col) return;
    setEditForm({
      name: col.name || "",
      description: col.description || "",
      category: col.category || "",
      address: col.address || "",
      city: col.city || "",
      state: col.state || "",
      country: col.country || "India",
      zip: col.zip || "",
      website: col.website || "",
      contact_email: col.contact_email || "",
      contact_phone: col.contact_phone || "",
      logo_url: col.logo_url || "",
      banner_url: col.banner_url || "",
      partners: Array.isArray(col.partners) ? col.partners.join(", ") : (col.partners || ""),
    });
  };

  useEffect(() => {
    fetchManagedCollectives();
  }, []);

  const handleSelectCollective = (col) => {
    setSelectedCol(col);
    syncEditForm(col);
    fetchCollectivePages(col.id);
  };

  // --- Page Hierarchy Handlers ---
  const fetchCollectivePages = async (colId) => {
    if (!colId) return;
    setLoadingPages(true);
    try {
      const token = getToken();
      const res = await fetch(`${API}/collectives/${colId}/pages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPages(data.pages || []);
      }
    } catch (err) {
      console.warn("Could not fetch collective pages:", err);
    } finally {
      setLoadingPages(false);
    }
  };

  const openCreatePageModal = () => {
    setEditingPage(null);
    setPageForm({
      page_slug: "",
      title: "",
      content: "",
      page_order: pages.length + 1,
      is_published: true,
    });
    setShowPageModal(true);
  };

  const openEditPageModal = (p) => {
    setEditingPage(p);
    setPageForm({
      page_slug: p.page_slug,
      title: p.title,
      content: p.content,
      page_order: p.page_order || 0,
      is_published: p.is_published !== false,
    });
    setShowPageModal(true);
  };

  const handleSavePage = async (e) => {
    e.preventDefault();
    if (!selectedCol) return;
    setSavingPage(true);
    try {
      const token = getToken();
      const isEditing = Boolean(editingPage);
      const url = isEditing
        ? `${API}/collectives/${selectedCol.id}/pages/${editingPage.id}`
        : `${API}/collectives/${selectedCol.id}/pages`;
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(pageForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save sub-page");

      showToast(isEditing ? "Sub-page updated! ✅" : "Sub-page created! ✅", "success");
      setShowPageModal(false);
      fetchCollectivePages(selectedCol.id);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSavingPage(false);
    }
  };

  const handleDeletePage = async (pageId) => {
    if (!window.confirm("Are you sure you want to delete this sub-page? This action cannot be undone.")) return;
    try {
      const token = getToken();
      const res = await fetch(`${API}/collectives/${selectedCol.id}/pages/${pageId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete sub-page");
      showToast("Sub-page deleted successfully", "success");
      fetchCollectivePages(selectedCol.id);
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleTogglePublish = async (p) => {
    try {
      const token = getToken();
      const res = await fetch(`${API}/collectives/${selectedCol.id}/pages/${p.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_published: !p.is_published }),
      });
      if (res.ok) {
        showToast(`Page is now ${!p.is_published ? "Published" : "Draft"}!`, "info");
        fetchCollectivePages(selectedCol.id);
      }
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // 1. Update Collective Details
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!selectedCol) return;
    setSaving(true);

    try {
      const token = getToken();
      const payload = {
        ...editForm,
        partners: editForm.partners
          ? editForm.partners.split(",").map((p) => p.trim()).filter(Boolean)
          : [],
      };
      const res = await fetch(`${API}/collectives/${selectedCol.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update collective");

      showToast("Collective profile updated successfully! ✅", "success");
      fetchManagedCollectives();
      setActiveTab("overview");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  // 2. Add Collective Member
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMemberEmail.trim()) {
      showToast("Please enter an active user email", "error");
      return;
    }
    setAddingMember(true);

    try {
      const token = getToken();
      const res = await fetch(`${API}/collectives/${selectedCol.id}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: newMemberEmail.trim(),
          role: newMemberRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add member");

      showToast("Member added to collective roster! ✅", "success");
      setNewMemberEmail("");
      fetchManagedCollectives();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setAddingMember(false);
    }
  };

  // 3. Remove Collective Member
  const handleRemoveMember = async (userId) => {
    if (!window.confirm("Remove this member from the collective?")) return;

    try {
      const token = getToken();
      const res = await fetch(`${API}/collectives/${selectedCol.id}/members/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to remove member");

      showToast("Member removed successfully", "info");
      fetchManagedCollectives();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // 4. Send Collective-Scoped Broadcast
  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastContent.trim()) {
      showToast("Broadcast message cannot be empty", "error");
      return;
    }
    setBroadcasting(true);

    try {
      const token = getToken();
      const res = await fetch(`${API}/messages/broadcast`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          target_type: "collective",
          collective_id: selectedCol.id,
          content: broadcastContent.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to dispatch broadcast");

      showToast(data.message || "Broadcast dispatched to group members! ✅", "success");
      setBroadcastContent("");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setBroadcasting(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || "pending").toLowerCase();
    if (s === "approved") {
      return (
        <span className="badge badge-approved">
          <FaCheckCircle /> Approved / Public
        </span>
      );
    }
    if (s === "rejected") {
      return (
        <span className="badge badge-rejected">
          <FaTimesCircle /> Rejected
        </span>
      );
    }
    return (
      <span className="badge badge-pending">
        <FaClock /> Pending Admin Review
      </span>
    );
  };

  if (loading) {
    return (
      <div className="manager-page-loading">
        <div className="spinner"></div>
        <p>Loading your managed collective...</p>
      </div>
    );
  }

  return (
    <div className="manager-portal">
      {/* HEADER BAR */}
      <div className="portal-header">
        <div className="header-left">
          <h1>Manager Portal</h1>
          <p>Manage your assigned community organization, member roster, and announcements</p>
        </div>

        {collectives.length > 1 && (
          <div className="collective-selector">
            <label>Assigned Collective:</label>
            <select
              value={selectedCol?.id || ""}
              onChange={(e) => {
                const c = collectives.find((item) => item.id === e.target.value);
                if (c) handleSelectCollective(c);
              }}
            >
              {collectives.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* TOAST ALERTS */}
      {toast.msg && <div className={`portal-toast ${toast.type}`}>{toast.msg}</div>}

      {/* NO COLLECTIVE ASSIGNED STATE */}
      {collectives.length === 0 ? (
        <div className="empty-manager-card">
          <FaBuilding className="empty-icon" />
          <h2>No Collective Assigned Yet</h2>
          <p>
            You are logged in as a Collective Manager, but do not currently own or manage a
            registered collective profile.
          </p>
          <div className="empty-actions">
            <Link to="/dashboard" className="btn-secondary">
              Go to User Dashboard
            </Link>
          </div>
        </div>
      ) : (
        <div className="portal-content">
          {/* TOP COLLECTIVE IDENTITY BAR */}
          <div className="collective-identity-card">
            <div className="identity-logo-wrap">
              <img
                src={
                  selectedCol.logo_url ||
                  "https://images.unsplash.com/photo-1577495508048-b635879837f1?w=300&auto=format&fit=crop&q=60"
                }
                alt={selectedCol.name}
                className="identity-logo"
              />
            </div>
            <div className="identity-details">
              <div className="identity-title-row">
                <h2>{selectedCol.name}</h2>
                {getStatusBadge(selectedCol.status)}
              </div>
              <p className="identity-slug">
                Public Profile URL:{" "}
                <Link to={`/${selectedCol.slug}`} target="_blank" className="slug-link">
                  /{selectedCol.slug} <FaExternalLinkAlt />
                </Link>
              </p>
              <div className="identity-meta">
                <span>📍 {selectedCol.city ? `${selectedCol.city}, ${selectedCol.state || ""}` : "No location set"}</span>
                <span>👥 {selectedCol.members?.length || 0} Member(s)</span>
                {selectedCol.website && (
                  <span>
                    🌐{" "}
                    <a href={selectedCol.website.startsWith("http") ? selectedCol.website : `https://${selectedCol.website}`} target="_blank" rel="noreferrer">
                      Website
                    </a>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* TABS NAVIGATION */}
          <div className="portal-tabs">
            <button
              className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
              onClick={() => setActiveTab("overview")}
            >
              <FaBuilding /> Overview
            </button>
            <button
              className={`tab-btn ${activeTab === "edit" ? "active" : ""}`}
              onClick={() => setActiveTab("edit")}
            >
              <FaEdit /> Edit Profile
            </button>
            <button
              className={`tab-btn ${activeTab === "members" ? "active" : ""}`}
              onClick={() => setActiveTab("members")}
            >
              <FaUsers /> Members ({selectedCol.members?.length || 0})
            </button>
            <button
              className={`tab-btn ${activeTab === "pages" ? "active" : ""}`}
              onClick={() => setActiveTab("pages")}
            >
              <FaFileAlt /> Pages & Hierarchy ({pages.length})
            </button>
            <button
              className={`tab-btn ${activeTab === "broadcast" ? "active" : ""}`}
              onClick={() => setActiveTab("broadcast")}
            >
              <FaBullhorn /> Group Broadcast
            </button>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="tab-pane overview-pane">
              <div className="overview-grid">
                <div className="info-card">
                  <h3>Collective Information</h3>
                  <div className="info-item">
                    <label>Primary Owner:</label>
                    <p>{selectedCol.owner?.name || selectedCol.owner?.email || "Manager (You)"}</p>
                  </div>
                  <div className="info-item">
                    <label>Description:</label>
                    <p>{selectedCol.description || "No description provided."}</p>
                  </div>
                  <div className="info-item">
                    <label>Category:</label>
                    <p>{selectedCol.category || "General Collective"}</p>
                  </div>
                  <div className="info-item">
                    <label>Street Address:</label>
                    <p>{selectedCol.address || "Not specified"}</p>
                  </div>
                  <div className="info-item">
                    <label>Location & Postal Code:</label>
                    <p>
                      {[selectedCol.city, selectedCol.state, selectedCol.country, selectedCol.zip]
                        .filter(Boolean)
                        .join(", ") || "Not specified"}
                    </p>
                  </div>
                  {selectedCol.partners && (Array.isArray(selectedCol.partners) ? selectedCol.partners.length > 0 : Boolean(selectedCol.partners)) && (
                    <div className="info-item">
                      <label>Partners / Affiliates:</label>
                      <p>{Array.isArray(selectedCol.partners) ? selectedCol.partners.join(", ") : selectedCol.partners}</p>
                    </div>
                  )}
                </div>

                <div className="info-card">
                  <h3>Contact & Media</h3>
                  <div className="info-item">
                    <label>Contact Email:</label>
                    <p>{selectedCol.contact_email || "None"}</p>
                  </div>
                  <div className="info-item">
                    <label>Contact Phone:</label>
                    <p>{selectedCol.contact_phone || "None"}</p>
                  </div>
                  <div className="info-item">
                    <label>Website Link:</label>
                    <p>{selectedCol.website || "None"}</p>
                  </div>
                  <div className="quick-action-box">
                    <button className="btn-primary" onClick={() => setActiveTab("edit")}>
                      <FaEdit /> Update Information
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EDIT PROFILE */}
          {activeTab === "edit" && (
            <div className="tab-pane edit-pane">
              <form onSubmit={handleSaveEdit} className="portal-form">
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>Collective Name *</label>
                    <input
                      type="text"
                      required
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Description</label>
                    <textarea
                      rows="4"
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Category</label>
                    <input
                      type="text"
                      placeholder="e.g. Non-Profit, Business, Arts"
                      value={editForm.category}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Website</label>
                    <input
                      type="text"
                      placeholder="https://example.org"
                      value={editForm.website}
                      onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Contact Email</label>
                    <input
                      type="email"
                      value={editForm.contact_email}
                      onChange={(e) => setEditForm({ ...editForm, contact_email: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Contact Phone</label>
                    <input
                      type="text"
                      value={editForm.contact_phone}
                      onChange={(e) => setEditForm({ ...editForm, contact_phone: e.target.value })}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Street Address</label>
                    <input
                      type="text"
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>City</label>
                    <input
                      type="text"
                      value={editForm.city}
                      onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>State</label>
                    <input
                      type="text"
                      value={editForm.state}
                      onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Country</label>
                    <input
                      type="text"
                      value={editForm.country}
                      onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>ZIP Code</label>
                    <input
                      type="text"
                      value={editForm.zip}
                      onChange={(e) => setEditForm({ ...editForm, zip: e.target.value })}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Partners / Affiliates (Comma-separated)</label>
                    <input
                      type="text"
                      placeholder="e.g. Partner NGO, Global Foundation, Tech Alliance"
                      value={editForm.partners}
                      onChange={(e) => setEditForm({ ...editForm, partners: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Logo Image URL</label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={editForm.logo_url}
                      onChange={(e) => setEditForm({ ...editForm, logo_url: e.target.value })}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Banner Image URL</label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={editForm.banner_url}
                      onChange={(e) => setEditForm({ ...editForm, banner_url: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn-secondary" onClick={() => setActiveTab("overview")}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? "Saving Changes..." : "Save Collective Profile"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: MEMBERS */}
          {activeTab === "members" && (
            <div className="tab-pane members-pane">
              <div className="pane-header">
                <div>
                  <h3>Collective Member Roster</h3>
                  <p>Members who belong to this collective profile</p>
                </div>
              </div>

              {/* ADD MEMBER FORM */}
              <form onSubmit={handleAddMember} className="add-member-bar">
                <input
                  type="email"
                  placeholder="Enter registered user email to add..."
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  required
                />
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                >
                  <option value="member">Member</option>
                  <option value="owner">Co-Owner</option>
                </select>
                <button type="submit" className="btn-primary" disabled={addingMember}>
                  <FaPlus /> {addingMember ? "Adding..." : "Add Member"}
                </button>
              </form>

              {/* MEMBERS TABLE */}
              <div className="table-responsive">
                <table className="members-table">
                  <thead>
                    <tr>
                      <th>Name / User</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Joined Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedCol.members || []).map((m) => (
                      <tr key={m.id}>
                        <td>
                          <strong>{m.user?.name || "Community Member"}</strong>
                        </td>
                        <td>{m.user?.email || "—"}</td>
                        <td>
                          <span className={`role-pill role-${m.role}`}>{m.role}</span>
                        </td>
                        <td>{m.joined_at ? new Date(m.joined_at).toLocaleDateString() : "—"}</td>
                        <td>
                          <button
                            className="btn-danger-icon"
                            onClick={() => handleRemoveMember(m.user?.id || m.id)}
                            title="Remove Member"
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(!selectedCol.members || selectedCol.members.length === 0) && (
                      <tr>
                        <td colSpan="5" className="empty-td">
                          No members in roster yet. Use the form above to add members.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: GROUP BROADCAST */}
          {activeTab === "broadcast" && (
            <div className="tab-pane broadcast-pane">
              <div className="broadcast-card">
                <h3>📢 Collective Member Announcement</h3>
                <p>
                  Send an official notification to all registered members of{" "}
                  <strong>{selectedCol.name}</strong>. Messages will be delivered directly to their
                  in-app inbox and copied to their primary email addresses per CommunityHub policy.
                </p>

                <form onSubmit={handleSendBroadcast}>
                  <div className="form-group">
                    <label>Broadcast Message Content *</label>
                    <textarea
                      rows="6"
                      required
                      placeholder="Type your collective announcement, meeting update, or instructions here..."
                      value={broadcastContent}
                      onChange={(e) => setBroadcastContent(e.target.value)}
                    />
                  </div>

                  <div className="broadcast-actions">
                    <button type="submit" className="btn-primary" disabled={broadcasting}>
                      <FaBullhorn />{" "}
                      {broadcasting ? "Dispatching Broadcast..." : "Send Announcement to All Members"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 5: PAGES & HIERARCHY */}
          {activeTab === "pages" && (
            <div className="tab-pane pages-pane">
              <div className="pane-header-with-action">
                <div>
                  <h3>Collective Sub-Page Hierarchy</h3>
                  <p>
                    Configure custom sub-pages (e.g. <code>/{selectedCol.slug}/about</code>,{" "}
                    <code>/{selectedCol.slug}/programs</code>) for your organization.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={openCreatePageModal}
                >
                  <FaPlus /> Add Sub-Page
                </button>
              </div>

              {/* PAGES TABLE */}
              <div className="table-responsive">
                <table className="members-table pages-table">
                  <thead>
                    <tr>
                      <th>Sort</th>
                      <th>Page Title</th>
                      <th>Public Route / URL</th>
                      <th>Status</th>
                      <th>Last Updated</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pages.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <span className="order-chip">#{p.page_order || 0}</span>
                        </td>
                        <td>
                          <strong>{p.title}</strong>
                        </td>
                        <td>
                          <Link
                            to={`/${selectedCol.slug}/${p.page_slug}`}
                            target="_blank"
                            className="page-slug-badge"
                            title="Preview live sub-page"
                          >
                            /{selectedCol.slug}/{p.page_slug} <FaExternalLinkAlt />
                          </Link>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`publish-toggle-btn ${p.is_published ? "published" : "draft"}`}
                            onClick={() => handleTogglePublish(p)}
                            title="Click to toggle publish status"
                          >
                            {p.is_published ? (
                              <>
                                <FaEye /> Published
                              </>
                            ) : (
                              <>
                                <FaEyeSlash /> Draft
                              </>
                            )}
                          </button>
                        </td>
                        <td>{p.updated_at ? new Date(p.updated_at).toLocaleDateString() : "—"}</td>
                        <td>
                          <div className="table-actions">
                            <button
                              className="btn-secondary-icon"
                              onClick={() => openEditPageModal(p)}
                              title="Edit Page"
                            >
                              <FaEdit />
                            </button>
                            <button
                              className="btn-danger-icon"
                              onClick={() => handleDeletePage(p.id)}
                              title="Delete Page"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {pages.length === 0 && (
                      <tr>
                        <td colSpan="6" className="empty-td">
                          No sub-pages configured yet for this collective. Click <strong>"Add Sub-Page"</strong> above to create your first sub-page!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PAGE EDITOR MODAL */}
      {showPageModal && (
        <div className="page-modal-overlay" onClick={() => setShowPageModal(false)}>
          <div className="page-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingPage ? "Edit Collective Sub-Page" : "Create New Sub-Page"}</h3>
              <button
                className="close-modal-btn"
                onClick={() => setShowPageModal(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSavePage} className="page-modal-form">
              <div className="form-group">
                <label>Page Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. About Our Collective, Programs, Team"
                  value={pageForm.title}
                  onChange={(e) => {
                    const newTitle = e.target.value;
                    if (!editingPage && (!pageForm.page_slug || pageForm.page_slug === pageForm.title.toLowerCase().replace(/[^a-z0-9]/g, "-"))) {
                      setPageForm({
                        ...pageForm,
                        title: newTitle,
                        page_slug: newTitle.toLowerCase().trim().replace(/[^a-z0-9-_]/g, "-").replace(/-+/g, "-"),
                      });
                    } else {
                      setPageForm({ ...pageForm, title: newTitle });
                    }
                  }}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>
                    URL Slug *{" "}
                    <small style={{ color: "#64748b" }}>
                      (Route: /{selectedCol?.slug}/{pageForm.page_slug || "..."})
                    </small>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. about, programs, initiatives"
                    value={pageForm.page_slug}
                    onChange={(e) =>
                      setPageForm({
                        ...pageForm,
                        page_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, "-"),
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Display Sort Order</label>
                  <input
                    type="number"
                    min="0"
                    value={pageForm.page_order}
                    onChange={(e) =>
                      setPageForm({ ...pageForm, page_order: parseInt(e.target.value, 10) || 0 })
                    }
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Page Content (Formatted text / paragraphs) *</label>
                <textarea
                  rows="8"
                  required
                  placeholder="Enter the full text, mission statement, program details, or announcement for this sub-page. Separate paragraphs with blank lines."
                  value={pageForm.content}
                  onChange={(e) => setPageForm({ ...pageForm, content: e.target.value })}
                />
              </div>

              <div className="form-checkbox-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={pageForm.is_published}
                    onChange={(e) =>
                      setPageForm({ ...pageForm, is_published: e.target.checked })
                    }
                  />
                  <span>Publish this sub-page publicly (Make visible on public collective profile)</span>
                </label>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowPageModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={savingPage}>
                  {savingPage ? "Saving Sub-Page..." : editingPage ? "Update Sub-Page" : "Create Sub-Page"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMPONENT STYLES */}
      <style>{`
        .manager-portal {
          max-width: 1200px;
          margin: 30px auto;
          padding: 0 20px;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }

        .portal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .portal-header h1 {
          font-size: 28px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 6px 0;
        }

        .portal-header p {
          margin: 0;
          color: #64748b;
          font-size: 15px;
        }

        .collective-selector {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #f1f5f9;
          padding: 8px 14px;
          border-radius: 10px;
        }

        .collective-selector select {
          padding: 6px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          background: white;
          font-weight: 600;
          color: #0f172a;
        }

        .portal-toast {
          padding: 12px 18px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-weight: 600;
          font-size: 14px;
        }

        .portal-toast.success { background: #dcfce7; color: #166534; }
        .portal-toast.error { background: #fee2e2; color: #991b1b; }
        .portal-toast.info { background: #e0f2fe; color: #0369a1; }

        .collective-identity-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 24px;
          display: flex;
          gap: 24px;
          align-items: center;
          margin-bottom: 24px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        }

        .identity-logo {
          width: 90px;
          height: 90px;
          border-radius: 14px;
          object-fit: cover;
          border: 1px solid #e2e8f0;
        }

        .identity-details { flex: 1; }

        .identity-title-row {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 6px;
        }

        .identity-title-row h2 {
          margin: 0;
          font-size: 22px;
          font-weight: 700;
          color: #0f172a;
        }

        .identity-slug {
          font-size: 14px;
          color: #64748b;
          margin: 0 0 10px 0;
        }

        .slug-link {
          color: #0f766e;
          font-weight: 600;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .identity-meta {
          display: flex;
          gap: 20px;
          font-size: 14px;
          color: #475569;
          flex-wrap: wrap;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
        }

        .badge-approved { background: #dcfce7; color: #166534; }
        .badge-pending { background: #fef3c7; color: #b45309; }
        .badge-rejected { background: #fee2e2; color: #991b1b; }

        .portal-tabs {
          display: flex;
          gap: 10px;
          border-bottom: 2px solid #e2e8f0;
          margin-bottom: 24px;
          overflow-x: auto;
        }

        .tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 18px;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          font-weight: 600;
          font-size: 14px;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }

        .tab-btn.active {
          color: #0f766e;
          border-bottom-color: #0f766e;
        }

        .tab-pane {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        }

        .overview-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }

        .info-card h3 {
          margin: 0 0 16px 0;
          font-size: 17px;
          font-weight: 700;
          color: #0f172a;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 8px;
        }

        .info-item {
          margin-bottom: 14px;
        }

        .info-item label {
          font-size: 13px;
          color: #64748b;
          display: block;
          font-weight: 600;
          margin-bottom: 2px;
        }

        .info-item p {
          margin: 0;
          font-size: 15px;
          color: #1e293b;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
        }

        .full-width { grid-column: 1 / -1; }

        .form-group label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #334155;
          margin-bottom: 6px;
        }

        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 14px;
          box-sizing: border-box;
        }

        .form-actions {
          margin-top: 24px;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        .btn-primary {
          background: #0f766e;
          color: white;
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: background 0.2s;
        }

        .btn-primary:hover { background: #115e59; }

        .btn-secondary {
          background: #f1f5f9;
          color: #475569;
          padding: 10px 20px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
        }

        .add-member-bar {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          background: #f8fafc;
          padding: 16px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
        }

        .add-member-bar input {
          flex: 1;
          padding: 10px 14px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
        }

        .add-member-bar select {
          padding: 10px 14px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background: white;
        }

        .members-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .members-table th {
          text-align: left;
          padding: 12px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          color: #475569;
        }

        .members-table td {
          padding: 14px 12px;
          border-bottom: 1px solid #f1f5f9;
          color: #1e293b;
        }

        .role-pill {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 700;
          text-transform: capitalize;
        }

        .role-owner { background: #e0e7ff; color: #3730a3; }
        .role-member { background: #f1f5f9; color: #475569; }

        .btn-danger-icon {
          background: #fee2e2;
          color: #dc2626;
          border: none;
          border-radius: 6px;
          padding: 8px 10px;
          cursor: pointer;
        }

        .empty-manager-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 60px 24px;
          text-align: center;
          max-width: 600px;
          margin: 40px auto;
        }

        .empty-icon { font-size: 54px; color: #94a3b8; margin-bottom: 16px; }

        /* PAGES & HIERARCHY STYLES */
        .pane-header-with-action {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .pane-header-with-action h3 {
          margin: 0 0 4px 0;
          font-size: 20px;
          font-weight: 700;
          color: #0f172a;
        }

        .pane-header-with-action p {
          margin: 0;
          color: #64748b;
          font-size: 14px;
        }

        .order-chip {
          display: inline-block;
          background: #f1f5f9;
          color: #475569;
          font-weight: 700;
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 6px;
        }

        .page-slug-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #f0fdf4;
          color: #166534;
          font-size: 13px;
          font-family: monospace;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 6px;
          text-decoration: none;
          transition: background 0.15s;
        }

        .page-slug-badge:hover {
          background: #dcfce7;
        }

        .publish-toggle-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }

        .publish-toggle-btn.published {
          background: #dcfce7;
          color: #166534;
        }

        .publish-toggle-btn.draft {
          background: #fef3c7;
          color: #92400e;
        }

        .table-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .btn-secondary-icon {
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 8px 10px;
          cursor: pointer;
          transition: background 0.15s;
        }

        .btn-secondary-icon:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        /* MODAL STYLES */
        .page-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999;
          padding: 20px;
        }

        .page-modal-card {
          background: white;
          border-radius: 16px;
          width: 100%;
          max-width: 680px;
          max-height: 90vh;
          overflow-y: auto;
          padding: 30px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 1px solid #e2e8f0;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
          color: #0f172a;
        }

        .close-modal-btn {
          background: none;
          border: none;
          font-size: 28px;
          line-height: 1;
          color: #94a3b8;
          cursor: pointer;
        }

        .close-modal-btn:hover {
          color: #0f172a;
        }

        .page-modal-form .form-row {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 16px;
        }

        .form-checkbox-row {
          margin: 16px 0 24px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          font-size: 14px;
          color: #334155;
          font-weight: 500;
        }

        .checkbox-label input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid #f1f5f9;
        }

        @media (max-width: 768px) {
          .overview-grid, .form-grid { grid-template-columns: 1fr; }
          .collective-identity-card { flex-direction: column; text-align: center; }
          .identity-title-row { justify-content: center; }
          .identity-meta { justify-content: center; }
          .add-member-bar { flex-direction: column; }
        }
      `}</style>
    </div>
  );
}
