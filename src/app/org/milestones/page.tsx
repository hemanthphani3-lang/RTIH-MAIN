"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabase/client";
import { getMilestonesForOrg, submitMilestoneEvidence } from "@/lib/actions/milestones";
import { STAGE_BADGES, STAGE_CONFIG, VentureStage } from "@/lib/milestones-config";
import { Target, CheckCircle2, Clock, AlertCircle, Send, X, Link2, Star, ChevronRight, Zap, Hourglass, Activity, ShieldCheck } from "lucide-react";
import Link from "next/link";

type EvidenceType = "url" | "document" | "video";

export default function OrgMilestonesPage() {
  const [data, setData] = useState<any>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Evidence modal state
  const [submittingMilestone, setSubmittingMilestone] = useState<any>(null);
  const [evidenceType, setEvidenceType] = useState<EvidenceType>("url");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: orgData } = await supabase.from("organizations").select("id").eq("founder_id", user.id).single();
    if (!orgData) { setLoading(false); return; }
    setOrgId(orgData.id);
    const res = await getMilestonesForOrg(orgData.id);
    if (res.success) {
      setData(res.data);
    } else {
      setError(res.error || "Failed to load milestones");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openEvidenceModal = (milestone: any) => {
    setSubmittingMilestone(milestone);
    setEvidenceType("url");
    setEvidenceUrl(milestone.submission?.evidence_url || "");
    setEvidenceNote(milestone.submission?.evidence_note || "");
    setSubmitError("");
  };

  const handleSubmitEvidence = async () => {
    if (!orgId || !submittingMilestone) return;
    if (!evidenceUrl.trim()) { setSubmitError("Please provide a URL or link."); return; }
    setSubmitLoading(true);
    setSubmitError("");
    const res = await submitMilestoneEvidence(orgId, submittingMilestone.id, evidenceUrl, evidenceNote, evidenceType);
    if (res.success) {
      setSubmittingMilestone(null);
      setEvidenceUrl("");
      setEvidenceNote("");
      await loadData();
    } else {
      setSubmitError(res.error || "Failed to submit evidence");
    }
    setSubmitLoading(false);
  };

  if (loading) return (
    <DashboardLayout>
      <div className="p-8 flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#FFD700]/20 border-t-[#FFD700] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-900 dark:text-white font-bold animate-pulse">Loading Founder Action Center...</p>
        </div>
      </div>
    </DashboardLayout>
  );

  const verifiedStage = data?.verifiedStage || "Ideation";
  const badge = STAGE_BADGES[verifiedStage as VentureStage];
  const progressPct = data?.progressPct || 0;
  
  const milestonesCompleted = data?.verifiedCount || 0;
  const milestonesRemaining = (data?.totalCore || 0) - milestonesCompleted;

  // Determine next recommended action
  const pendingCore = data?.core?.filter((m: any) => m.displayStatus === "Not Started" || m.displayStatus === "Rejected");
  const nextAction = pendingCore && pendingCore.length > 0 ? pendingCore[0] : null;

  const statusIcon = (status: string) => {
    switch (status) {
      case "Verified":
      case "Completed": return <CheckCircle2 className="w-6 h-6 text-green-400" />;
      case "Submitted":
      case "In Progress": return <Clock className="w-6 h-6 text-yellow-400 animate-pulse" />;
      case "Rejected": return <AlertCircle className="w-6 h-6 text-red-400" />;
      default: return <div className="w-6 h-6 rounded-full border-2 border-slate-600" />;
    }
  };

  const statusPill = (status: string) => {
    const map: Record<string, string> = {
      "Verified": "bg-green-500/10 text-green-400 border-green-500/20",
      "Completed": "bg-green-500/10 text-green-400 border-green-500/20",
      "Submitted": "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
      "In Progress": "bg-blue-500/10 text-blue-400 border-blue-500/20",
      "Rejected": "bg-red-500/10 text-red-400 border-red-500/20",
      "Not Started": "bg-white dark:bg-white/5 text-slate-500 border-slate-200 dark:border-white/10",
    };
    return `text-[10px] font-bold uppercase px-3 py-1 rounded-full border tracking-wider ${map[status] || map["Not Started"]}`;
  };

  const getDifficultyColor = (diff: string) => {
    if (diff === "Easy") return "text-green-400";
    if (diff === "Medium") return "text-yellow-400";
    return "text-red-400";
  };

  const MilestoneCard = ({ m }: { m: any }) => {
    const isVerified = m.displayStatus === "Verified" || m.displayStatus === "Completed";
    const isRejected = m.displayStatus === "Rejected";
    const isPending = m.displayStatus === "Submitted" || m.displayStatus === "In Progress";
    const canSubmit = m.displayStatus === "Not Started" || m.displayStatus === "Rejected";

    return (
      <div className={`bg-[#0f172a]/80 backdrop-blur-xl border rounded-2xl p-6 flex flex-col md:flex-row gap-5 transition-all hover:bg-[#1e293b]/80 group ${
        isVerified ? "border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.05)]" :
        isRejected ? "border-red-500/30" :
        isPending ? "border-yellow-500/20" :
        "border-slate-200 dark:border-slate-800"
      }`}>
        <div className="shrink-0 mt-1">{statusIcon(m.displayStatus)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className={`font-extrabold text-lg ${
              isVerified ? "text-green-400" : "text-slate-900 dark:text-white"
            }`}>{m.title}</h3>
            <span className={statusPill(m.displayStatus)}>{m.displayStatus}</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 leading-relaxed">{m.description}</p>
          
          <div className="flex flex-wrap items-center gap-4 mb-4 bg-slate-100 dark:bg-black/20 rounded-xl p-3 border border-white/5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
              <Zap className={`w-3.5 h-3.5 ${getDifficultyColor(m.difficulty)}`} />
              Difficulty: <span className="text-slate-900 dark:text-white font-medium">{m.difficulty || "Medium"}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
              <Hourglass className="w-3.5 h-3.5 text-blue-400" />
              Est. Time: <span className="text-slate-900 dark:text-white font-medium">{m.estimatedTime || "N/A"}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
              <Activity className="w-3.5 h-3.5 text-pink-400" />
              Health Impact: <span className="text-green-400 font-extrabold">{m.healthImpact || "+10 pts"}</span>
            </div>
          </div>

          {isRejected && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4">
              <p className="text-red-400 text-xs font-bold mb-0.5">Manager Feedback:</p>
              <p className="text-slate-600 dark:text-slate-300 text-sm">{m.submission?.notes || "No comments provided."}</p>
            </div>
          )}

          {isVerified && (
            <p className="text-green-400 text-sm font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Verified by Incubation Manager
            </p>
          )}

          {isPending && (
            <p className="text-yellow-400 text-sm font-bold flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> Under Review
            </p>
          )}

          {canSubmit && (
            <button
              onClick={() => openEvidenceModal(m)}
              className="mt-2 flex items-center gap-2 text-sm font-bold bg-indigo-600/10 text-indigo-400 border border-indigo-500/30 px-5 py-2.5 rounded-xl hover:bg-indigo-600/20 hover:text-indigo-300 transition-all shadow-sm"
            >
              <Send className="w-4 h-4" /> {isRejected ? "Revise & Resubmit Evidence" : "Complete Milestone"}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-5xl mx-auto space-y-10 animate-in fade-in duration-500 pb-24">

        {/* Action Center Header */}
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            Founder Action Center
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">Your operational engine for stage advancement and venture growth.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-red-400 text-sm font-medium">{error}</div>
        )}

        {/* Progress & Next Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Main Status Block */}
          <div className="md:col-span-8 bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/20 rounded-3xl p-8 relative overflow-hidden shadow-2xl shadow-indigo-900/20">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Target className="w-48 h-48" />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <span className="bg-indigo-500/20 text-indigo-300 text-xs font-bold px-3 py-1 rounded-full border border-indigo-500/30 uppercase tracking-widest">
                  Current Stage
                </span>
                <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  {badge?.icon} {verifiedStage}
                </h2>
              </div>
              
              <div className="mb-8">
                <div className="flex justify-between text-sm font-bold mb-2">
                  <span className="text-indigo-300">Stage Progress</span>
                  <span className="text-slate-900 dark:text-white">{progressPct}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-black/40 rounded-full h-3 border border-white/5">
                  <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-400 transition-all duration-1000 shadow-[0_0_15px_rgba(99,102,241,0.5)]" style={{ width: `${progressPct}%` }} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-100 dark:bg-black/20 border border-white/5 rounded-2xl p-4">
                  <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Completed</p>
                  <p className="text-2xl font-extrabold text-green-400">{milestonesCompleted}</p>
                </div>
                <div className="bg-slate-100 dark:bg-black/20 border border-white/5 rounded-2xl p-4">
                  <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Remaining</p>
                  <p className="text-2xl font-extrabold text-yellow-400">{milestonesRemaining}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Next Recommended Action */}
          <div className="md:col-span-4 bg-[#1e293b] border border-slate-300 dark:border-slate-700 rounded-3xl p-8 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
                <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">Next Action</h3>
              </div>
              
              {nextAction ? (
                <>
                  <h4 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2 leading-tight">{nextAction.title}</h4>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">{nextAction.description}</p>
                  
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 mb-6">
                    <p className="text-green-400 text-xs font-bold uppercase mb-0.5">Impact</p>
                    <p className="text-green-300 text-sm font-medium">{nextAction.healthImpact} to Health Score</p>
                  </div>
                </>
              ) : data?.allCoreVerified ? (
                <>
                  <h4 className="text-xl font-extrabold text-[#FFD700] mb-2 leading-tight">Stage Complete!</h4>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">You have completed all core milestones for this stage.</p>
                  <div className="bg-[#FFD700]/10 border border-[#FFD700]/20 rounded-xl p-3 mb-6">
                    <p className="text-[#FFD700] text-xs font-bold uppercase mb-0.5">Impact</p>
                    <p className="text-yellow-200 text-sm font-medium">Unlock {badge?.name} Badge</p>
                  </div>
                </>
              ) : (
                <p className="text-slate-500 dark:text-slate-400 text-sm">All set for now!</p>
              )}
            </div>
            
            {data?.allCoreVerified ? (
              <Link href="/org/roadmap" className="w-full bg-[#FFD700] text-black text-center px-4 py-3 rounded-xl font-extrabold text-sm hover:shadow-[0_0_20px_rgba(255,215,0,0.4)] transition-all flex items-center justify-center gap-2">
                Apply for {STAGE_CONFIG[data.stageSequence]?.stage || "Next"} Stage <ChevronRight className="w-4 h-4" />
              </Link>
            ) : nextAction ? (
              <button 
                onClick={() => openEvidenceModal(nextAction)}
                className="w-full bg-white text-black px-4 py-3 rounded-xl font-extrabold text-sm hover:bg-slate-200 transition-all shadow-md">
                Complete Now
              </button>
            ) : null}
          </div>
        </div>

        {/* Core Milestones */}
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
            <Target className="w-6 h-6 text-indigo-400" /> Stage Core Milestones
            <span className="text-xs bg-white/60 dark:bg-white/10 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full font-bold ml-2">Required</span>
          </h2>
          <div className="space-y-4">
            {data?.core?.length === 0 ? (
              <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center text-slate-500 font-medium">No milestones found for this stage.</div>
            ) : (
              data?.core?.map((m: any) => <MilestoneCard key={m.id} m={m} />)
            )}
          </div>
        </div>

        {/* Optional Milestones */}
        {data?.optional?.length > 0 && (
          <div className="pt-8 border-t border-white/5">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
              <Star className="w-5 h-5 text-purple-400" /> Optional Milestones
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium bg-slate-100 dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800">Boost your Venture Health</span>
            </h2>
            <div className="space-y-4 opacity-80 hover:opacity-100 transition-opacity">
              {data?.optional?.map((m: any) => <MilestoneCard key={m.id} m={m} />)}
            </div>
          </div>
        )}

      </div>

      {/* Evidence Modal */}
      {submittingMilestone && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-8 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Complete Milestone</h3>
              <button onClick={() => setSubmittingMilestone(null)} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white bg-white dark:bg-white/5 p-2 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 mb-6 mt-4">
              <p className="text-indigo-400 font-extrabold text-sm mb-1">{submittingMilestone.title}</p>
              <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">{submittingMilestone.evidenceHint}</p>
            </div>

            {/* Evidence type tabs */}
            <div className="flex gap-2 mb-6">
              {(["url", "document", "video"] as EvidenceType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setEvidenceType(t)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold border transition-all ${
                    evidenceType === t ? "bg-indigo-600 border-indigo-500 text-slate-900 dark:text-white shadow-lg shadow-indigo-600/20" : "bg-slate-200 dark:bg-black/40 border-white/5 text-slate-500 dark:text-slate-400 hover:bg-white dark:bg-white/5 hover:text-slate-900 dark:text-white"
                  }`}
                >
                  {t === "url" ? "🔗 Link" : t === "document" ? "📄 Doc" : "🎥 Video"}
                </button>
              ))}
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 block">
                  {evidenceType === "url" ? "Website / Product URL" : evidenceType === "document" ? "Document URL (Drive, Notion, etc.)" : "Video URL (YouTube, Loom)"}
                </label>
                <input
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-slate-200 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl p-3.5 text-slate-900 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all shadow-inner"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 block">Implementation Notes</label>
                <textarea
                  value={evidenceNote}
                  onChange={(e) => setEvidenceNote(e.target.value)}
                  rows={4}
                  placeholder="Briefly explain how you completed this milestone..."
                  className="w-full bg-slate-200 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl p-3.5 text-slate-900 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all shadow-inner"
                />
              </div>
            </div>

            {submitError && <div className="bg-red-500/10 text-red-400 text-sm font-bold mt-4 p-3 rounded-xl border border-red-500/20">{submitError}</div>}

            <div className="flex gap-3 mt-8">
              <button onClick={() => setSubmittingMilestone(null)} className="flex-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 px-4 py-3.5 rounded-xl font-bold text-sm hover:bg-white/60 dark:bg-white/10 hover:text-slate-900 dark:text-white transition-all">Cancel</button>
              <button
                onClick={handleSubmitEvidence}
                disabled={submitLoading}
                className="flex-[2] bg-indigo-600 text-slate-900 dark:text-white px-4 py-3.5 rounded-xl font-extrabold text-sm hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/30 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitLoading ? "Submitting..." : <><Send className="w-4 h-4" /> Submit for Verification</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
