import { useEffect, useState, useRef } from "react";

export default function ChatWindow({ conversationId, recipientInfo, onMessageSent }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (conversationId) {
      fetchMessages();
    }
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`http://localhost:5000/api/messages/conversations/${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (e) {
      console.error("Error fetching messages:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setSending(true);
    const token = localStorage.getItem("token");
    const content = inputText;
    setInputText("");

    try {
      const res = await fetch(`http://localhost:5000/api/messages/conversations/${conversationId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.messageItem]);
        if (onMessageSent) onMessageSent();
      } else {
        alert("Could not send message");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const currentUserId = (() => {
    try {
      return JSON.parse(localStorage.getItem("user"))?.id;
    } catch {
      return null;
    }
  })();

  if (!conversationId) {
    return (
      <div className="chat-placeholder">
        <h3>💬 In-App Messaging Center</h3>
        <p>Select a conversation from the sidebar or start a new thread from a Collective profile.</p>
        <style>{`
          .chat-placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: #64748b;
            text-align: center;
            padding: 40px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="chat-window">
      {/* HEADER */}
      <div className="chat-header">
        <div className="avatar">
          {(recipientInfo?.name || recipientInfo?.collective?.name || "C").charAt(0).toUpperCase()}
        </div>
        <div>
          <h4>{recipientInfo?.name || recipientInfo?.collective?.name || "Conversation Thread"}</h4>
          <span className="sub-text">
            {recipientInfo?.collective ? "Collective Profile" : recipientInfo?.role ? `Role: ${recipientInfo.role}` : "Active Member"}
          </span>
        </div>
      </div>

      {/* MESSAGES CONTAINER */}
      <div className="messages-body">
        {loading ? (
          <div className="loading-msgs">Loading thread messages...</div>
        ) : messages.length === 0 ? (
          <div className="no-msgs">No messages yet. Send a greeting to start the conversation!</div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            return (
              <div key={msg.id} className={`message-bubble-wrap ${isMe ? "me" : "them"}`}>
                <div className="message-bubble">
                  {!isMe && <span className="sender-name">{msg.sender?.name || "Sender"}</span>}
                  <p className="message-text">{msg.content}</p>
                  <span className="timestamp">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT FORM */}
      <form onSubmit={handleSend} className="chat-input-form">
        <input
          type="text"
          placeholder="Type your message..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={sending}
        />
        <button type="submit" disabled={sending || !inputText.trim()}>
          {sending ? "..." : "Send Send"}
        </button>
      </form>

      <style>{`
        .chat-window {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #ffffff;
        }

        .chat-header {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px 24px;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
        }

        .chat-header .avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: #2563eb;
          color: white;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
        }

        .chat-header h4 {
          margin: 0 0 2px;
          font-size: 16px;
          color: #0f172a;
        }

        .sub-text {
          font-size: 12px;
          color: #64748b;
        }

        .messages-body {
          flex: 1;
          padding: 20px 24px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: #f1f5f9;
        }

        .loading-msgs, .no-msgs {
          text-align: center;
          color: #94a3b8;
          font-size: 14px;
          margin: auto 0;
        }

        .message-bubble-wrap {
          display: flex;
          width: 100%;
        }

        .message-bubble-wrap.me {
          justify-content: flex-end;
        }

        .message-bubble-wrap.them {
          justify-content: flex-start;
        }

        .message-bubble {
          max-width: 65%;
          padding: 10px 14px;
          border-radius: 14px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.04);
          display: flex;
          flex-direction: column;
        }

        .me .message-bubble {
          background: #2563eb;
          color: white;
          border-bottom-right-radius: 2px;
        }

        .them .message-bubble {
          background: white;
          color: #1e293b;
          border: 1px solid #e2e8f0;
          border-bottom-left-radius: 2px;
        }

        .sender-name {
          font-size: 11px;
          font-weight: 700;
          color: #0f766e;
          margin-bottom: 4px;
        }

        .message-text {
          margin: 0;
          font-size: 14px;
          line-height: 1.4;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .timestamp {
          font-size: 10px;
          align-self: flex-end;
          margin-top: 4px;
          opacity: 0.75;
        }

        .chat-input-form {
          display: flex;
          gap: 10px;
          padding: 16px 24px;
          background: white;
          border-top: 1px solid #e2e8f0;
        }

        .chat-input-form input {
          flex: 1;
          padding: 12px 18px;
          border-radius: 24px;
          border: 1px solid #cbd5e1;
          font-size: 14px;
          outline: none;
        }

        .chat-input-form button {
          background: #2563eb;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 24px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s;
        }

        .chat-input-form button:hover {
          background: #1d4ed8;
        }

        .chat-input-form button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
