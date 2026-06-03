"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { calculateVentureHealth } from "./health";
// NOTE: calculateReadiness was removed in Phase 9 (replaced by dual-approval certification system)

// Helper to log timeline activity
async function logActivity(orgId: string, event: string, description: string, actorId: string) {
  await supabaseAdmin.from("activity_timeline").insert({
    organization_id: orgId,
    event,
    description,
    actor: actorId
  });
}

export async function submitMilestone(orgId: string, milestoneId: string, notes: string, actorId: string) {
  // Check if it already exists
  const { data: existing } = await supabaseAdmin
    .from("milestone_submissions")
    .select("id")
    .eq("organization_id", orgId)
    .eq("milestone_id", milestoneId)
    .maybeSingle();

  if (existing) {
    await supabaseAdmin
      .from("milestone_submissions")
      .update({ status: 'Submitted', notes, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await supabaseAdmin
      .from("milestone_submissions")
      .insert({
        organization_id: orgId,
        milestone_id: milestoneId,
        status: 'Submitted',
        notes
      });
  }

  const { data: milestone } = await supabaseAdmin.from("milestones").select("title").eq("id", milestoneId).single();
  const mTitle = milestone?.title || "A milestone";

  await logActivity(orgId, "Milestone Submitted", `Submitted milestone: ${mTitle}`, actorId);
  return { success: true };
}

export async function reviewMilestone(submissionId: string, mentorId: string, outcome: string, comments: string) {
  // Get submission details
  const { data: submission } = await supabaseAdmin
    .from("milestone_submissions")
    .select("*, milestones(title, stage_id)")
    .eq("id", submissionId)
    .single();

  if (!submission) throw new Error("Submission not found");

  // Insert review
  await supabaseAdmin.from("milestone_reviews").insert({
    submission_id: submissionId,
    mentor_id: mentorId,
    outcome,
    comments
  });

  // Update submission status
  const newStatus = outcome === 'Approved' ? 'Approved' : (outcome === 'Rejected' ? 'Rejected' : 'Draft');
  await supabaseAdmin
    .from("milestone_submissions")
    .update({ status: newStatus })
    .eq("id", submissionId);

  await logActivity(
    submission.organization_id,
    `Milestone ${outcome}`,
    `Mentor reviewed ${submission.milestones.title}: ${outcome}`,
    mentorId
  );

  // If approved, recalculate health (stage progression is now handled by dual-approval system in certification.ts)
  if (outcome === 'Approved') {
    // NOTE: Auto-promotion disabled in Phase 9. Stage advancement now requires:
    // 1. Mentor Approval (via milestones.ts reviewMilestoneAsMentor)
    // 2. Manager Approval (via milestones.ts reviewMilestoneAsManager)
    // 3. Stage Certification Request (via certification.ts)
    await calculateVentureHealth(submission.organization_id);
  }

  return { success: true };
}

async function checkAndProgressStage(orgId: string, currentStageId: string, actorId: string) {
  // Check if all required milestones for the current stage are approved
  const { data: requiredMilestones } = await supabaseAdmin
    .from("milestones")
    .select("id")
    .eq("stage_id", currentStageId)
    .eq("is_required", true);

  if (!requiredMilestones || requiredMilestones.length === 0) return;

  const { data: approvedSubmissions } = await supabaseAdmin
    .from("milestone_submissions")
    .select("milestone_id")
    .eq("organization_id", orgId)
    .eq("status", "Approved");

  const approvedIds = (approvedSubmissions || []).map(s => s.milestone_id);
  const allCompleted = requiredMilestones.every(rm => approvedIds.includes(rm.id));

  if (allCompleted) {
    // Find next stage
    const { data: currentStage } = await supabaseAdmin.from("startup_stages").select("sequence").eq("id", currentStageId).single();
    if (!currentStage) return;

    const { data: nextStage } = await supabaseAdmin
      .from("startup_stages")
      .select("id, name")
      .eq("sequence", currentStage.sequence + 1)
      .maybeSingle();

    if (nextStage) {
      await progressStage(orgId, currentStageId, nextStage.id, actorId, 'automatic', `Automatically progressed to ${nextStage.name}`);
    }
  }
}

export async function progressStage(orgId: string, currentStageId: string, newStageId: string, actorId: string, type: string, notes: string) {
  // Update org stage string
  const { data: stageInfo } = await supabaseAdmin.from("startup_stages").select("name").eq("id", newStageId).single();
  if (stageInfo) {
    await supabaseAdmin.from("organizations").update({ stage: stageInfo.name }).eq("id", orgId);
  }

  // Record transition
  await supabaseAdmin.from("stage_transitions").insert({
    organization_id: orgId,
    previous_stage: currentStageId,
    new_stage: newStageId,
    transition_type: type,
    promoted_by: actorId,
    notes
  });

  await logActivity(orgId, "Stage Progressed", notes, actorId);
  return { success: true };
}

export async function createActionItem(orgId: string, mentorId: string, title: string, description: string, dueDate: string | null, priority: string = 'Medium') {
  try {
    const { error } = await supabaseAdmin.from("action_items").insert({
      organization_id: orgId,
      mentor_id: mentorId,
      title,
      description,
      due_date: dueDate || null,
      priority,
      created_by: mentorId,
      status: 'Pending'
    });
    if (error) throw new Error(error.message);

    await logActivity(orgId, "Action Item Created", `Mentor assigned: ${title} [${priority} Priority]`, mentorId);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function completeActionItem(itemId: string, actorId: string) {
  const { data: item } = await supabaseAdmin.from("action_items").select("*").eq("id", itemId).single();
  if (!item) return;

  await supabaseAdmin.from("action_items").update({ status: 'Completed', completed_at: new Date().toISOString() }).eq("id", itemId);
  await logActivity(item.organization_id, "Action Item Completed", `Completed task: ${item.title}`, actorId);
  // Trigger health recalculation
  await calculateVentureHealth(item.organization_id);
  return { success: true };
}

export async function updateStartupStatus(orgId: string, status: string, actorId: string) {
  await supabaseAdmin.from("organizations").update({ status }).eq("id", orgId);
  
  await supabaseAdmin.from("startup_status_history").insert({
    organization_id: orgId,
    status,
    updated_by: actorId
  });

  await logActivity(orgId, "Status Updated", `Venture status changed to ${status}`, actorId);
  return { success: true };
}
