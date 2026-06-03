import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import OpenAI from "openai";

export async function GET() {
  const healthStatus = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    services: {
      database: { status: "unknown", latency: 0 },
      openai: { status: "unknown", latency: 0 },
      redis: { status: "not_implemented", latency: 0 },
      vector_store: { status: "not_implemented", latency: 0 }
    }
  };

  try {
    // 1. Check Database (Supabase Postgres)
    const dbStart = Date.now();
    const { error: dbError } = await supabaseAdmin.from("organizations").select("id").limit(1);
    healthStatus.services.database.latency = Date.now() - dbStart;
    
    if (dbError) {
      healthStatus.services.database.status = "unhealthy";
      healthStatus.status = "degraded";
    } else {
      healthStatus.services.database.status = "healthy";
    }

    // 2. Check OpenAI / Grok API
    const openaiStart = Date.now();
    const grokKeys = (process.env.GROK_API_KEYS || '').split(',').map(k => k.trim()).filter(Boolean);
    if (grokKeys.length > 0) {
       const openai = new OpenAI({ apiKey: grokKeys[0], baseURL: 'https://api.x.ai/v1' });
       // Simple ping to list models
       await openai.models.list();
       healthStatus.services.openai.latency = Date.now() - openaiStart;
       healthStatus.services.openai.status = "healthy";
    } else {
       healthStatus.services.openai.status = "unconfigured";
    }
    
  } catch (err: any) {
    console.error("[Health Check Error]", err.message);
    healthStatus.status = "unhealthy";
  }

  return NextResponse.json(healthStatus, { status: healthStatus.status === "unhealthy" ? 503 : 200 });
}
