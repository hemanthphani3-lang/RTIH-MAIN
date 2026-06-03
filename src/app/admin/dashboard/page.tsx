"use client";

import { useEffect, useState, useCallback } from "react";
import { BarChart3, Users, Building, ShieldCheck, CheckCircle, XCircle, ShieldAlert, Award, Rocket, Target, Sparkles, Bot } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import AiHealthWidget from "@/components/admin/AiHealthWidget";
import { getAdminDashboardData, approveOrganization, rejectOrganization } from "@/lib/actions/admin";
import { supabase } from "@/lib/supabase/client";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ orgs: 0, managers: 0, mentors: 0, verified: 0, opportunities: 0 });
  const [pendingOrgs, setPendingOrgs] = useState<any[]>([]);
  const [riskFlags, setRiskFlags] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [healthScores, setHealthScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const result = await getAdminDashboardData();
    if (result.success && result.stats) {
      setStats(result.stats);
      setPendingOrgs(result.pendingOrgs || []);
      setRiskFlags(result.riskFlags || []);
      setCertificates(result.certificates || []);
      setHealthScores(result.healthScores || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();

    // Realtime subscriptions — live update on any table change
    const channels = [
      supabase.channel("admin-orgs").on("postgres_changes", { event: "*", schema: "public", table: "organizations" }, loadData).subscribe(),
      supabase.channel("admin-verif").on("postgres_changes", { event: "*", schema: "public", table: "verification_requests" }, loadData).subscribe(),
      supabase.channel("admin-mentors").on("postgres_changes", { event: "*", schema: "public", table: "mentors" }, loadData).subscribe(),
      supabase.channel("admin-managers").on("postgres_changes", { event: "*", schema: "public", table: "managers" }, loadData).subscribe(),
      supabase.channel("admin-risks").on("postgres_changes", { event: "*", schema: "public", table: "risk_flags" }, loadData).subscribe(),
      supabase.channel("admin-certs").on("postgres_changes", { event: "*", schema: "public", table: "certificates" }, loadData).subscribe(),
      supabase.channel("admin-health").on("postgres_changes", { event: "*", schema: "public", table: "health_scores" }, loadData).subscribe(),
    ];

    return () => { channels.forEach(c => supabase.removeChannel(c)); };
  }, [loadData]);

  const handleApprove = async (reqId: string, orgId: string) => {
    const res = await approveOrganization(reqId, orgId);
    if (!res.success) alert("Error: " + res.error);
    // No need to call loadData — realtime will trigger it
  };

  const handleReject = async (reqId: string, orgId: string) => {
    const res = await rejectOrganization(reqId, orgId);
    if (!res.success) alert("Error: " + res.error);
  };

  if (loading) return <DashboardLayout><div className="min-h-screen flex items-center justify-center text-slate-900 dark:text-white">Loading Admin Dashboard...</div></DashboardLayout>;

  const avgHealth = healthScores.length > 0
    ? Math.round(healthScores.reduce((acc, h) => acc + h.current_score, 0) / healthScores.length)
    : 0;
  const criticalCount = riskFlags.filter(r => r.severity === 'Critical').length;

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">

        {/* Header */}
        <div className="flex items-center justify-between bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-6 rounded-3xl">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Platform Admin</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse inline-block"></span>
              Live — updates automatically
            </p>
          </div>
          <button className="bg-[#FFD700] text-black px-6 py-2.5 rounded-xl text-sm font-bold hover:shadow-[0_0_15px_rgba(255,215,0,0.3)] transition-all">Generate Report</button>
        </div>

        {/* Core Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          {[
            { label: "Total Organizations", value: stats.orgs, icon: Building, color: "blue" },
            { label: "Verified Startups", value: stats.verified, icon: ShieldCheck, color: "green" },
            { label: "Total Mentors", value: stats.mentors, icon: Users, color: "purple" },
            { label: "Total Managers", value: stats.managers, icon: BarChart3, color: "orange" },
            { label: "Ecosystem Opportunities", value: stats.opportunities, icon: Rocket, color: "indigo" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white dark:bg-white/5 backdrop-blur-xl p-6 rounded-3xl shadow-xl border border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <Icon className={`w-5 h-5 text-${color}-400`} />
                <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 tracking-wide uppercase">{label}</h3>
              </div>
              <p className="text-4xl font-extrabold text-slate-900 dark:text-white">{value}</p>
            </div>
          ))}
        </div>

        {/* Ecosystem Intelligence */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-slate-200 dark:border-white/10 text-center">
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-2">Avg Ecosystem Health</p>
            <p className="text-5xl font-extrabold text-[#FFD700] drop-shadow-[0_0_15px_rgba(255,215,0,0.4)]">{avgHealth}</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">across all startups</p>
          </div>
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-slate-200 dark:border-white/10 text-center">
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-2">Critical Risks</p>
            <p className={`text-5xl font-extrabold ${criticalCount > 0 ? 'text-red-400' : 'text-green-400'}`}>{criticalCount}</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">startups need intervention</p>
          </div>
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-slate-200 dark:border-white/10 text-center">
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-2">Certificates Issued</p>
            <p className="text-5xl font-extrabold text-green-400">{certificates.length}</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">total certifications</p>
          </div>
        </div>

        {/* AI Ecosystem Intelligence */}
        <div className="bg-gradient-to-br from-indigo-600/10 to-purple-600/10 border border-indigo-500/30 rounded-3xl p-8 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="absolute -right-10 -top-10 opacity-20"><Sparkles className="w-64 h-64 text-indigo-400" /></div>
          <div className="relative z-10 flex-1">
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
              <Sparkles className="w-8 h-8 text-indigo-400" /> AI Ecosystem Intelligence
            </h2>
            <p className="text-indigo-200">
              Your Admin AI Copilot has full access to cross-domain analytics. Use the Copilot chat to query platform health, analyze mentor performance, or identify macro trends in startup dropout rates.
            </p>
          </div>
          <div className="relative z-10 shrink-0">
             <div className="bg-slate-200 dark:bg-black/40 backdrop-blur-md border border-slate-200 dark:border-white/10 p-5 rounded-2xl flex items-center gap-4 hover:border-indigo-500/50 transition-colors cursor-pointer group">
               <Bot className="w-8 h-8 text-indigo-400 group-hover:scale-110 transition-transform" />
               <div>
                 <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Suggested Query</p>
                 <p className="text-sm text-slate-900 dark:text-white italic">"Which domain is growing fastest this month?"</p>
               </div>
             </div>
          </div>
        </div>

        {/* AI Health Monitoring */}
        <AiHealthWidget />

        {/* Risk Flags */}
        {riskFlags.length > 0 && (
          <div className="bg-red-500/5 backdrop-blur-xl rounded-3xl border border-red-500/20 overflow-hidden">
            <div className="p-6 border-b border-red-500/20 flex items-center gap-3 bg-red-500/10">
              <ShieldAlert className="w-6 h-6 text-red-400" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Critical Risk Alerts</h2>
              <span className="ml-auto bg-red-500/20 text-red-400 border border-red-500/30 text-xs px-3 py-1.5 rounded-full font-bold">{riskFlags.length} active</span>
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

        {/* Recent Certifications */}
        {certificates.length > 0 && (
          <div className="bg-green-500/5 backdrop-blur-xl rounded-3xl border border-green-500/20 overflow-hidden">
            <div className="p-6 border-b border-green-500/20 flex items-center gap-3 bg-green-500/10">
              <Award className="w-6 h-6 text-green-400" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Recent Certifications</h2>
            </div>
            <div className="divide-y divide-white/5">
              {certificates.map((cert) => (
                <div key={cert.id} className="p-5 flex items-center justify-between hover:bg-white dark:bg-white/5 transition-all">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{cert.organizations?.name}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">🏆 {cert.certificate_type}</p>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(cert.issue_date).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Approvals */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-3xl shadow-xl border border-slate-200 dark:border-white/10 overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-100 dark:bg-black/20">
            <h2 className="text-xl font-bold flex items-center gap-3 text-slate-900 dark:text-white">
              <Users className="w-6 h-6 text-[#FFD700]" /> Pending Startup Enrollments
            </h2>
            <span className="bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/30 py-1.5 px-4 rounded-full text-sm font-bold">
              {pendingOrgs.length} awaiting review
            </span>
          </div>
          <div className="divide-y divide-white/10">
            {pendingOrgs.length === 0 ? (
              <p className="p-12 text-center text-slate-500 dark:text-slate-400 font-medium">No pending enrollments.</p>
            ) : (
              pendingOrgs.map((req) => (
                <div key={req.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white dark:bg-white/5 transition-all">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{req.organizations?.name}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Founder: <span className="font-semibold text-slate-900 dark:text-white">{req.organizations?.user_profiles?.full_name}</span></p>
                    <span className="bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs px-3 py-1 rounded-lg font-bold mt-2 inline-block">{req.organizations?.stage}</span>
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
    </DashboardLayout>
  );
}
