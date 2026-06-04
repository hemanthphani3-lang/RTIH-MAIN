"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { VentureStage, VENTURE_STAGES } from "@/lib/milestones-config";

// ─── SUBMIT STAGE CERTIFICATION REQUEST ────────────────────────────────────

export async function submitStageCertificationRequest(
  orgId: string,
  requestedStage: VentureStage,
  evidence: Record<string, string> // label -> url/text
) {
  try {
    // Get current org
    const { data: org, error: orgErr } = await supabaseAdmin
      .from("organizations")
      .select("verified_stage, stage, name")
      .eq("id", orgId)
      .single();
    if (orgErr || !org) throw new Error("Organization not found");

    const currentStage = org.verified_stage || org.stage || "Ideation";

    // Check no existing pending request
    const { data: existing } = await supabaseAdmin
      .from("stage_certification_requests")
      .select("id, status")
      .eq("organization_id", orgId)
      .in("status", ["Pending"])
      .single();

    if (existing) {
      return { success: false, error: "You already have an active certification request. Please wait for it to be reviewed." };
    }

    // Create request
    const { data: req, error: reqErr } = await supabaseAdmin
      .from("stage_certification_requests")
      .insert({
        organization_id: orgId,
        requested_stage: requestedStage,
        current_stage: currentStage,
        status: "Pending",
        evidence,
      })
      .select("id")
      .single();

    if (reqErr || !req) throw new Error(reqErr?.message || "Failed to create request");

    // Log to activity timeline
    await supabaseAdmin.from("activity_timeline").insert({
      organization_id: orgId,
      event: "Stage Certification Requested",
      description: `Applied for ${requestedStage} stage certification`,
      timestamp: new Date().toISOString(),
    });

    // We no longer notify mentors. Managers will see this in their queue.

    return { success: true, requestId: req.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── GET ORG CERTIFICATION STATUS ──────────────────────────────────────────

export async function getOrgCertificationStatus(orgId: string) {
  try {
    const { data: org, error: orgErr } = await supabaseAdmin
      .from("organizations")
      .select("id, name, stage, verified_stage, claimed_stage, status, health_score, badges")
      .eq("id", orgId)
      .single();
    if (orgErr || !org) throw new Error("Org not found");

    // Active certification request
    const { data: activeReq } = await supabaseAdmin
      .from("stage_certification_requests")
      .select("id, requested_stage, current_stage, status, manager_outcome, manager_comments, created_at, verification_method")
      .eq("organization_id", orgId)
      .in("status", ["Pending", "Physical Review Scheduled", "Revision Requested"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // History of past requests
    const { data: history } = await supabaseAdmin
      .from("stage_certification_requests")
      .select("id, requested_stage, current_stage, status, manager_outcome, created_at, manager_reviewed_at, verification_method")
      .eq("organization_id", orgId)
      .in("status", ["Approved", "Rejected", "Downgraded"])
      .order("created_at", { ascending: false })
      .limit(5);

    const verifiedStageRaw = org.verified_stage || org.stage || "Ideation";
    const verifiedStage = verifiedStageRaw.endsWith(" Stage") ? verifiedStageRaw.replace(" Stage", "") : verifiedStageRaw;
    const stageIndex = VENTURE_STAGES.indexOf(verifiedStage as VentureStage);
    const nextStage = stageIndex !== -1 && stageIndex < VENTURE_STAGES.length - 1 ? VENTURE_STAGES[stageIndex + 1] : null;

    return {
      success: true,
      data: {
        org: { ...org, verifiedStage, nextStage },
        activeRequest: activeReq || null,
        history: history || [],
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── MENTOR CERTIFICATION QUEUE ─────────────────────────────────────────────

// ─── MANAGER CERTIFICATION QUEUE ─────────────────────────────────────────────

export async function getManagerCertificationQueue(managerUserId: string) {
  try {
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

    const { data: orgs } = await supabaseAdmin
      .from("organizations")
      .select("id")
      .eq("status", "Approved")
      .in("primary_domain_id", domainIds);
    const orgIds = (orgs || []).map((o) => o.id);
    if (orgIds.length === 0) return { success: true, data: [] };

    const { data, error } = await supabaseAdmin
      .from("stage_certification_requests")
      .select(`
        id, requested_stage, current_stage, status, evidence, created_at, verification_method, manager_outcome, manager_comments,
        organizations!organization_id(id, name, verified_stage, user_profiles!founder_id(full_name, email))
      `)
      .in("status", ["Pending", "Physical Review Scheduled", "Revision Requested"])
      .in("organization_id", orgIds)
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);
    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message, data: [] };
  }
}

// ─── REVIEW CERTIFICATION AS MANAGER ─────────────────────────────────────────

export async function reviewCertificationAsManager(
  requestId: string,
  managerUserId: string,
  outcome: "Approved" | "Rejected" | "Revision Requested" | "Downgrade Stage" | "Schedule Physical Review" | "Approve Through Physical Verification",
  comments: string,
  verificationMethod: "Digital" | "Physical" | "Hybrid" = "Digital"
) {
  try {
    if (!comments || comments.trim().length < 10) {
      return { success: false, error: "Please provide detailed comments (at least 10 characters)." };
    }

    let newStatus = "Pending";
    if (outcome === "Approved" || outcome === "Approve Through Physical Verification" || outcome === "Downgrade Stage") newStatus = "Approved";
    else if (outcome === "Rejected") newStatus = "Rejected";
    else if (outcome === "Revision Requested") newStatus = "Revision Requested";
    else if (outcome === "Schedule Physical Review") newStatus = "Physical Review Scheduled";

    const { data: req, error } = await supabaseAdmin
      .from("stage_certification_requests")
      .update({
        manager_outcome: outcome,
        manager_comments: comments,
        manager_reviewed_by: managerUserId,
        manager_reviewed_at: new Date().toISOString(),
        status: newStatus,
        verification_method: verificationMethod
      })
      .eq("id", requestId)
      .select("organization_id, requested_stage, current_stage")
      .single();

    if (error) throw new Error(error.message);

    // If APPROVED or Downgraded: update the org's verified_stage and log transition
    if (["Approved", "Approve Through Physical Verification", "Downgrade Stage"].includes(outcome)) {
      await supabaseAdmin
        .from("organizations")
        .update({
          verified_stage: req.requested_stage,
          stage: req.requested_stage,
          updated_at: new Date().toISOString(),
        })
        .eq("id", req.organization_id);

      // Log stage transition
      const { data: prevStage } = await supabaseAdmin
        .from("startup_stages")
        .select("id")
        .eq("name", req.current_stage)
        .single();
      const { data: newStage } = await supabaseAdmin
        .from("startup_stages")
        .select("id")
        .eq("name", req.requested_stage)
        .single();

      if (prevStage && newStage) {
        await supabaseAdmin.from("stage_transitions").insert({
          organization_id: req.organization_id,
          previous_stage: prevStage.id,
          new_stage: newStage.id,
          transition_type: "manager_approved",
          promoted_by: managerUserId,
          notes: `Certified via ${verificationMethod} review. Outcome: ${outcome}. Manager: ${comments.substring(0, 100)}`,
        });
      }

      await supabaseAdmin.from("activity_timeline").insert({
        organization_id: req.organization_id,
        event: "Stage Certified",
        description: `🎉 Congratulations! Your venture has been officially certified at the ${req.requested_stage} stage.`,
        actor: managerUserId,
      });

      // Notify founder
      const { data: org } = await supabaseAdmin
        .from("organizations")
        .select("founder_id")
        .eq("id", req.organization_id)
        .single();
      if (org?.founder_id) {
        await supabaseAdmin.from("notifications").insert({
          user_id: org.founder_id,
          title: `🎉 Stage Certified: ${req.requested_stage}`,
          description: `Your venture has been officially certified at the ${req.requested_stage} stage by the Hub Manager!`,
        });
      }

      // Recalculate health
      try {
        const { calculateVentureHealth } = await import("@/lib/actions/health");
        await calculateVentureHealth(req.organization_id);
      } catch (_) {}
    } else {
      // Notify founder of rejection/revision
      const { data: org } = await supabaseAdmin
        .from("organizations")
        .select("founder_id")
        .eq("id", req.organization_id)
        .single();
      if (org?.founder_id) {
        await supabaseAdmin.from("notifications").insert({
          user_id: org.founder_id,
          title: `Stage Certification: ${outcome}`,
          description: `Your ${req.requested_stage} certification was ${outcome.toLowerCase()}. Manager feedback: "${comments.substring(0, 150)}"`,
        });
      }
    }

    // Log governance action
    await supabaseAdmin.from("audit_logs").insert({
      action: `STAGE_CERTIFICATION_${outcome.toUpperCase().replace(/ /g, "_")}`,
      entity: "stage_certification_requests",
      entity_id: requestId,
      performed_by: managerUserId,
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── ADMIN OVERRIDE ──────────────────────────────────────────────────────────

export async function adminOverrideStage(
  orgId: string,
  newStage: VentureStage,
  reason: string,
  adminUserId: string
) {
  try {
    const { data: org, error } = await supabaseAdmin
      .from("organizations")
      .update({ verified_stage: newStage, stage: newStage, updated_at: new Date().toISOString() })
      .eq("id", orgId)
      .select("verified_stage, name, founder_id")
      .single();

    if (error) throw new Error(error.message);

    await supabaseAdmin.from("audit_logs").insert({
      action: "ADMIN_STAGE_OVERRIDE",
      entity: "organizations",
      entity_id: orgId,
      performed_by: adminUserId,
      timestamp: new Date().toISOString(),
    });

    await supabaseAdmin.from("activity_timeline").insert({
      organization_id: orgId,
      event: "Admin Stage Override",
      description: `Stage changed to ${newStage} by admin. Reason: ${reason}`,
      actor: adminUserId,
    });

    if (org?.founder_id) {
      await supabaseAdmin.from("notifications").insert({
        user_id: org.founder_id,
        title: "Venture Stage Updated by Admin",
        description: `Your venture stage has been updated to ${newStage}. Reason: ${reason}`,
      });
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
