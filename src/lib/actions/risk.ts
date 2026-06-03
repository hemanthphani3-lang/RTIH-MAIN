"use server";

import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * Scans a startup's activity and health to generate Risk Flags.
 */
export async function detectRisk(orgId: string) {
  try {
    const { data: health } = await supabaseAdmin.from("health_scores").select("*").eq("organization_id", orgId).single();
    if (!health) return { success: true, flags: [] };

    const flags = [];

    // Rule 1: Critical Health Score
    if (health.current_score < 30) {
      flags.push({
        organization_id: orgId,
        risk_type: "Critical System Health",
        severity: "Critical",
        recommended_action: "Immediate Manager Intervention Required. Review recent mentor evaluations."
      });
    }

    // Rule 2: Rapidly Declining Trend
    if (health.trend === 'Declining' && health.previous_score - health.current_score > 15) {
      flags.push({
        organization_id: orgId,
        risk_type: "Rapid Health Decline",
        severity: "High",
        recommended_action: "Mentor should schedule an emergency check-in session."
      });
    }

    // Insert new flags
    if (flags.length > 0) {
      // Clear old flags first to prevent spam
      await supabaseAdmin.from("risk_flags").delete().eq("organization_id", orgId);
      await supabaseAdmin.from("risk_flags").insert(flags);
    }

    return { success: true, flags };
  } catch (error: any) {
    console.error("Risk Detection Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Global Cron-like function that could be called daily to check all startups
 */
export async function runGlobalRiskDetection() {
  const { data: orgs } = await supabaseAdmin.from("organizations").select("id").eq("status", "Active");
  if (!orgs) return;
  
  for (const org of orgs) {
    await detectRisk(org.id);
  }
}
