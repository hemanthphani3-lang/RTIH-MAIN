"use server"

import { executeAiQuery } from "../ai/fallback-engine";
import { getOrganizationContext, getMentorContext, getManagerContext, getAdminContext } from "../ai/context-builder";
import { executeTool } from "../ai/tool-executor";
import { supabaseAdmin } from "../supabase/server";

export async function askCopilot(prompt: string, role: string, entityId?: string, currentModule?: string, history?: any[]) {
  try {
    console.log(`[Copilot] Request received for role: ${role}, Module: ${currentModule || 'dashboard'}, User: ${entityId}`);

    // ---------------------------------------------------------
    // STEP 1: FAST HEURISTIC INTENT DETECTION (Zero Latency)
    // ---------------------------------------------------------
    let intentJSON = { intent: "general_query", params: {} as any };
    let usedLLMForIntent = false;

    const lowerPrompt = prompt.toLowerCase();
    if (lowerPrompt.includes("what should i do") || lowerPrompt.includes("next action") || lowerPrompt.includes("pending")) {
      intentJSON.intent = "WHAT_SHOULD_I_DO_NEXT";
    } else if (lowerPrompt.includes("how many mentors") || lowerPrompt.includes("count mentors")) {
      intentJSON.intent = "count_mentors";
    } else if (lowerPrompt.includes("list mentors") || lowerPrompt.includes("who are the mentors") || lowerPrompt.includes("all mentors")) {
      intentJSON.intent = "LIST_MENTORS";
    } else if (lowerPrompt.includes("list startups") || lowerPrompt.includes("assigned to me") || lowerPrompt.includes("my startups")) {
      intentJSON.intent = "LIST_STARTUPS";
    } else if (lowerPrompt.includes("health") || lowerPrompt.includes("risk")) {
      intentJSON.intent = "analyze_health";
    } else if (lowerPrompt.includes("ecosystem") || lowerPrompt.includes("total startups") || lowerPrompt.includes("report")) {
      intentJSON.intent = "ecosystem_report";
    } else if (lowerPrompt.length < 25 && !lowerPrompt.includes("startup") && !lowerPrompt.includes("mentor") && !lowerPrompt.includes("data")) {
      // Basic conversational queries (hi, thanks, who are you)
      intentJSON.intent = "general_query";
    } else {
      // Fallback to LLM for complex extraction
      usedLLMForIntent = true;
      const intentPrompt = `You are a strict JSON intent analyzer.
Extract the user's intent and parameters based on this prompt: "${prompt}".
Possible intents: "count_mentors", "search_startups", "analyze_health", "ecosystem_report", "general_query", "LIST_MENTORS", "LIST_STARTUPS", "STARTUP_SUMMARY", "WHAT_SHOULD_I_DO_NEXT".
Current Role: ${role}
Return ONLY a raw JSON object (no markdown formatting).
Format: { "intent": "string", "params": { "target": "string" } }`;

      try {
        const rawIntent = await executeAiQuery(intentPrompt, "You output raw JSON only.", 'organization', history);
        const cleanedIntent = rawIntent.replace(/```json/g, '').replace(/```/g, '').trim();
        intentJSON = JSON.parse(cleanedIntent);
      } catch (e) {
        console.warn("[Copilot] Intent detection failed, falling back to general query.", e);
      }
    }
    
    if (!usedLLMForIntent) {
       console.log(`[Copilot] Fast Heuristic bypassed LLM. Intent: ${intentJSON.intent}`);
    }

    // ---------------------------------------------------------
    // STEP 2 & 3: CONDITIONAL DATABASE & CONTEXT RETRIEVAL
    // ---------------------------------------------------------
    let liveData = { success: true, data: "No live data available" };
    let contextData = "Context unavailable";

    if (intentJSON.intent === "general_query") {
      console.info(JSON.stringify({ timestamp: new Date().toISOString(), event: 'intent_classified', intent: 'general_query', action: 'bypassing_database' }));
      contextData = "You are a highly capable AI assistant for the RTIH Innovation Ecosystem. Answer general queries using your built-in knowledge. No platform data is required for this query.";
      liveData = { success: true, data: "Not applicable for general query." };
    } else {
      console.info(JSON.stringify({ timestamp: new Date().toISOString(), event: 'intent_classified', intent: intentJSON.intent, action: 'retrieving_database' }));
      
      console.info(JSON.stringify({ timestamp: new Date().toISOString(), event: 'database_retrieval_started' }));
      liveData = await executeTool(intentJSON.intent, intentJSON.params, role, entityId, currentModule);
      console.info(JSON.stringify({ timestamp: new Date().toISOString(), event: 'database_retrieval_finished', success: liveData.success }));

      console.info(JSON.stringify({ timestamp: new Date().toISOString(), event: 'context_retrieval_started', role }));
      try {
        if (role === 'organization' && entityId) {
          contextData = await getOrganizationContext(entityId);
        } else if (role === 'mentor' && entityId) {
          contextData = await getMentorContext(entityId);
        } else if (role === 'manager' && entityId) {
          contextData = await getManagerContext(entityId);
        } else if (role === 'admin') {
          contextData = await getAdminContext();
        }
        console.info(JSON.stringify({ timestamp: new Date().toISOString(), event: 'context_retrieval_success' }));
      } catch (ctxErr: any) {
        console.error(JSON.stringify({ timestamp: new Date().toISOString(), event: 'context_retrieval_failure', error: ctxErr.message }));
      }
    }

    // ---------------------------------------------------------
    // STEP 4: GENERATE FINAL RESPONSE
    // ---------------------------------------------------------
    console.log(`[Copilot] LLM call started`);
    const masterSystemPrompt = `You are the RTIH Innovation Copilot. You are a single, unified, highly intelligent Operating System Assistant integrated deeply into the RTIH platform. 
You do NOT have a fixed persona (e.g. no "Startup Advisor" or "Executive Assistant"). You adapt dynamically based on the user's intent, role, and current module.

Your current user's role is: ${role.toUpperCase()}. 
Current Module viewing: ${currentModule || 'Dashboard'}

Below is the LIVE DATA retrieved directly from the database to personalize your response:
<LIVE_DATA>
${liveData?.data || "No live data available"}
</LIVE_DATA>

<STATIC_CONTEXT>
${contextData}
</STATIC_CONTEXT>

SUPPORTED RESPONSE MODES (Determine automatically based on query intent):
1. Answer: Direct answers to questions.
2. Analysis: In-depth breakdown of metrics or progress based on LIVE_DATA.
3. Recommendation: Proactive, actionable advice on what to do next based on pending tasks or milestones.
4. Report Generation: Generate professional Markdown reports using real platform data.
5. Document Generation: Draft meeting briefs, action plans, or learning roadmaps.
6. Risk Assessment: Evaluate startup or domain health scores and flag intervention needs.
7. Data Search: Format the <LIVE_DATA> into clear Markdown lists.
8. Summary Generation: High-level summaries of portfolio or ecosystem status based entirely on actual records.

ADVISORY & STRATEGY QUERIES:
If the user asks for advice, recommendations, strategy, improvement suggestions, roadmap guidance, fundraising advice, product advice, or market advice:
- You MUST use the LIVE_DATA and STATIC_CONTEXT to personalize your answer to their exact situation (e.g. their stage, domain, or health score).
- You MUST NOT restrict your reasoning to only the database facts.
- Combine the RTIH data with your own deep domain expertise, general business intelligence, and industry best practices.
- Example: If their stage is "MVP", do not just say "You are in MVP." Instead say "You are currently in the MVP stage. I recommend focusing on customer validation, pilot deployments, and user feedback before approaching investors."

FACTUAL QUERIES (Counts, Reports, Metrics, Lists, Compliance):
If the user asks for hard platform statistics (e.g. "How many mentors are there?", "List all startups in Seed stage"):
- Restrict your answer STRICTLY to the LIVE_DATA provided.
- NEVER fabricate startups, mentors, reports, or funding data. If the <LIVE_DATA> is empty, explicitly state that the information could not be found.

CORE RULES:
- You are advisory only. Human approval remains mandatory for platform actions.
- You cannot approve startups, change status, assign mentors, or generate certificates.
- Do NOT introduce yourself with a persona. Just answer directly and professionally.
- Proactive Intelligence: Always point out pending milestones, inactive ventures, or risks if they appear in your data.
- You must maintain conversation awareness. Refer back to the history if the user uses pronouns like "they" or "them".`;

    let response = "Sorry, I couldn't generate a response.";
    try {
      response = await executeAiQuery(prompt, masterSystemPrompt, role, history);
      console.log(`[Copilot] LLM call success`);
    } catch (llmErr) {
      const requestId = Math.random().toString(36).substring(2, 10).toUpperCase();
      console.error(`[Copilot] [Request ID: ${requestId}] LLM call failure:`, llmErr);
      return { 
        success: false, 
        error: `RTIH Copilot is temporarily unavailable because all AI providers are currently unreachable or have exhausted their quotas.\n\nPlease try again later or contact an administrator.\n\nError Reference: ${requestId}`
      };
    }

    // Log Query
    try {
      await supabaseAdmin.from('ai_query_logs').insert({
        role: role,
        query: prompt,
        response: response,
        user_id: entityId
      });
    } catch (logErr) {
      console.error("[Copilot Logging Error]", logErr);
    }

    console.log(`[Copilot] Response returned successfully`);
    return { success: true, data: response };

  } catch (error: any) {
    const requestId = Math.random().toString(36).substring(2, 10).toUpperCase();
    console.error(`[Copilot Error] [Request ID: ${requestId}] Critical unhandled failure:`, error);
    return { 
      success: false, 
      error: `An unexpected system error occurred. Please try again later.\n\nError Reference: ${requestId}` 
    };
  }
}
