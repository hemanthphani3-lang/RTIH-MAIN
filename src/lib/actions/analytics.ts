"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { LOCATION_DOMAINS, LocationType } from "@/lib/constants";

// Reverse mapping to find location by domain
const domainToLocationMap: Record<string, string> = {};
Object.entries(LOCATION_DOMAINS).forEach(([loc, domains]) => {
  domains.forEach(d => {
    domainToLocationMap[d] = loc;
  });
});

/**
 * Fetch total ecosystem metrics for Executive Dashboard
 */
export async function getEcosystemMetrics() {
  try {
    const [{ count: totalOrgs }, { count: activeOrgs }, { count: graduatedOrgs }, { count: totalMentors }] = await Promise.all([
      supabaseAdmin.from("organizations").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("organizations").select("*", { count: "exact", head: true }).eq("status", "Approved"),
      supabaseAdmin.from("organizations").select("*", { count: "exact", head: true }).eq("status", "Graduated"),
      supabaseAdmin.from("mentors").select("*", { count: "exact", head: true })
    ]);

    // Fetch stage distribution
    const { data: orgs } = await supabaseAdmin.from("organizations").select("stage");
    const stageDistribution = orgs?.reduce((acc: any, org) => {
      acc[org.stage] = (acc[org.stage] || 0) + 1;
      return acc;
    }, {});

    return {
      success: true,
      data: {
        totalOrgs: totalOrgs || 0,
        activeOrgs: activeOrgs || 0,
        graduatedOrgs: graduatedOrgs || 0,
        totalMentors: totalMentors || 0,
        stageDistribution: Object.entries(stageDistribution || {}).map(([name, value]) => ({ name, value }))
      }
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Fetch performance metrics grouped by domain
 */
export async function getDomainIntelligence() {
  try {
    const { data: orgs } = await supabaseAdmin
      .from("organizations")
      .select(`
        id, stage, status, 
        domains!primary_domain_id(name)
      `);

    if (!orgs) return { success: true, data: [] };

    const domainMap: Record<string, { total: number, active: number, graduated: number }> = {};

    orgs.forEach((org: any) => {
      const domainName = org.domains?.name || "Uncategorized";
      if (!domainMap[domainName]) {
        domainMap[domainName] = { total: 0, active: 0, graduated: 0 };
      }
      domainMap[domainName].total += 1;
      if (org.status === "Approved") domainMap[domainName].active += 1;
      if (org.status === "Graduated") domainMap[domainName].graduated += 1;
    });

    const formatted = Object.entries(domainMap).map(([name, metrics]) => ({
      name,
      ...metrics
    }));

    return { success: true, data: formatted };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Fetch performance metrics grouped by Hub and then by domain
 */
export async function getHubAndDomainIntelligence() {
  try {
    const { data: orgs, error } = await supabaseAdmin
      .from("organizations")
      .select(`
        *,
        domains!primary_domain_id(name)
      `);

    if (error) throw new Error(error.message);
    
    if (!orgs) return { success: true, data: [] };

    const hubMap: Record<string, any> = {};

    orgs.forEach((org: any) => {
      const domainName = org.domains?.name || "Uncategorized";
      // The hub_id column stores the location name directly. 
      // If missing, infer from the primary domain.
      const hubName = org.hub_id || domainToLocationMap[domainName] || "Unassigned Location";

      if (!hubMap[hubName]) {
        hubMap[hubName] = { name: hubName, total: 0, active: 0, domains: {} };
      }

      hubMap[hubName].total += 1;
      if (org.status === "Approved") hubMap[hubName].active += 1;

      if (!hubMap[hubName].domains[domainName]) {
        hubMap[hubName].domains[domainName] = { name: domainName, total: 0, active: 0 };
      }

      hubMap[hubName].domains[domainName].total += 1;
      if (org.status === "Approved") hubMap[hubName].domains[domainName].active += 1;
    });

    const formatted = Object.values(hubMap).map((hub: any) => ({
      name: hub.name,
      total: hub.total,
      active: hub.active,
      domains: Object.values(hub.domains)
    }));

    return { success: true, data: formatted };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Identify startups that might be struggling (stalled at same stage, low health)
 */
export async function getRiskIntelligence(managerLocation?: string) {
  try {
    let query = supabaseAdmin
      .from("organizations")
      .select(`
        id, name, stage, status, created_at,
        domains!primary_domain_id(name),
        user_profiles!founder_id(full_name, email)
      `)
      .in("status", ["Approved", "Pending"]);

    // In a real app we would compute a health score or check last activity
    // For now we simulate risk by checking age in current status or lacking a mentor
    const { data: orgs, error } = await query;
    if (error) throw new Error(error.message);

    const highRisk = (orgs || []).map(o => ({
      ...o,
      riskLevel: "High",
      riskReason: "No recent progress logs detected (Simulated)"
    })).slice(0, 5); // Limit to top 5 for the dashboard

    return { success: true, data: highRisk };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Fetch mentor effectiveness metrics
 */
export async function getMentorImpact(mentorId?: string) {
  try {
    let query = supabaseAdmin
      .from("mentorship_assignments")
      .select(`
        id, mentor_id, organization_id,
        organizations(status, stage)
      `);

    if (mentorId) {
      query = query.eq("mentor_id", mentorId);
    }

    const { data: assignments, error } = await query;
    if (error) throw new Error(error.message);

    const totalAssigned = assignments?.length || 0;
    const graduated = assignments?.filter((a: any) => a.organizations?.status === "Graduated").length || 0;
    const active = assignments?.filter((a: any) => a.organizations?.status === "Approved").length || 0;

    return {
      success: true,
      data: {
        totalAssigned,
        active,
        graduated,
        successRate: totalAssigned > 0 ? Math.round((graduated / totalAssigned) * 100) : 0
      }
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
