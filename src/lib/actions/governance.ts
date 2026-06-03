"use server";

import { supabaseAdmin } from "@/lib/supabase/server";

export type GovernanceAction = 
  | "STARTUP_APPROVED" 
  | "STARTUP_REJECTED" 
  | "MANUAL_PROMOTION" 
  | "CERTIFICATE_REVOKED" 
  | "RISK_OVERRIDE" 
  | "MENTOR_ASSIGNED";

/**
 * Log a high-level governance/compliance event.
 */
export async function logGovernanceAction(
  action: GovernanceAction,
  entityType: string,
  entityId: string,
  userId: string,
  details: any = {}
) {
  try {
    const { error } = await supabaseAdmin.from("governance_logs").insert({
      action,
      entity_type: entityType,
      entity_id: entityId,
      user_id: userId,
      details
    });

    if (error) throw new Error(error.message);
    return { success: true };
  } catch (err: any) {
    console.error("Governance log failed:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetch governance logs for the admin dashboard.
 */
export async function getGovernanceLogs(limit: number = 50) {
  try {
    const { data, error } = await supabaseAdmin
      .from("governance_logs")
      .select(`
        id, action, entity_type, entity_id, created_at, details,
        user_profiles!user_id(full_name, email)
      `)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message, data: [] };
  }
}
