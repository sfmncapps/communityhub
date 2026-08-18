import dotenv from "dotenv";
import path from "path";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.resolve(".env") });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  console.log("Checking Supabase connection...");
  const tables = ["users_active", "collectives", "collective_members", "conversations", "conversation_participants", "messages"];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select("*").limit(1);
    if (error) {
      console.log(`Table '${table}' query status:`, error.message);
    } else {
      console.log(`Table '${table}' exists. Count sample:`, data?.length);
    }
  }
}

check();
