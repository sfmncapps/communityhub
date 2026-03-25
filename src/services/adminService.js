import supabase from "../config/supabaseClient";
import { sendApprovalNotification } from "./notificationService"; // ✅ add this

export const approveUser = async (user, refresh) => {
  // 1) insert active
  const { error } = await supabase.from("users_active").insert([
    {
      username: user.username || null,
      name: user.name || null,
      email: user.email || null,
      phone: user.phone || null,
      whatsapp: user.whatsapp || null, // ✅ if whatsapp column exists
      company_name: user.company_name || null,
      category: user.category || null,
      company_address: user.company_address || null,
      password: user.password || null,
      login_method: user.login_method || null,
      oauth_provider: user.oauth_provider || null,
      oauth_uid: user.oauth_uid || null,
    },
  ]);

  if (error) {
    alert("Insert failed: " + error.message);
    return;
  }

  // 2) mark approved
  await supabase.from("users_pending").update({ approved: true }).eq("id", user.id);

  // 3) ✅ send message/email/whatsapp from backend
  await sendApprovalNotification(user);

  alert("User approved successfully!");
  if (refresh) refresh();
};