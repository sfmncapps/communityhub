import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import supabase from "../../config/supabaseClient";

export default function ProtectedUserRoute() {
  const [checking, setChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        if (mounted) {
          setIsAuthenticated(true);
          setChecking(false);
        }
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (mounted) {
        setIsAuthenticated(Boolean(session?.user));
        setChecking(false);
      }
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setIsAuthenticated(Boolean(session?.user || localStorage.getItem("token")));
      setChecking(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (checking) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}
