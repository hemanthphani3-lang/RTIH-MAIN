import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';

const geminiKeys = (process.env.GEMINI_API_KEYS || '').split(',').map(k => k.trim()).filter(Boolean);
const grokKeys = (process.env.GROK_API_KEYS || '').split(',').map(k => k.trim()).filter(Boolean);
const openRouterKeys = (process.env.OPENROUTER_API_KEYS || '').split(',').map(k => k.trim()).filter(Boolean);

const geminiModel = process.env.GEMINI_MODEL || '';
const grokModel = process.env.GROK_MODEL || '';
const openRouterModel = process.env.OPENROUTER_MODEL || '';

// Startup Validation
console.log(`[AI Config] Grok Model Loaded: ${!!grokModel} ${grokModel ? '('+grokModel+')' : ''}`);
console.log(`[AI Config] Gemini Model Loaded: ${!!geminiModel} ${geminiModel ? '('+geminiModel+')' : ''}`);
console.log(`[AI Config] OpenRouter Model Loaded: ${!!openRouterModel} ${openRouterModel ? '('+openRouterModel+')' : ''}`);

type ProviderHealth = {
  status: "unhealthy" | "healthy";
  reason?: string;
  checkedAt: number;
};

// 5-minute cache
const HEALTH_CACHE_TTL = 5 * 60 * 1000;
const healthCache: Record<string, ProviderHealth> = {};

// Round-Robin Indices
let currentGeminiIndex = 0;
let currentGrokIndex = 0;
let currentOpenRouterIndex = 0;

function logProviderError(provider: string, model: string, keyIndex: number, err: any) {
  const status = err?.status || err?.response?.status || err?.statusCode || "Unknown";
  const body = err?.response?.data ? JSON.stringify(err.response.data) : (err?.body ? JSON.stringify(err.body) : "No body");
  console.error(`\n[${provider}]\nModel: ${model}\nKey Index: ${keyIndex}\nStatus: ${status}\nError: ${err.message}\nStack: ${err.stack}\nRaw Body: ${body}\n`);
}

function isRetryableError(err: any): boolean {
  const status = err?.status || err?.response?.status || err?.statusCode;
  const message = (err?.message || "").toLowerCase();
  
  if (status === 429 || message.includes("429") || message.includes("quota") || message.includes("rate limit") || message.includes("resource_exhausted")) {
    return true; // Rate limit or Quota
  }
  if (status >= 500 || message.includes("timeout") || message.includes("network") || message.includes("fetch")) {
    return true; // Temporary server/network errors
  }
  
  // 400 (Model not found), 401 (Invalid Key), 403 (Forbidden), 404 (Missing) are permanent per key/model
  return false; 
}

function checkHealth(provider: string): void {
  const cached = healthCache[provider];
  if (cached && cached.status === "unhealthy" && (Date.now() - cached.checkedAt) < HEALTH_CACHE_TTL) {
    throw new Error(`${provider} skipped (cached unhealthy: ${cached.reason})`);
  }
}

function markUnhealthy(provider: string, reason: string): void {
  console.warn(`[AI Engine] Marking ${provider} UNHEALTHY for 5 minutes. Reason: ${reason}`);
  healthCache[provider] = { status: "unhealthy", reason, checkedAt: Date.now() };
}

function markHealthy(provider: string): void {
  healthCache[provider] = { status: "healthy", checkedAt: Date.now() };
}

