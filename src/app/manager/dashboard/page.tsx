"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, CheckCircle, XCircle, ShieldAlert, Activity, TrendingUp, Target, ChevronRight, Sparkles, Bot, ShieldCheck, Globe, X } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { getAdminDashboardData, approveOrganization, rejectOrganization } from "@/lib/actions/admin";
import { supabase } from "@/lib/supabase/client";
import { getDomainIntelligence } from "@/lib/actions/analytics";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function ManagerDashboard() {
  const [pendingOrgs, setPendingOrgs] = useState<any[]>([]);
  const [healthScores, setHealthScores] = useState<any[]>([]);
  const [riskFlags, setRiskFlags] = useState<any[]>([]);
  const [pendingOppApps, setPendingOppApps] = useState(0);
  const [domainIntel, setDomainIntel] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [certQueue, setCertQueue] = useState<any[]>([]);
  const [reviewingCert, setReviewingCert] = useState<any>(null);
  const [certForm, setCertForm] = useState({ outcome: 'Approved' as string, comments: '', verificationMethod: 'Digital' as "Digital" | "Physical" | "Hybrid" });
  const [certLoading, setCertLoading] = useState(false);
  const [milestoneQueue, setMilestoneQueue] = useState<any[]>([]);
  const [reviewingMilestone, setReviewingMilestone] = useState<any>(null);
  const [milestoneForm, setMilestoneForm] = useState({ outcome: 'Approved' as string, comments: '' });
  const [milestoneLoading, setMilestoneLoading] = useState(false);

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();

    const result = await getAdminDashboardData();
    if (result.success) {
      setPendingOrgs(result.pendingOrgs || []);
      setHealthScores(result.healthScores || []);
      setRiskFlags(result.riskFlags || []);
      setPendingOppApps(result.pendingOppApps || 0);
    }
    const intel = await getDomainIntelligence();
    if (intel.success) setDomainIntel(intel.data || []);

    if (user) {
      const { getManagerCertificationQueue } = await import('@/lib/actions/certification');
      const certRes = await getManagerCertificationQueue(user.id);
      if (certRes.success) setCertQueue(certRes.data || []);

      const { getManagerMilestoneQueue } = await import('@/lib/actions/milestones');
      const msRes = await getManagerMilestoneQueue(user.id);
      if (msRes.success) setMilestoneQueue(msRes.data || []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const ch = supabase.channel("mgr-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "organizations" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "venture_health_scores" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "risk_flags" }, loadData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadData]);

  const handleApprove = async (reqId: string, orgId: string) => {
    const res = await approveOrganization(reqId, orgId);
    if (res.success) { await loadData(); alert("Organization Approved!"); }
    else alert("Error: " + res.error);
  };

  const handleReject = async (reqId: string, orgId: string) => {
    const res = await rejectOrganization(reqId, orgId);
    if (res.success) { await loadData(); alert("Organization Rejected."); }
    else alert("Error: " + res.error);
  };

  if (loading) return <DashboardLayout><div className="p-8 text-center text-slate-900 dark:text-white">Loading Manager Intelligence...</div></DashboardLayout>;

  const healthy = healthScores.filter(h => h.status === 'Healthy' || h.status === 'Growing').length;
  const atRisk = healthScores.filter(h => h.status === 'At Risk' || h.status === 'Critical').length;
  const criticalRisks = riskFlags.filter(r => r.severity === 'Critical' || r.severity === 'High');

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">

        <div className="flex items-center justify-between bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-6 rounded-3xl">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Manager Dashboard</h1>
          {criticalRisks.length > 0 && (
            <span className="bg-red-500/20 text-red-400 border border-red-500/30 py-2 px-5 rounded-full text-sm font-bold flex items-center gap-2 animate-pulse">
              <ShieldAlert className="w-5 h-5" /> {criticalRisks.length} High Risk Startups
            </span>
          )}
        </div>

        {/* Health Distribution & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-slate-200 dark:border-white/10 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">Pending Approvals</p>
              <h3 className="text-4xl font-extrabold text-[#FFD700] mt-2">{pendingOrgs.length}</h3>
            </div>
            <div className="bg-[#FFD700]/10 border border-[#FFD700]/20 p-4 rounded-2xl">
              <Users className="w-8 h-8 text-[#FFD700]" />
            </div>
          </div>
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-slate-200 dark:border-white/10 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">Healthy Startups</p>
              <h3 className="text-4xl font-extrabold text-green-400 mt-2">{healthy}</h3>
            </div>
            <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-2xl">
              <TrendingUp className="w-8 h-8 text-green-400" />
            </div>
          </div>
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-slate-200 dark:border-white/10 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">At Risk Startups</p>
              <h3 className="text-4xl font-extrabold text-red-400 mt-2">{atRisk}</h3>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl">
              <ShieldAlert className="w-8 h-8 text-red-400" />
            </div>
          </div>
          <a href="/manager/opportunities" className="bg-white dark:bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-slate-200 dark:border-white/10 flex items-center justify-between hover:bg-white/60 dark:bg-white/10 hover:border-indigo-500/30 transition-all group">
            <div>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest group-hover:text-indigo-400 transition-colors">Opp. Applications</p>
              <div className="flex items-end gap-3 mt-2">
                <h3 className="text-4xl font-extrabold text-indigo-400">{pendingOppApps}</h3>
                <span className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1 group-hover:text-indigo-400 transition-colors">Review <ChevronRight className="w-3 h-3"/></span>
              </div>
            </div>
            <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-2xl group-hover:bg-indigo-500/20 transition-all">
              <Target className="w-8 h-8 text-indigo-400" />
            </div>
          </a>
        </div>

        {/* AI Portfolio Intelligence */}
        <div className="bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border border-indigo-500/20 rounded-3xl p-6 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="absolute -right-10 -top-10 opacity-10"><Sparkles className="w-64 h-64 text-indigo-400" /></div>
          <div className="relative z-10 flex-1">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
              <Sparkles className="w-6 h-6 text-indigo-400" /> AI Portfolio Intelligence
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Use your AI Copilot (bottom right) to generate detailed reports on domain trends, search for specific startups by health score, or predict drop-off risks across your portfolio.
            </p>
          </div>
          <div className="relative z-10 shrink-0">
             <div className="bg-slate-200 dark:bg-black/40 backdrop-blur-md border border-slate-200 dark:border-white/10 p-4 rounded-2xl flex items-center gap-3">
               <Bot className="w-8 h-8 text-indigo-400" />
               <div>
                 <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Suggested Prompt</p>
                 <p className="text-sm text-slate-900 dark:text-white italic">&quot;Show AI startups below 60 health&quot;</p>
               </div>
             </div>
          </div>
        </div>

        {/* Risk Flags */}
        {riskFlags.length > 0 && (
          <div className="bg-red-500/5 backdrop-blur-xl rounded-3xl border border-red-500/20 overflow-hidden">
            <div className="p-6 border-b border-red-500/20 flex items-center gap-3 bg-red-500/10">
              <ShieldAlert className="w-6 h-6 text-red-400" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Active Risk Alerts</h2>
            </div>
            <div className="divide-y divide-white/5">
              {riskFlags.map((flag) => (
                <div key={flag.id} className="p-5 flex items-center justify-between hover:bg-white dark:bg-white/5 transition-all">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{flag.organizations?.name}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">{flag.risk_type}</p>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${
                    flag.severity === 'Critical' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                    flag.severity === 'High' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                    'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                  }`}>{flag.severity}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Health Distribution Table */}
        {healthScores.length > 0 && (
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-3xl border border-slate-200 dark:border-white/10 overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center gap-3">
              <Activity className="w-6 h-6 text-[#FFD700]" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Startup Health Distribution</h2>
            </div>
            <div className="divide-y divide-white/5">
              {healthScores.map((h: any, idx: number) => (
                <div key={idx} className="p-5 flex items-center justify-between hover:bg-white dark:bg-white/5 transition-all">
                  <p className="font-bold text-slate-900 dark:text-white">{h.organizations?.name}</p>
                  <div className="flex items-center gap-4">
                    <div className="w-32 bg-white/60 dark:bg-white/10 rounded-full h-2">
                      <div className="h-2 rounded-full bg-gradient-to-r from-[#FFD700] to-green-400" style={{ width: `${h.current_score}%` }} />
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white w-10 text-right">{h.current_score}</span>
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${
                      h.status === 'Healthy' || h.status === 'Growing' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                      h.status === 'At Risk' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                      'bg-red-500/20 text-red-400 border-red-500/30'
                    }`}>{h.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stage Certification Queue */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" /> Stage Certification Reviews
            {certQueue.length > 0 && <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold">{certQueue.length} pending</span>}
          </h2>
          {certQueue.length === 0 ? (
            <div className="bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-8 text-center text-slate-500 text-sm">No certification requests pending your review.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {certQueue.map((req: any) => (
                <div key={req.id} className="bg-white dark:bg-white/5 backdrop-blur-xl border border-amber-500/20 rounded-2xl p-5 hover:bg-white/60 dark:bg-white/10 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-slate-900 dark:text-white font-bold">{req.organizations?.name}</h3>
                      <p className="text-slate-500 dark:text-slate-400 text-xs">{req.organizations?.user_profiles?.full_name}</p>
                    </div>
                    <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 rounded font-bold uppercase">Pending Review</span>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded">{req.current_stage}</span>
                    <ChevronRight className="w-3 h-3 text-slate-500" />
                    <span className="text-xs bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-1 rounded font-bold">{req.requested_stage}</span>
                  </div>
                  <button onClick={() => { setReviewingCert(req); setCertForm({ outcome: 'Approved', comments: '', verificationMethod: 'Digital' }); }}
                    className="mt-2 w-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold py-2 rounded-xl hover:bg-amber-500/20 transition-all">
                    Review Certification Request
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Milestone Queue */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-green-400" /> Milestone Verification Queue
            {milestoneQueue.length > 0 && <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full font-bold">{milestoneQueue.length} pending</span>}
          </h2>
          {milestoneQueue.length === 0 ? (
            <div className="bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-8 text-center text-slate-500 text-sm">No milestone submissions pending your review.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {milestoneQueue.map((sub: any) => (
                <div key={sub.id} className="bg-white dark:bg-white/5 backdrop-blur-xl border border-green-500/20 rounded-2xl p-5 hover:bg-white/60 dark:bg-white/10 transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-slate-900 dark:text-white font-bold text-sm">{sub.milestones?.title}</h3>
                      <p className="text-slate-500 dark:text-slate-400 text-xs">{sub.organizations?.name}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${ sub.milestones?.is_required ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}` }>{sub.milestones?.is_required ? 'Core' : 'Optional'}</span>
                  </div>
                  {sub.mentor_outcome && (
                    <div className="mb-2 p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <p className="text-green-400 text-[10px] font-bold uppercase tracking-wider">Mentor: {sub.mentor_outcome}</p>
                    </div>
                  )}
                  {sub.evidence_url && (
                    <a href={sub.evidence_url} target="_blank" rel="noreferrer" className="text-indigo-400 text-xs hover:text-indigo-300 underline flex items-center gap-1 mb-2">
                      <Globe className="w-3 h-3" /> View Evidence
                    </a>
                  )}
                  {sub.evidence_note && <p className="text-xs text-slate-500 italic mb-2">{sub.evidence_note}</p>}
                  <p className="text-[10px] text-slate-600">Submitted: {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : 'N/A'}</p>
                  <button onClick={() => { setReviewingMilestone(sub); setMilestoneForm({ outcome: 'Approved', comments: '' }); }}
                    className="mt-3 w-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold py-2 rounded-xl hover:bg-green-500/20 transition-all">
                    Review Milestone
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Domain Analytics */}
        {domainIntel.length > 0 && (
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-3xl border border-slate-200 dark:border-white/10 p-6 h-96">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><TrendingUp className="w-6 h-6 text-indigo-400"/> Hub Domain Intelligence</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[...domainIntel, ...Array.from({ length: Math.max(0, 5 - domainIntel.length) }).map((_, i) => ({ name: ' '.repeat(i + 1), total: 0, active: 0 }))]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#cbd5e1" />
                <YAxis stroke="#cbd5e1" allowDecimals={false} />
                <Tooltip cursor={{fill: 'rgba(255,255,255,0.1)'}} contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff'}} />
                <Bar dataKey="total" fill="#3b82f6" name="Total Startups" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Pending Applications */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-3xl border border-slate-200 dark:border-white/10 overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-100 dark:bg-black/20">
            <h2 className="text-xl font-bold flex items-center gap-3 text-slate-900 dark:text-white">
              <Users className="w-6 h-6 text-[#FFD700]" /> Pending Applications
            </h2>
            <span className="bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/30 py-1.5 px-4 rounded-full text-sm font-bold">
              {pendingOrgs.length} awaiting review
            </span>
          </div>
          <div className="divide-y divide-white/10">
            {pendingOrgs.length === 0 ? (
              <p className="p-12 text-center text-slate-500 dark:text-slate-400 font-medium">No pending applications.</p>
            ) : (
              pendingOrgs.map((req) => (
                <div key={req.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white dark:bg-white/5 transition-all">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{req.organizations?.name}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Founder: <span className="font-semibold text-slate-900 dark:text-white">{req.organizations?.user_profiles?.full_name}</span></p>
                    <span className="bg-purple-500/20 text-purple-400 border border-purple-500/20 text-xs px-3 py-1 rounded-lg font-bold mt-2 inline-block">{req.organizations?.stage}</span>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => handleApprove(req.id, req.organizations.id)}
                      className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 hover:bg-green-500/20 text-green-400 px-6 py-2.5 rounded-xl text-sm font-bold transition-all">
                      <CheckCircle className="w-5 h-5" /> Approve
                    </button>
                    <button onClick={() => handleReject(req.id, req.organizations.id)}
                      className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 px-6 py-2.5 rounded-xl text-sm font-bold transition-all">
                      <XCircle className="w-5 h-5" /> Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Manager Cert Review Modal */}
      {reviewingCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Review Certification</h3>
              <button onClick={() => setReviewingCert(null)} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="mb-4 p-3 bg-white dark:bg-white/5 rounded-xl">
              <p className="text-slate-900 dark:text-white font-bold">{reviewingCert.organizations?.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{reviewingCert.current_stage} → <span className="text-indigo-400 font-bold">{reviewingCert.requested_stage}</span></p>
            </div>
            {reviewingCert.evidence && Object.entries(reviewingCert.evidence).filter(([k,v]) => v).map(([k,v]) => (
              <div key={k} className="mb-2">
                <p className="text-xs text-slate-500 uppercase tracking-wider">{k}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">{String(v)}</p>
              </div>
            ))}
            <div className="mt-4 mb-4">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Verification Method</p>
              <div className="flex gap-2 flex-wrap mb-4">
                {['Digital', 'Physical', 'Hybrid'].map(m => (
                  <button key={m} onClick={() => setCertForm({...certForm, verificationMethod: m as any})}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      certForm.verificationMethod === m ?
                        'bg-blue-500/20 border-blue-500/30 text-blue-400'
                      : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:bg-white/60 dark:bg-white/10'
                    }`}>{m}</button>
                ))}
              </div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Your Decision</p>
              <div className="flex gap-2 flex-wrap">
                {['Approved', 'Approve Through Physical Verification', 'Downgrade Stage', 'Revision Requested', 'Schedule Physical Review', 'Rejected'].map(o => (
                  <button key={o} onClick={() => setCertForm({...certForm, outcome: o})}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      certForm.outcome === o ?
                        (o === 'Approved' || o === 'Approve Through Physical Verification') ? 'bg-green-500/20 border-green-500/30 text-green-400' :
                        o === 'Rejected' ? 'bg-red-500/20 border-red-500/30 text-red-400' :
                        o === 'Downgrade Stage' ? 'bg-orange-500/20 border-orange-500/30 text-orange-400' :
                        'bg-yellow-500/20 border-yellow-500/30 text-yellow-400'
                      : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:bg-white/60 dark:bg-white/10'
                    }`}>{o}</button>
                ))}
              </div>
            </div>
            <textarea value={certForm.comments} onChange={e => setCertForm({...certForm, comments: e.target.value})}
              rows={3} placeholder="Provide detailed comments..."
              className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white text-sm focus:border-indigo-500/50 focus:outline-none mb-4" />
            <button disabled={certLoading} onClick={async () => {
              const u = (await supabase.auth.getUser()).data.user;
              if (!u) return;
              setCertLoading(true);
              const { reviewCertificationAsManager } = await import('@/lib/actions/certification');
              const res = await reviewCertificationAsManager(reviewingCert.id, u.id, certForm.outcome as any, certForm.comments, certForm.verificationMethod);
              setCertLoading(false);
              if (res.success) { setReviewingCert(null); await loadData(); } else alert('Error: ' + res.error);
            }} className="w-full bg-[#FFD700] text-black font-extrabold py-3 rounded-xl text-sm hover:shadow-[0_0_20px_rgba(255,215,0,0.4)] transition-all disabled:opacity-60">
              {certLoading ? 'Submitting...' : 'Submit Decision'}
            </button>
          </div>
        </div>
      )}

      {/* Manager Milestone Review Modal */}
      {reviewingMilestone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-8 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Review Milestone</h3>
              <button onClick={() => setReviewingMilestone(null)} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="mb-4 p-3 bg-white dark:bg-white/5 rounded-xl">
              <p className="text-slate-900 dark:text-white font-bold text-sm">{reviewingMilestone.milestones?.title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{reviewingMilestone.organizations?.name}</p>
            </div>
            {(reviewingMilestone.mentor_outcome || reviewingMilestone.mentor_comments) && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                <p className="text-green-400 text-xs font-bold uppercase tracking-wider mb-1">Mentor Recommendation</p>
                <p className="text-slate-900 dark:text-white text-sm font-bold">{reviewingMilestone.mentor_outcome}</p>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">{reviewingMilestone.mentor_comments}</p>
              </div>
            )}
            {reviewingMilestone.evidence_url && (
              <a href={reviewingMilestone.evidence_url} target="_blank" rel="noreferrer" className="text-indigo-400 text-sm hover:text-indigo-300 underline flex items-center gap-1 mb-3">
                <Globe className="w-4 h-4" /> View Submitted Evidence
              </a>
            )}
            {reviewingMilestone.evidence_note && <p className="text-sm text-slate-500 dark:text-slate-400 italic mb-4">{reviewingMilestone.evidence_note}</p>}
            <div className="mb-4">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Decision</p>
              <div className="flex gap-2">
                {['Approved', 'Revision Requested', 'Rejected'].map(o => (
                  <button key={o} onClick={() => setMilestoneForm({...milestoneForm, outcome: o})}
                    className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                      milestoneForm.outcome === o ?
                        o === 'Approved' ? 'bg-green-500/20 border-green-500/30 text-green-400' :
                        o === 'Rejected' ? 'bg-red-500/20 border-red-500/30 text-red-400' :
                        'bg-yellow-500/20 border-yellow-500/30 text-yellow-400'
                      : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400'
                    }`}>{o}</button>
                ))}
              </div>
            </div>
            <textarea value={milestoneForm.comments} onChange={e => setMilestoneForm({...milestoneForm, comments: e.target.value})}
              rows={3} placeholder="Provide feedback for the founder..."
              className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white text-sm focus:border-green-500/50 focus:outline-none mb-4" />
            <button disabled={milestoneLoading} onClick={async () => {
              const u = (await supabase.auth.getUser()).data.user;
              if (!u) return;
              setMilestoneLoading(true);
              const { reviewMilestoneAsManager } = await import('@/lib/actions/milestones');
              const res = await reviewMilestoneAsManager(reviewingMilestone.id, u.id, milestoneForm.outcome as any, milestoneForm.comments);
              setMilestoneLoading(false);
              if (res.success) { setReviewingMilestone(null); await loadData(); } else alert('Error: ' + res.error);
            }} className="w-full bg-green-500 text-slate-900 dark:text-white font-extrabold py-3 rounded-xl text-sm hover:shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all disabled:opacity-60">
              {milestoneLoading ? 'Submitting...' : 'Submit Milestone Decision'}
            </button>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
