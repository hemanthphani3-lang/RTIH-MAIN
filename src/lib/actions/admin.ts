"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { logGovernanceAction } from "./governance";

export async function getAdminDashboardData() {
  try {
    // Get role IDs first
    const { data: roles } = await supabaseAdmin.from("roles").select("id, name");
    const mentorRoleId = roles?.find(r => r.name === "Mentor")?.id;
    const managerRoleId = roles?.find(r => r.name === "Manager")?.id;

    const [orgsRes, verifiedRes, mentorsRes, managersRes, pendingRes, riskRes, certRes, healthRes, pendingOppAppsRes, oppsRes] = await Promise.all([
      supabaseAdmin.from("organizations").select("id", { count: 'exact', head: true }).neq("status", "Rejected"),
      supabaseAdmin.from("verification_requests").select("id", { count: 'exact', head: true }).eq("status", "Approved"),
      supabaseAdmin.from("user_profiles").select("id", { count: 'exact', head: true }).eq("role_id", mentorRoleId || ""),
      supabaseAdmin.from("user_profiles").select("id", { count: 'exact', head: true }).eq("role_id", managerRoleId || ""),
      supabaseAdmin.from("verification_requests").select(`
        id, status, created_at,
        organizations ( id, name, stage, description, user_profiles(full_name, email) )
      `).eq("status", "Pending"),
      supabaseAdmin.from("risk_flags").select("id, risk_type, severity, generated_date, organizations(name)").order("generated_date", { ascending: false }).limit(10),
      supabaseAdmin.from("certificates").select("id, certificate_type, issue_date, organizations(name)").order("issue_date", { ascending: false }).limit(10),
      supabaseAdmin.from("health_scores").select("current_score, status, organization_id, organizations(name)"),
      supabaseAdmin.from("opportunity_applications").select("id", { count: 'exact', head: true }).eq("status", "Submitted"),
      supabaseAdmin.from("opportunities").select("id", { count: 'exact', head: true })
    ]);

    return {
      success: true,
      stats: {
        orgs: orgsRes.count || 0,
        verified: verifiedRes.count || 0,
        mentors: mentorsRes.count || 0,
        managers: managersRes.count || 0,
        opportunities: oppsRes.count || 0
      },
      pendingOrgs: pendingRes.data || [],
      riskFlags: riskRes.data || [],
      certificates: certRes.data || [],
      healthScores: healthRes.data || [],
      pendingOppApps: pendingOppAppsRes.count || 0
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function approveOrganization(reqId: string, orgId: string) {
  try {
    await supabaseAdmin.from("verification_requests").update({ status: "Approved" }).eq("id", reqId);
    await supabaseAdmin.from("organizations").update({ status: "Active" }).eq("id", orgId);
    
    // Log Governance Action
    const { data: { user } } = await supabaseAdmin.auth.getUser();
    if (user) {
      await logGovernanceAction("STARTUP_APPROVED", "organization", orgId, user.id, { request_id: reqId });
    }
    
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function rejectOrganization(reqId: string, orgId: string) {
  try {
    await supabaseAdmin.from("verification_requests").update({ status: "Rejected" }).eq("id", reqId);
    await supabaseAdmin.from("organizations").update({ status: "Rejected" }).eq("id", orgId);
    
    // Log Governance Action
    const { data: { user } } = await supabaseAdmin.auth.getUser();
    if (user) {
      await logGovernanceAction("STARTUP_REJECTED", "organization", orgId, user.id, { request_id: reqId });
    }
    
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
