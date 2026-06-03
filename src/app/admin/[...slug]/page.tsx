"use client";
import { use, useEffect, useState } from "react";
import ComingSoon from "@/components/layout/ComingSoon";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabase/client";
import { ShieldAlert, Search, Shield, Save } from "lucide-react";
import { adminOverrideStage } from "@/lib/actions/certification";
import { VENTURE_STAGES, VentureStage } from "@/lib/milestones-config";

export default function AdminDynamicPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const unwrappedParams = use(params);
  const slugPath = unwrappedParams.slug.join("/");

  if (slugPath === "overrides") {
    return <AdminOverridesPage />;
  }

  const title = unwrappedParams.slug.join(" ").replace(/-/g, " ").toUpperCase();
  return <ComingSoon title={`ADMIN ${title}`} />;
}

function AdminOverridesPage() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [overrideOrgId, setOverrideOrgId] = useState<string | null>(null);
  const [newStage, setNewStage] = useState<VentureStage>("Ideation");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadOrgs();
  }, []);

  const loadOrgs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("organizations")
      .select("id, name, stage, verified_stage")
      .order("name");
    setOrgs(data || []);
    setLoading(false);
  };

  const handleOverride = async () => {
    if (!overrideOrgId || !reason) return alert("Please provide a reason.");
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const res = await adminOverrideStage(overrideOrgId, newStage, reason, user.id);
    if (res.success) {
      alert("Stage overridden successfully.");
      setOverrideOrgId(null);
      setReason("");
      await loadOrgs();
    } else {
      alert("Error: " + res.error);
    }
    setSubmitting(false);
  };

  const filteredOrgs = orgs.filter(o => o.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <DashboardLayout>
      <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center justify-between bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-6 rounded-3xl">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              <ShieldAlert className="w-8 h-8 text-red-500" /> Venture Stage Overrides
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Force change venture stages. Actions are logged.</p>
          </div>
        </div>

        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-3xl border border-slate-200 dark:border-white/10 p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-3 text-slate-500" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search organizations..." className="w-full bg-slate-200 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2 text-slate-900 dark:text-white focus:border-red-500/50 focus:outline-none" />
            </div>
          </div>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {loading ? <div className="text-slate-500 dark:text-slate-400 text-center py-8">Loading...</div> : 
             filteredOrgs.map(org => (
              <div key={org.id} className="bg-slate-100 dark:bg-black/20 border border-white/5 p-4 rounded-2xl flex items-center justify-between hover:bg-white dark:bg-white/5 transition-all">
                <div>
                  <h3 className="text-slate-900 dark:text-white font-bold">{org.name}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Current Verified Stage: <span className="text-[#FFD700] font-bold">{org.verified_stage || org.stage || 'None'}</span></p>
                </div>
                <button onClick={() => {
                  setOverrideOrgId(org.id);
                  setNewStage((org.verified_stage || org.stage || 'Ideation') as VentureStage);
                  setReason("");
                }} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all">
                  <Shield className="w-4 h-4" /> Override Stage
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {overrideOrgId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-100 dark:bg-slate-900 border border-red-500/30 rounded-3xl p-8 w-full max-w-md shadow-[0_0_50px_rgba(239,68,68,0.15)]">
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2 mb-4"><ShieldAlert className="w-5 h-5 text-red-500" /> Confirm Override</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">You are overriding the stage for <span className="text-slate-900 dark:text-white font-bold">{orgs.find(o => o.id === overrideOrgId)?.name}</span>. This action will bypass all normal verification flows.</p>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 block">New Target Stage</label>
                <select value={newStage} onChange={e => setNewStage(e.target.value as VentureStage)} className="w-full bg-slate-200 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white focus:border-red-500/50 focus:outline-none">
                  {VENTURE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 block">Reason for Override (Required)</label>
                <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Provide a justification for the audit log..." className="w-full bg-slate-200 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white focus:border-red-500/50 focus:outline-none" />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setOverrideOrgId(null)} className="flex-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 px-4 py-3 rounded-xl font-bold text-sm hover:bg-white/60 dark:bg-white/10 transition-all">Cancel</button>
              <button disabled={submitting} onClick={handleOverride} className="flex-1 bg-red-500 hover:bg-red-600 text-slate-900 dark:text-white px-4 py-3 rounded-xl font-bold text-sm shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                <Save className="w-4 h-4" /> {submitting ? 'Applying...' : 'Force Override'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
