"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { LOCATION_DOMAINS, LocationType } from "@/lib/constants";

// ========================================================
// OPPORTUNITY MANAGEMENT (Admin/Manager)
// ========================================================

export async function createOpportunity(data: any, creatorUserId: string) {
  try {
    // 1. Role & Location Validation for Managers
    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("roles(name)")
      .eq("id", creatorUserId)
      .single();

    const role = (profile?.roles as any)?.name;

    if (role === "Manager") {
      const { data: manager } = await supabaseAdmin
        .from("managers")
        .select("location")
        .eq("user_id", creatorUserId)
        .single();

      if (!manager) throw new Error("Manager profile not found");

      if (manager.location !== data.location) {
        throw new Error(`Managers can only create opportunities for their assigned hub location (${manager.location}).`);
      }

      if (data.domain) {
        const allowedDomains = LOCATION_DOMAINS[manager.location as LocationType] || [];
        if (!allowedDomains.includes(data.domain)) {
          throw new Error(`The domain "${data.domain}" is not supported at the ${manager.location} hub.`);
        }
      }
    }

    // Determine Domain ID
    let domainId = null;
    if (data.domain) {
      const { data: dom } = await supabaseAdmin.from("domains").select("id").eq("name", data.domain).single();
      if (dom) domainId = dom.id;
    }

    const { data: opp, error } = await supabaseAdmin.from("opportunities").insert({
      type: data.type,
      title: data.title,
      description: data.description,
      domain_id: domainId,
      created_by: creatorUserId,
      location: data.location,
      mode: data.mode,
      registration_start_date: data.registrationStartDate || null,
      registration_end_date: data.registrationEndDate || null,
      event_date: data.eventDate || null,
      capacity: data.capacity || null,
      status: "Published" // Auto-publish for demo simplicity
    }).select().single();

    if (error) throw new Error(error.message);

    // Insert Eligibility
    await supabaseAdmin.from("opportunity_eligibility").insert({
      opportunity_id: opp.id,
      stage_requirements: data.stageRequirements || [],
      domain_requirements: data.domainRequirements || []
    });

    // Audit Log
    await supabaseAdmin.from("audit_logs").insert({
      action: "Opportunity Created",
      entity: "opportunities",
      entity_id: opp.id,
      performed_by: creatorUserId
    });

    // Auto-sync Hackathons to the Hackathon Engine
    if (data.type === "Hackathon") {
      await supabaseAdmin.from("hackathons").insert({
        opportunity_id: opp.id,
        start_date: data.startDate || null,
        duration_days: data.durationDays || null,
        submission_deadline: data.eventDate || data.registrationEndDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        judging_criteria: { "Innovation": 25, "Feasibility": 25, "Impact": 25, "Market Potential": 10, "Presentation": 15 },
        max_team_size: 4,
        min_team_size: 1
      });
    }

    // Generate Recommendations
    await generateRecommendations(opp.id);

    return { success: true, opportunity: opp };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getOpportunities(filters?: any) {
  try {
    let query = supabaseAdmin.from("opportunities").select(`
      *,
      domains(name),
      opportunity_eligibility(stage_requirements, domain_requirements)
    `).order("created_at", { ascending: false });

    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.type) query = query.eq("type", filters.type);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message, data: [] };
  }
}

export async function getOpportunityById(id: string) {
  try {
    const { data, error } = await supabaseAdmin.from("opportunities").select(`
      *,
      domains(name),
      opportunity_eligibility(stage_requirements, domain_requirements)
    `).eq("id", id).single();
    if (error) throw new Error(error.message);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message, data: null };
  }
}

// ========================================================
// OPPORTUNITY DISCOVERY & RECOMMENDATION ENGINE
// ========================================================

async function generateRecommendations(opportunityId: string) {
  // A simple rule-based engine:
  // Match Orgs based on domain or stage.
  const { data: opp } = await getOpportunityById(opportunityId);
  if (!opp) return;

  const { data: eligibility } = await supabaseAdmin.from("opportunity_eligibility").select("*").eq("opportunity_id", opportunityId).single();
  
  const { data: orgs } = await supabaseAdmin.from("organizations").select("id, primary_domain_id, stage, domains(name)");
  if (!orgs) return;

  const recommendations = [];

  for (const org of orgs) {
    let score = 0;
    let reasons = [];

    if (opp.domain_id && org.primary_domain_id === opp.domain_id) {
      score += 3;
      reasons.push("Matches your primary domain");
    }

    if (eligibility && eligibility.stage_requirements && eligibility.stage_requirements.includes(org.stage)) {
      score += 2;
      reasons.push("Perfect for your current stage");
    }

    if (score > 0) {
      recommendations.push({
        organization_id: org.id,
        opportunity_id: opportunityId,
        reason: reasons.join(" & "),
        score
      });
    }
  }

  if (recommendations.length > 0) {
    await supabaseAdmin.from("opportunity_recommendations").insert(recommendations).select();
  }
}

export async function getRecommendedOpportunities(userId: string) {
  try {
    // 1. Get org ID
    const { data: org } = await supabaseAdmin.from("organizations").select("id").eq("founder_id", userId).single();
    if (!org) return { success: true, data: [] };

    // 2. Get recommendations
    const { data, error } = await supabaseAdmin.from("opportunity_recommendations").select(`
      score, reason,
      opportunities(*, domains(name))
    `).eq("organization_id", org.id).order("score", { ascending: false }).limit(5);

    if (error) throw new Error(error.message);
    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message, data: [] };
  }
}

