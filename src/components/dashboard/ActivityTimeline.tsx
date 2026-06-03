"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function ActivityTimeline({ orgId }: { orgId: string }) {
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    async function fetchTimeline() {
      const { data } = await supabase
        .from("activity_timeline")
        .select(`
          *,
          user_profiles:actor (full_name, roles (name))
        `)
        .eq("organization_id", orgId)
        .order("timestamp", { ascending: false })
        .limit(10);
        
      if (data) setActivities(data);
    }
    fetchTimeline();

    // Setup realtime subscription
    const channel = supabase.channel('timeline-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_timeline', filter: `organization_id=eq.${orgId}` }, payload => {
        fetchTimeline();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orgId]);

  return (
    <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl shadow-xl border border-white/10 text-white">
      <h3 className="text-xl font-bold mb-6">Activity Timeline</h3>
      {activities.length === 0 ? (
        <p className="text-sm text-slate-400 bg-white/5 p-4 rounded-xl border border-white/10">No activity recorded yet.</p>
      ) : (
        <div className="space-y-4">
          {activities.map((act) => (
            <div key={act.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-[#FFD700] mt-1.5 shadow-[0_0_10px_rgba(255,215,0,0.5)]" />
                <div className="w-px h-full bg-white/10 mt-2" />
              </div>
              <div className="pb-6">
                <p className="text-sm font-bold text-white">{act.event}</p>
                <p className="text-sm text-slate-300 mt-1">{act.description}</p>
                <p className="text-xs text-slate-400 mt-2 font-medium">
                  {new Date(act.timestamp).toLocaleString()} • {act.user_profiles?.full_name} ({act.user_profiles?.roles?.name})
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
