import { useEffect, useState, useMemo } from "react";
import supabase from "../../config/supabaseClient";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const getAuthToken = async () => {
  const localToken = localStorage.getItem("token");
  if (localToken) return localToken;
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
};

const PendingUsers = () => {
  const [activeUsers, setActiveUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [tab, setTab] = useState("active"); // 'active' | 'pending'
  const [roleMap, setRoleMap] = useState({});
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchAllUsers();

    // 1. Live Supabase Realtime Listener for instant table updates
    const channel = supabase
      .channel("admin-users-list-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "users_active" }, () => fetchAllUsers())
      .on("postgres_changes", { event: "*", schema: "public", table: "users_pending" }, () => fetchAllUsers())
      .subscribe();

    // 2. Periodic polling fallback every 10 seconds
    const interval = setInterval(fetchAllUsers, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const fetchAllUsers = async () => {
    setLoading(true);
    const token = await getAuthToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      // 1. Fetch active users
      const activeRes = await fetch(`${API}/admin/users`, { headers });
      if (activeRes.ok) {
        const activeData = await activeRes.json();
        setActiveUsers(activeData.users || []);
        
        // Initialize roleMap
        const initialRoles = {};
        (activeData.users || []).forEach((u) => {
          initialRoles[u.id] = u.role || "user";
        });
        setRoleMap(initialRoles);
      }

      // 2. Fetch pending users
      const pendingRes = await fetch(`${API}/admin/pending-users`, { headers });
      if (pendingRes.ok) {
        const pendingData = await pendingRes.json();
        setPendingUsers(pendingData.users || []);
      }
    } catch (err) {
      console.error("Fetch users error:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredActiveUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return activeUsers;
    return activeUsers.filter((u) => {
      return (
        (u.name || "").toLowerCase().includes(q) ||
        (u.username || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.phone || "").toLowerCase().includes(q) ||
        (u.company_name || "").toLowerCase().includes(q) ||
        (u.role || "").toLowerCase().includes(q)
      );
    });
  }, [activeUsers, searchQuery]);

  const filteredPendingUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return pendingUsers;
    return pendingUsers.filter((u) => {
      return (
        (u.name || "").toLowerCase().includes(q) ||
        (u.username || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.phone || "").toLowerCase().includes(q)
      );
    });
  }, [pendingUsers, searchQuery]);

  const handleApproveUser = async (user) => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API}/admin/approve-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ id: user.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert("Approval failed: " + (data.message || "Unknown error"));
        return;
      }

      alert("✅ User approved successfully!");
      fetchAllUsers();
    } catch (err) {
      alert("Approval failed: " + err.message);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setUpdatingId(userId);
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API}/admin/users/${userId}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert("Failed to update role: " + (data.message || "Permission denied"));
        return;
      }

      alert(`✅ User role updated to '${newRole}' successfully!`);
      fetchAllUsers();
    } catch (err) {
      alert("Role update error: " + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="page">
      <div className="top">
        <div>
          <h2 className="h2">Users & Role-Based Access Control (RBAC)</h2>
          <p className="sub">Manage active registered accounts, assign 4-tier roles, and approve new member signups.</p>
        </div>
        <button className="btn" onClick={fetchAllUsers}>
          ↻ Refresh Accounts
        </button>
      </div>

      <div className="controlsRow">
        <div className="tabRow">
          <button
            className={`tabBtn ${tab === "active" ? "active" : ""}`}
            onClick={() => setTab("active")}
          >
            👥 Active Accounts ({activeUsers.length})
          </button>
          <button
            className={`tabBtn ${tab === "pending" ? "active" : ""}`}
            onClick={() => setTab("pending")}
          >
            ⏳ Pending Signups ({pendingUsers.length})
          </button>
        </div>

        <div className="searchWrapper">
          <span className="searchIcon">🔍</span>
          <input
            type="text"
            className="searchInput"
            placeholder="Search by name, email, phone, role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loading && <div className="muted">Loading user accounts...</div>}

      {!loading && tab === "active" && (
        <>
          {filteredActiveUsers.length === 0 ? (
            <div className="empty">
              {searchQuery ? "No matching accounts found for your query." : "No active users found."}
            </div>
          ) : (
            <div className="tableWrapper">
              <table className="userTable">
                <thead>
                  <tr>
                    <th>User Details</th>
                    <th>Email / Contact</th>
                    <th>Status</th>
                    <th>Current Role</th>
                    <th>Manage Role (RBAC)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredActiveUsers.map((u) => (
                    <tr key={u.id} className="userRow">
                      <td>
                        <div className="name">{u.name || u.username || "Unnamed Member"}</div>
                        <div className="company">{u.company_name ? `🏢 ${u.company_name}` : "Individual Member"}</div>
                      </td>
                      <td>
                        <div className="emailText">{u.email || u.phone || u.whatsapp || "No contact"}</div>
                      </td>
                      <td>
                        <span className={`statusPill ${u.verification_status || "unverified"}`}>
                          {(u.verification_status || "unverified").toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span className={`roleBadge ${u.role || "user"}`}>
                          {(u.role || "user").toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div className="roleControl">
                          <select
                            className="roleSelect"
                            value={roleMap[u.id] || u.role || "user"}
                            onChange={(e) => setRoleMap({ ...roleMap, [u.id]: e.target.value })}
                          >
                            <option value="user">User (Tier 1)</option>
                            <option value="manager">Manager (Tier 2)</option>
                            <option value="admin">Admin (Tier 3)</option>
                            <option value="superadmin">Superadmin (Tier 4)</option>
                          </select>
                          <button
                            className="saveRoleBtn"
                            disabled={updatingId === u.id || (roleMap[u.id] === u.role)}
                            onClick={() => handleRoleChange(u.id, roleMap[u.id])}
                          >
                            {updatingId === u.id ? "Saving..." : "Save Role"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {!loading && tab === "pending" && (
        <>
          {filteredPendingUsers.length === 0 ? (
            <div className="empty">
              {searchQuery ? "No pending signups match your search." : "No pending user registrations awaiting approval."}
            </div>
          ) : (
            <div className="grid">
              {filteredPendingUsers.map((u) => (
                <div key={u.id} className="card">
                  <div className="cardTop">
                    <h3 className="title">{u.name || u.username}</h3>
                    <span className="statusPill pending">PENDING APPROVAL</span>
                  </div>
                  <div className="meta">
                    <div><b>Email:</b> {u.email || "-"}</div>
                    <div><b>Phone:</b> {u.phone || u.whatsapp || "-"}</div>
                    <div><b>Login Method:</b> {u.login_method || "-"}</div>
                  </div>
                  <div className="btnRow">
                    <button className="btn" onClick={() => handleApproveUser(u)}>
                      Approve & Activate User
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <style>{`
        .page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }
        .top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 16px;
          margin-bottom: 20px;
        }
        .h2 { margin: 0; color: #0f172a; font-weight: 800; font-size: 1.4rem; letter-spacing: -0.3px; }
        .sub { margin: 6px 0 0; color: #64748b; font-size: 0.95rem; }
        .btn {
          background: linear-gradient(135deg, #0f766e, #16a34a);
          color: #fff;
          border: none;
          border-radius: 10px;
          padding: 10px 18px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(15, 118, 110, 0.25);
        }
        .controlsRow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }
        .tabRow {
          display: flex;
          gap: 8px;
        }
        .tabBtn {
          padding: 9px 16px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          background: #f8fafc;
          color: #475569;
          font-weight: 600;
          font-size: 13.5px;
          cursor: pointer;
          transition: all 0.18s ease;
        }
        .tabBtn.active {
          background: #0f766e;
          color: #ffffff;
          border-color: #0f766e;
          box-shadow: 0 2px 8px rgba(15, 118, 110, 0.2);
        }
        .searchWrapper {
          position: relative;
          min-width: 280px;
        }
        .searchIcon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 13px;
          color: #94a3b8;
        }
        .searchInput {
          width: 100%;
          padding: 9px 12px 9px 34px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          font-size: 13.5px;
          outline: none;
          transition: border-color 0.18s ease, box-shadow 0.18s ease;
          background: #ffffff;
        }
        .searchInput:focus {
          border-color: #0f766e;
          box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.12);
        }
        .tableWrapper {
          overflow-x: auto;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
        }
        .userTable {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .userTable th {
          background: #f8fafc;
          padding: 12px 16px;
          color: #475569;
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid #e2e8f0;
        }
        .userTable td {
          padding: 14px 16px;
          border-bottom: 1px solid #f1f5f9;
        }
        .userRow:hover {
          background: #f8fafc;
        }
        .name { font-weight: 700; color: #0f172a; font-size: 14px; }
        .company { font-size: 0.82rem; color: #64748b; margin-top: 2px; }
        .emailText { font-size: 13.5px; color: #334155; }
        .statusPill {
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.5px;
        }
        .statusPill.verified { background: #dcfce7; color: #166534; }
        .statusPill.unverified { background: #fef3c7; color: #92400e; }
        .statusPill.pending { background: #ffedd5; color: #c2410c; }
        .roleBadge {
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.5px;
        }
        .roleBadge.superadmin { background: #fee2e2; color: #991b1b; }
        .roleBadge.admin { background: #e0e7ff; color: #3730a3; }
        .roleBadge.manager { background: #fef9c3; color: #854d0e; }
        .roleBadge.user { background: #f1f5f9; color: #334155; }
        .roleControl {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .roleSelect {
          padding: 6px 10px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background: #fff;
          font-size: 13px;
          font-weight: 500;
          outline: none;
        }
        .roleSelect:focus {
          border-color: #0f766e;
        }
        .saveRoleBtn {
          padding: 6px 14px;
          border-radius: 8px;
          border: none;
          background: #0f766e;
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .saveRoleBtn:hover:not(:disabled) {
          background: #0d655e;
        }
        .saveRoleBtn:disabled {
          background: #e2e8f0;
          color: #94a3b8;
          cursor: not-allowed;
        }
        .empty {
          padding: 40px 20px;
          text-align: center;
          color: #64748b;
          background: #f8fafc;
          border-radius: 12px;
          border: 1px dashed #cbd5e1;
        }
        .muted { color: #64748b; padding: 20px 0; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
        .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; background: #fff; }
        .cardTop { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
        .title { margin: 0; font-size: 1.05rem; color: #0f172a; }
        .meta { display: flex; flex-direction: column; gap: 6px; color: #475569; font-size: 0.9rem; margin-bottom: 14px; }
        .btnRow { display: flex; justify-content: flex-end; }
      `}</style>
    </div>
  );
};

export default PendingUsers;