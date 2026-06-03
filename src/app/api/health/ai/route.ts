import { NextResponse } from "next/server";
import { OpenAI } from "openai";
import { GoogleGenAI } from "@google/genai";

export async function GET() {
  const getKeys = (envVar: string | undefined): string[] => {
    if (!envVar) return [];
    return envVar.split(",").map((k) => k.trim()).filter((k) => k.length > 0);
  };

  const grokKeys = getKeys(process.env.GROK_API_KEYS);
  const geminiKeys = getKeys(process.env.GEMINI_API_KEYS);
  const openRouterKeys = getKeys(process.env.OPENROUTER_API_KEYS);

  const grokModel = process.env.GROK_MODEL || "";
  const geminiModel = process.env.GEMINI_MODEL || "";
  const openRouterModel = process.env.OPENROUTER_MODEL || "";

  const results: any = {
    grok: { status: "Not Configured", model: grokModel, available: false, lastChecked: new Date().toISOString() },
    gemini: { status: "Not Configured", model: geminiModel, available: false, lastChecked: new Date().toISOString() },
    openrouter: { status: "Not Configured", model: openRouterModel, available: false, lastChecked: new Date().toISOString() }
  };

  // 1. Check Grok
  if (grokKeys.length > 0 && grokModel) {
    try {
      const grok = new OpenAI({ apiKey: grokKeys[0], baseURL: "https://api.x.ai/v1" });
      await grok.models.retrieve(grokModel);
      results.grok.status = "Online";
      results.grok.available = true;
    } catch (e: any) {
      if (e.status === 429) results.grok.status = "Rate Limited";
      else if (e.status === 400 || e.status === 404) results.grok.status = "Model Unavailable";
      else if (e.status === 401 || e.status === 403) results.grok.status = "Invalid API Key";
      else results.grok.status = `Error: ${e.message}`;
    }
  }

  // 2. Check Gemini
  if (geminiKeys.length > 0 && geminiModel) {
    try {
      const gemini = new GoogleGenAI({ apiKey: geminiKeys[0] });
      await gemini.models.get({ model: geminiModel });
      results.gemini.status = "Online";
      results.gemini.available = true;
    } catch (e: any) {
      const errStr = e.message || String(e);
      if (errStr.includes("429") || errStr.includes("RESOURCE_EXHAUSTED")) results.gemini.status = "Rate Limited";
      else if (errStr.includes("403") || errStr.includes("API_KEY_INVALID")) results.gemini.status = "Invalid API Key";
      else if (errStr.includes("404") || errStr.includes("NOT_FOUND")) results.gemini.status = "Model Unavailable";
      else results.gemini.status = `Error: ${errStr.substring(0, 50)}...`;
    }
  }

  // 3. Check OpenRouter
  if (openRouterKeys.length > 0 && openRouterModel) {
    try {
      // OpenRouter models endpoint logic requires a simple chat completion or fetching https://openrouter.ai/api/v1/models
      const or = new OpenAI({ apiKey: openRouterKeys[0], baseURL: "https://openrouter.ai/api/v1" });
      
      // OpenRouter can be picky with `models.retrieve`, so we do a quick minimal chat completion
      await or.chat.completions.create({
        model: openRouterModel,
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 1
      });
      results.openrouter.status = "Online";
      results.openrouter.available = true;
    } catch (e: any) {
      if (e.status === 429) results.openrouter.status = "Rate Limited";
      else if (e.status === 404) results.openrouter.status = "Model Unavailable";
      else if (e.status === 401 || e.status === 403) results.openrouter.status = "Invalid API Key";
      else results.openrouter.status = `Error: ${e.message}`;
    }
  }

  return NextResponse.json(results);
}
