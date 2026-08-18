import { useEffect, useState } from "react";
import { approveUser } from "../../services/adminService";

const API = import.meta.env.VITE_API_BASE_URL || "https://communityhub.sunflowerwebtek.com/api";

const PendingUsers = () => {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    try {
      const res = await fetch(`${API}/admin/pending-users`);
      const data = await res.json();
      if (!res.ok) {
        console.error("Failed to load pending users:", data.message);
        setUsers([]);
        return;
      }
      setUsers(data.users || []);
    } catch (err) {
      console.error(err);
      setUsers([]);
    }
  };

  return (
    <div>
      <h2>Pending Registrations</h2>

      {users.length === 0 && <p>No pending registrations.</p>}

      {users.map((user) => (
        <div key={user.id}>
          <p>{user.username || user.name} - {user.email || user.phone || user.whatsapp}</p>
          <button onClick={() => approveUser(user, fetchPending)}>
            Approve
          </button>
        </div>
      ))}
    </div>
  );
};

export default PendingUsers;