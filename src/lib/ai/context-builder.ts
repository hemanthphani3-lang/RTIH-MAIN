import { supabaseAdmin } from "../supabase/server";

export async function getOrganizationContext(userId: string) {
  try {
    const { data: org, error: orgErr } = await supabaseAdmin.from('organizations').select('id, name, stage, status, created_at, primary_domain_id').eq('founder_id', userId).single();
    
    if (orgErr || !org) return "Organization context not found.";
    
    const { data: milestones } = await supabaseAdmin.from('milestones').select('*').eq('organization_id', org.id);
    
    return `STARTUP PROFILE DATA:
Profile: ${JSON.stringify(org)}
Milestones: ${JSON.stringify(milestones || [])}

Use this data to answer any questions the organization asks about their own profile, progress, or status.`;
  } catch (error) {
    console.error("[Context Builder] Organization context failed", error);
    return "Context unavailable";
  }
}

export async function getMentorContext(mentorId: string) {
  try {
    const { data: mentor, error: mentorErr } = await supabaseAdmin.from('mentors').select('*, domains(name)').eq('user_id', mentorId).single();
    if (mentorErr) return "Mentor context not found.";
    
    const { data: domainStartups } = await supabaseAdmin.from('organizations').select('name, stage, status').eq('primary_domain_id', mentor?.domain_id);

    return `MENTOR DATA CONTEXT:
Your Profile: ${JSON.stringify(mentor || {})}
Startups in your Domain: ${JSON.stringify(domainStartups || [])}

Use this data to answer any questions the mentor asks about startups they are overseeing or their own domain.`;
  } catch (error) {
    console.error("[Context Builder] Mentor context failed", error);
    return "Context unavailable";
  }
}

export async function getManagerContext(managerId: string) {
  try {
    const { data: manager, error: managerErr } = await supabaseAdmin.from('managers').select('*, domains(name)').eq('user_id', managerId).single();
    if (managerErr) return "Manager context not found.";
    
    let domainStartups: any[] = [];
    let domainMentors: any[] = [];
    
    if (manager?.domain_id) {
       const resStartups = await supabaseAdmin.from('organizations').select('name, stage, status, created_at').eq('primary_domain_id', manager.domain_id);
       domainStartups = resStartups.data || [];
       
       const resMentors = await supabaseAdmin.from('mentors').select('id, user_profiles(full_name, email)').eq('domain_id', manager.domain_id);
       domainMentors = resMentors.data || [];
    }

    return `MANAGER DATA CONTEXT:
Your Domain: ${manager?.domains?.name || 'Unknown'}
Startups in your Domain: ${JSON.stringify(domainStartups)}
Mentors in your Domain: ${JSON.stringify(domainMentors)}

You have access to all of this data. Whenever the manager asks a question about startups or mentors, USE THIS DATA to answer it comprehensively!`;
  } catch (error) {
    console.error("[Context Builder] Manager context failed", error);
    return "Context unavailable";
  }
}

export async function getAdminContext() {
  try {
    const { data: allStartups } = await supabaseAdmin.from('organizations').select('name, stage, status, primary_domain_id');
    const { data: allMentors } = await supabaseAdmin.from('mentors').select('id, user_profiles(full_name, email), domains(name)');

    return `ADMIN DATA CONTEXT:
All Startups: ${JSON.stringify(allStartups || [])}
All Mentors: ${JSON.stringify(allMentors || [])}

You are an Admin. You have access to the entire platform's data. Use this data to answer ANY questions about startups, mentors, or overall ecosystem analytics!`;
  } catch (error) {
    console.error("[Context Builder] Admin context failed", error);
    return "Context unavailable";
  }
}
