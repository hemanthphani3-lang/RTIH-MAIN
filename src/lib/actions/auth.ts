"use server";

import { supabaseAdmin } from "@/lib/supabase/server";

export async function registerOrganization(data: any) {
  try {
    // 1. Create user via Admin API (Bypasses client-side rate limits & auto-confirms email)
    const { data: authData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email.trim(),
      password: data.password,
      email_confirm: true,
    });

    if (signUpError) throw new Error(signUpError.message);
    if (!authData.user) throw new Error("Registration failed");

    const userId = authData.user.id;

    // 2. Get Organization Role ID
    const { data: roleData } = await supabaseAdmin.from("roles").select("id").eq("name", "Organization").single();

    // 3. Create User Profile
    const { error: profileError } = await supabaseAdmin.from("user_profiles").insert({
      id: userId,
      role_id: roleData?.id,
      full_name: data.fullName,
      email: data.email,
      mobile: data.mobile,
    });
    if (profileError) throw new Error("Profile Error: " + profileError.message);

    // 4. Create Organization (Status: Pending)
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from("organizations")
      .insert({
        founder_id: userId,
        name: data.orgName,
        description: data.orgDescription,
        problem_statement: data.orgProblem,
        solution: data.orgSolution,
        website: data.orgWebsite,
        stage: data.orgStage,
        primary_domain_id: data.primaryDomain || null,
        status: "Pending",
      })
        .select()
      .single();
    if (orgError) throw new Error("Organization Error: " + orgError.message);

    // 5. Submit Verification Request
    const { error: verificationError } = await supabaseAdmin.from("verification_requests").insert({
      organization_id: orgData.id,
      level: 1,
      status: "Pending",
    });
    if (verificationError) throw new Error("Verification Error: " + verificationError.message);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