export async function getRecommendedOpportunitiesForMentor(mentorUserId: string) {
  try {
    const { data: mentor } = await supabaseAdmin.from("mentor_profiles").select("id").eq("user_id", mentorUserId).single();
    if (!mentor) return { success: true, data: [] };

    const { data: assignments } = await supabaseAdmin.from("mentorship_assignments").select("organization_id").eq("mentor_id", mentor.id);
    if (!assignments || assignments.length === 0) return { success: true, data: [] };

    const orgIds = assignments.map(a => a.organization_id);

    const { data, error } = await supabaseAdmin.from("opportunity_recommendations").select(`
      score, reason,
      organizations(name),
      opportunities(*, domains(name))
    `).in("organization_id", orgIds).order("score", { ascending: false }).limit(6);

    if (error) throw new Error(error.message);
    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message, data: [] };
  }
}

// ========================================================
// APPLICATIONS & WORKSPACES
// ========================================================

export async function applyToOpportunity(opportunityId: string, submissionData: any, userId: string) {
  try {
    const { data: org } = await supabaseAdmin.from("organizations").select("id").eq("founder_id", userId).single();
    if (!org) throw new Error("Organization not found");

    const { data: app, error } = await supabaseAdmin.from("opportunity_applications").insert({
      organization_id: org.id,
      opportunity_id: opportunityId,
      status: "Submitted",
      submission_data: submissionData,
      submitted_at: new Date()
    }).select().single();

    if (error) throw new Error(error.message);

    // Timeline Event
    await supabaseAdmin.from("opportunity_timeline").insert({
      opportunity_id: opportunityId,
      organization_id: org.id,
      event: "Application Submitted",
      description: "Organization successfully submitted an application.",
      actor_id: userId
    });

    return { success: true, applicationId: app.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getOrgApplications(userId: string) {
  try {
    const { data: org } = await supabaseAdmin.from("organizations").select("id").eq("founder_id", userId).single();
    if (!org) return { success: true, data: [] };

    const { data, error } = await supabaseAdmin.from("opportunity_applications").select(`
      *,
      opportunities(*, domains(name))
    `).eq("organization_id", org.id).order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message, data: [] };
  }
}

export async function getApplicationsForOpportunity(opportunityId: string) {
  try {
    const { data, error } = await supabaseAdmin.from("opportunity_applications").select(`
      *,
      organizations(name, stage, user_profiles(full_name, email))
    `).eq("opportunity_id", opportunityId).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message, data: [] };
  }
}

export async function reviewApplication(applicationId: string, decision: "Accepted" | "Rejected" | "Waitlisted", comments: string, reviewerId: string) {
  try {
    // 1. Update application
    const { data: app, error } = await supabaseAdmin.from("opportunity_applications")
      .update({ status: decision })
      .eq("id", applicationId)
      .select().single();
    
    if (error) throw new Error(error.message);

    // 2. Add review record
    await supabaseAdmin.from("opportunity_reviews").insert({
      application_id: applicationId,
      reviewer_id: reviewerId,
      decision,
      comments
    });

    // 3. Timeline event
    await supabaseAdmin.from("opportunity_timeline").insert({
      opportunity_id: app.opportunity_id,
      organization_id: app.organization_id,
      event: `Application ${decision}`,
      description: `Application was ${decision.toLowerCase()} by a Manager.`,
      actor_id: reviewerId
    });

    // 4. If Accepted, activate workspace & track participation
    if (decision === "Accepted") {
      await supabaseAdmin.from("opportunity_workspaces").insert({
        opportunity_id: app.opportunity_id,
        organization_id: app.organization_id,
        status: "Active"
      });

      await supabaseAdmin.from("opportunity_participation").insert({
        organization_id: app.organization_id,
        opportunity_id: app.opportunity_id,
        participation_status: "Active"
      });

      await supabaseAdmin.from("opportunity_timeline").insert({
        opportunity_id: app.opportunity_id,
        organization_id: app.organization_id,
        event: `Workspace Activated`,
        description: `Opportunity workspace is now active for the organization.`
      });
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getOrgWorkspaces(userId: string) {
  try {
    const { data: org } = await supabaseAdmin.from("organizations").select("id").eq("founder_id", userId).single();
    if (!org) return { success: true, data: [] };

    const { data, error } = await supabaseAdmin.from("opportunity_workspaces").select(`
      *,
      opportunities(*, domains(name))
    `).eq("organization_id", org.id).order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message, data: [] };
  }
}

// Global Participation Stats
export async function getParticipationStats() {
  try {
    const { count: appsCount } = await supabaseAdmin.from("opportunity_applications").select("*", { count: 'exact', head: true });
    const { count: oppsCount } = await supabaseAdmin.from("opportunities").select("*", { count: 'exact', head: true });
    const { count: activeCount } = await supabaseAdmin.from("opportunity_participation").select("*", { count: 'exact', head: true }).eq("participation_status", "Active");

    return { success: true, data: { appsCount, oppsCount, activeCount } };
  } catch (err: any) {
    return { success: false, error: err.message, data: {} };
  }
}
