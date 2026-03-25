import supabase from "../config/supabaseClient";
import bcrypt from "bcryptjs";

/* ================= REGISTER ================= */
/* ================= REGISTER ================= */
export const registerUser = async (formData) => {
  try {
    const res = await fetch("http://localhost:5000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: formData.username,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        company_name: formData.companyName,
        category: formData.category,
        company_address: formData.companyAddress,
        password: formData.password,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Registration failed");
      return null;
    }

    // ✅ success message
    alert("Registration submitted. Waiting for admin approval.");

    return data;

  } catch (err) {
    console.error("Register error:", err);
    alert("Server error during registration");
    return null;
  }
};
export const loginUser = async (identifier, password) => {
  try {
    const res = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Login failed");
      return null;
    }

    // optional: store token
    if (data.token) localStorage.setItem("token", data.token);

    return data.user;
  } catch (err) {
    console.error("Login error:", err);
    alert("Backend not running / API error");
    return null;
  }
};



