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
          if (data.token) localStorage.setItem("token", data.token);
          window.dispatchEvent(new Event("profile-updated"));
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
        redirectTo: `${window.location.origin}/login`,
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

  /* MICROSOFT (Azure AD / Outlook - RFP §7b) */
  const loginWithMicrosoft = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: {
        redirectTo: `${window.location.origin}/login`,
        scopes: "email profile openid",
      },
    });
    if (error) alert(error.message);
  };

  /* FACEBOOK (RFP §7b) */
  const loginWithFacebook = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "facebook",
      options: {
        redirectTo: `${window.location.origin}/login`,
      },
    });
    if (error) alert(error.message);
  };

  /* TWITTER / X (RFP §7b) */
  const loginWithTwitter = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "twitter",
      options: {
        redirectTo: `${window.location.origin}/login`,
      },
    });
    if (error) alert(error.message);
  };

  const showProviderNote = (provider, note) => {
    alert(`${provider} SSO Note: ${note}`);
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
            <div className="otp-intent-tabs">
              <button
                type="button"
                className={otpIntent === "login" ? "tab active" : "tab"}
                onClick={() => switchOtpIntent("login")}
              >
                Log in with OTP
              </button>
              <button
                type="button"
                className={otpIntent === "signup" ? "tab active" : "tab"}
                onClick={() => switchOtpIntent("signup")}
              >
                Sign up with OTP
              </button>
            </div>

            <div className="icon-row">
              <button type="button" className="icon-btn" onClick={loginWithGoogle} title="Sign in with Google">
                <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg" alt="Google"/>
              </button>

              <button type="button" className="icon-btn" onClick={loginWithApple} title="Sign in with Apple">
                <img src="https://cdn-icons-png.flaticon.com/512/0/747.png" alt="Apple"/>
              </button>

              <button type="button" className="icon-btn" onClick={loginWithMicrosoft} title="Sign in with Microsoft (Outlook / Azure AD)">
                <svg width="20" height="20" viewBox="0 0 21 21">
                  <path fill="#f25022" d="M1 1h9v9H1z"/>
                  <path fill="#00a4ef" d="M1 11h9v9H1z"/>
                  <path fill="#7fba00" d="M11 1h9v9h-9z"/>
                  <path fill="#ffb900" d="M11 11h9v9h-9z"/>
                </svg>
              </button>

              <button type="button" className="icon-btn" onClick={loginWithFacebook} title="Sign in with Facebook">
                <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/facebook/facebook-original.svg" alt="Facebook"/>
              </button>

              <button type="button" className="icon-btn" onClick={loginWithTwitter} title="Sign in with X / Twitter">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#0f172a">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 22.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </button>

              {/* WhatsApp: separate, unified flow — no signup/login tabs apply */}
              <button type="button" className="icon-btn" onClick={() => { setWaOpen(true); setMode(null); }} title="Instant WhatsApp OTP Login">
                <img src="https://cdn-icons-png.flaticon.com/512/733/733585.png" alt="WhatsApp"/>
              </button>

              <button type="button" className="icon-btn" onClick={() => { setMode("email"); setWaOpen(false); }} title="Sign in / Sign up with Email OTP">
                <img src="https://cdn-icons-png.flaticon.com/512/561/561127.png" alt="Email OTP"/>
              </button>

              <button type="button" className="icon-btn" onClick={() => { setMode("phone"); setWaOpen(false); }} title="Sign in / Sign up with Phone OTP">
                <img src="https://cdn-icons-png.flaticon.com/512/724/724664.png" alt="Phone OTP"/>
              </button>
            </div>

            <div className="sso-directory-bar">
              <div className="sso-directory-label">SSO Providers (RFP §7b):</div>
              <div className="sso-pill-group">
                <span className="sso-pill active" title="Active native Supabase OAuth">Google</span>
                <span className="sso-pill active" title="Active native Supabase OAuth">Apple</span>
                <span className="sso-pill active" title="Active native Supabase OAuth (Azure AD)">Microsoft</span>
                <span className="sso-pill active" title="Active native Supabase OAuth">Facebook</span>
                <span className="sso-pill active" title="Active native Supabase OAuth">Twitter/X</span>
                <span className="sso-pill active" title="Active CommunityHub OTP">WhatsApp</span>
                <button
                  type="button"
                  className="sso-pill info"
                  onClick={() => showProviderNote("Yahoo", "Requires custom OpenID Connect / SAML Enterprise Identity connector on Supabase Auth.")}
                  title="Click for Yahoo integration details"
                >
                  Yahoo ℹ️
                </button>
                <button
                  type="button"
                  className="sso-pill info"
                  onClick={() => showProviderNote("Instagram", "Meta deprecated standalone Instagram login; please use Facebook Login for business accounts.")}
                  title="Click for Instagram integration details"
                >
                  Instagram ℹ️
                </button>
              </div>
            </div>

            {mode && (
              <div className="otp-box">
                <div className="otp-title">
                  {otpIntent === "login" ? "Log in with " : "Sign up with "}
                  {mode === "email" && "Email OTP"}
                  {mode === "phone" && "Phone OTP"}
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
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }

        .icon-btn {
          background: #f1f5f9 !important;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 46px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          transition: all 0.2s ease;
          margin-top: 0 !important;
          padding: 0 !important;
          cursor: pointer;
        }

        .icon-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.1);
          border-color: #94a3b8;
          background: #ffffff !important;
        }

        .icon-btn img {
          width: 22px;
          height: 22px;
          object-fit: contain;
        }

        .sso-directory-bar {
          margin-top: 16px;
          padding: 10px 12px;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          font-size: 0.75rem;
        }

        .sso-directory-label {
          font-weight: 700;
          color: #475569;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-size: 0.68rem;
        }

        .sso-pill-group {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .sso-pill {
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.72rem;
          font-weight: 600;
        }

        .sso-pill.active {
          background: #dcfce7;
          color: #166534;
        }

        .sso-pill.info {
          background: #e0f2fe !important;
          color: #0369a1 !important;
          border: 1px solid #bae6fd !important;
          cursor: pointer;
          margin-top: 0 !important;
          padding: 2px 8px !important;
          border-radius: 4px !important;
        }

        .sso-pill.info:hover {
          background: #bae6fd !important;
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
