import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import ChatWindow from "../components/messaging/ChatWindow";

export default function MessagingCenter() {
  const location = useLocation();
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(location.state?.conversationId || null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

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
      console.error(e);
    } finally {
      setLoading(false);
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

  return (
    <div className="messaging-center-page">
      <div className="messaging-layout">
        {/* SIDEBAR */}
        <div className="conv-sidebar">
          <div className="sidebar-header">
            <h2>Messages</h2>
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

        .sidebar-header h2 {
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 12px;
        }

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

        .conv-item:hover {
          background: #f1f5f9;
        }

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

        .chat-main {
          height: 100%;
        }

        .loading-txt, .empty-txt {
          padding: 30px 20px;
          text-align: center;
          color: #94a3b8;
          font-size: 13px;
        }

        @media (max-width: 768px) {
          .messaging-layout { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
