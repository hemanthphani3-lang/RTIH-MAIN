"use server";

import { supabaseAdmin } from "../supabase/server";
import { supabase } from "../supabase/client";

export async function processAIQuery(prompt: string, role: string, language: string) {
  try {
    // 1. Log the query
    await supabaseAdmin.from("ai_query_logs").insert({
      prompt,
      role,
      language,
      response: "[MOCK_RESPONSE]"
    });

    // 2. Mock AI Logic (To be replaced with Gemini/OpenRouter keys)
    const isTelugu = language === 'te';
    
    // Simulate thinking delay
    await new Promise(r => setTimeout(r, 1000));

    const lowerPrompt = prompt.toLowerCase();
    let response = "";

    if (role === 'organization') {
      if (lowerPrompt.includes("help") || lowerPrompt.includes("next")) {
        response = isTelugu 
          ? "మీ తదుపరి దశ మీ కస్టమర్ ఇంటర్వ్యూలను పూర్తి చేయడం. మీ డాష్‌బోర్డ్‌లో పెండింగ్‌లో ఉన్న చర్యలను తనిఖీ చేయండి." 
          : "Your next step is to complete your Customer Interviews. Check your pending action items on your dashboard.";
      } else if (lowerPrompt.includes("funding")) {
        response = isTelugu 
          ? "నిధుల కోసం మీరు మీ పిచ్ డెక్ మరియు ఫైనాన్షియల్ మోడల్‌ను సమర్పించాలి." 
          : "For funding, you need to complete the Funding Readiness stage by submitting your Pitch Deck and Financial Model.";
      } else {
        response = isTelugu 
          ? "నేను మీ ఇన్నోవేషన్ కోపైలట్‌ని. దయచేసి మీ వెంచర్ వృద్ధి గురించి నన్ను ఏదైనా అడగండి."
          : "I am your Innovation Copilot. Please ask me anything about your venture growth, milestones, or opportunities.";
      }
    } else if (role === 'mentor') {
      response = "As a mentor, your portfolio currently has 2 startups at High Risk. I recommend reviewing their Health Scores and assigning action items.";
    } else if (role === 'admin') {
      response = "Statewide analytics indicate a 15% drop-off at the MVP validation stage. Consider launching a Bootcamp opportunity for this cohort.";
    } else {
      response = "How can I assist you with the RTIH ecosystem today?";
    }

    return { success: true, data: response };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
