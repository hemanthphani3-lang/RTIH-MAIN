"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { LocationType } from "@/lib/constants";

/**
 * Creates a new user (Mentor or Manager) with a given email, password, and role.
 * Only callable from the server — uses the Admin client to bypass RLS.
 * Also inserts into the role-specific table (mentors / managers).
 */
export async function createStaffUser(
  email: string,
  password: string,
  fullName: string,
  role: "Mentor" | "Manager",
  location?: LocationType,
  domainNames?: string[]
) {
  try {
    // 1. Look up the role ID
    const { data: roleRow, error: roleErr } = await supabaseAdmin
      .from("roles")
      .select("id")
      .eq("name", role)
      .single();

    if (roleErr || !roleRow) throw new Error(`Role "${role}" not found in roles table`);

    // 2. Create the auth user via Supabase Admin
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm so they can log in immediately
      user_metadata: { full_name: fullName }
    });

    if (authErr || !authData?.user) throw new Error(authErr?.message || "Failed to create auth user");

    const userId = authData.user.id;

    // 3. Insert into user_profiles
    const { error: profileErr } = await supabaseAdmin.from("user_profiles").insert({
      id: userId,
      full_name: fullName,
      email,
      role_id: roleRow.id
    });

    if (profileErr) {
      // Rollback: delete the auth user if profile insertion fails
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error("Failed to create user profile: " + profileErr.message);
    }

    // 4. Insert into role-specific table
    if (role === "Mentor") {
      const { data: mentorRow, error: mentorErr } = await supabaseAdmin.from("mentors").insert({
        user_id: userId,
        location: location || null,
        max_capacity: 5
      }).select("id").single();
      
      if (mentorErr || !mentorRow) throw new Error("Failed to insert into mentors: " + (mentorErr?.message || "No ID returned"));

      // Insert multiple domains
      if (domainNames && domainNames.length > 0) {
        // Fetch domain IDs
        const { data: domains } = await supabaseAdmin.from("domains").select("id, name").in("name", domainNames);
        if (domains && domains.length > 0) {
          const mentorDomains = domains.map(d => ({
            mentor_id: mentorRow.id,
            domain_id: d.id
          }));
          const { error: mdErr } = await supabaseAdmin.from("mentor_domains").insert(mentorDomains);
          if (mdErr) throw new Error("Failed to assign mentor domains: " + mdErr.message);
        }
      }

    } else if (role === "Manager") {
      const { error: managerErr } = await supabaseAdmin.from("managers").insert({
        user_id: userId,
        location: location || null
      });
      if (managerErr) throw new Error("Failed to insert into managers: " + managerErr.message);
    }

    return { success: true, userId };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Fetch all existing Mentors with their profile info and associated domains.
 */
export async function getAllMentors() {
  const { data, error } = await supabaseAdmin
    .from("mentors")
    .select(`
      id, 
      user_id,
      location,
      max_capacity, 
      mentor_domains( domains(name) )
    `);

  if (error) return { success: false, error: error.message, data: [] };
  
  // Fetch profiles separately due to foreign key constraints
  const userIds = data?.map(m => m.user_id).filter(Boolean) || [];
  let profiles: any[] = [];
  if (userIds.length > 0) {
    const { data: pData } = await supabaseAdmin
      .from("user_profiles")
      .select("id, full_name, email")
      .in("id", userIds);
    if (pData) profiles = pData;
  }

  // Format the data to make it easier for the frontend to consume domains
  const formattedData = data?.map((m: any) => {
    const profile = profiles.find(p => p.id === m.user_id) || {};
    return {
      ...m,
      user_profiles: profile,
      domains: m.mentor_domains?.map((md: any) => md.domains?.name).filter(Boolean) || []
    };
  });

  return { success: true, data: formattedData || [] };
}

/**
 * Fetch all existing Managers with their profile info and location.
 */
export async function getAllManagers() {
  const { data, error } = await supabaseAdmin
    .from("managers")
    .select("id, location, user_profiles(id, full_name, email)");

  if (error) return { success: false, error: error.message, data: [] };
  return { success: true, data: data || [] };
}

/**
 * Fetch a specific manager's location using their auth user ID
 */
export async function getManagerLocation(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("managers")
    .select("location")
    .eq("user_id", userId)
    .single();
    
  if (error) return { success: false, error: error.message };
  return { success: true, location: data?.location };
}
