"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { STAGE_CONFIG, VENTURE_STAGES, VentureStage } from "@/lib/milestones-config";

// ─── SEED MILESTONES (called once on app init or manually) ─────────────────

export async function seedMilestones() {
  // Deprecated: Milestones are now entirely driven by STAGE_CONFIG.
  // The database table 'milestones' is obsolete.
  return { success: true, count: 0 };
}

// ─── GET MILESTONES FOR AN ORG ──────────────────────────────────────────────

export async function getMilestonesForOrg(orgId: string) {
  try {
    // 1. Get org's verified stage
    const { data: org, error: orgErr } = await supabaseAdmin
      .from("organizations")
      .select("verified_stage, claimed_stage, stage, name")
      .eq("id", orgId)
      .single();
    if (orgErr || !org) throw new Error("Organization not found");

    const verifiedStage = org.verified_stage || org.stage || "Ideation";

    // 2. Get static config for this stage
    const stageConfig = STAGE_CONFIG.find(s => s.stage === verifiedStage);
    if (!stageConfig) throw new Error(`Stage "${verifiedStage}" not found in config`);

    const milestones = stageConfig.milestones.map(m => ({
      id: m.title, // using title as id for frontend
      title: m.title,
      description: m.description,
      is_required: m.is_required,
      difficulty: m.difficulty,
      estimatedTime: m.estimatedTime,
      healthImpact: m.healthImpact
    }));

    const milestoneTitles = milestones.map(m => m.title);

    // 3. Get all submissions for this org for the current stage's milestones
    const { data: submissions } = await supabaseAdmin
      .from("milestone_submissions")
      .select("id, milestone_title, status, evidence_url, evidence_note, evidence_type, submitted_at, notes")
      .eq("organization_id", orgId)
      .in("milestone_title", milestoneTitles);

    const submissionMap: Record<string, any> = {};
    (submissions || []).forEach((s) => { submissionMap[s.milestone_title] = s; });

    // 4. Combine
    const enriched = milestones.map((m) => {
      const sub = submissionMap[m.title];
      return {
        ...m,
        submission: sub || null,
        displayStatus: !sub
          ? "Not Started"
          : sub.status === "Submitted"
          ? "Submitted"
          : sub.status === "Approved" || sub.status === "Verified"
          ? "Verified"
          : sub.status === "Completed"
          ? "Completed"
          : sub.status === "Rejected"
          ? "Rejected"
          : sub.status === "In Progress"
          ? "In Progress"
          : "Not Started",
      };
    });

    const core = enriched.filter((m) => m.is_required);
    const optional = enriched.filter((m) => !m.is_required);
    const verifiedCount = core.filter((m) => m.displayStatus === "Verified" || m.displayStatus === "Completed").length;
    const progressPct = core.length > 0 ? Math.round((verifiedCount / core.length) * 100) : 0;

    return {
      success: true,
      data: {
        org,
        verifiedStage,
        stageSequence: stageConfig.sequence,
        core,
        optional,
        verifiedCount,
        totalCore: core.length,
        progressPct,
        allCoreVerified: verifiedCount === core.length,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── SUBMIT MILESTONE EVIDENCE ──────────────────────────────────────────────

export async function submitMilestoneEvidence(
  orgId: string,
  milestoneTitle: string, // Changed from milestoneId
  evidenceUrl: string,
  evidenceNote: string,
  evidenceType: "url" | "document" | "video" | "physical"
) {
  try {
    // Check for existing submission
    const { data: existing } = await supabaseAdmin
      .from("milestone_submissions")
      .select("id, status")
      .eq("organization_id", orgId)
      .eq("milestone_title", milestoneTitle)
      .single();

    if (existing && (existing.status === "Approved" || existing.status === "Verified")) {
      return { success: false, error: "This milestone is already verified." };
    }

    if (existing) {
      // Update existing submission
      await supabaseAdmin
        .from("milestone_submissions")
        .update({
          status: "Submitted",
          evidence_url: evidenceUrl,
          evidence_note: evidenceNote,
          evidence_type: evidenceType,
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      // Create new submission
      await supabaseAdmin.from("milestone_submissions").insert({
        organization_id: orgId,
        milestone_title: milestoneTitle,
        status: "Submitted",
        evidence_url: evidenceUrl,
        evidence_note: evidenceNote,
        evidence_type: evidenceType,
        submitted_at: new Date().toISOString(),
      });
    }

    // Notify org timeline
    await supabaseAdmin.from("activity_timeline").insert({
      organization_id: orgId,
      event: "Milestone Evidence Submitted",
      description: `Evidence submitted for milestone review`,
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── MENTOR MILESTONE QUEUE ─────────────────────────────────────────────────

export async function getMentorMilestoneQueue(mentorUserId: string) {
  try {
    // Get mentor record
    const { data: mentorData } = await supabaseAdmin
      .from("mentors")
      .select("id")
      .eq("user_id", mentorUserId)
      .single();
    if (!mentorData) return { success: true, data: [] };

    // Get assigned org IDs
    const { data: assignments } = await supabaseAdmin
      .from("mentorship_assignments")
      .select("organization_id")
      .eq("mentor_id", mentorData.id);
    const orgIds = (assignments || []).map((a) => a.organization_id);
    if (orgIds.length === 0) return { success: true, data: [] };

    // Get submitted milestone submissions for these orgs (not yet mentor-reviewed)
    const { data: submissions, error } = await supabaseAdmin
      .from("milestone_submissions")
      .select(`
        id, status, evidence_url, evidence_note, evidence_type, submitted_at,
        organization_id, milestone_title,
        organizations!organization_id(name, verified_stage, user_profiles!founder_id(full_name))
      `)
      .eq("status", "Submitted")
      .in("organization_id", orgIds)
      .order("submitted_at", { ascending: true });

    if (error) throw new Error(error.message);
    return { success: true, data: submissions || [] };
  } catch (err: any) {
    return { success: false, error: err.message, data: [] };
  }
}

// ─── REVIEW MILESTONE AS MENTOR ─────────────────────────────────────────────

export async function reviewMilestoneAsMentor(
  submissionId: string,
  mentorUserId: string,
  outcome: "Approved" | "Rejected" | "Revision Requested",
  comments: string
) {
  try {
    // Upsert mentor review
    const { data: existing } = await supabaseAdmin
      .from("milestone_reviews")
      .select("id")
      .eq("submission_id", submissionId)
      .eq("reviewer_type", "mentor")
      .single();

    if (existing) {
      await supabaseAdmin
        .from("milestone_reviews")
        .update({ outcome, comments, review_date: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabaseAdmin.from("milestone_reviews").insert({
        submission_id: submissionId,
        mentor_id: mentorUserId,
        reviewer_type: "mentor",
        outcome,
        comments,
      });
    }

    // Update submission status
    const newStatus =
      outcome === "Approved"
        ? "Mentor Approved"
        : outcome === "Rejected"
        ? "Rejected"
        : "Submitted"; // revision = back to submitted for founder

    await supabaseAdmin
      .from("milestone_submissions")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", submissionId);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── MANAGER MILESTONE QUEUE ────────────────────────────────────────────────

export async function getManagerMilestoneQueue(managerUserId: string) {
  try {
    // Get manager's location and domain
    const { data: mgr } = await supabaseAdmin
      .from("managers")
      .select("location")
      .eq("user_id", managerUserId)
      .single();
    if (!mgr) return { success: true, data: [] };

    const { LOCATION_DOMAINS } = await import("@/lib/constants");
    const allowedDomains = mgr.location ? LOCATION_DOMAINS[mgr.location as keyof typeof LOCATION_DOMAINS] : [];
    const { data: domains } = await supabaseAdmin
      .from("domains")
      .select("id")
      .in("name", allowedDomains);
    const domainIds = (domains || []).map((d) => d.id);

    // Get approved orgs in manager's domain
    const { data: orgs } = await supabaseAdmin
      .from("organizations")
      .select("id")
      .eq("status", "Approved")
      .in("primary_domain_id", domainIds);
    const orgIds = (orgs || []).map((o) => o.id);
    if (orgIds.length === 0) return { success: true, data: [] };

    // Get mentor-approved submissions waiting for manager review
    const { data: submissions, error } = await supabaseAdmin
      .from("milestone_submissions")
      .select(`
        id, status, evidence_url, evidence_note, evidence_type, submitted_at,
        organization_id, milestone_title,
        organizations!organization_id(name, verified_stage, user_profiles!founder_id(full_name)),
        milestone_reviews(outcome, comments, reviewer_type, review_date)
      `)
      .eq("status", "Mentor Approved")
      .in("organization_id", orgIds)
      .order("submitted_at", { ascending: true });

    if (error) throw new Error(error.message);
    return { success: true, data: submissions || [] };
  } catch (err: any) {
    return { success: false, error: err.message, data: [] };
  }
}

// ─── REVIEW MILESTONE AS MANAGER ────────────────────────────────────────────

export async function reviewMilestoneAsManager(
  submissionId: string,
  managerUserId: string,
  outcome: "Approved" | "Rejected" | "Revision Requested",
  comments: string
) {
  try {
    const { data: existing } = await supabaseAdmin
      .from("milestone_reviews")
      .select("id")
      .eq("submission_id", submissionId)
      .eq("reviewer_type", "manager")
      .single();

    if (existing) {
      await supabaseAdmin
        .from("milestone_reviews")
        .update({ outcome, comments, review_date: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabaseAdmin.from("milestone_reviews").insert({
        submission_id: submissionId,
        manager_id: managerUserId,
        reviewer_type: "manager",
        outcome,
        comments,
      });
    }

    const newStatus =
      outcome === "Approved" ? "Approved" : outcome === "Rejected" ? "Rejected" : "Submitted";

    await supabaseAdmin
      .from("milestone_submissions")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", submissionId);

    // If approved, recalculate health score
    if (outcome === "Approved") {
      const { data: sub } = await supabaseAdmin
        .from("milestone_submissions")
        .select("organization_id")
        .eq("id", submissionId)
        .single();
      if (sub) {
        try {
          const { calculateVentureHealth } = await import("@/lib/actions/health");
          await calculateVentureHealth(sub.organization_id);
        } catch (_) {}
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
