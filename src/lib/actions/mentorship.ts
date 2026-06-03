"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { LOCATION_DOMAINS } from "@/lib/constants";

/**
 * Get approved startups in the Manager's hub that have no mentor assigned yet.
 */
export async function getApprovedStartupsForAssignment(managerUserId: string) {
  try {
    const { data: mgr } = await supabaseAdmin.from("managers").select("location").eq("user_id", managerUserId).single();
    if (!mgr?.location) throw new Error("Manager location not set");

    const allowedDomains = LOCATION_DOMAINS[mgr.location as keyof typeof LOCATION_DOMAINS] || [];
    const { data: doms } = await supabaseAdmin.from("domains").select("id").in("name", allowedDomains);
    const domainIds = doms?.map(d => d.id) || [];

    // Approved orgs in domain that have no mentorship_assignment yet
    const { data: orgs, error } = await supabaseAdmin
      .from("organizations")
      .select(`
        id, name, description, stage, status,
        domains!primary_domain_id(name),
        user_profiles!founder_id(full_name, email),
        mentorship_assignments(id)
      `)
      .eq("status", "Approved")
      .in("primary_domain_id", domainIds);

    if (error) throw new Error(error.message);

    // Filter to those without an assignment
    const unassigned = (orgs || []).filter((o: any) => !o.mentorship_assignments || o.mentorship_assignments.length === 0);
    return { success: true, data: unassigned };
  } catch (err: any) {
    return { success: false, error: err.message, data: [] };
  }
}

/**
 * Get available Mentors for a given manager's location, filtered by org's primary domain.
 */
export async function getMentorsForAssignment(managerUserId: string, orgPrimaryDomainName: string) {
  try {
    const { data: mgr } = await supabaseAdmin.from("managers").select("location").eq("user_id", managerUserId).single();
    if (!mgr?.location) throw new Error("Manager location not set");

    // Get mentors in the same location
    const { data: mentors, error } = await supabaseAdmin
      .from("mentors")
      .select(`
        id, max_capacity, location,
        user_profiles!user_id(full_name, email),
        mentor_domains(domains(name)),
        mentorship_assignments(id)
      `)
      .eq("location", mgr.location);

    if (error) throw new Error(error.message);

    // Filter by domain and capacity
    const available = (mentors || [])
      .filter((m: any) => {
        const assignedCount = m.mentorship_assignments?.length || 0;
        const hasCapacity = assignedCount < (m.max_capacity || 5);
        const domains = m.mentor_domains?.map((md: any) => md.domains?.name).filter(Boolean) || [];
        const hasDomain = domains.includes(orgPrimaryDomainName);
        return hasCapacity && hasDomain;
      })
      .map((m: any) => ({
        ...m,
        domains: m.mentor_domains?.map((md: any) => md.domains?.name).filter(Boolean) || [],
        assignedCount: m.mentorship_assignments?.length || 0
      }));

    return { success: true, data: available };
  } catch (err: any) {
    return { success: false, error: err.message, data: [] };
  }
}

/**
 * Assign a mentor to a startup.
 */
export async function assignMentorToStartup(orgId: string, mentorId: string, assignedByUserId: string) {
  try {
    const { data: profile } = await supabaseAdmin.from("user_profiles").select("id").eq("id", assignedByUserId).single();
    if (!profile) throw new Error("Assigning user not found");

    const { error } = await supabaseAdmin.from("mentorship_assignments").insert({
      organization_id: orgId,
      mentor_id: mentorId,
      assigned_by: assignedByUserId
    });
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Get all assigned startups and their Mentors — for the Mentor dashboard.
 */
export async function getMentorAssignments(mentorUserId: string) {
  try {
    // Get mentor record
    const { data: mentorRecord } = await supabaseAdmin
      .from("mentors")
      .select("id, max_capacity, location, mentor_domains(domains(name))")
      .eq("user_id", mentorUserId)
      .single();

    if (!mentorRecord) throw new Error("Mentor record not found");

    const { data: assignments, error } = await supabaseAdmin
      .from("mentorship_assignments")
      .select(`
        id, created_at,
        organizations(
          id, name, description, stage, status, website,
          user_profiles!founder_id(full_name, email, mobile),
          domains!primary_domain_id(name),
          documents(document_type, file_url)
        )
      `)
      .eq("mentor_id", mentorRecord.id);

    if (error) throw new Error(error.message);

    return {
      success: true,
      mentorRecord: {
        ...mentorRecord,
        domains: mentorRecord.mentor_domains?.map((md: any) => md.domains?.name).filter(Boolean) || []
      },
      assignments: assignments || []
    };
  } catch (err: any) {
    return { success: false, error: err.message, mentorRecord: null, assignments: [] };
  }
}

/**
 * Get a startup's full profile for the Org Dashboard.
 */
export async function getOrgDashboardData(userId: string) {
  try {
    const { data: org, error } = await supabaseAdmin
      .from("organizations")
      .select(`
        id, name, description, stage, status, website, created_at,
        domains!primary_domain_id(name),
        documents(id, document_type, file_url, upload_date),
        mentorship_assignments(
          mentor:mentors(
            user_profiles!user_id(full_name, email),
            mentor_domains(domains(name))
          )
        ),
        verification_requests(level, status)
      `)
      .eq("founder_id", userId)
      .single();

    if (error) throw new Error(error.message);
    return { success: true, data: org };
  } catch (err: any) {
    return { success: false, error: err.message, data: null };
  }
}

export async function submitMentorEvaluation(orgId: string, mentorId: string, score: number, strengths: string, weaknesses: string, recs: string) {
  try {
    const { error } = await supabaseAdmin.from("evaluations").insert({
      organization_id: orgId,
      mentor_id: mentorId,
      score,
      strengths,
      weaknesses,
      recommendations: recs
    });
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function saveMentorNote(orgId: string, mentorId: string, note: string) {
  try {
    const { error } = await supabaseAdmin.from("mentor_notes").insert({
      organization_id: orgId,
      mentor_id: mentorId,
      note
    });
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function verifyActionItem(itemId: string, orgId: string) {
  try {
    const { error } = await supabaseAdmin.from("action_items")
      .update({ status: 'Verified' })
      .eq('id', itemId)
      .eq('organization_id', orgId);
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
