import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import ChatWindow from "../components/messaging/ChatWindow";
import supabase from "../config/supabaseClient";

export default function MessagingCenter() {
  const location = useLocation();
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(location.state?.conversationId || null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal State for New Message / Broadcast
  const [showModal, setShowModal] = useState(false);
  const [recipientsList, setRecipientsList] = useState([]);
  const [collectivesList, setCollectivesList] = useState([]);
  const [userRole, setUserRole] = useState("user");
  const [modalMode, setModalMode] = useState("direct"); // 'direct', 'collective', 'platform'
  const [selectedRecipientId, setSelectedRecipientId] = useState("");
  const [selectedCollectiveId, setSelectedCollectiveId] = useState("");
  const [messageText, setMessageText] = useState("");
  const [submittingMsg, setSubmittingMsg] = useState(false);
  const [modalMsg, setModalMsg] = useState(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    if (!token) return setLoading(false);

    try {
      const res = await fetch("http://localhost:5000/api/messages/conversations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const convList = data.conversations || [];
        setConversations(convList);

        if (!activeConvId && convList.length > 0) {
          setActiveConvId(convList[0].id);
        }
      }
    } catch (e) {
      console.error("Fetch conversations error:", e);
    } finally {
      setLoading(false);
    }
  };

  const openNewMessageModal = async () => {
    setShowModal(true);
    setModalMsg(null);
    setSelectedRecipientId("");
    setSelectedCollectiveId("");
    setMessageText("");

    const token = localStorage.getItem("token");
    if (token) {
      try {
        const res = await fetch("http://localhost:5000/api/messages/recipients", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setRecipientsList(data.users || []);
          setCollectivesList(data.collectives || []);
          setUserRole(data.role || "user");
        }
      } catch (err) {
        console.warn("Recipients fetch warning:", err.message);
      }
    }

    // Direct query fallback for users if API fails
    if (recipientsList.length === 0) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const me = authData?.user;
        const { data: users } = await supabase
          .from("users_active")
          .select("id, name, email, role, company_name")
          .neq("id", me?.id || "");
        setRecipientsList(users || []);
      } catch (colErr) {
        console.warn("Supabase recipient query:", colErr.message);
      }
    }
  };

  const handleCreateOrBroadcast = async (e) => {
    e.preventDefault();
    setModalMsg(null);

    if (!messageText.trim()) {
      return setModalMsg({ type: "error", text: "Please enter a message" });
    }

    setSubmittingMsg(true);
    const token = localStorage.getItem("token");

    try {
      if (modalMode === "direct") {
        if (!selectedRecipientId) {
          setSubmittingMsg(false);
          return setModalMsg({ type: "error", text: "Please select a recipient" });
        }

        const res = await fetch("http://localhost:5000/api/messages/conversations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            recipient_id: selectedRecipientId,
            initial_message: messageText,
          }),
        });

        const json = await res.json();
        if (res.ok) {
          setShowModal(false);
          await fetchConversations();
          if (json.conversation_id) setActiveConvId(json.conversation_id);
        } else {
          setModalMsg({ type: "error", text: json.message || "Could not send message" });
        }
      } else {
        // Broadcast Mode (Collective Group or Platform-wide)
        const res = await fetch("http://localhost:5000/api/messages/broadcast", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            target_type: modalMode === "platform" ? "platform" : "collective",
            collective_id: modalMode === "collective" ? selectedCollectiveId : null,
            content: messageText,
          }),
        });

        const json = await res.json();
        if (res.ok) {
          setModalMsg({ type: "success", text: json.message });
          setTimeout(() => {
            setShowModal(false);
            fetchConversations();
          }, 1500);
        } else {
          setModalMsg({ type: "error", text: json.message || "Broadcast failed" });
        }
      }
    } catch (err) {
      setModalMsg({ type: "error", text: err.message });
    } finally {
      setSubmittingMsg(false);
    }
  };

  const activeConv = conversations.find((c) => c.id === activeConvId);

  const getRecipientDisplay = (conv) => {
    if (conv?.collective) return { name: conv.collective.name, collective: conv.collective };
    if (conv?.recipients && conv.recipients.length > 0) {
      return conv.recipients[0];
    }
    return { name: "Community Member" };
  };

  const filteredConvs = conversations.filter((c) => {
    const disp = getRecipientDisplay(c);
    const name = disp.name || "";
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const isAdmin = ["admin", "superadmin"].includes(userRole);
  const isManager = userRole === "manager" || collectivesList.length > 0;

  return (
    <div className="messaging-center-page">
      <div className="messaging-layout">
        {/* SIDEBAR */}
        <div className="conv-sidebar">
          <div className="sidebar-header">
            <div className="title-row">
              <h2>Messages</h2>
              <button className="new-msg-btn" onClick={openNewMessageModal}>
                ✏️ New Message
              </button>
            </div>
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="conv-list">
            {loading ? (
              <div className="loading-txt">Loading conversations...</div>
            ) : filteredConvs.length === 0 ? (
              <div className="empty-txt">No active conversations found.</div>
            ) : (
              filteredConvs.map((c) => {
                const disp = getRecipientDisplay(c);
                const isActive = c.id === activeConvId;
                return (
                  <div
                    key={c.id}
                    className={`conv-item ${isActive ? "active" : ""}`}
                    onClick={() => setActiveConvId(c.id)}
                  >
                    <div className="avatar">
                      {(disp.name || "C").charAt(0).toUpperCase()}
                    </div>
                    <div className="conv-meta">
                      <div className="top-row">
                        <span className="conv-name">{disp.name}</span>
                        {c.updated_at && (
                          <span className="time-str">
                            {new Date(c.updated_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>
                      <div className="bottom-row">
                        <span className="snippet">
                          {c.last_message ? c.last_message.content : "Click to view thread"}
                        </span>
                        {c.unread_count > 0 && (
                          <span className="unread-badge">{c.unread_count}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* MAIN CHAT WINDOW */}
        <div className="chat-main">
          <ChatWindow
            conversationId={activeConvId}
            recipientInfo={activeConv ? getRecipientDisplay(activeConv) : null}
            onMessageSent={fetchConversations}
          />
        </div>
      </div>

      {/* NEW MESSAGE / BROADCAST MODAL */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>💬 Send Message / Announcement</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>

            {/* TAB SELECTOR BASED ON ROLES */}
            <div className="modal-tabs">
              <button
                className={modalMode === "direct" ? "tab-btn active" : "tab-btn"}
                onClick={() => setModalMode("direct")}
              >
                👤 Peer Direct Message
              </button>
              {isManager && (
                <button
                  className={modalMode === "collective" ? "tab-btn active" : "tab-btn"}
                  onClick={() => setModalMode("collective")}
                >
                  🤝 Message Group Members
                </button>
              )}
              {isAdmin && (
                <button
                  className={modalMode === "platform" ? "tab-btn active" : "tab-btn"}
                  onClick={() => setModalMode("platform")}
                >
                  📢 Platform-Wide Broadcast
                </button>
              )}
            </div>

            {modalMsg && (
              <div className={`alert-box ${modalMsg.type}`}>{modalMsg.text}</div>
            )}

            <form onSubmit={handleCreateOrBroadcast} className="modal-form">
              {modalMode === "direct" && (
                <div className="form-group">
                  <label>Select Verified Recipient:</label>
                  <select
                    value={selectedRecipientId}
                    onChange={(e) => setSelectedRecipientId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Member --</option>
                    {recipientsList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name || u.email} {u.company_name ? `(${u.company_name})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {modalMode === "collective" && (
                <div className="form-group">
                  <label>Select Collective Group:</label>
                  <select
                    value={selectedCollectiveId}
                    onChange={(e) => setSelectedCollectiveId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Collective Group --</option>
                    {collectivesList.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {modalMode === "platform" && (
                <div className="info-callout">
                  👑 <strong>Admin Notice:</strong> This broadcast message will be sent to all active users on CommunityHub and forwarded via email notifications.
                </div>
              )}

              <div className="form-group">
                <label>Message Content:</label>
                <textarea
                  rows="4"
                  placeholder="Type your message here..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn" disabled={submittingMsg}>
                  {submittingMsg ? "Sending..." : "Send Message & Email Notification"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .messaging-center-page {
          font-family: 'Segoe UI', system-ui, sans-serif;
          background: #f8fafc;
          height: calc(100vh - 70px);
        }

        .messaging-layout {
          display: grid;
          grid-template-columns: 320px 1fr;
          height: 100%;
          border-top: 1px solid #e2e8f0;
        }

        .conv-sidebar {
          background: white;
          border-right: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
        }

        .sidebar-header {
          padding: 20px;
          border-bottom: 1px solid #f1f5f9;
        }

        .title-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .sidebar-header h2 {
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }

        .new-msg-btn {
          background: #0f766e;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .new-msg-btn:hover { background: #0d9488; }

        .search-input {
          width: 100%;
          padding: 8px 14px;
          border-radius: 20px;
          border: 1px solid #cbd5e1;
          font-size: 13px;
          outline: none;
          box-sizing: border-box;
        }

        .conv-list {
          flex: 1;
          overflow-y: auto;
        }

        .conv-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 20px;
          border-bottom: 1px solid #f8fafc;
          cursor: pointer;
          transition: 0.2s;
        }

        .conv-item:hover { background: #f1f5f9; }

        .conv-item.active {
          background: #e0f2fe;
          border-left: 4px solid #0284c7;
        }

        .conv-item .avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #0f766e;
          color: white;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        }

        .conv-meta {
          flex: 1;
          overflow: hidden;
        }

        .top-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
        }

        .conv-name {
          font-size: 14px;
          font-weight: 700;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .time-str {
          font-size: 11px;
          color: #94a3b8;
        }

        .bottom-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .snippet {
          font-size: 12px;
          color: #64748b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 180px;
        }

        .unread-badge {
          background: #ef4444;
          color: white;
          font-size: 11px;
          font-weight: bold;
          padding: 2px 7px;
          border-radius: 10px;
        }

        .chat-main { height: 100%; }

        .loading-txt, .empty-txt {
          padding: 30px 20px;
          text-align: center;
          color: #94a3b8;
          font-size: 13px;
        }

        /* MODAL STYLES */
        .modal-backdrop {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-card {
          background: white;
          border-radius: 16px;
          width: 500px;
          max-width: 90%;
          padding: 24px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .modal-header h3 { margin: 0; color: #0f172a; }

        .close-btn {
          background: transparent;
          border: none;
          font-size: 18px;
          cursor: pointer;
          color: #64748b;
        }

        .modal-tabs {
          display: flex;
          gap: 6px;
          background: #f1f5f9;
          padding: 4px;
          border-radius: 10px;
          margin-bottom: 16px;
        }

        .modal-tabs .tab-btn {
          flex: 1;
          border: none;
          background: transparent;
          padding: 8px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          color: #475569;
        }

        .modal-tabs .tab-btn.active {
          background: white;
          color: #0f766e;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .info-callout {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #1e40af;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 13px;
          margin-bottom: 16px;
        }

        .modal-form { display: flex; flex-direction: column; gap: 14px; }

        .modal-form .form-group { display: flex; flex-direction: column; gap: 6px; }

        .modal-form label { font-size: 13px; font-weight: 600; color: #334155; }

        .modal-form select, .modal-form textarea {
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font-size: 14px;
          outline: none;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 10px;
        }

        .cancel-btn {
          background: #f1f5f9;
          color: #475569;
          border: none;
          padding: 10px 18px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }

        .modal-actions .submit-btn {
          background: #0f766e;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
        }

        .alert-box {
          padding: 10px;
          border-radius: 8px;
          font-size: 13px;
          margin-bottom: 12px;
        }
        .alert-box.success { background: #d1fae5; color: #047857; }
        .alert-box.error { background: #ffe4e6; color: #e11d48; }

        @media (max-width: 768px) {
          .messaging-layout { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
