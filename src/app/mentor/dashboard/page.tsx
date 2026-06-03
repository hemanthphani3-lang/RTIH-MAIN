"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabase/client";
import { getMentorAssignments } from "@/lib/actions/mentorship";
import { getMentorImpact } from "@/lib/actions/analytics";
import { getRecommendedOpportunitiesForMentor } from "@/lib/actions/opportunities";
import { Building2, Activity, FileText, Globe, MapPin, Users, Target, ChevronRight, Sparkles, ShieldCheck, X } from "lucide-react";

export default function MentorDashboard() {
  const [mentorRecord, setMentorRecord] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [riskInsights, setRiskInsights] = useState<any[]>([]);
  const [impact, setImpact] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [milestoneQueue, setMilestoneQueue] = useState<any[]>([]);
  const [reviewingMilestone, setReviewingMilestone] = useState<any>(null);
  const [milestoneForm, setMilestoneForm] = useState({ outcome: 'Approved' as string, comments: '' });
  const [milestoneLoading, setMilestoneLoading] = useState(false);

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const res = await getMentorAssignments(user.id);
    if (res.success) {
      setMentorRecord(res.mentorRecord);
      setAssignments(res.assignments || []);
    }
    const recRes = await getRecommendedOpportunitiesForMentor(user.id);
    if (recRes.success) setRecommendations(recRes.data);

    const impactRes = await getMentorImpact(user.id);
    if (impactRes.success) setImpact(impactRes.data);
    
    // Fetch AI Risk Insights
    const { getRiskInsights } = await import("@/lib/actions/ai");
    const riskRes = await getRiskInsights();
    if (riskRes.success) {
      // Filter only for assigned startups
      const assignedOrgIds = (res.assignments || []).map((a: any) => a.organization_id);
      setRiskInsights((riskRes.data || []).filter((r: any) => assignedOrgIds.includes(r.organization_id)));
    }



    const { getMentorMilestoneQueue } = await import('@/lib/actions/milestones');
    const msRes = await getMentorMilestoneQueue(user.id);
    if (msRes.success) setMilestoneQueue(msRes.data || []);
    
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const ch = supabase.channel("mentor-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "mentorship_assignments" }, loadData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadData]);

  if (loading) return <div className="p-8 text-center text-white">Loading your portfolio...</div>;

  const usedCapacity = assignments.length;
  const maxCapacity = mentorRecord?.max_capacity || 5;
  const capacityPct = Math.min(100, (usedCapacity / maxCapacity) * 100);

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">

        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Mentor Dashboard</h1>
            <p className="text-slate-400 mt-1 text-sm flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              {mentorRecord?.location || "Location not set"} Hub
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {mentorRecord?.domains?.map((d: string) => (
              <span key={d} className="text-[10px] bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20 px-3 py-1.5 rounded-md font-bold uppercase tracking-wider">
                {d}
              </span>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-300 uppercase tracking-widest">Assigned Startups</p>
              <h3 className="text-4xl font-extrabold text-white mt-2">{usedCapacity}</h3>
            </div>
            <div className="bg-indigo-500/20 border border-indigo-500/30 p-4 rounded-2xl">
              <Building2 className="w-8 h-8 text-indigo-400" />
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-300 uppercase tracking-widest">Capacity</p>
              <h3 className="text-4xl font-extrabold text-white mt-2">{usedCapacity} / {maxCapacity}</h3>
              <div className="w-full bg-white/10 rounded-full h-1.5 mt-3">
                <div className="h-1.5 rounded-full bg-gradient-to-r from-[#FFD700] to-green-400 transition-all duration-700" style={{ width: `${capacityPct}%` }} />
              </div>
            </div>
            <div className="bg-green-500/20 border border-green-500/30 p-4 rounded-2xl">
              <Activity className="w-8 h-8 text-green-400" />
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-300 uppercase tracking-widest">Slots Available</p>
              <h3 className="text-4xl font-extrabold text-[#FFD700] mt-2">{Math.max(0, maxCapacity - usedCapacity)}</h3>
            </div>
            <div className="bg-[#FFD700]/10 border border-[#FFD700]/20 p-4 rounded-2xl">
              <Users className="w-8 h-8 text-[#FFD700]" />
            </div>
          </div>
        </div>

        {/* Impact Analytics */}
        {impact && (
          <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-1"><Target className="w-5 h-5 text-purple-400"/> Mentor Impact Analytics</h2>
              <p className="text-sm text-slate-400">Your historical performance and success rate across assigned startups.</p>
            </div>
            <div className="flex gap-8 items-center text-center">
              <div>
                <p className="text-3xl font-extrabold text-white">{impact.graduated}</p>
                <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">Graduated</p>
              </div>
              <div className="w-px h-10 bg-white/10"></div>
              <div>
                <p className="text-3xl font-extrabold text-green-400">{impact.successRate}%</p>
                <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">Success Rate</p>
              </div>
            </div>
          </div>
        )}

        {/* AI Risk Insights */}
        {riskInsights.length > 0 && (
          <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-20"><Activity className="w-32 h-32 text-red-400" /></div>
            <div className="relative z-10">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2 mb-4">
                <Sparkles className="w-6 h-6 text-red-400" /> AI Risk Alerts
              </h2>
              <p className="text-slate-400 text-sm mb-4">The AI Copilot has flagged the following startups in your portfolio for review:</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {riskInsights.map((risk, i) => (
                  <div key={i} className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-300">{risk.organizations?.name}</span>
                      <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${
                        risk.severity === 'Critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        risk.severity === 'High' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                        'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      }`}>
                        {risk.severity} Risk
                      </span>
                    </div>
                    <p className="text-sm text-white">{risk.insight}</p>
                    <p className="text-[10px] text-slate-500 mt-2">Detected: {new Date(risk.detected_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}



        {/* Milestone Queue */}
        <div>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-green-400" /> Milestone Verification Queue
            {milestoneQueue.length > 0 && <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full font-bold">{milestoneQueue.length} pending</span>}
          </h2>
          {milestoneQueue.length === 0 ? (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center text-slate-500 text-sm">No milestone submissions pending your review.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {milestoneQueue.map((sub: any) => (
                <div key={sub.id} className="bg-white/5 backdrop-blur-xl border border-green-500/20 rounded-2xl p-5 hover:bg-white/10 transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-white font-bold text-sm">{sub.milestones?.title}</h3>
                      <p className="text-slate-400 text-xs">{sub.organizations?.name}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${ sub.milestones?.is_required ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}` }>{sub.milestones?.is_required ? 'Core' : 'Optional'}</span>
                  </div>
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

        {/* Startup Portfolio */}
        <div>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#FFD700]" /> Your Startup Portfolio
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {assignments.length === 0 ? (
              <div className="col-span-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-16 text-center">
                <Building2 className="w-12 h-12 text-slate-500 mx-auto mb-4 opacity-50" />
                <p className="text-slate-400 font-medium">No startups assigned to you yet. Your Manager will assign them soon.</p>
              </div>
            ) : (
              assignments.map((a: any, idx: number) => {
                const org = a.organizations;
                return (
                  <div key={idx} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex flex-col gap-5 hover:bg-white/10 transition-all">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-white">{org?.name}</h3>
                        <p className="text-slate-400 text-sm mt-1">{org?.description}</p>
                      </div>
                      <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-1 rounded-md font-bold uppercase">{org?.status}</span>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <span className="flex items-center gap-1 text-xs text-slate-400 bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
                        <Globe className="w-3.5 h-3.5" /> {org?.website || "No website"}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-400 bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
                        {org?.stage}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-400 bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
                        {org?.domains?.name}
                      </span>
                    </div>

                    <div className="border-t border-white/10 pt-4 space-y-2">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Founder</p>
                      <p className="text-sm text-white font-medium">{org?.user_profiles?.full_name}</p>
                      <p className="text-xs text-slate-400">{org?.user_profiles?.email}</p>
                    </div>

                    {org?.documents && org.documents.length > 0 && (
                      <div className="border-t border-white/10 pt-4 space-y-2">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Documents</p>
                        {org.documents.map((doc: any, di: number) => (
                          <a key={di} href={doc.file_url} target="_blank" rel="noreferrer"
                            className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                            <FileText className="w-4 h-4" /> {doc.document_type}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recommended for Your Startups */}
        {recommendations.length > 0 && (
          <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-20"><Target className="w-32 h-32 text-indigo-400" /></div>
            <div className="relative z-10">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2 mb-4">
                <Target className="w-6 h-6 text-indigo-400" /> Recommended for Your Startups
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendations.map((rec: any, idx: number) => (
                  <div key={idx} className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-5 hover:bg-white/10 hover:border-indigo-500/30 transition-all group">
                    <div className="flex items-center justify-between mb-3">
                      <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[10px] uppercase font-bold px-2 py-1 rounded">
                        {rec.opportunities.type}
                      </span>
                      <span className="text-green-400 text-[10px] uppercase font-bold bg-green-500/10 px-2 py-1 rounded border border-green-500/20">
                        {rec.organizations.name}
                      </span>
                    </div>
                    <h3 className="font-bold text-white mb-1">{rec.opportunities.title}</h3>
                    <p className="text-xs text-slate-400 mb-3">{rec.reason} ({rec.score} pt match)</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Milestone Review Modal */}
      {reviewingMilestone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold text-white">Review Milestone</h3>
              <button onClick={() => setReviewingMilestone(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="mb-4 p-3 bg-white/5 rounded-xl">
              <p className="text-white font-bold text-sm">{reviewingMilestone.milestones?.title}</p>
              <p className="text-xs text-slate-400">{reviewingMilestone.organizations?.name}</p>
            </div>
            {reviewingMilestone.evidence_url && (
              <a href={reviewingMilestone.evidence_url} target="_blank" rel="noreferrer" className="text-indigo-400 text-sm hover:text-indigo-300 underline flex items-center gap-1 mb-3">
                <Globe className="w-4 h-4" /> View Submitted Evidence
              </a>
            )}
            {reviewingMilestone.evidence_note && <p className="text-sm text-slate-400 italic mb-4">{reviewingMilestone.evidence_note}</p>}
            <div className="mb-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Decision</p>
              <div className="flex gap-2">
                {['Approved', 'Revision Requested', 'Rejected'].map(o => (
                  <button key={o} onClick={() => setMilestoneForm({...milestoneForm, outcome: o})}
                    className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                      milestoneForm.outcome === o ?
                        o === 'Approved' ? 'bg-green-500/20 border-green-500/30 text-green-400' :
                        o === 'Rejected' ? 'bg-red-500/20 border-red-500/30 text-red-400' :
                        'bg-yellow-500/20 border-yellow-500/30 text-yellow-400'
                      : 'bg-white/5 border-white/10 text-slate-400'
                    }`}>{o}</button>
                ))}
              </div>
            </div>
            <textarea value={milestoneForm.comments} onChange={e => setMilestoneForm({...milestoneForm, comments: e.target.value})}
              rows={3} placeholder="Provide feedback for the founder..."
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-green-500/50 focus:outline-none mb-4" />
            <button disabled={milestoneLoading} onClick={async () => {
              const u = (await supabase.auth.getUser()).data.user;
              if (!u) return;
              setMilestoneLoading(true);
              const { reviewMilestoneAsMentor } = await import('@/lib/actions/milestones');
              const res = await reviewMilestoneAsMentor(reviewingMilestone.id, u.id, milestoneForm.outcome as any, milestoneForm.comments);
              setMilestoneLoading(false);
              if (res.success) { setReviewingMilestone(null); await loadData(); } else alert('Error: ' + res.error);
            }} className="w-full bg-green-500 text-white font-extrabold py-3 rounded-xl text-sm hover:shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all disabled:opacity-60">
              {milestoneLoading ? 'Submitting...' : 'Submit Milestone Review'}
            </button>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
