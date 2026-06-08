import { useState } from "react";
import { registerUser } from "../../services/authService";

const RegisterForm = () => {
  const [formData, setFormData] = useState({
    username: "",
    name: "",
    email: "",
    phone: "",
    companyName: "",
    category: "",
    companyAddress: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const validateUsername = (username) => {
    const regex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{7,15}$/;
    return regex.test(username);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Mandatory check
    for (let key in formData) {
      if (!formData[key].trim()) {
        setError("All fields are mandatory");
        return;
      }
    }

    if (!validateUsername(formData.username)) {
      setError(
        "Username must be 7-15 chars with uppercase, lowercase, number & special character"
      );
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const { confirmPassword, ...dataToSend } = formData;

    try {
      await registerUser(dataToSend);
      alert("Registered successfully");
    } catch (err) {
      setError("Registration failed");
    }

    // reset
    setFormData({
      username: "",
      name: "",
      email: "",
      phone: "",
      companyName: "",
      category: "",
      companyAddress: "",
      password: "",
      confirmPassword: "",
    });
  };

  return (
    <div style={styles.page}>
      <form style={styles.card} onSubmit={handleSubmit}>
        <h2 style={styles.heading}>User Registration</h2>

        {error && <p style={styles.error}>{error}</p>}

        <input
          name="username"
          placeholder="Username"
          value={formData.username}
          onChange={handleChange}
          style={styles.input}
          required
        />

        <input
          name="name"
          placeholder="Full Name"
          value={formData.name}
          onChange={handleChange}
          style={styles.input}
          required
        />

        <input
          name="email"
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          style={styles.input}
          required
        />

        <input
          name="phone"
          placeholder="Phone Number"
          value={formData.phone}
          onChange={handleChange}
          style={styles.input}
          required
        />

        <input
          name="companyName"
          placeholder="Company Name"
          value={formData.companyName}
          onChange={handleChange}
          style={styles.input}
          required
        />

        <select
          name="category"
          value={formData.category}
          onChange={handleChange}
          style={styles.input}
          required
        >
          <option value="">Select Category</option>
          <option value="IT">IT</option>
          <option value="Non-IT">Non-IT</option>
        </select>

        <textarea
          name="companyAddress"
          placeholder="Company Address"
          value={formData.companyAddress}
          onChange={handleChange}
          style={styles.textarea}
          required
        />

        <input
          name="password"
          type="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          style={styles.input}
          required
        />

        <input
          name="confirmPassword"
          type="password"
          placeholder="Confirm Password"
          value={formData.confirmPassword}
          onChange={handleChange}
          style={styles.input}
          required
        />

        <button type="submit" style={styles.button}>
          Register
        </button>
      </form>
    </div>
  );
};

const styles = {
  page: {
    minHeight: "100vh",
    background: "transparent",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px 0px 0px 0px",
  },

  card: {
    background: "#ffffff",
    padding: "10px",
    width: "150%",
    borderRadius: "18px",
    boxShadow: "0 15px 40px rgba(0,0,0,0.06)",
    display: "flex",
    flexDirection: "column",
  },

  heading: {
    marginBottom: "10px",
    background: "linear-gradient(135deg, #0f766e, #16a34a)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    textAlign: "center",
  },

  input: {
    width: "100%",
    padding: "12px 14px",
    marginBottom: "14px",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    fontSize: "14px",
  },

  textarea: {
    width: "100%",
    padding: "12px 14px",
    height: "70px",
    marginBottom: "14px",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    fontSize: "14px",
    resize: "none",
  },

  button: {
    width: "100%",
    padding: "14px",
    marginTop: "10px",
    background: "linear-gradient(135deg, #0f766e, #16a34a)",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },

  error: {
    color: "red",
    fontSize: "13px",
    marginBottom: "12px",
    textAlign: "center",
  },
};

export default RegisterForm;