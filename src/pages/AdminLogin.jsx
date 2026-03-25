import { useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../config/supabaseClient";

export default function AdminLogin() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      nav("/admin", { replace: true });
    } catch (e) {
      alert(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: "70px auto", padding: 18, border: "1px solid #e5e7eb", borderRadius: 12 }}>
      <h2>Admin Login</h2>

      <label>Email</label>
      <input style={inp} value={email} onChange={(e) => setEmail(e.target.value)} />

      <label>Password</label>
      <input style={inp} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

      <button style={btn} onClick={login} disabled={loading}>
        {loading ? "Logging in..." : "Login"}
      </button>
    </div>
  );
}

const inp = { width: "100%", padding: 12, borderRadius: 10, border: "1px solid #d1d5e1", margin: "8px 0 14px" };
const btn = { width: "100%", padding: 12, borderRadius: 10, border: "none", background: "#111827", color: "#fff", fontWeight: 900 };
