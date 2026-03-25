import { useState } from "react";
import LoginForm from "../components/auth/LoginForm";
import RegisterForm from "../components/auth/RegisterForm";

const LoginPage = () => {
  const [showRegister, setShowRegister] = useState(false);

  return (
    <>
      {/* CSS HERE */}
      <style>{`
        div {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          background: #f5f6fa;
        }

        div > form {
          display: flex;
          flex-direction: column;
          gap: 15px;
          width: 300px;
        }

        div > form input {
          padding: 12px;
          border: 1px solid #000;
          border-radius: 4px;
        }

        div > form button {
          padding: 12px;
          background: #000;
          color: #fff;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        div > p {
          margin-top: 15px;
          font-size: 14px;
        }

        div > p span {
          color: red;
          cursor: pointer;
          text-decoration: underline;
        }
      `}</style>

      {/* HTML HERE */}
      <div>
        {showRegister ? <RegisterForm /> : <LoginForm />}

        <p>
          {showRegister
            ? "Already have an account?"
            : "Don’t have an account?"}
          <span onClick={() => setShowRegister(!showRegister)}>
            {showRegister ? " Login" : " Register"}
          </span>
        </p>
      </div>
    </>
  );
};

export default LoginPage;
