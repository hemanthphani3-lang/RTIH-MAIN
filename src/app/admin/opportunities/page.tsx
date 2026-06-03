"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { getOpportunities, getParticipationStats } from "@/lib/actions/opportunities";
import { supabase } from "@/lib/supabase/client";
import { Rocket, Target, Users, Activity, BarChart3 } from "lucide-react";

export default function AdminOpportunitiesAnalyticsPage() {
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ appsCount: 0, oppsCount: 0, activeCount: 0 });
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const [oppRes, statsRes] = await Promise.all([
      getOpportunities(),
      getParticipationStats()
    ]);
    if (oppRes.success) setOpportunities(oppRes.data);
    if (statsRes.success) setStats(statsRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const ch = supabase.channel("admin-opportunities")
      .on("postgres_changes", { event: "*", schema: "public", table: "opportunities" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "opportunity_applications" }, loadData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadData]);

  if (loading) return <DashboardLayout><div className="p-8 text-center text-white">Loading Ecosystem Data...</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
        
        {/* Header */}
        <div className="flex items-center justify-between bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Ecosystem Opportunities Overview</h1>
            <p className="text-slate-400 mt-1 text-sm">Global visibility into all Hackathons, Challenges, and Grants.</p>
          </div>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-500/20 rounded-lg"><Rocket className="w-5 h-5 text-indigo-400" /></div>
              <h3 className="text-slate-400 font-bold uppercase text-xs tracking-wider">Total Opportunities</h3>
            </div>
            <p className="text-4xl font-extrabold text-white">{stats.oppsCount}</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/20 rounded-lg"><Target className="w-5 h-5 text-blue-400" /></div>
              <h3 className="text-slate-400 font-bold uppercase text-xs tracking-wider">Applications Submitted</h3>
            </div>
            <p className="text-4xl font-extrabold text-white">{stats.appsCount}</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-500/20 rounded-lg"><Activity className="w-5 h-5 text-green-400" /></div>
              <h3 className="text-slate-400 font-bold uppercase text-xs tracking-wider">Active Participants</h3>
            </div>
            <p className="text-4xl font-extrabold text-white">{stats.activeCount}</p>
          </div>
        </div>

        {/* Global List */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-indigo-400" /> Opportunity Performance
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Title</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Type</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Domain</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Capacity</th>
                </tr>
              </thead>
              <tbody>
                {opportunities.map((opp) => (
                  <tr key={opp.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-white">{opp.title}</p>
                      <p className="text-xs text-slate-500">{new Date(opp.created_at).toLocaleDateString()}</p>
                    </td>
                    <td className="p-4"><span className="text-xs font-bold bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded border border-indigo-500/20">{opp.type}</span></td>
                    <td className="p-4 text-sm text-slate-300">{opp.domains?.name || 'All'}</td>
                    <td className="p-4">
                      <span className={`text-xs font-bold px-2 py-1 rounded border ${opp.status === 'Published' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                        {opp.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-300">{opp.capacity || 'Unlimited'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {opportunities.length === 0 && <p className="text-center text-slate-500 py-8">No opportunities have been created yet.</p>}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
