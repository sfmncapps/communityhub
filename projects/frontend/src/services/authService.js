import supabase from "../config/supabaseClient";

const API = import.meta.env.VITE_API_BASE_URL || "https://communityhub.sunflowerwebtek.com/api";

/* ================= SESSION MANAGEMENT ================= */
export const setAuthSession = (token, user) => {
  if (token) localStorage.setItem("token", token);
  if (user) localStorage.setItem("user", JSON.stringify(user));
  window.dispatchEvent(new Event("auth-changed"));
  window.dispatchEvent(new Event("profile-updated"));
};

export const clearAuthSession = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.dispatchEvent(new Event("auth-changed"));
  window.dispatchEvent(new Event("profile-updated"));
};

export const getStoredUser = () => {
  const token = localStorage.getItem("token");
  if (!token) return null;
  const userStr = localStorage.getItem("user");
  try {
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
};

export const getAuthToken = () => {
  return localStorage.getItem("token") || null;
};

/* ================= REGISTER ================= */
export const registerUser = async (formData) => {
  try {
    const res = await fetch(`${API}/auth/register`, {
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

    // success message
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
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Login failed");
      return null;
    }

    // Store token and user atomically
    setAuthSession(data.token, data.user);

    return data.user;
  } catch (err) {
    console.error("Login error:", err);
    alert("Backend not running / API error");
    return null;
  }
};

export const getAuthProvidersService = async () => {
  try {
    const res = await fetch(`${API}/auth/providers`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("Fetch providers error:", err);
    return null;
  }
};




