"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { detectRisk } from "./risk";

/**
 * Calculates and updates the Venture Health score for a given startup.
 * The score ranges from 0 to 100 based on milestone completion, 
 * action items, and evaluation data.
 */
export async function calculateVentureHealth(orgId: string) {
  try {
    // 1. Fetch data needed for calculation
    const [milestonesRes, actionsRes, evalsRes] = await Promise.all([
      supabaseAdmin.from("milestone_submissions").select("*").eq("organization_id", orgId),
      supabaseAdmin.from("action_items").select("*").eq("organization_id", orgId),
      supabaseAdmin.from("mentor_evaluations").select("*").eq("organization_id", orgId).order("evaluation_date", { ascending: false }).limit(1)
    ]);

    const submissions = milestonesRes.data || [];
    const actions = actionsRes.data || [];
    const latestEval = evalsRes.data?.[0];

    // 2. Algorithm Weights (Configurable in future)
    // Milestones: 40%
    // Action Items: 40%
    // Mentor Eval: 20%

    // Calculate Milestone Score
    const approvedMilestones = submissions.filter(s => s.status === 'Approved').length;
    const totalMilestones = submissions.length || 1; // Prevent div by 0
    let milestoneScore = (approvedMilestones / totalMilestones) * 40;
    if (submissions.length === 0) milestoneScore = 20; // Default baseline if no submissions yet

    // Calculate Action Item Score
    const completedActions = actions.filter(a => a.status === 'Completed' || a.status === 'Verified').length;
    const totalActions = actions.length;
    let actionScore = totalActions > 0 ? (completedActions / totalActions) * 40 : 40; // Full points if no pending actions assigned

    // Mentor Evaluation Score
    let evalScore = latestEval ? (latestEval.evaluation_score / 100) * 20 : 20; // Default full points if not evaluated

    // Final Score
    let newScore = Math.round(milestoneScore + actionScore + evalScore);

    // 3. Determine Status
    let status = 'Healthy';
    if (newScore >= 80) status = 'Growing';
    else if (newScore < 50) status = 'At Risk';
    else if (newScore < 30) status = 'Critical';

    // 4. Update the Database
    // Fetch previous score to determine trend
    const { data: currentHealth } = await supabaseAdmin.from("health_scores").select("*").eq("organization_id", orgId).single();
    
    let trend = 'Stable';
    if (currentHealth) {
      if (newScore > currentHealth.current_score) trend = 'Improving';
      else if (newScore < currentHealth.current_score) trend = 'Declining';
      
      await supabaseAdmin.from("health_scores").update({
        previous_score: currentHealth.current_score,
        current_score: newScore,
        trend,
        status,
        updated_at: new Date().toISOString()
      }).eq("id", currentHealth.id);
    } else {
      await supabaseAdmin.from("health_scores").insert({
        organization_id: orgId,
        current_score: newScore,
        previous_score: newScore,
        trend: 'Stable',
        status
      });
    }

    // 5. Trigger Risk Detection Engine if health is low
    if (status === 'At Risk' || status === 'Critical') {
      await detectRisk(orgId);
    }

    return { success: true, score: newScore, status, trend };
  } catch (error: any) {
    console.error("Health Calculation Error:", error);
    return { success: false, error: error.message };
  }
}
