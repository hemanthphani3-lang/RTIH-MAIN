import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Poor man's dotenv
const envStr = fs.readFileSync(".env.local", "utf-8");
const env: Record<string, string> = {};
for (const line of envStr.split("\n")) {
  if (line.includes("=")) {
    const [k, ...v] = line.split("=");
    env[k.trim()] = v.join("=").trim().replace(/['"]/g, '');
  }
}

const supabaseUrl = env["NEXT_PUBLIC_SUPABASE_URL"];
const supabaseKey = env["SUPABASE_SERVICE_ROLE_KEY"];

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.rpc('exec_sql', { sql: 'ALTER TABLE stage_certification_requests ADD COLUMN IF NOT EXISTS verification_method VARCHAR(50);' });
  console.log(data, error);
}
run();
