import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { loginUser } from "../../services/authService";
import supabase from "../../config/supabaseClient";

const LoginForm = () => {
  const navigate = useNavigate();

  const [mode, setMode] = useState(null);
  const [step, setStep] = useState("enter");

  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [tempToken, setTempToken] = useState("");

  const API = "http://localhost:5000/api";

  /* ✅ FIX: ADMIN APPROVAL REMOVED */
  useEffect(() => {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {

    // ✅ login ayithe dashboard
    if (session?.user) {
      navigate("/dashboard");
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
      redirectTo: `${window.location.origin}/dashboard`,
    },
  });

  if (error) alert(error.message);
};

  /* APPLE */
  const loginWithApple = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
    });
    if (error) alert(error.message);
  };

  /* OTP FLOW */
  const sendOtp = async () => {
    if (!mode) return alert("Select login method");
    if (!identifier.trim()) return alert("Enter Email / Phone / WhatsApp number");

    const res = await fetch(`${API}/auth/send-otp`, {
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

    const res = await fetch(`${API}/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel: mode, identifier, otp }),
    });

    const data = await res.json();
    if (!res.ok) return alert(data.message || "OTP verification failed");

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

    alert("Account created successfully"); // ✅ FIXED TEXT

    setMode(null);
    setStep("enter");
    setIdentifier("");
    setOtp("");
    setNewPassword("");
    setTempToken("");
  };

  const cancelOtpFlow = () => {
    setMode(null);
    setStep("enter");
    setIdentifier("");
    setOtp("");
    setNewPassword("");
    setTempToken("");
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

              <button type="button" className="icon-btn" onClick={() => { setMode("whatsapp"); }}>
                <img src="https://cdn-icons-png.flaticon.com/512/733/733585.png" alt="whatsapp"/>
              </button>

              <button type="button" className="icon-btn" onClick={loginWithApple}>
                <img src="https://cdn-icons-png.flaticon.com/512/0/747.png" alt="apple"/>
              </button>
            </div>

            {mode && (
              <div className="otp-box">
                <div className="otp-title">
                  {mode === "email" && "Email OTP Login"}
                  {mode === "phone" && "Phone OTP Login"}
                  {mode === "whatsapp" && "WhatsApp OTP Login"}
                </div>

                {step === "enter" && (
                  <div className="otp-form-col">
                    <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="Enter value"/>
                    <button type="button" onClick={sendOtp}>Send OTP</button>
                  </div>
                )}

                {step === "otp" && (
                  <div className="otp-form-col">
                    <input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter OTP"/>
                    <button type="button" onClick={verifyOtp}>Verify OTP</button>
                  </div>
                )}

                {step === "password" && (
                  <div className="otp-form-col">
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Set Password"/>
                    <button type="button" onClick={completeSignup}>Create Account</button>
                  </div>
                )}

                <button type="button" className="otp-cancel" onClick={cancelOtpFlow}>Cancel</button>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* ✅ YOUR ORIGINAL CSS */}
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
