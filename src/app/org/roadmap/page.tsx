"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabase/client";
import { getOrgCertificationStatus, submitStageCertificationRequest } from "@/lib/actions/certification";
import { STAGE_CONFIG, VENTURE_STAGES, STAGE_BADGES, VentureStage } from "@/lib/milestones-config";
import { Map, Rocket, CheckCircle2, Lock, Clock, AlertCircle, Send, X } from "lucide-react";

export default function OrgRoadmapPage() {
  const [data, setData] = useState<any>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCertModal, setShowCertModal] = useState(false);
  const [certEvidence, setCertEvidence] = useState<Record<string, string>>({});
  const [certNotes, setCertNotes] = useState("");
  const [certLoading, setCertLoading] = useState(false);
  const [certError, setCertError] = useState("");

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: orgData } = await supabase.from("organizations").select("id").eq("founder_id", user.id).single();
    if (!orgData) { setLoading(false); return; }
    setOrgId(orgData.id);
    const res = await getOrgCertificationStatus(orgData.id);
    if (res.success) setData(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const ch = supabase.channel("org-roadmap")
      .on("postgres_changes", { event: "*", schema: "public", table: "stage_certification_requests" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "organizations" }, loadData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadData]);

  const handleCertSubmit = async () => {
    if (!orgId || !data?.org?.nextStage) return;
    setCertLoading(true);
    setCertError("");
    try {
      const evidence = { ...certEvidence, notes: certNotes };
      const res = await submitStageCertificationRequest(orgId, data.org.nextStage as VentureStage, evidence);
      if (res.success) {
        setShowCertModal(false);
        setCertEvidence({});
        setCertNotes("");
        await loadData();
      } else {
        setCertError(res.error || "Failed to submit");
      }
    } catch (err: any) {
      setCertError(err.message);
    } finally {
      setCertLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-slate-900 dark:text-white text-lg font-bold animate-pulse">Loading your Venture Roadmap...</div>
    </div>
  );

  const org = data?.org;
  const activeRequest = data?.activeRequest;
  const verifiedStageRaw = org?.verifiedStage || "Ideation";
  const verifiedStage = verifiedStageRaw.endsWith(" Stage") ? verifiedStageRaw.replace(" Stage", "") : verifiedStageRaw;
  const verifiedIndex = VENTURE_STAGES.indexOf(verifiedStage as VentureStage);
  const nextStage = org?.nextStage;
  const nextStageConfig = nextStage ? STAGE_CONFIG.find(s => s.stage === nextStage) : null;

  const getStatusColor = (score: number) => score >= 70 ? "bg-green-500" : score >= 40 ? "bg-yellow-500" : "bg-red-500";

  return (
    <DashboardLayout>
      <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">

        {/* Header */}
        <div className="flex items-center justify-between bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-6 rounded-3xl">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              <Map className="w-8 h-8 text-[#FFD700]" /> Venture Roadmap
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Your verified startup journey through the RTIH ecosystem</p>
          </div>
          <div className="bg-[#FFD700]/10 border border-[#FFD700]/20 px-4 py-2 rounded-xl">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mb-0.5">Verified Stage</p>
            <p className="text-[#FFD700] font-extrabold text-lg">{verifiedStage}</p>
          </div>
        </div>

        {/* Venture Status Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-4">
            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-2">Verified Stage</p>
            <div className="flex items-center gap-2">
              <span className="text-lg">{STAGE_BADGES[verifiedStage as VentureStage]?.icon}</span>
              <span className="text-slate-900 dark:text-white font-bold text-sm">{verifiedStage}</span>
            </div>
          </div>
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-4">
            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-2">Claimed Stage</p>
            {org?.claimed_stage && org.claimed_stage !== verifiedStage ? (
              <div className="flex items-center gap-2">
                <span className="text-yellow-400 font-bold text-sm">{org.claimed_stage}</span>
                <span className="text-[10px] bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-1.5 py-0.5 rounded font-bold">Pending</span>
              </div>
            ) : (
              <span className="text-slate-500 dark:text-slate-400 text-sm">Same as verified</span>
            )}
          </div>
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-4">
            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-2">Health Score</p>
            <div>
              <span className="text-slate-900 dark:text-white font-extrabold text-xl">{org?.health_score || 0}</span>
              <span className="text-slate-500 text-sm">/100</span>
              <div className="w-full bg-white/60 dark:bg-white/10 rounded-full h-1.5 mt-2">
                <div className={`h-1.5 rounded-full transition-all ${getStatusColor(org?.health_score || 0)}`} style={{ width: `${org?.health_score || 0}%` }} />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-4">
            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-2">Next Stage</p>
            {nextStage ? (
              <div className="flex items-center gap-2">
                <Rocket className="w-4 h-4 text-indigo-400" />
                <span className="text-indigo-400 font-bold text-sm">{nextStage}</span>
              </div>
            ) : (
              <span className="text-yellow-400 font-bold text-sm">🏆 Scale Champion</span>
            )}
          </div>
        </div>

        {/* Stage Roadmap */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-8 flex items-center gap-2">Stage Progression</h2>
          <div className="flex flex-col space-y-6">
            {VENTURE_STAGES.map((stage, i) => {
              const isCompleted = i < verifiedIndex;
              const isCurrent = i === verifiedIndex;
              const isFuture = i > verifiedIndex;
              const badge = STAGE_BADGES[stage];
              const config = STAGE_CONFIG.find(s => s.stage === stage);

              return (
                <div key={stage} className="flex gap-5 relative">
                  {i !== VENTURE_STAGES.length - 1 && (
                    <div className={`absolute left-6 top-14 bottom-[-24px] w-0.5 rounded-full ${isCompleted ? "bg-indigo-600 dark:bg-[#FFD700]" : "bg-slate-200 dark:bg-white/10"}`} />
                  )}
                  <div className="relative z-10 shrink-0">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all ${
                      isCompleted ? "bg-indigo-600 dark:bg-[#FFD700] border-indigo-600 dark:border-[#FFD700] text-white dark:text-black shadow-[0_0_20px_rgba(99,102,241,0.4)] dark:shadow-[0_0_20px_rgba(255,215,0,0.4)]" :
                      isCurrent ? "bg-indigo-100 dark:bg-indigo-500/20 border-indigo-500 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400" :
                      "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-600"
                    }`}>
                      {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : isCurrent ? <Rocket className="w-5 h-5 animate-pulse" /> : <Lock className="w-4 h-4" />}
                    </div>
                  </div>
                  <div className={`pt-1.5 flex-1 ${isFuture ? "opacity-50 dark:opacity-40" : ""}`}>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className={`text-lg font-extrabold ${isCurrent ? "text-indigo-600 dark:text-indigo-300" : isCompleted ? "text-indigo-700 dark:text-[#FFD700]" : "text-slate-600 dark:text-slate-400"}`}>
                        {badge?.icon} {stage}
                      </h3>
                      {isCompleted && <span className="text-[10px] bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-500/20 px-2 py-0.5 rounded-full font-bold uppercase">Certified ✅</span>}
                      {isCurrent && <span className="text-[10px] bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-500/20 px-2 py-0.5 rounded-full font-bold uppercase animate-pulse">Active Stage</span>}
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                      {isCompleted ? "Stage certified. Your venture has successfully passed this stage." :
                       isCurrent ? "Complete all core milestones and apply for next stage certification." :
                       config?.description || "Future stage — unlock by advancing from previous stage."}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{STAGE_BADGES[stage]?.name} Badge</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Certification Request */}
        {activeRequest && (
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl p-6">
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-400 animate-pulse" /> Certification Request In Progress
            </h2>
            <div className="flex items-center gap-2 mb-6">
              <span className="text-slate-500 dark:text-slate-400 text-sm">Applying for:</span>
              <span className="text-slate-900 dark:text-white font-bold">{activeRequest.requested_stage}</span>
            </div>
            {/* 2-Step Tracker */}
            <div className="flex items-center gap-0">
              {["Submitted", "Manager Review"].map((step, i) => {
                const isStepDone = i === 0 ? true : !!activeRequest.manager_outcome;
                const isActive = i === 1 && ["Pending", "Physical Review Scheduled"].includes(activeRequest.status);
                return (
                  <div key={step} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                        isStepDone ? "bg-green-500 border-green-500 text-slate-900 dark:text-white" :
                        isActive ? "bg-yellow-500/20 border-yellow-500 text-yellow-400 animate-pulse" :
                        "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500"
                      }`}>
                        {isStepDone ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 whitespace-nowrap">{step}</span>
                    </div>
                    {i < 1 && <div className={`h-0.5 w-24 mx-2 mb-4 ${isStepDone ? "bg-green-500" : "bg-white/60 dark:bg-white/10"}`} />}
                  </div>
                );
              })}
            </div>
            {activeRequest.status === "Revision Requested" && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-red-400 font-bold text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Revision Requested</p>
                <p className="text-slate-600 dark:text-slate-300 text-sm mt-1">{activeRequest.manager_comments}</p>
              </div>
            )}
            {activeRequest.status === "Physical Review Scheduled" && (
              <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                <p className="text-yellow-400 font-bold text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Physical/Hybrid Review Scheduled</p>
                <p className="text-slate-600 dark:text-slate-300 text-sm mt-1">{activeRequest.manager_comments}</p>
              </div>
            )}
          </div>
        )}

        {/* Next Stage CTA */}
        {!activeRequest && nextStage && (
          <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-3xl p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5" />
            <div className="relative z-10">
              <Rocket className="w-12 h-12 text-indigo-400 mx-auto mb-4 animate-bounce" />
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">Ready to Advance?</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-6">Complete all core milestones, then apply for <span className="text-indigo-400 font-bold">{nextStage}</span> certification.</p>
              <button
                onClick={() => setShowCertModal(true)}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 text-slate-900 dark:text-white px-8 py-3 rounded-xl font-bold text-sm hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] transition-all flex items-center gap-2 mx-auto"
              >
                <Send className="w-4 h-4" /> Submit for {nextStage} Certification
              </button>
            </div>
          </div>
        )}

        {/* Certification Modal */}
        {showCertModal && nextStage && nextStageConfig && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Apply for {nextStage} Certification</h3>
                <button onClick={() => setShowCertModal(false)} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Submit evidence for the following requirements:</p>
              <div className="space-y-4">
                {nextStageConfig.advancementEvidence.map((ev) => (
                  <div key={ev}>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block">{ev}</label>
                    <input
                      value={certEvidence[ev] || ""}
                      onChange={(e) => setCertEvidence({ ...certEvidence, [ev]: e.target.value })}
                      placeholder="URL or brief description..."
                      className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white text-sm focus:border-indigo-500/50 focus:outline-none transition-all"
                    />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block">Supporting Notes</label>
                  <textarea
                    value={certNotes}
                    onChange={(e) => setCertNotes(e.target.value)}
                    rows={4}
                    placeholder="Describe your progress, achievements and why you are ready for this stage..."
                    className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white text-sm focus:border-indigo-500/50 focus:outline-none transition-all"
                  />
                </div>
              </div>
              {certError && <p className="text-red-400 text-sm mt-3">{certError}</p>}
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowCertModal(false)} className="flex-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 px-4 py-3 rounded-xl font-bold text-sm hover:bg-white/60 dark:bg-white/10 transition-all">Cancel</button>
                <button
                  onClick={handleCertSubmit}
                  disabled={certLoading}
                  className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-slate-900 dark:text-white px-4 py-3 rounded-xl font-bold text-sm hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all disabled:opacity-60"
                >
                  {certLoading ? "Submitting..." : "Submit Certification Request"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
