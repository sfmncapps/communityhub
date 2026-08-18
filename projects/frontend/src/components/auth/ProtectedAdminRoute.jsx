import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import supabase from "../../config/supabaseClient";

export default function ProtectedAdminRoute() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const run = async () => {
      setLoading(true);

      const { data: sess } = await supabase.auth.getSession();
      const user = sess?.session?.user;

      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      // role check from profiles table
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error(error);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(data?.role === "admin");
      setLoading(false);
    };

    run();
  }, []);

  if (loading) return <div style={{ padding: 20 }}>Checking admin access...</div>;

  if (!isAdmin) return <Navigate to="/admin-login" replace />;

  return <Outlet />;
}
