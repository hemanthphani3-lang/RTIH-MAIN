"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { getOpportunities, createOpportunity } from "@/lib/actions/opportunities";
import { supabase } from "@/lib/supabase/client";
import { Plus, Rocket, Users, Calendar, MapPin, Globe, Activity, Eye, FileText } from "lucide-react";
import Link from "next/link";
import { ALL_DOMAINS, LOCATION_DOMAINS, LocationType } from "@/lib/constants";

export default function ManagerOpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    title: "", description: "", type: "Hackathon", domain: ALL_DOMAINS[0], 
    location: "Visakhapatnam", mode: "Online", capacity: 100, stageRequirements: ["Ideation", "MVP"],
    startDate: "", durationDays: 3
  });
  const [userId, setUserId] = useState("");
  const [managerLocation, setManagerLocation] = useState<string>("");
  const [allowedDomains, setAllowedDomains] = useState<string[]>(ALL_DOMAINS);

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      const { data: mgr } = await supabase.from("managers").select("location").eq("user_id", user.id).single();
      if (mgr?.location) {
        setManagerLocation(mgr.location);
        const allowed = LOCATION_DOMAINS[mgr.location as LocationType] || ALL_DOMAINS;
        setAllowedDomains(allowed);
        setFormData(prev => ({ ...prev, location: mgr.location, domain: allowed[0] || "" }));
      }
    }
    const res = await getOpportunities();
    if (res.success) setOpportunities(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const ch = supabase.channel("mgr-opportunities")
      .on("postgres_changes", { event: "*", schema: "public", table: "opportunities" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "opportunity_applications" }, loadData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await createOpportunity(formData, userId);
    if (res.success) {
      setShowCreateModal(false);
      await loadData();
    } else {
      alert("Error: " + res.error);
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
        
        {/* Header */}
        <div className="flex items-center justify-between bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-6 rounded-3xl">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Opportunities Engine</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Create and manage hackathons, grants, and ecosystem programs.</p>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="bg-[#FFD700] text-black px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:shadow-[0_0_20px_rgba(255,215,0,0.4)] transition-all">
            <Plus className="w-5 h-5" /> Create Opportunity
          </button>
        </div>

        {/* List */}
        {loading && !showCreateModal ? (
          <div className="text-center text-slate-500 dark:text-slate-400 py-10">Loading opportunities...</div>
        ) : opportunities.length === 0 ? (
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-16 text-center">
            <Rocket className="w-16 h-16 text-slate-500 mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No active opportunities</h3>
            <p className="text-slate-500 dark:text-slate-400">Launch a new hackathon, funding call, or startup challenge.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {opportunities.map((opp) => (
              <div key={opp.id} className="bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl p-6 flex flex-col group hover:bg-white/60 dark:bg-white/10 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 px-2 py-1 rounded-md font-bold uppercase">{opp.type}</span>
                      <span className="text-[10px] bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20 px-2 py-1 rounded-md font-bold uppercase">{opp.domains?.name || 'All'}</span>
                      <span className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase border ${opp.status === 'Published' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20'}`}>{opp.status}</span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{opp.title}</h2>
                  </div>
                </div>
                
                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-6 flex-grow">{opp.description}</p>
                
                <div className="grid grid-cols-2 gap-4 mb-6 pt-4 border-t border-slate-200 dark:border-white/10">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <MapPin className="w-4 h-4 text-slate-500" /> {opp.location} ({opp.mode})
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Users className="w-4 h-4 text-slate-500" /> Capacity: {opp.capacity || 'Unlimited'}
                  </div>
                </div>

                <div className="flex gap-3 mt-auto">
                  <Link href={`/manager/opportunities/${opp.id}/applications`} className="flex-1 text-center py-2.5 rounded-xl bg-white dark:bg-white/5 hover:bg-white/60 dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm font-bold transition-colors">
                    Review Applications
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative z-10 w-full max-w-2xl bg-[#0b1121] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl p-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-6">Create Opportunity</h2>
            <form onSubmit={handleCreate} className="space-y-5">
              
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1 block">Type</label>
                  <select required value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full bg-slate-200 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white">
                    <option value="Hackathon">Hackathon</option>
                    <option value="Startup Challenge">Startup Challenge</option>
                    <option value="Funding Call">Funding Call</option>
                    <option value="Grant">Grant</option>
                    <option value="Investor Program">Investor Program</option>
                    <option value="Workshop">Workshop</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1 block">Target Domain</label>
                  <select required value={formData.domain} onChange={e => setFormData({...formData, domain: e.target.value})} className="w-full bg-slate-200 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white">
                    {allowedDomains.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1 block">Title</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-slate-200 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white" placeholder="e.g. AI Innovation Hackathon 2026" />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1 block">Description</label>
                <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={4} className="w-full bg-slate-200 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white" placeholder="Describe the opportunity, goals, and requirements..." />
              </div>

              {formData.type === "Hackathon" && (
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1 block">Start Date</label>
                    <input required type="datetime-local" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full bg-slate-200 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1 block">Duration (Days)</label>
                    <input required type="number" min="1" value={formData.durationDays} onChange={e => setFormData({...formData, durationDays: parseInt(e.target.value)})} className="w-full bg-slate-200 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-5">
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1 block">Mode</label>
                  <select required value={formData.mode} onChange={e => setFormData({...formData, mode: e.target.value})} className="w-full bg-slate-200 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white">
                    <option value="Online">Online</option>
                    <option value="Offline">Offline</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1 block">Location Hub</label>
                  <input required readOnly type="text" value={formData.location} className="w-full bg-slate-200 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white opacity-70 cursor-not-allowed" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1 block">Capacity</label>
                  <input required type="number" value={formData.capacity} onChange={e => setFormData({...formData, capacity: parseInt(e.target.value)})} className="w-full bg-slate-200 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white" />
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-200 dark:border-white/10">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-900 dark:text-white bg-white dark:bg-white/5 hover:bg-white/60 dark:bg-white/10 transition-colors">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 py-3 rounded-xl font-bold text-black bg-[#FFD700] hover:shadow-[0_0_20px_rgba(255,215,0,0.4)] transition-all">Launch Opportunity</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
