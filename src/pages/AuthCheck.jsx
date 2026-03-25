import { useEffect } from "react";
import supabase from "../config/supabaseClient";
import { useNavigate } from "react-router-dom";

const AuthCheck = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      // Check if approved
      const { data } = await supabase
        .from("users_active")
        .select("*")
        .eq("auth_id", user.id)
        .maybeSingle();

      if (data) {
        navigate("/dashboard");
      } else {
        alert("Waiting for admin approval");
        await supabase.auth.signOut();
      }
    };

    checkUser();
  }, []);

  return null;
};

export default AuthCheck;
