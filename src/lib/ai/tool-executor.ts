import { supabaseAdmin } from "../supabase/server";

export async function executeTool(intent: string, params: any, role: string, entityId?: string, currentModule?: string) {
  try {
    const safeRole = role?.toLowerCase() || '';
    
    switch (intent) {
      case 'WHAT_SHOULD_I_DO_NEXT':
      case 'NEXT_ACTIONS': {
        // Build actionable tasks based on role
        if (safeRole === 'organization') {
          const { data } = await supabaseAdmin.from('organizations').select('stage, status').eq('founder_id', entityId).single();
          return { success: true, data: JSON.stringify({ context: "Organization pending actions and status", pending_actions: ["Update Profile", "Complete Next Milestone", "Check Feedback"], current_status: data }) };
        } else if (safeRole === 'mentor') {
           return { success: true, data: JSON.stringify({ context: "Mentor pending actions", pending_actions: ["Review assigned startups", "Schedule monthly sessions"] }) };
        } else if (safeRole === 'manager') {
           return { success: true, data: JSON.stringify({ context: "Manager pending actions", pending_actions: ["Review pending startup approvals", "Balance mentor workloads"] }) };
        } else {
           return { success: true, data: JSON.stringify({ context: "Admin pending actions", pending_actions: ["Review ecosystem health", "Generate executive report"] }) };
        }
      }

      case 'LIST_MENTORS':
      case 'count_mentors': {
        // use 'mentors' table instead of 'profiles'
        const { data, error } = await supabaseAdmin.from('mentors')
            .select('id, user_profiles(full_name, email), domains(name), created_at');
        if (error) throw error;
        return { success: true, data: JSON.stringify({ context: "List of all mentors in the database", mentor_records: data }) };
      }

      case 'LIST_STARTUPS':
      case 'LIST_ORGANIZATIONS':
      case 'search_startups': {
        let query = supabaseAdmin.from('organizations').select('name, stage, status');
        
        if (safeRole === 'manager' && entityId) {
            const { data: profile } = await supabaseAdmin.from('managers').select('domain_id').eq('user_id', entityId).single();
            if (profile?.domain_id) query = query.eq('primary_domain_id', profile.domain_id);
        }
        
        if (params?.stage) query = query.eq('stage', params.stage);

        const { data, error } = await query;
        if (error) throw error;
        return { success: true, data: JSON.stringify({ context: "List of startups based on search criteria", startup_records: data }) };
      }

      case 'STARTUP_SUMMARY': {
        let query = supabaseAdmin.from('organizations').select('name, stage, status, domains(name)');
        if (params?.target) {
            query = query.ilike('name', `%${params.target}%`);
        } else if (safeRole === 'organization' && entityId) {
            query = query.eq('founder_id', entityId);
        }
        const { data, error } = await query.limit(5); // In case multiple match
        if (error) throw error;
        return { success: true, data: JSON.stringify({ context: "Summary details of specific startups", startup_records: data }) };
      }

      case 'HEALTH_ANALYSIS':
      case 'analyze_health': {
        let query = supabaseAdmin.from('organizations').select('name, stage, status');
        if (safeRole === 'organization' && entityId) {
            query = query.eq('founder_id', entityId);
        } else if (params?.target) {
            query = query.ilike('name', `%${params.target}%`);
        }
        const { data, error } = await query.limit(5);
        if (error) throw error;
        return { success: true, data: JSON.stringify({ context: "Health analysis details of startups", startup_records: data }) };
      }

      case 'REPORT_GENERATION':
      case 'ECOSYSTEM_ANALYSIS':
      case 'ecosystem_report': {
        const { count: totalOrgs } = await supabaseAdmin.from('organizations').select('*', { count: 'exact', head: true });
        const { count: totalMentors } = await supabaseAdmin.from('mentors').select('*', { count: 'exact', head: true });
        
        return {
            success: true,
            data: JSON.stringify({
                context: "High level ecosystem metrics",
                total_startups: totalOrgs,
                total_mentors: totalMentors
            })
        };
      }

      default:
        return { success: true, data: "Intent not mapped to a specific tool. Proceeding with general context." };
    }
  } catch (error: any) {
    console.error("[Tool Executor Error]", error.message);
    return { success: false, data: "I couldn't access the requested data, but I can still help answer general questions." };
  }
}
