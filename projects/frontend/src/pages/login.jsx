import { useState } from "react";
import LoginForm from "../components/auth/LoginForm";
import RegisterForm from "../components/auth/RegisterForm";

const LoginPage = () => {
  const [showRegister, setShowRegister] = useState(false);

  return (
    <>
      <div className="auth-wrapper">
        <div className="auth-container">

          {/* LEFT SIDE DESIGN PANEL */}
          <div className="auth-left">
            <div className="auth-left-content">
              <h1>Welcome to Community Hub</h1>
              <p>
                A secure and trusted platform where verified members connect, explore opportunities, and grow together.
              </p>
            </div>
          </div>

          {/* RIGHT SIDE FORM */}
          <div className="auth-right">
            <div className="auth-card">
              {showRegister ? <RegisterForm /> : <LoginForm />}

              <p className="auth-toggle-text">
                {showRegister
                  ? "Already have an account?"
                  : "Don’t have an account?"}
                <span onClick={() => setShowRegister(!showRegister)}>
                  {showRegister ? " Login" : " Register"}
                </span>
              </p>
            </div>
          </div>

        </div>
      </div>

      <style>{`

*{
  box-sizing:border-box;
}

body{
  margin:0;
  font-family: 'Poppins', sans-serif;
}

/* FULL PAGE BACKGROUND */
.auth-wrapper{
  min-height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  margin: 20px 0px 20px 0px;
}

/* MAIN CONTAINER */
.auth-container{
  width:100%;
  max-width:1050px;
  display:grid;
  grid-template-columns:1fr 1fr;
  border-radius:35px;
  overflow:hidden;
  box-shadow:0 40px 100px rgba(0,0,0,0.4);
  animation:fadeIn .8s ease;
}

/* LEFT SIDE */
.auth-left{
  background:linear-gradient(135deg, #0f766e, #16a34a);
  color:white;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:80px 60px;
  position:relative;
}

.auth-left::after{
  content:"";
  position:absolute;
  width:420px;
  height:420px;
  background:rgba(255,255,255,0.08);
  border-radius:50%;
  top:-120px;
  right:-120px;
}

.auth-left-content{
  max-width:400px;
  z-index:2;
}

.auth-left-content h1{
  font-size:2.8rem;
  margin-bottom:20px;
  font-weight:600;
}

.auth-left-content p{
  font-size:1rem;
  line-height:1.8;
  opacity:0.9;
}

/* RIGHT SIDE */
.auth-right{

  display:flex;
  align-items:center;
  justify-content:center;
  padding:40px 30px 30px 30px;
  position:relative;
}

/* Top Curved Welcome Tag Effect */
.auth-right::before{
  content:"Welcome back";
  position:absolute;
  top:0;
  left:0;
  background:linear-gradient(135deg, #0f766e, #16a34a);
  color:white;
  padding:12px 30px;
  border-bottom-right-radius:30px;
  font-size:14px;
  font-weight:500;
}

/* FORM CARD */
.auth-card{
  width:100%;
  max-width:380px;
  animation:slideUp .6s ease;
}

/* TOGGLE TEXT */
.auth-toggle-text{
  font-size:14px;
  text-align:center;
  color:#555;
}

.auth-toggle-text span{
  margin-left:6px;
  color:#6d28d9;
  font-weight:600;
  cursor:pointer;
  transition:.3s;
}

.auth-toggle-text span:hover{
  color:#4c1d95;
  text-decoration:underline;
}

/* ANIMATIONS */
@keyframes fadeIn{
  from{opacity:0; transform:scale(.95);}
  to{opacity:1; transform:scale(1);}
}

@keyframes slideUp{
  from{opacity:0; transform:translateY(20px);}
  to{opacity:1; transform:translateY(0);}
}

/* RESPONSIVE */
@media(max-width:900px){
  .auth-container{
    grid-template-columns:1fr;
    border-radius:25px;
  }

  .auth-left{
    display:none;
  }

  .auth-right{
    padding:50px 30px;
  }
}

`}</style>

    </>
  );
};

export default LoginPage;
