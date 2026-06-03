import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://lqedyacvbbteymhtpkxr.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxZWR5YWN2YmJ0ZXltaHRwa3hyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDQxMjQ2OCwiZXhwIjoyMDk1OTg4NDY4fQ.E1elYeQx6q5uD5LrJRJpJ99nXNhBDk_8BkUGL0eZNDw";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function seed() {
  console.log("Seeding Roles and Domains...");
  const defaultRoles = ['Organization', 'Mentor', 'Manager', 'Admin'];
  for (const role of defaultRoles) {
    await supabase.from('roles').upsert({ name: role }, { onConflict: 'name' });
  }

  const defaultDomains = ['AI', 'EV', 'AgriTech', 'HealthTech', 'FinTech', 'EdTech'];
  for (const domain of defaultDomains) {
    await supabase.from('domains').upsert({ name: domain }, { onConflict: 'name' });
  }

  const usersToCreate = [
    { email: 'f@gmail.com', role: 'Organization', name: 'Founder User' },
    { email: 'm@gmail.com', role: 'Mentor', name: 'Mentor User' },
    { email: 'man@gmail.com', role: 'Manager', name: 'Manager User' },
    { email: 'a@gmail.com', role: 'Admin', name: 'Admin User' }
  ];

  // Fetch roles
  const { data: roles, error: rolesError } = await supabase.from('roles').select('*');
  if (rolesError) {
    console.error("Error querying roles:", rolesError);
  }
  if (!roles || roles.length === 0) {
    console.error("Roles not found in DB. Data array is empty or null.");
    return;
  }

  for (const u of usersToCreate) {
    console.log("Creating user:", u.email);
    // 1. Create auth user
    // Note: We use 'rtih12' because Supabase enforces a 6-character minimum for passwords by default.
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: u.email,
      password: 'rtih12', 
      email_confirm: true
    });

    if (authError) {
      if (authError.message.includes("already registered")) {
        console.log(`User ${u.email} already exists, skipping creation...`);
      } else {
        console.log("Error creating auth user:", authError.message);
      }
      continue;
    }

    const userId = authUser.user.id;
    const roleId = roles.find(r => r.name === u.role).id;

    // 2. Create user profile
    const { error: profileError } = await supabase.from('user_profiles').upsert({
      id: userId,
      role_id: roleId,
      full_name: u.name,
      email: u.email
    });

    if (profileError) {
      console.log("Error creating profile:", profileError.message);
    } else {
      console.log(`Successfully created ${u.email} with role ${u.role}`);
    }
  }

  // ==========================================
  // PHASE 2: Seed Startup Stages & Milestones
  // ==========================================
  console.log("Seeding Startup Stages & Milestones...");
  const stages = [
    { sequence: 1, name: "Idea Stage", desc: "Initial formulation and conceptualization" },
    { sequence: 2, name: "Validation Stage", desc: "Problem-solution fit and customer discovery" },
    { sequence: 3, name: "Prototype Stage", desc: "Building the initial prototype" },
    { sequence: 4, name: "MVP Stage", desc: "Minimum viable product and early adoption" },
    { sequence: 5, name: "Growth Stage", desc: "Scaling operations and revenue" },
    { sequence: 6, name: "Funding Stage", desc: "Investment readiness and pitching" }
  ];

  for (const s of stages) {
    // Check if stage exists first
    const { data: existingStage } = await supabase
      .from('startup_stages')
      .select('id')
      .eq('name', s.name)
      .maybeSingle();

    let stageId;
    if (existingStage) {
      stageId = existingStage.id;
    } else {
      const { data: stageData, error: stageError } = await supabase
        .from('startup_stages')
        .insert({ name: s.name, sequence: s.sequence, description: s.desc })
        .select('id')
        .single();
        
      if (stageError) {
        console.error(`Error inserting stage ${s.name}:`, stageError.message);
        continue;
      }
      stageId = stageData.id;
    }

    // Default milestones for each stage
    const milestonesToInsert = [];
    if (s.sequence === 1) {
      milestonesToInsert.push({ title: "Problem Statement Definition", description: "Clearly define the problem you are solving.", stage_id: stageId });
      milestonesToInsert.push({ title: "Market Research", description: "Analyze the current market landscape.", stage_id: stageId });
    } else if (s.sequence === 2) {
      milestonesToInsert.push({ title: "Customer Interviews", description: "Conduct at least 10 customer discovery interviews.", stage_id: stageId });
      milestonesToInsert.push({ title: "Competitor Analysis", description: "Identify direct and indirect competitors.", stage_id: stageId });
    } else if (s.sequence === 3) {
      milestonesToInsert.push({ title: "Wireframes / Design", description: "Complete the initial design of the prototype.", stage_id: stageId });
    } else if (s.sequence === 4) {
      milestonesToInsert.push({ title: "MVP Launch", description: "Release the MVP to a small group of beta testers.", stage_id: stageId });
    } else if (s.sequence === 5) {
      milestonesToInsert.push({ title: "First Paying Customer", description: "Acquire the first paying customer.", stage_id: stageId });
    } else if (s.sequence === 6) {
      milestonesToInsert.push({ title: "Pitch Deck Creation", description: "Finalize the investment pitch deck.", stage_id: stageId });
      milestonesToInsert.push({ title: "Financial Projections", description: "Complete 3-year financial projections.", stage_id: stageId });
    }

    if (milestonesToInsert.length > 0) {
      // Because we don't have a unique constraint on milestones title, we just insert them safely
      // However, to prevent duplicates on multiple runs, we can check first or just ignore for the sake of the seed script
      for (const m of milestonesToInsert) {
        const { data: existing } = await supabase.from('milestones').select('id').eq('title', m.title).eq('stage_id', m.stage_id).maybeSingle();
        if (!existing) {
          await supabase.from('milestones').insert(m);
        }
      }
    }
  }

  console.log("Seeding completed successfully.");
}

seed();
