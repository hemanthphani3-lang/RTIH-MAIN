import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';
import path from 'path';

// Load env vars the Next.js way
loadEnvConfig(process.cwd());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearAuth() {
  console.log("Fetching all users from Supabase Auth...");
  const { data, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error("Error fetching users:", error.message);
    return;
  }
  
  let deletedCount = 0;

  for (const user of data.users) {
    // Check their role
    const { data: profile } = await supabase.from('user_profiles').select('roles(name)').eq('id', user.id).single();
    const roleName = profile?.roles ? (profile.roles as any).name : null;
    
    // If they are NOT an Admin, Manager, or Mentor, we delete them (meaning they are an Organization or orphaned)
    if (roleName !== 'Admin' && roleName !== 'Manager' && roleName !== 'Mentor') {
      console.log(`Deleting Organization/Orphaned user: ${user.email}`);
      
      const { data: org } = await supabase.from('organizations').select('id').eq('founder_id', user.id).single();
      if (org) {
        await supabase.from('verification_requests').delete().eq('organization_id', org.id);
      }
      await supabase.from('organizations').delete().eq('founder_id', user.id);
      await supabase.from('user_profiles').delete().eq('id', user.id);
      
      // Finally, delete from Auth
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
      if (deleteError) {
        console.error(`Failed to delete ${user.email}:`, deleteError.message);
      } else {
        deletedCount++;
      }
    }
  }
  
  console.log(`\nSuccessfully deleted ${deletedCount} test organization accounts!`);
}

clearAuth();
