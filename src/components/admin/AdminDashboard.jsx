import { useEffect, useState } from "react";
import { approveUser } from "../../services/adminService";
import supabase from "../../config/supabaseClient";

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);

  const fetchPending = async () => {
    const { data } = await supabase
      .from("users_pending")
      .select("*")
      .eq("approved", false);

    setUsers(data || []);
  };

  useEffect(() => {
    fetchPending();
  }, []);

  return (
    <div>
      <h2>Pending Registrations</h2>
      {users.length === 0 && <p>No pending users</p>}
      {users.map((user) => (
        <div key={user.id}>
          <p>{user.username} - {user.email}</p>
          <button
            onClick={async () => {
              await approveUser(user);
              fetchPending(); // refresh list
            }}
          >
            Approve
          </button>
        </div>
      ))}
    </div>
  );
};

export default AdminDashboard;