export async function executeAiQuery(prompt: string, systemPrompt?: string, role?: string, history?: any[]): Promise<string> {
  const safeRole = role?.toLowerCase() || '';

  // Helper to execute Gemini
  const runGemini = async () => {
    checkHealth('Gemini');
    if (!geminiModel) {
      console.warn(`[AI Engine] Skipping Gemini: Model environment variable GEMINI_MODEL is missing or invalid.`);
      throw new Error("Gemini skipped (invalid model)");
    }
    
    let lastError: any = null;
    const startIndex = currentGeminiIndex;
    
    for (let i = 0; i < geminiKeys.length; i++) {
      const idx = (startIndex + i) % geminiKeys.length;
      try {
        console.log(`[AI Engine] Attempting Gemini using key index ${idx} for role ${safeRole}`);
        const ai = new GoogleGenAI({ apiKey: geminiKeys[idx] });
        
        let fullPrompt = prompt;
        if (history && history.length > 0) {
           const historyText = history.map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join('\n');
           fullPrompt = `Previous Conversation History:\n${historyText}\n\nCurrent Request: ${prompt}`;
        }

        const response = await ai.models.generateContent({
          model: geminiModel,
          contents: fullPrompt,
          config: { systemInstruction: systemPrompt }
        });
        
        if (response.text) {
          markHealthy('Gemini');
          currentGeminiIndex = (idx + 1) % geminiKeys.length; // Rotate for load-balancing
          return response.text;
        }
      } catch (err: any) {
        logProviderError('Gemini', geminiModel, idx, err);
        lastError = err;
        
        if (!isRetryableError(err)) {
          markUnhealthy('Gemini', err?.message || 'Permanent Error');
          throw new Error(`Gemini permanent failure: ${err?.message}`);
        }
      }
    }
    throw new Error(lastError ? `Gemini exhausted: ${lastError.message}` : "Gemini exhausted");
  };

  // Helper to execute Grok
  const runGrok = async () => {
    checkHealth('Grok');
    if (!grokModel) {
      console.warn(`[AI Engine] Skipping Grok: Model environment variable GROK_MODEL is missing or invalid.`);
      throw new Error("Grok skipped (invalid model)");
    }
    
    let lastError: any = null;
    const startIndex = currentGrokIndex;
    
    for (let i = 0; i < grokKeys.length; i++) {
      const idx = (startIndex + i) % grokKeys.length;
      try {
        console.log(`[AI Engine] Attempting Grok using key index ${idx} for role ${safeRole}`);
        const openai = new OpenAI({ apiKey: grokKeys[idx], baseURL: 'https://api.x.ai/v1' });
        const messages: any[] = [];
        if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
        if (history) {
           messages.push(...history.map(h => ({ role: h.role === 'user' ? 'user' : 'assistant', content: h.content })));
        }
        messages.push({ role: 'user', content: prompt });

        const completion = await openai.chat.completions.create({
          model: grokModel,
          messages,
        });
        if (completion.choices[0]?.message?.content) {
          markHealthy('Grok');
          currentGrokIndex = (idx + 1) % grokKeys.length; // Rotate for load-balancing
          return completion.choices[0].message.content;
        }
      } catch (err: any) {
        logProviderError('Grok', grokModel, idx, err);
        lastError = err;
        
        if (!isRetryableError(err)) {
          markUnhealthy('Grok', err?.message || 'Permanent Error');
          throw new Error(`Grok permanent failure: ${err?.message}`);
        }
      }
    }
    throw new Error(lastError ? `Grok exhausted: ${lastError.message}` : "Grok exhausted");
  };

  // Helper to execute OpenRouter
  const runOpenRouter = async () => {
    checkHealth('OpenRouter');
    if (!openRouterModel) {
      console.warn(`[AI Engine] Skipping OpenRouter: Model environment variable OPENROUTER_MODEL is missing or invalid.`);
      throw new Error("OpenRouter skipped (invalid model)");
    }
    
    let lastError: any = null;
    const startIndex = currentOpenRouterIndex;
    
    for (let i = 0; i < openRouterKeys.length; i++) {
      const idx = (startIndex + i) % openRouterKeys.length;
      try {
        console.log(`[AI Engine] Attempting OpenRouter using key index ${idx} for role ${safeRole}`);
        const openai = new OpenAI({ 
          apiKey: openRouterKeys[idx], 
          baseURL: 'https://openrouter.ai/api/v1',
          defaultHeaders: {
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "RTIH Innovation System",
          }
        });
        const messages: any[] = [];
        if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
        if (history) {
           messages.push(...history.map(h => ({ role: h.role === 'user' ? 'user' : 'assistant', content: h.content })));
        }
        messages.push({ role: 'user', content: prompt });

        const completion = await openai.chat.completions.create({
          model: openRouterModel,
          messages,
        });
        if (completion.choices[0]?.message?.content) {
          markHealthy('OpenRouter');
          currentOpenRouterIndex = (idx + 1) % openRouterKeys.length; // Rotate for load-balancing
          return completion.choices[0].message.content;
        }
      } catch (err: any) {
        logProviderError('OpenRouter', openRouterModel, idx, err);
        lastError = err;
        
        if (!isRetryableError(err)) {
          markUnhealthy('OpenRouter', err?.message || 'Permanent Error');
          throw new Error(`OpenRouter permanent failure: ${err?.message}`);
        }
      }
    }
    throw new Error(lastError ? `OpenRouter exhausted: ${lastError.message}` : "OpenRouter exhausted");
  };

  // Role-Based Routing Logic
  try {
    if (safeRole === 'organization' || safeRole === 'founder') {
       return await runGemini();
    } else if (safeRole === 'mentor' || safeRole === 'manager') {
       return await runGemini(); // Temporarily route to Gemini because Grok keys have 0 credits
    } else if (safeRole === 'admin') {
       return await runOpenRouter();
    } else {
       // Default Intent parsing or unknown role goes to Gemini as it's fast
       return await runGemini();
    }
  } catch (primaryErr: any) {
    console.warn(`[AI Engine] Primary engine for role ${safeRole} failed. Falling back...`, primaryErr.message);
    // Fallback cascade if preferred engine fails
    try { return await runGemini(); } catch {}
    try { return await runGrok(); } catch {}
    try { return await runOpenRouter(); } catch {}
    
    throw new Error("All AI providers and keys exhausted. Please check your API limits.");
  }
}
