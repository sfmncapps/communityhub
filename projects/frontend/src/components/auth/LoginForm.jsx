import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { loginUser } from "../../services/authService";
import supabase from "../../config/supabaseClient";

const LoginForm = () => {
  const navigate = useNavigate();

  // "login" = OTP login for existing/approved users
  // "signup" = OTP signup flow (verify -> set password)
  // Applies to email/phone only — WhatsApp has its own unified flow below.
  const [otpIntent, setOtpIntent] = useState("login");

  const [mode, setMode] = useState(null); // "email" | "phone" | null
  const [step, setStep] = useState("enter");

  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [tempToken, setTempToken] = useState("");

  // WhatsApp — separate, simplified state: enter number -> OTP -> done.
  // No signup/login distinction, no password, ever.
  const [waOpen, setWaOpen] = useState(false);
  const [waStep, setWaStep] = useState("enter");
  const [waIdentifier, setWaIdentifier] = useState("");
  const [waOtp, setWaOtp] = useState("");

  const API = import.meta.env.VITE_API_BASE_URL || "https://communityhub.sunflowerwebtek.com/api";

  /* OAuth session check — runs after Google/Apple redirect back to /login.
     A live Supabase session only means "we know who they are", not that
     they're an approved member — so we call the backend (service_role)
     to check/create the account, since the frontend's anon-key
     client is blocked by RLS on users_active. */
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const accessToken = session?.access_token;
      if (!accessToken) return;

      try {
        const res = await fetch(`${API}/auth/oauth-check`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json();

        if (!res.ok) {
          alert("Sign-in check failed: " + (data.message || "Unknown error"));
          await supabase.auth.signOut();
          return;
        }

        if (data.approved) {
          navigate("/dashboard");
        } else {
          alert("Account created. Waiting for admin approval before you can log in.");
          await supabase.auth.signOut();
        }
      } catch (err) {
        console.error("oauth-check failed:", err);
        alert("Sign-in check failed. Please try again.");
        await supabase.auth.signOut();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  /* NORMAL LOGIN */
  const handleSubmit = async (e) => {
    e.preventDefault();

    const identifier = e.target.username.value;
    const password = e.target.password.value;

    try {
      const user = await loginUser(identifier, password);
      if (user) navigate("/dashboard");
    } catch (err) {
      alert("Invalid credentials");
    }
  };

  /* GOOGLE */
  const loginWithGoogle = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      // Land back on /login, not /dashboard directly — the
      // onAuthStateChange handler above decides where to send
      // them once it's confirmed they're an approved member.
      redirectTo: `${window.location.origin}/login`,
      // Force Google's account picker every time, instead of
      // silently reusing whatever Google account the browser
      // already has an active session with. Without this, a
      // second person on the same browser can't switch accounts.
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error) alert(error.message);
};

  /* APPLE */
  const loginWithApple = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: {
        redirectTo: `${window.location.origin}/login`,
      },
    });
    if (error) alert(error.message);
  };

  /* OTP FLOW (email/phone) — endpoint chosen by otpIntent */
  const sendOtp = async () => {
    if (!mode) return alert("Select login method");
    if (!identifier.trim()) return alert("Enter Email / Phone number");

    const endpoint = otpIntent === "login" ? "send-login-otp" : "send-otp";

    const res = await fetch(`${API}/auth/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel: mode, identifier }),
    });

    const data = await res.json();
    if (!res.ok) return alert(data.message || "Failed to send OTP");

    alert("OTP sent!");
    setStep("otp");
  };

  const verifyOtp = async () => {
    if (!otp.trim()) return alert("Enter OTP");

    const endpoint = otpIntent === "login" ? "verify-login-otp" : "verify-otp";

    const res = await fetch(`${API}/auth/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel: mode, identifier, otp }),
    });

    const data = await res.json();
    if (!res.ok) return alert(data.message || "OTP verification failed");

    if (otpIntent === "login") {
      // Existing, approved user — we're done, session token issued already.
      if (data.token) localStorage.setItem("token", data.token);
      navigate("/dashboard");
      return;
    }

    // Signup flow — still needs a password set.
    setTempToken(data.tempToken);
    alert("OTP verified. Now set password.");
    setStep("password");
  };

  const completeSignup = async () => {
    if (!newPassword.trim()) return alert("Set password");

    const res = await fetch(`${API}/auth/complete-signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tempToken}`,
      },
      body: JSON.stringify({ password: newPassword }),
    });

    const data = await res.json();
    if (!res.ok) return alert(data.message || "Signup failed");

    // Auto-approved: log them straight in, same as any other login.
    if (data.token) localStorage.setItem("token", data.token);
    window.dispatchEvent(new Event("profile-updated"));
    navigate("/dashboard");
  };

  const cancelOtpFlow = () => {
    setMode(null);
    setStep("enter");
    setIdentifier("");
    setOtp("");
    setNewPassword("");
    setTempToken("");
  };

  const switchOtpIntent = (intent) => {
    setOtpIntent(intent);
    setMode(null);
    setStep("enter");
    setIdentifier("");
    setOtp("");
    setNewPassword("");
    setTempToken("");
  };

  /* WHATSAPP — unified flow, no signup/login split, no password */
  const sendWhatsappOtp = async () => {
    if (!waIdentifier.trim()) return alert("Enter WhatsApp number");

    const res = await fetch(`${API}/auth/whatsapp/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: waIdentifier }),
    });

    const data = await res.json();
    if (!res.ok) return alert(data.message || "Failed to send OTP");

    alert("OTP sent on WhatsApp!");
    setWaStep("otp");
  };

  const verifyWhatsappOtp = async () => {
    if (!waOtp.trim()) return alert("Enter OTP");

    const res = await fetch(`${API}/auth/whatsapp/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: waIdentifier, otp: waOtp }),
    });

    const data = await res.json();
    if (!res.ok) return alert(data.message || "OTP verification failed");

    if (data.token) localStorage.setItem("token", data.token);
    window.dispatchEvent(new Event("profile-updated"));
    navigate("/dashboard");
  };

  const cancelWhatsappFlow = () => {
    setWaOpen(false);
    setWaStep("enter");
    setWaIdentifier("");
    setWaOtp("");
  };

  return (
    <>
      <div className="login-page">
        <form className="login-form" onSubmit={handleSubmit}>
          <h2>Login</h2>

          <input name="username" placeholder="Username / Email / Phone" required />
          <input name="password" type="password" placeholder="Password" required />
          <button type="submit">Login</button>
          <div className="alt-login">
            <div className="icon-row">
              <button type="button" className="icon-btn" onClick={loginWithGoogle}>
                <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg" alt="google"/>
              </button>

              <button type="button" className="icon-btn" onClick={() => { setMode("email"); }}>
                <img src="https://cdn-icons-png.flaticon.com/512/561/561127.png" alt="email"/>
              </button>

              <button type="button" className="icon-btn" onClick={() => { setMode("phone"); }}>
                <img src="https://cdn-icons-png.flaticon.com/512/724/724664.png" alt="phone"/>
              </button>

              {/* WhatsApp: separate, unified flow — no signup/login tabs apply */}
              <button type="button" className="icon-btn" onClick={() => { setWaOpen(true); }}>
                <img src="https://cdn-icons-png.flaticon.com/512/733/733585.png" alt="whatsapp"/>
              </button>

              <button type="button" className="icon-btn" onClick={loginWithApple}>
                <img src="https://cdn-icons-png.flaticon.com/512/0/747.png" alt="apple"/>
              </button>
            </div>

            {mode && (
              <div className="otp-box">
                <div className="otp-title">
                  Log in with {mode === "email" ? "Email OTP" : "Phone OTP"}
                </div>

                {step === "enter" && (
                  <div className="otp-form-col">
                    <input
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder={mode === "email" ? "Enter email" : "Enter phone number"}
                    />
                    <button type="button" onClick={sendOtp}>Send OTP</button>
                  </div>
                )}

                {step === "otp" && (
                  <div className="otp-form-col">
                    <input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter OTP"/>
                    <button type="button" onClick={verifyOtp}>Verify OTP</button>
                  </div>
                )}

                {step === "password" && otpIntent === "signup" && (
                  <div className="otp-form-col">
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Set Password"/>
                    <button type="button" onClick={completeSignup}>Create Account</button>
                  </div>
                )}

                <button type="button" className="otp-cancel" onClick={cancelOtpFlow}>Cancel</button>
              </div>
            )}

            {waOpen && (
              <div className="otp-box">
                <div className="otp-title">Log in with WhatsApp</div>

                {waStep === "enter" && (
                  <div className="otp-form-col">
                    <input
                      value={waIdentifier}
                      onChange={(e) => setWaIdentifier(e.target.value)}
                      placeholder="Enter WhatsApp number"
                    />
                    <button type="button" onClick={sendWhatsappOtp}>Send OTP</button>
                  </div>
                )}

                {waStep === "otp" && (
                  <div className="otp-form-col">
                    <input
                      value={waOtp}
                      onChange={(e) => setWaOtp(e.target.value)}
                      placeholder="Enter OTP"
                    />
                    <button type="button" onClick={verifyWhatsappOtp}>Verify OTP</button>
                  </div>
                )}

                <button type="button" className="otp-cancel" onClick={cancelWhatsappFlow}>Cancel</button>
              </div>
            )}
          </div>
        </form>
      </div>

      <style>{`
        .login-page {
          min-height: 50vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .login-form {
          background: #ffffff;
          padding: 20px 40px 40px 40px;
          border-radius: 12px;
          width: 100%;
          max-width: 520px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.08);
          display: flex;
          flex-direction: column;
        }

        .login-form h2 {
          text-align: center;
          margin-bottom: 25px;
          color: #1e40af;
        }

        .login-form input {
          padding: 12px 14px;
          margin-bottom: 15px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font-size: 0.95rem;
        }

        .login-form button {
          margin-top: 10px;
          padding: 12px;
          border-radius: 8px;
          border: none;
          background: linear-gradient(135deg, #0f766e, #16a34a);
          color: #fff;
          font-weight: 600;
          cursor: pointer;
        }

        .alt-login { margin-top: 25px; }

        .otp-intent-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }

        .otp-intent-tabs .tab {
          flex: 1;
          padding: 10px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: #f8fafc !important;
          color: #475569;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          margin-top: 0 !important;
        }

        .otp-intent-tabs .tab.active {
          background: linear-gradient(135deg, #0f766e, #16a34a) !important;
          color: #fff;
          border-color: transparent;
        }

        .icon-row {
          display: flex;
          gap: 10px;
        }

        .icon-btn {
          flex: 1;
          background: #f1f5f9 !important;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 48px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          transition: 0.3s ease;
          margin-top: 0 !important;
          padding: 0 !important;
        }

        .icon-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 18px rgba(0,0,0,0.1);
        }

        .icon-btn img {
          width: 22px;
          height: 22px;
        }

        .otp-box {
          margin-top: 16px;
          padding: 14px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
        }

        .otp-title {
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 10px;
          font-size: 14px;
        }

        .otp-form-col {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .otp-cancel {
          margin-top: 10px !important;
          background: #e2e8f0 !important;
          color: #0f172a !important;
        }
      `}</style>
    </>
  );
};

export default LoginForm;
