"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import AICopilotWorkspace from "@/components/AICopilotWorkspace";
import { supabase } from "@/lib/supabase/client";

export default function GlobalAICopilotPage() {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    async function loadRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('roles(name)')
        .eq('id', user.id)
        .single();
        
      if (profile && profile.roles) {
        setRole((profile.roles as any).name);
      } else {
        setRole("organization");
      }
    }
    loadRole();
  }, []);

  if (!role) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center text-slate-400">Initializing Copilot...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">AI Innovation Copilot</h1>
          <p className="text-slate-400 mt-1 text-sm">Your state-of-the-art intelligent assistant for ecosystem navigation.</p>
        </div>
        
        <AICopilotWorkspace userRole={role} />
      </div>
    </DashboardLayout>
  );
}
