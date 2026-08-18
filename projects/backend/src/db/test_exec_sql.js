import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.resolve(".env") });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testSql() {
  const sql = fs.readFileSync(path.resolve("src/db/supabase_migration_rfp_features.sql"), "utf-8");
  
  // Try rpc if available
  const { data, error } = await supabase.rpc("exec_sql", { query: sql });
  if (error) {
    console.log("RPC exec_sql result:", error.message);
  } else {
    console.log("RPC exec_sql success!", data);
  }
}

testSql();
