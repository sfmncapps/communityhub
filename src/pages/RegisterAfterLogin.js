import supabase from "../config/supabaseClient";

export const registerIfNew = async () => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return;

  // Check if already exists
  const { data } = await supabase
    .from("users_pending")
    .select("*")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (!data) {
    await supabase.from("users_pending").insert({
      auth_id: user.id,
      email: user.email,
      name: user.user_metadata.full_name || "",
      status: "pending"
    });
  }
};
