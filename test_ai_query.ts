import { executeAiQuery } from "./src/lib/ai/fallback-engine";
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

async function test() {
  try {
    await executeAiQuery("Hello", "System", "manager");
  } catch (e: any) {
    console.log("Execution finished:", e.message);
  }
}
test();
