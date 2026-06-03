"use server";
import { supabaseAdmin } from "../supabase/server";

export interface OrgFilters {
  search?: string;
  domain?: string;
  stage?: string;
  verificationLevel?: string;
  riskStatus?: string;
  mentorId?: string;
  managerId?: string;
  status?: string;
}

// Basic basic risk calculator based on available metrics
function calculateAutomatedRisk(org: any) {
  let score = 0;
  
  // Health score factors
  if (org.health_score < 40) score += 40;
  else if (org.health_score < 60) score += 20;
  
  // Activity factors (if last updated is old)
  const lastUpdate = new Date(org.updated_at);
  const now = new Date();
  const daysSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 3600 * 24);
  
  if (daysSinceUpdate > 60) score += 30;
  else if (daysSinceUpdate > 30) score += 15;
  
  if (org.status === 'Pending') score += 10;
  
  if (score >= 60) return { level: 'Critical', severity: `High risk score: ${score}` };
  if (score >= 40) return { level: 'High', severity: `Elevated risk score: ${score}` };
  if (score >= 20) return { level: 'Medium', severity: `Moderate risk score: ${score}` };
  return { level: 'Low', severity: 'Normal operation' };
}

export async function getOrganizationsPortfolio(filters: OrgFilters, limit: number = 50, offset: number = 0) {
  try {
    let query = supabaseAdmin
      .from("organizations")
      .select(`
        *,
        founder:founder_id(id, full_name, email),
        primary_domain:primary_domain_id(id, name),
        assignments:mentorship_assignments(
          mentor:mentor_id(id, user_id, user_profiles!mentors_user_id_fkey(full_name))
        )
      `, { count: 'exact' });

    // Apply filters
    if (filters.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }
    if (filters.domain) {
      // filtering by nested relation name requires a different approach in supabase 
      // but for simplicity we'll assume we filter post-fetch or use an RPC if needed. 
      // For now, we fetch all and filter in memory if the relation is filtered, or we do a subquery.
    }
    if (filters.stage && filters.stage !== "All") {
      query = query.eq('verified_stage', filters.stage);
    }
    if (filters.verificationLevel && filters.verificationLevel !== "All") {
      query = query.eq('verification_level', filters.verificationLevel);
    }
    if (filters.riskStatus && filters.riskStatus !== "All") {
      query = query.eq('risk_level', filters.riskStatus);
    }
    if (filters.status && filters.status !== "All") {
      query = query.eq('status', filters.status);
    }

    query = query.order('created_at', { ascending: false });
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);

    let orgs = data || [];

    // Memory filters for nested relations
    if (filters.search) {
      orgs = orgs.filter((o: any) => 
        o.name?.toLowerCase().includes(filters.search!.toLowerCase()) || 
        o.founder?.full_name?.toLowerCase().includes(filters.search!.toLowerCase())
      );
    }
    
    if (filters.domain && filters.domain !== "All") {
      orgs = orgs.filter((o: any) => o.primary_domain?.name === filters.domain);
    }

    // Process automated risk validation inline if they are null
    const processedOrgs = await Promise.all(orgs.map(async (org: any) => {
      let currentRisk = org.risk_level;
      if (!currentRisk) {
        const autoRisk = calculateAutomatedRisk(org);
        currentRisk = autoRisk.level;
        // Background async update
        supabaseAdmin.from('organizations').update({ risk_level: currentRisk, risk_severity: autoRisk.severity }).eq('id', org.id).then();
      }
      return { ...org, calculated_risk: currentRisk };
    }));

    return { success: true, data: processedOrgs, count };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getOrganizationDetails(orgId: string) {
  try {
    const { data: org, error } = await supabaseAdmin
      .from("organizations")
      .select(`
        *,
        founder:founder_id(id, full_name, email),
        primary_domain:primary_domain_id(id, name),
        secondary_domains:organization_domains(domain:domain_id(name)),
        assignments:mentorship_assignments(
          id, assignment_date, status,
          mentor:mentor_id(id, user_profiles!mentors_user_id_fkey(full_name))
        )
      `)
      .eq("id", orgId)
      .single();

    if (error || !org) throw new Error("Organization not found");

    // Fetch parallel data (milestones, certificates, opportunities, timeline)
    const [milestonesRes, certsRes, timelineRes] = await Promise.all([
      supabaseAdmin.from("milestone_submissions").select("*").eq("organization_id", orgId).order("submitted_at", { ascending: false }),
      supabaseAdmin.from("certificates").select("*").eq("organization_id", orgId).order("issue_date", { ascending: false }),
      supabaseAdmin.from("activity_timeline").select("*").eq("organization_id", orgId).order("timestamp", { ascending: false }).limit(20)
    ]);

    return { 
      success: true, 
      data: {
        ...org,
        milestones: milestonesRes.data || [],
        certificates: certsRes.data || [],
        timeline: timelineRes.data || []
      } 
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateOrganizationRisk(orgId: string, riskLevel: string, severity: string, adminId: string) {
  try {
    const { error } = await supabaseAdmin
      .from("organizations")
      .update({ risk_level: riskLevel, risk_severity: severity, updated_at: new Date().toISOString() })
      .eq("id", orgId);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("audit_logs").insert({
      user_id: adminId,
      action: "UPDATE_RISK",
      entity_type: "organization",
      entity_id: orgId,
      details: `Risk level updated to ${riskLevel}. Reason: ${severity}`
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function bulkUpdateOrganizations(orgIds: string[], action: string, payload: any, adminId: string) {
  try {
    let updateData = {};
    if (action === "ARCHIVE") updateData = { status: "Archived" };
    else if (action === "REACTIVATE") updateData = { status: "Approved" };
    else if (action === "SET_STAGE") updateData = { verified_stage: payload.stage };
    else throw new Error("Unknown action");

    const { error } = await supabaseAdmin
      .from("organizations")
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .in("id", orgIds);
    if (error) throw new Error(error.message);

    const logs = orgIds.map(id => ({
      user_id: adminId,
      action: `BULK_${action}`,
      entity_type: "organization",
      entity_id: id,
      details: `Bulk action applied.`
    }));
    await supabaseAdmin.from("audit_logs").insert(logs);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function aiOrganizationSearch(prompt: string) {
  // MOCK AI FALLBACK LOGIC
  // Once real API keys (Gemini, Grok, OpenRouter) are added, this function will
  // pass the 'prompt' to the LLM to extract JSON structural filters.
  
  console.log(`[AI Search Mock] Parsing prompt: "${prompt}"`);
  
  let extractedFilters: OrgFilters = {};
  const lowerPrompt = prompt.toLowerCase();
  
  if (lowerPrompt.includes("ev ") || lowerPrompt.includes("electric vehicle")) {
    extractedFilters.domain = "Electric Vehicles"; // Assuming this is the name
  } else if (lowerPrompt.includes("ai ") || lowerPrompt.includes("artificial intelligence")) {
    extractedFilters.domain = "Artificial Intelligence";
  }

  if (lowerPrompt.includes("funding-ready") || lowerPrompt.includes("funding ready")) {
    extractedFilters.stage = "Funding Readiness";
  } else if (lowerPrompt.includes("ideation")) {
    extractedFilters.stage = "Ideation";
  }

  if (lowerPrompt.includes("high risk") || lowerPrompt.includes("intervention")) {
    extractedFilters.riskStatus = "High";
  }

  // Actually run the query using the extracted filters
  return await getOrganizationsPortfolio(extractedFilters, 100);
}
