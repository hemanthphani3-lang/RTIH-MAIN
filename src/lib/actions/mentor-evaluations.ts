"use server";

import { supabaseAdmin } from "../supabase/server";

export async function getActionItems(orgId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from("action_items")
      .select(`
        *,
        mentor:mentor_id(id, user_profiles!mentors_user_id_fkey(full_name))
      `)
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createActionItem(orgId: string, mentorId: string, payload: any) {
  try {
    const { data, error } = await supabaseAdmin
      .from("action_items")
      .insert({
        organization_id: orgId,
        mentor_id: mentorId,
        title: payload.title,
        description: payload.description,
        priority: payload.priority,
        due_date: payload.dueDate
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Update org health score negatively if priority is high/critical
    if (payload.priority === 'High' || payload.priority === 'Critical') {
      const { data: org } = await supabaseAdmin.from('organizations').select('health_score').eq('id', orgId).single();
      if (org) {
        const penalty = payload.priority === 'Critical' ? 10 : 5;
        const newScore = Math.max(0, (org.health_score || 100) - penalty);
        await supabaseAdmin.from('organizations').update({ health_score: newScore }).eq('id', orgId);
      }
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateActionItemStatus(itemId: string, status: string, orgId: string) {
  try {
    const { error } = await supabaseAdmin
      .from("action_items")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", itemId);

    if (error) throw new Error(error.message);

    if (status === 'Completed') {
      // Reward health score
      const { data: org } = await supabaseAdmin.from('organizations').select('health_score').eq('id', orgId).single();
      if (org) {
        const newScore = Math.min(100, (org.health_score || 0) + 5);
        await supabaseAdmin.from('organizations').update({ health_score: newScore }).eq('id', orgId);
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
