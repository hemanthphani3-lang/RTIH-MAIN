"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabase/client";
import { getOrgDashboardData } from "@/lib/actions/mentorship";
import { getRecommendedOpportunities } from "@/lib/actions/opportunities";
import { Building2, FileText, CheckCircle2, Clock, XCircle, UserCheck, Globe, Rocket, Target, ChevronRight, Sparkles } from "lucide-react";

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  "Pending": { color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20", icon: <Clock className="w-4 h-4" />, label: "Under Review" },
  "Approved": { color: "text-green-400 bg-green-500/10 border-green-500/20", icon: <CheckCircle2 className="w-4 h-4" />, label: "Approved" },
  "Rejected": { color: "text-red-400 bg-red-500/10 border-red-500/20", icon: <XCircle className="w-4 h-4" />, label: "Rejected" },
};

export default function OrgDashboard() {
  const [org, setOrg] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [skillGaps, setSkillGaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const res = await getOrgDashboardData(user.id);
    if (res.success) setOrg(res.data);
    const recRes = await getRecommendedOpportunities(user.id);
    if (recRes.success) setRecommendations(recRes.data || []);
    
    if (res.success && res.data) {
      const { getSkillGaps } = await import("@/lib/actions/ai");
      const gapRes = await getSkillGaps(res.data.id);
      if (gapRes.success) setSkillGaps(gapRes.data || []);
    }
    
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadData();
    const ch = supabase.channel("org-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "mentorship_assignments" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "organizations" }, loadData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadData]);

  if (loading) return <DashboardLayout><div className="p-8 text-center text-slate-900 dark:text-white">Loading your profile...</div></DashboardLayout>;

  if (!org) return (
    <DashboardLayout>
      <div className="p-8 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[70vh] text-center">
        <Rocket className="w-20 h-20 text-[#FFD700] mb-6 opacity-80" />
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-3">Welcome to RTIH!</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8">You haven't registered your startup yet. Get started by completing the onboarding wizard.</p>
        <a href="/org/onboarding"
          className="bg-[#FFD700] text-black px-8 py-3 rounded-xl font-bold text-sm hover:shadow-[0_0_20px_rgba(255,215,0,0.4)] transition-all">
          Start Registration →
        </a>
      </div>
    </DashboardLayout>
  );

  const statusCfg = STATUS_CONFIG[org.status] || STATUS_CONFIG["Pending"];
  const mentor = org.mentorship_assignments?.[0]?.mentor;
  const mentorDomains = mentor?.mentor_domains?.map((md: any) => md.domains?.name).filter(Boolean) || [];

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">

        {/* Header */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-6 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              <Building2 className="w-8 h-8 text-[#FFD700]" /> {org.name}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{org.description}</p>
          </div>
          <span className={`flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl border ${statusCfg.color}`}>
            {statusCfg.icon} {statusCfg.label}
          </span>
        </div>

        {/* Verification Progress */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-6 rounded-3xl">
          <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-6">Verification Journey</h2>
          <div className="flex items-center gap-0">
            {[
              { label: "Applied", desc: "Application submitted" },
              { label: "Level 0", desc: "Under manager review" },
              { label: "Approved", desc: "Cleared for mentorship" },
              { label: "Mentored", desc: "Mentor assigned" },
            ].map((step, i) => {
              const isCompleted = 
                (i === 0) ||
                (i === 1 && org.status !== "Pending") ||
                (i === 2 && org.status === "Approved") ||
                (i === 3 && org.mentorship_assignments?.length > 0);

              return (
                <div key={i} className="flex-1 flex flex-col items-center relative">
                  {i > 0 && (
                    <div className={`absolute left-0 top-5 -translate-y-1/2 w-full h-0.5 ${isCompleted ? "bg-[#FFD700]" : "bg-white/60 dark:bg-white/10"}`} style={{ left: "-50%", width: "100%" }} />
                  )}
                  <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all ${isCompleted ? "bg-[#FFD700] border-[#FFD700] text-black shadow-[0_0_15px_rgba(255,215,0,0.4)]" : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-white/10 text-slate-500"}`}>
                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
                  </div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white mt-3">{step.label}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 text-center">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Startup Details */}
          <div className="lg:col-span-2 bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl p-6 space-y-5">
            <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Startup Profile</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <p className="text-xs text-slate-500 mb-1">Stage</p>
                <p className="text-slate-900 dark:text-white font-semibold">{org.stage}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Primary Domain</p>
                <span className="text-[#FFD700] bg-[#FFD700]/10 border border-[#FFD700]/20 text-xs px-3 py-1 rounded-md font-bold">{org.domains?.name}</span>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Website</p>
                {org.website ? (
                  <a href={org.website} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5" /> {org.website}
                  </a>
                ) : (
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Not provided</p>
                )}
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Applied On</p>
                <p className="text-slate-900 dark:text-white text-sm">{new Date(org.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
              </div>
            </div>
          </div>

          {/* Assigned Mentor */}
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl p-6 flex flex-col">
            <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Your Mentor</h2>
            {mentor ? (
              <div className="flex flex-col gap-4 flex-grow">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#FFD700]/20 to-[#FFD700]/5 border border-[#FFD700]/20 rounded-2xl flex items-center justify-center">
                    <span className="text-[#FFD700] font-extrabold text-lg">{mentor?.user_profiles?.full_name?.[0]}</span>
                  </div>
                  <div>
                    <p className="text-slate-900 dark:text-white font-bold">{mentor?.user_profiles?.full_name}</p>
                    <p className="text-slate-500 dark:text-slate-400 text-xs">{mentor?.user_profiles?.email}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {mentorDomains.map((d: string) => (
                    <span key={d} className="text-[10px] bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20 px-2 py-1 rounded-md font-bold uppercase">{d}</span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center text-center py-8">
                <UserCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  {org.status === "Approved" ? "A Mentor will be assigned soon by your Manager." : "Mentor assigned after approval."}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* AI Copilot Insights */}
        {skillGaps.length > 0 && (
          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-20"><Target className="w-32 h-32 text-purple-400" /></div>
            <div className="relative z-10">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                <Sparkles className="w-6 h-6 text-purple-400" /> AI Skill Gap Analysis
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">Based on your {org.stage} stage in the {org.domains?.name} domain, your AI Copilot recommends developing the following skills:</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {skillGaps.map((gap, i) => (
                  <div key={i} className="bg-slate-200 dark:bg-black/40 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs bg-white/60 dark:bg-white/10 text-slate-600 dark:text-slate-300 px-2 py-1 rounded font-bold">{gap.category}</span>
                        <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${
                          gap.priority === "High" ? "bg-red-500/20 text-red-400" :
                          gap.priority === "Medium" ? "bg-yellow-500/20 text-yellow-400" : "bg-blue-500/20 text-blue-400"
                        }`}>{gap.priority} Priority</span>
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-white mt-1">{gap.skill}</h3>
                    </div>
                  </div>
                ))}
              </div>
              <button 
                onClick={async () => {
                  const { generateStartupSkillGaps } = await import("@/lib/actions/ai");
                  await generateStartupSkillGaps(org.id);
                  loadData();
                }}
                className="mt-4 text-xs font-bold text-purple-400 hover:text-purple-300 underline underline-offset-4"
              >
                Recalculate Gaps
              </button>
            </div>
          </div>
        )}

        {/* Documents */}
        {org.documents && org.documents.length > 0 && (
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl p-6">
            <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Submitted Documents</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {org.documents.map((doc: any, i: number) => (
                <a key={i} href={doc.file_url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-3 p-4 bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl hover:bg-white dark:bg-white/5 transition-colors group">
                  <div className="w-10 h-10 bg-indigo-500/20 border border-indigo-500/20 rounded-xl flex items-center justify-center">
                    <FileText className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-slate-900 dark:text-white text-sm font-bold group-hover:text-indigo-400 transition-colors">{doc.document_type}</p>
                    <p className="text-slate-500 text-xs">{new Date(doc.upload_date).toLocaleDateString()}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Opportunities */}
        {recommendations.length > 0 && (
          <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-20"><Target className="w-32 h-32 text-indigo-400" /></div>
            <div className="relative z-10">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                <Target className="w-6 h-6 text-indigo-400" /> Recommended for You
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendations.slice(0, 3).map((rec: any, idx: number) => (
                  <div key={idx} onClick={() => router.push(`/org/opportunities/${rec.opportunities.id}`)}
                    className="bg-slate-200 dark:bg-black/40 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-5 hover:bg-white/60 dark:bg-white/10 hover:border-indigo-500/30 transition-all cursor-pointer group">
                    <div className="flex items-center justify-between mb-3">
                      <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[10px] uppercase font-bold px-2 py-1 rounded">
                        {rec.opportunities.type}
                      </span>
                      <span className="text-[#FFD700] text-xs font-bold bg-[#FFD700]/10 px-2 py-1 rounded">
                        {rec.score} pt match
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-400 transition-colors mb-1">{rec.opportunities.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{rec.reason}</p>
                    <div className="flex items-center text-xs font-bold text-indigo-400 gap-1 group-hover:gap-2 transition-all">
                      View details <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
