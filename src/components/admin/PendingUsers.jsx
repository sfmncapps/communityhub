import { useEffect, useState } from "react";
import supabase from "../../config/supabaseClient";
import { approveUser } from "../../services/adminService";

const PendingUsers = () => {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    const { data } = await supabase
      .from("users_pending")
      .select("*")
      .eq("approved", false);

    setUsers(data || []);
  };

  return (
    <div>
      <h2>Pending Registrations</h2>

      {users.map((user) => (
        <div key={user.id}>
          <p>{user.username} - {user.email}</p>
          <button onClick={() => approveUser(user, fetchPending)}>
  Approve
</button>
        </div>
      ))}
    </div>
  );
};

export default PendingUsers;
