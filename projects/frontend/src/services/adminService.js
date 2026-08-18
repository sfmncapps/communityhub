const API = import.meta.env.VITE_API_BASE_URL || "https://communityhub.sunflowerwebtek.com/api";

export const approveUser = async (user, refresh) => {
  try {
    const res = await fetch(`${API}/admin/approve-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id }),
    });

    const data = await res.json();
    if (!res.ok) {
      alert("Approval failed: " + (data.message || "Unknown error"));
      return;
    }

    alert("User approved successfully!");
    if (refresh) refresh();
  } catch (err) {
    alert("Approval failed: " + err.message);
  }
};