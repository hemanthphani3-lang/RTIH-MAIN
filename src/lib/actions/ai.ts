"use server";

import { supabaseAdmin } from "@/lib/supabase/server";

// ==========================================
// MOCK LLM ENGINE (Placeholder for Gemini/Grok/OpenRouter)
// ==========================================
async function callLLMEngine(prompt: string, context: any, role: string, language: string) {
  // TODO: Replace this block with your actual AI SDK logic using standard fetch or @ai-sdk
  // Example future logic:
  // if (primary === "gemini") { return await fetchGemini(prompt, context) }
  // else if (fallback === "grok") { return await fetchGrok(prompt, context) }
  
  console.log(`[AI Engine] Executing query as ${role} in ${language}. Context keys:`, Object.keys(context));
  
  // Dummy Responses based on Role for UI testing
  await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate API latency

  if (role === "Organization") {
    if (prompt.toLowerCase().includes("health")) {
      return "Based on my analysis of your data, your health score is currently 65. You missed 2 milestones this month. I recommend focusing on your 'MVP Launch' action item to improve your score.";
    }
    if (prompt.toLowerCase().includes("skill") || prompt.toLowerCase().includes("gap")) {
      return "I noticed your domain is EV Technology but you lack hardware validation milestones. You should prioritize adding technical advisors to your team.";
    }
    return "As your AI Copilot, I'm analyzing your roadmap and milestones. You are currently on track, but ensure you complete your pending KYC verification soon.";
  }

  if (role === "Mentor") {
    return "I've scanned your assigned startups. 'EcoTech' currently has a High Risk flag due to zero engagement in the last 14 days. I recommend scheduling an emergency check-in.";
  }

  if (role === "Manager") {
    if (prompt.toLowerCase().includes("high-risk") || prompt.toLowerCase().includes("attention")) {
      return "Based on my risk analysis, there are 2 startups in your Hub currently marked as High-Risk due to lack of progress logs: 'EcoTech' and 'AgriSmart'. I recommend immediate intervention.";
    }
    return "Your domain currently has 45 active startups. The average health score is 72. I recommend launching a new funding opportunity to boost engagement.";
  }

  if (role === "Admin") {
    if (prompt.toLowerCase().includes("domain") && prompt.toLowerCase().includes("fastest")) {
      return "Based on the latest Ecosystem Metrics, the 'MedTech' domain is growing the fastest, with a 15% increase in active startups this quarter. 'AgriTech' is closely following.";
    }
    return "Ecosystem Intelligence: Over the last 30 days, we've seen a 20% drop-off in the EdTech domain at the MVP stage. Hackathon participation is up 40%.";
  }

  return "I understand your query, but I need more context to provide a specific answer.";
}


// ==========================================
// CORE AI COPILOT QUERY
// ==========================================
export async function queryCopilot(query: string, role: string, language: string = "en") {
  try {
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    let context = {};

    // 1. Role-Based Context Retrieval Layer
    if (role === "Organization") {
      const { data: org } = await supabaseAdmin.from("organizations").select("id, name, stage, domain_id, health_score").eq("founder_id", user.id).single();
      if (org) {
        const [milestones, actionItems, feedback] = await Promise.all([
          supabaseAdmin.from("milestones").select("title, status").eq("organization_id", org.id).limit(5),
          supabaseAdmin.from("action_items").select("title, status").eq("organization_id", org.id).limit(5),
          supabaseAdmin.from("mentor_feedback").select("feedback").eq("organization_id", org.id).limit(3)
        ]);
        context = { org, milestones: milestones.data, actionItems: actionItems.data, feedback: feedback.data };
      }
    } 
    else if (role === "Mentor") {
      const { data: assignments } = await supabaseAdmin.from("mentor_assignments").select("organizations(name, health_score, stage)").eq("mentor_id", user.id);
      context = { assignedStartups: assignments };
    }
    else if (role === "Manager") {
      const { data: stats } = await supabaseAdmin.from("organizations").select("stage, health_score");
      context = { portfolioStats: stats };
    }
    else if (role === "Admin") {
      context = { ecosystem: "Admin scope enabled. Full aggregate access available." };
    }

    // 2. Call the AI Engine
    const aiResponse = await callLLMEngine(query, context, role, language);

    // 3. Log the Interaction
    await supabaseAdmin.from("ai_query_logs").insert({
      user_id: user.id,
      role,
      query,
      response: aiResponse,
      language
    });

    return { success: true, response: aiResponse };

  } catch (err: any) {
    console.error("AI Copilot Error:", err);
    return { success: false, error: err.message };
  }
}

// ==========================================
// AUTOMATED BACKGROUND ANALYSIS TRIGGERS
// ==========================================

export async function generateStartupSkillGaps(organizationId: string) {
  // Placeholder: In production, this would be a cron job or webhook that feeds startup data to the LLM
  // and parses the JSON response to insert into ai_skill_gap_analysis
  try {
    const mockGaps = [
      { skill: "Financial Modeling", category: "Business", priority: "High" },
      { skill: "Cloud Architecture", category: "Technical", priority: "Medium" }
    ];

    for (const gap of mockGaps) {
      await supabaseAdmin.from("ai_skill_gap_analysis").insert({
        organization_id: organizationId,
        skill: gap.skill,
        category: gap.category,
        priority: gap.priority
      });
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getSkillGaps(organizationId: string) {
  try {
    const { data, error } = await supabaseAdmin.from("ai_skill_gap_analysis").select("*").eq("organization_id", organizationId).order("priority", { ascending: false });
    if (error) throw new Error(error.message);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getRiskInsights() {
  // Meant for Mentors/Managers
  try {
    const { data, error } = await supabaseAdmin.from("ai_risk_insights").select("*, organizations(name)").eq("is_resolved", false).order("severity", { ascending: false });
    if (error) throw new Error(error.message);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
