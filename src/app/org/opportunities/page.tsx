"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { getOpportunities, getRecommendedOpportunities } from "@/lib/actions/opportunities";
import { supabase } from "@/lib/supabase/client";
import { Rocket, Sparkles, MapPin, Users, ChevronRight, Search } from "lucide-react";
import Link from "next/link";

export default function OrgOpportunitiesHub() {
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [recommended, setRecommended] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const [oppRes, recRes] = await Promise.all([
        getOpportunities({ status: 'Published' }),
        getRecommendedOpportunities(user.id)
      ]);

      if (oppRes.success) setOpportunities(oppRes.data);
      if (recRes.success) setRecommended(recRes.data);
      setLoading(false);
    }
    loadData();
  }, []);

  const filteredOpps = opportunities.filter(o => o.title.toLowerCase().includes(search.toLowerCase()) || o.type.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <DashboardLayout><div className="p-8 text-center text-slate-900 dark:text-white">Loading Ecosystem Opportunities...</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-8 rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              <Rocket className="w-8 h-8 text-indigo-400" /> Opportunities Hub
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-xl">Discover hackathons, grants, funding calls, and ecosystem programs tailored for your startup.</p>
          </div>
          <div className="relative z-10 w-full md:w-auto">
            <Link href="/org/applications" className="bg-white/60 dark:bg-white/10 hover:bg-white/20 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white px-6 py-3 rounded-xl font-bold transition-colors inline-block w-full md:w-auto text-center">
              My Applications
            </Link>
          </div>
        </div>

        {/* Recommended Opportunities */}
        {recommended.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#FFD700]" /> Recommended for You
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommended.map(({ score, reason, opportunities: opp }) => (
                <div key={opp.id} className="bg-gradient-to-br from-[#FFD700]/10 to-[#FFD700]/5 border border-[#FFD700]/30 rounded-3xl p-6 flex flex-col relative group">
                  <div className="absolute top-4 right-4 bg-[#FFD700] text-black text-[10px] font-bold px-2 py-1 rounded-md uppercase">Match</div>
                  <div className="mb-4 pt-4">
                    <span className="text-xs text-[#FFD700] font-bold uppercase tracking-wider">{opp.type}</span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1 leading-tight">{opp.title}</h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 flex-grow">{reason}</p>
                  <Link href={`/org/opportunities/${opp.id}`} className="w-full text-center py-2.5 rounded-xl bg-[#FFD700]/20 hover:bg-[#FFD700]/30 border border-[#FFD700]/30 text-[#FFD700] text-sm font-bold transition-colors">
                    View Details
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Opportunities */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Ecosystem Opportunities</h2>
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search opportunities..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-slate-200 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredOpps.map((opp) => (
              <Link key={opp.id} href={`/org/opportunities/${opp.id}`} className="group bg-white dark:bg-white/5 hover:bg-white/60 dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-2xl p-5 flex flex-col md:flex-row gap-6 transition-all items-center">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">{opp.type}</span>
                    <span className="text-slate-600 text-[10px]">•</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">{opp.domains?.name || 'All Domains'}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-400 transition-colors">{opp.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">{opp.description}</p>
                </div>
                
                <div className="flex items-center gap-6 w-full md:w-auto">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <MapPin className="w-4 h-4 text-slate-500" /> {opp.mode}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Users className="w-4 h-4 text-slate-500" /> {opp.capacity || 'Unlimited'}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white dark:bg-white/5 flex items-center justify-center group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition-colors ml-auto md:ml-0">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </Link>
            ))}
            {filteredOpps.length === 0 && (
              <div className="text-center py-12 text-slate-500 border border-white/5 rounded-2xl border-dashed">
                No opportunities found matching your search.
              </div>
            )}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
