import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

async function run() {
  const { executeAiQuery } = await import("./src/lib/ai/fallback-engine");
  try {
    await executeAiQuery("Hello", "System", "manager");
  } catch(e) {
    console.log("Finished");
  }
}
run();
