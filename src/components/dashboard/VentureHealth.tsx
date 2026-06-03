"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { completeActionItem } from "@/lib/actions/lifecycle";
import { Target, CheckSquare, Clock } from "lucide-react";

export default function VentureHealth({ orgId, healthData, certs, evalData }: { orgId: string, healthData: any[], certs: any[], evalData: any[] }) {
  const [actionItems, setActionItems] = useState<any[]>([]);
  const [completing, setCompleting] = useState<string | null>(null);

  useEffect(() => {
    async function loadTasks() {
      const { data } = await supabase.from("action_items").select("*").eq("organization_id", orgId).order("created_at", { ascending: false });
      if (data) setActionItems(data);
    }
    loadTasks();
  }, [orgId]);

  const handleComplete = async (id: string) => {
    setCompleting(id);
    const { data: { user } } = await supabase.auth.getUser();
    await completeActionItem(id, user?.id || orgId);
    
    // Refresh
    const { data } = await supabase.from("action_items").select("*").eq("organization_id", orgId).order("created_at", { ascending: false });
    if (data) setActionItems(data);
    
    setCompleting(null);
  };

  const pending = actionItems.filter(i => i.status === 'Pending').length;
  
  const health = healthData?.[0] || { current_score: 50, trend: 'Stable', status: 'Pending Data' };
  const latestEval = evalData?.[0];
  const activeCerts = certs || [];

  return (
    <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl shadow-xl border border-white/10 text-white space-y-8">
      {/* Health Score Header */}
      <div className="flex justify-between items-center border-b border-white/10 pb-6">
        <div>
          <h3 className="text-2xl font-extrabold flex items-center gap-2">
            Venture Health
          </h3>
          <p className={`text-sm font-bold mt-1 ${health.trend === 'Improving' ? 'text-green-400' : health.trend === 'Declining' ? 'text-red-400' : 'text-slate-300'}`}>
            Trend: {health.trend} • Status: {health.status}
          </p>
        </div>
        <div className="text-right bg-black/20 px-6 py-4 rounded-2xl border border-white/10 shadow-inner">
          <span className="text-4xl font-extrabold text-[#FFD700] drop-shadow-[0_0_15px_rgba(255,215,0,0.4)]">{health.current_score}</span>
          <p className="text-xs text-slate-300 font-bold uppercase tracking-widest mt-1">System Score</p>
        </div>
      </div>

      {/* Certifications */}
      {activeCerts.length > 0 && (
        <div className="bg-green-500/10 border border-green-500/20 p-5 rounded-2xl">
          <h4 className="font-bold text-green-400 text-sm tracking-wide uppercase mb-3">Active Certifications</h4>
          <div className="flex flex-wrap gap-2">
            {activeCerts.map((cert: any, idx: number) => (
              <span key={idx} className="bg-green-500 text-black text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm">
                🏆 {cert.certificate_type}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Mentor Evaluation */}
      {latestEval && (
        <div className="bg-indigo-500/10 border border-indigo-500/20 p-5 rounded-2xl">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-bold text-indigo-400 text-sm tracking-wide uppercase">Latest Mentor Evaluation</h4>
            <span className="bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-full">{latestEval.evaluation_score}/100</span>
          </div>
          <div className="space-y-3 text-sm">
            <div>
              <span className="font-semibold text-green-400">Strengths:</span>
              <p className="text-slate-300 mt-0.5">{latestEval.strengths}</p>
            </div>
            <div>
              <span className="font-semibold text-red-400">Weaknesses:</span>
              <p className="text-slate-300 mt-0.5">{latestEval.weaknesses}</p>
            </div>
            <div className="bg-white/5 p-3 rounded-xl border border-white/5 mt-2">
              <span className="font-semibold text-[#FFD700]">Recommendation:</span>
              <p className="text-white mt-1 italic">"{latestEval.recommendations}"</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Items */}
      <div>
        <h4 className="font-bold text-sm text-slate-300 mb-4 flex items-center gap-2 uppercase tracking-wide">
          <Target className="w-5 h-5 text-[#FFD700]" /> Pending Action Items ({pending})
        </h4>
        
        {pending === 0 ? (
          <p className="text-sm text-slate-400 bg-white/5 border border-white/10 p-5 rounded-2xl italic">You are all caught up!</p>
        ) : (
          <div className="space-y-3">
            {actionItems.filter(i => i.status === 'Pending').map((item) => (
              <div key={item.id} className="p-4 border border-white/10 bg-white/5 backdrop-blur-sm rounded-2xl flex items-start gap-4 transition-all hover:bg-white/10">
                <button 
                  onClick={() => handleComplete(item.id)}
                  disabled={completing === item.id}
                  className="mt-0.5 text-slate-400 hover:text-green-400 transition-colors disabled:opacity-50"
                >
                  <CheckSquare className="w-6 h-6" />
                </button>
                <div>
                  <p className="font-bold text-sm text-white flex items-center gap-2">
                    {item.title}
                    {item.priority === 'High' && <span className="bg-red-500/20 text-red-400 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider border border-red-500/30">High Priority</span>}
                  </p>
                  <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{item.description}</p>
                  {item.due_date && (
                    <p className="text-xs text-[#FFD700] mt-2 flex items-center gap-1.5 font-semibold">
                      <Clock className="w-3.5 h-3.5" /> Due: {new Date(item.due_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
