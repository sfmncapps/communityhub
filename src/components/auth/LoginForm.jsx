import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { loginUser } from "../../services/authService";
import supabase from "../../config/supabaseClient";

const LoginForm = () => {
  const navigate = useNavigate();

  /* =========================
     NEW OTP FLOW STATES
  ========================== */
  const [mode, setMode] = useState(null); // email | phone | whatsapp
  const [step, setStep] = useState("enter"); // enter | otp | password

  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [tempToken, setTempToken] = useState("");

  const API = "http://localhost:5000/api";

  /* =========================
     GOOGLE / APPLE SESSION CHECK
  ========================== */
  useEffect(() => {
  const { data: listener } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (!session?.user) return;

      const email = session.user.email;
      const supaUserId = session.user.id; // important for Apple

      /* 1️⃣ Check users_active */
      const { data: activeUser } = await supabase
        .from("users_active")
        .select("*")
        .eq("email", email)
        .single();

      if (activeUser) {
        navigate("/dashboard");
        return;
      }

      /* 2️⃣ Check users_pending */
      const { data: pendingUser } = await supabase
        .from("users_pending")
        .select("*")
        .eq("email", email)
        .single();

      if (pendingUser) {
        alert("Waiting for admin approval.");
        return;
      }

      /* 3️⃣ If not found anywhere → Insert into users_pending */
      await supabase.from("users_pending").insert([
        {
          email,
          approved: false,
          login_method: event === "SIGNED_IN" ? session.user.app_metadata.provider : "google",
          oauth_provider: session.user.app_metadata.provider,
          oauth_uid: supaUserId,
        },
      ]);

      alert("Registered successfully. Waiting for admin approval.");
    }
  );

  return () => listener.subscription.unsubscribe();
}, [navigate]);

  /* =========================
     NORMAL LOGIN (username/email/phone + password)
  ========================== */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const identifier = e.target.username.value;
    const password = e.target.password.value;

    const user = await loginUser(identifier, password);
    if (user) navigate("/dashboard");
  };

  /* =========================
     GOOGLE LOGIN
  ========================== */
  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
    });
    if (error) alert(error.message);
  };

  /* =========================
     APPLE LOGIN
  ========================== */
  const loginWithApple = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
    });
    if (error) alert(error.message);
  };

  /* =========================
     SEND OTP
  ========================== */
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

  /* =========================
     VERIFY OTP
  ========================== */
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

  /* =========================
     COMPLETE SIGNUP (Insert into users_pending)
  ========================== */
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

    alert("Submitted for admin approval.");

    // reset states
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

          {/* NORMAL LOGIN */}
          <input name="username" placeholder="Username / Email / Phone" required />
          <input name="password" type="password" placeholder="Password" required />
          <button type="submit">Login</button>

          {/* ALT LOGIN */}
          <div className="alt-login">
            <div className="icon-row">
              {/* GOOGLE */}
              <button type="button" className="icon-btn" onClick={loginWithGoogle}>
                <img
                  alt="google"
                  src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg"
                />
              </button>

              {/* EMAIL */}
              <button
                type="button"
                className="icon-btn"
                onClick={() => {
                  setMode("email");
                  setStep("enter");
                  setIdentifier("");
                  setOtp("");
                  setNewPassword("");
                  setTempToken("");
                }}
              >
                <img alt="email" src="https://cdn-icons-png.flaticon.com/512/561/561127.png" />
              </button>

              {/* PHONE */}
              <button
                type="button"
                className="icon-btn"
                onClick={() => {
                  setMode("phone");
                  setStep("enter");
                  setIdentifier("");
                  setOtp("");
                  setNewPassword("");
                  setTempToken("");
                }}
              >
                <img alt="phone" src="https://cdn-icons-png.flaticon.com/512/724/724664.png" />
              </button>

              {/* WHATSAPP */}
              <button
                type="button"
                className="icon-btn"
                onClick={() => {
                  setMode("whatsapp");
                  setStep("enter");
                  setIdentifier("");
                  setOtp("");
                  setNewPassword("");
                  setTempToken("");
                }}
              >
                <img
                  alt="whatsapp"
                  src="https://cdn-icons-png.flaticon.com/512/733/733585.png"
                />
              </button>

              {/* APPLE */}
              <button type="button" className="icon-btn" onClick={loginWithApple}>
                <img alt="apple" src="https://cdn-icons-png.flaticon.com/512/0/747.png" />
              </button>
            </div>

            {/* OTP FLOW UI (below icons) */}
            {mode && (
              <div className="otp-box">
                <div className="otp-title">
                  {mode === "email" && "Email OTP Login"}
                  {mode === "phone" && "Phone OTP Login"}
                  {mode === "whatsapp" && "WhatsApp OTP Login"}
                </div>

                {step === "enter" && (
                  <div className="otp-form-col">
                    <input
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder={
                        mode === "email"
                          ? "Enter your email"
                          : "Enter number with country code (ex: +91XXXXXXXXXX)"
                      }
                      required
                    />
                    <button type="button" onClick={sendOtp}>
                      Send OTP
                    </button>
                  </div>
                )}

                {step === "otp" && (
                  <div className="otp-form-col">
                    <input
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="Enter OTP"
                      required
                    />
                    <button type="button" onClick={verifyOtp}>
                      Verify OTP
                    </button>
                  </div>
                )}

                {step === "password" && (
                  <div className="otp-form-col">
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Set Password"
                      required
                    />
                    <button type="button" onClick={completeSignup}>
                      Submit for Approval
                    </button>
                  </div>
                )}

                <button type="button" className="otp-cancel" onClick={cancelOtpFlow}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* ✅ CSS INCLUDED */}
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

        /* OTP BOX */
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

        .otp-form-col input {
          margin-bottom: 0;
        }

        .otp-cancel {
          margin-top: 10px !important;
          background: #e2e8f0 !important;
          color: #0f172a !important;
        }

        @media (max-width: 520px) {
          .login-form {
            padding: 18px 16px 22px 16px;
          }
          .icon-row {
            gap: 8px;
          }
        }
      `}</style>
    </>
  );
};

export default LoginForm;