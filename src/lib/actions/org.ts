"use server";

import { supabaseAdmin } from "@/lib/supabase/server";

export type OrganizationFormData = {
  // Founder Auth
  fullName: string;
  email: string;
  password?: string; // If creating new account
  mobile: string;
  
  // Org Details
  orgName: string;
  description: string;
  problemStatement: string;
  solution: string;
  website: string;
  stage: string;
  
  // Domains
  primaryDomain: string;
  secondaryDomains: string[];

  // Documents
  pitchDeckUrl?: string;
  incorporationUrl?: string;
};

export async function registerOrganization(data: OrganizationFormData, existingUserId?: string) {
  try {
    let userId = existingUserId;

    // 1. If not logged in, create the Auth user
    if (!userId) {
      if (!data.password) throw new Error("Password is required for new registration");
      
      const { data: roleData } = await supabaseAdmin.from("roles").select("id").eq("name", "Organization").single();
      if (!roleData) throw new Error("Organization role not found");

      const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: data.fullName }
      });

      if (authErr || !authData.user) throw new Error(authErr?.message || "Failed to create user");
      userId = authData.user.id;

      // Create Profile
      const { error: profileErr } = await supabaseAdmin.from("user_profiles").insert({
        id: userId,
        full_name: data.fullName,
        email: data.email,
        mobile: data.mobile,
        role_id: roleData.id
      });

      if (profileErr) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        throw new Error("Failed to create profile: " + profileErr.message);
      }
    }

    // 2. Resolve Primary Domain ID
    const { data: primaryDomainRow } = await supabaseAdmin
      .from("domains")
      .select("id")
      .eq("name", data.primaryDomain)
      .single();
    
    if (!primaryDomainRow) throw new Error(`Primary domain ${data.primaryDomain} not found.`);

    // 3. Create Organization
    const { data: orgData, error: orgErr } = await supabaseAdmin.from("organizations").insert({
      founder_id: userId,
      name: data.orgName,
      description: data.description,
      problem_statement: data.problemStatement,
      solution: data.solution,
      website: data.website || null,
      stage: data.stage,
      claimed_stage: data.stage,
      verified_stage: "Ideation",
      primary_domain_id: primaryDomainRow.id,
      status: "Pending" // Explicitly pending for Manager review
    }).select("id").single();

    if (orgErr || !orgData) throw new Error("Failed to create organization: " + orgErr?.message);

    // 4. Resolve and insert Secondary Domains
    if (data.secondaryDomains && data.secondaryDomains.length > 0) {
      const { data: secDomains } = await supabaseAdmin
        .from("domains")
        .select("id")
        .in("name", data.secondaryDomains);
        
      if (secDomains && secDomains.length > 0) {
        const orgDomains = secDomains.map(d => ({
          org_id: orgData.id,
          domain_id: d.id
        }));
        await supabaseAdmin.from("organization_domains").insert(orgDomains);
      }
    }

    // 5. Insert Documents if uploaded
    const documentsToInsert = [];
    if (data.pitchDeckUrl) {
      documentsToInsert.push({
        organization_id: orgData.id,
        uploaded_by: userId,
        document_type: "Pitch Deck",
        file_url: data.pitchDeckUrl
      });
    }
    if (data.incorporationUrl) {
      documentsToInsert.push({
        organization_id: orgData.id,
        uploaded_by: userId,
        document_type: "Incorporation Certificate",
        file_url: data.incorporationUrl
      });
    }

    if (documentsToInsert.length > 0) {
      await supabaseAdmin.from("documents").insert(documentsToInsert);
    }

    // 6. Create initial Level 0 verification request
    await supabaseAdmin.from("verification_requests").insert({
      organization_id: orgData.id,
      level: 0,
      status: "Pending"
    });

    return { success: true, orgId: orgData.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getPendingStartupsForManager(managerUserId: string) {
  try {
    // 1. Get manager location
    const { data: managerData, error: manErr } = await supabaseAdmin
      .from("managers")
      .select("location")
      .eq("user_id", managerUserId)
      .single();
      
    if (manErr || !managerData) throw new Error("Manager not found");

    const location = managerData.location;
    // We import LOCATION_DOMAINS dynamically or just pass the allowed domains
    // Wait, since this is a server action, I can import LOCATION_DOMAINS
    const { LOCATION_DOMAINS } = await import("@/lib/constants");
    const allowedDomains = location ? LOCATION_DOMAINS[location as keyof typeof LOCATION_DOMAINS] : [];

    if (allowedDomains.length === 0) return { success: true, data: [] };

    // 2. Get domains that match the allowed domains
    const { data: domains } = await supabaseAdmin.from("domains").select("id").in("name", allowedDomains);
    const domainIds = domains?.map(d => d.id) || [];

    if (domainIds.length === 0) return { success: true, data: [] };

    // 3. Fetch pending organizations with these primary domains
    const { data: orgs, error: orgErr } = await supabaseAdmin
      .from("organizations")
      .select(`
        id, name, description, problem_statement, solution, website, stage, status, created_at,
        user_profiles!founder_id(full_name, email, mobile),
        domains!primary_domain_id(name),
        documents(document_type, file_url)
      `)
      .eq("status", "Pending")
      .in("primary_domain_id", domainIds);

    if (orgErr) throw new Error(orgErr.message);

    return { success: true, data: orgs || [] };
  } catch (err: any) {
    return { success: false, error: err.message, data: [] };
  }
}

export async function updateStartupStatus(orgId: string, status: "Approved" | "Rejected") {
  try {
    const { error } = await supabaseAdmin
      .from("organizations")
      .update({ status })
      .eq("id", orgId);
      
    if (error) throw new Error(error.message);

    // If approved, update the verification request to Level 1
    if (status === "Approved") {
      await supabaseAdmin.from("verification_requests")
        .update({ status: "Approved" })
        .eq("organization_id", orgId)
        .eq("level", 0);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

