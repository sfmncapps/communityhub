import { useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../config/supabaseClient";
import { setAuthSession } from "../services/authService";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export default function AdminLogin() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const token = data?.session?.access_token;
      let userObj = data?.user ? { id: data.user.id, email: data.user.email, role: "admin" } : null;

      if (token) {
        try {
          const res = await fetch(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const json = await res.json();
            if (json.user) userObj = json.user;
          }
        } catch {}
      }

      const role = (userObj?.role || "").toLowerCase();
      if (role !== "admin" && role !== "superadmin") {
        await supabase.auth.signOut();
        throw new Error("Access denied: Administrative privileges required.");
      }

      setAuthSession(token, userObj);
      nav("/admin", { replace: true });
    } catch (e) {
      alert(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: "70px auto", padding: 24, border: "1px solid #e5e7eb", borderRadius: 16, background: "#ffffff", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
      <h2 style={{ margin: "0 0 8px", color: "#0f172a" }}>Admin Portal Login</h2>
      <p style={{ margin: "0 0 20px", fontSize: 13, color: "#64748b" }}>Restricted console for platform administrators and moderation team.</p>

      <label style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>Admin Email</label>
      <input style={inp} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@communityhub.com" />

      <label style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>Password</label>
      <input style={inp} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />

      <button style={btn} onClick={login} disabled={loading}>
        {loading ? "Authenticating..." : "Sign In to Admin Console"}
      </button>
    </div>
  );
}

const inp = { width: "100%", padding: 12, borderRadius: 10, border: "1px solid #d1d5e1", margin: "6px 0 16px", boxSizing: "border-box", fontSize: 14 };
const btn = { width: "100%", padding: 12, borderRadius: 10, border: "none", background: "#0f766e", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 15 };

