"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function JourneyRoadmap({ currentStageName }: { currentStageName: string }) {
  const [stages, setStages] = useState<any[]>([]);

  useEffect(() => {
    async function fetchStages() {
      const { data } = await supabase.from("startup_stages").select("*").order("sequence", { ascending: true });
      if (data) setStages(data);
    }
    fetchStages();
  }, []);

  if (stages.length === 0) return <div>Loading Journey...</div>;

  const currentIndex = stages.findIndex(s => s.name === currentStageName);

  return (
    <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl shadow-xl border border-white/10 text-white">
      <h3 className="text-xl font-bold mb-8">Entrepreneur Journey Roadmap</h3>
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-white/10 z-0 rounded-full" />
        
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 z-0 rounded-full transition-all duration-1000" 
          style={{ width: `${currentIndex > 0 ? (currentIndex / (stages.length - 1)) * 100 : 0}%` }} 
        />

        {stages.map((stage, idx) => {
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const isUpcoming = idx > currentIndex;

          return (
            <div key={stage.id} className="relative z-10 flex flex-col items-center">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all duration-300 shadow-lg ${
                  isCompleted ? "bg-indigo-500 border-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]" :
                  isCurrent ? "bg-white/10 backdrop-blur-md border-[#FFD700] text-[#FFD700] ring-4 ring-[#FFD700]/20" :
                  "bg-white/5 border-white/20 text-slate-400"
                }`}
              >
                {isCompleted ? "✓" : idx + 1}
              </div>
              <p className={`mt-4 text-xs font-semibold max-w-[80px] text-center ${isUpcoming ? 'text-slate-400' : 'text-white'}`}>
                {stage.name}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
