const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export const sendApprovalNotification = async (user) => {
  const res = await fetch(`${API}/admin/send-approval`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("Notification failed:", data);
  }
};