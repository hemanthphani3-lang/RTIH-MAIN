"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabase/client";
import { getPendingStartupsForManager, updateStartupStatus } from "@/lib/actions/org";
import { getMentorsForAssignment, assignMentorToStartup } from "@/lib/actions/mentorship";
import { Building2, CheckCircle2, XCircle, FileText, Globe, Loader2, UserCheck, X, MapPin, Activity } from "lucide-react";

export default function ManagerStartupsPage() {
  const [userId, setUserId] = useState<string>("");
  const [startups, setStartups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Mentor selection modal state
  const [approvingOrg, setApprovingOrg] = useState<any>(null);
  const [availableMentors, setAvailableMentors] = useState<any[]>([]);
  const [mentorsLoading, setMentorsLoading] = useState(false);
  const [selectedMentorId, setSelectedMentorId] = useState<string>("");

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      const res = await getPendingStartupsForManager(user.id);
      if (res.success) setStartups(res.data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const ch = supabase.channel("mgr-startups")
      .on("postgres_changes", { event: "*", schema: "public", table: "organizations" }, loadData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadData]);

  // Opens the approval modal and loads matching mentors
  const handleApproveClick = async (org: any) => {
    setApprovingOrg(org);
    setSelectedMentorId("");
    setAvailableMentors([]);
    setMentorsLoading(true);
    const res = await getMentorsForAssignment(userId, org.domains?.name || "");
    setAvailableMentors(res.data || []);
    setMentorsLoading(false);
  };

  // Approve + assign mentor in one go
  const handleApproveAndAssign = async () => {
    if (!selectedMentorId) return alert("Please select a mentor to assign.");
    setProcessingId(approvingOrg.id);

    // 1. Update org status to Approved
    const approveRes = await updateStartupStatus(approvingOrg.id, "Approved");
    if (!approveRes.success) {
      alert("Error approving: " + approveRes.error);
      setProcessingId(null);
      return;
    }

    // 2. Create mentorship assignment
    const assignRes = await assignMentorToStartup(approvingOrg.id, selectedMentorId, userId);
    if (!assignRes.success) {
      alert("Approved but failed to assign mentor: " + assignRes.error);
    }

    setProcessingId(null);
    setApprovingOrg(null);
    await loadData();
  };

  const handleReject = async (orgId: string) => {
    if (!confirm("Are you sure you want to reject this startup?")) return;
    setProcessingId(orgId);
    const res = await updateStartupStatus(orgId, "Rejected");
    if (!res.success) alert("Error: " + res.error);
    setProcessingId(null);
    await loadData();
  };

  if (loading) return <DashboardLayout><div className="p-8 text-center text-slate-900 dark:text-white">Loading Pending Startups...</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">

        {/* Header */}
        <div className="flex items-center justify-between bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-6 rounded-3xl">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Startup Verification Pipeline</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Review and approve startups, then assign a Mentor — all in one step.</p>
          </div>
          <div className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
            {startups.length} Pending Approval
          </div>
        </div>

        {/* Startups List */}
        <div className="space-y-6">
          {startups.length === 0 ? (
            <div className="bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl p-16 text-center">
              <Building2 className="w-16 h-16 text-slate-500 mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No pending startups</h3>
              <p className="text-slate-500 dark:text-slate-400">Your pipeline is clear! Check back later for new applications.</p>
            </div>
          ) : (
            startups.map((org: any) => (
              <div key={org.id} className="bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl p-6 md:p-8 flex flex-col lg:flex-row gap-8 hover:bg-white/60 dark:bg-white/10 transition-all">

                {/* Org Details */}
                <div className="flex-1 space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3 flex-wrap">
                      {org.name}
                      <span className="bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20 text-[10px] uppercase tracking-wider px-2 py-1 rounded-md font-bold">
                        {org.domains?.name}
                      </span>
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">{org.description}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-slate-200 dark:border-white/10">
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Problem</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-300">{org.problem_statement}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Solution</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-300">{org.solution}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-3">
                    <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
                      <Globe className="w-3.5 h-3.5" /> {org.website || "No website"}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
                      <Building2 className="w-3.5 h-3.5" /> {org.stage}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
                      Founder: {org.user_profiles?.full_name} · {org.user_profiles?.email}
                    </span>
                  </div>
                </div>

                {/* Docs & Actions */}
                <div className="w-full lg:w-64 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-white/10 pt-6 lg:pt-0 lg:pl-8 gap-6">
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Documents</h4>
                    {org.documents && org.documents.length > 0 ? (
                      <div className="space-y-2">
                        {org.documents.map((doc: any, i: number) => (
                          <a key={i} href={doc.file_url} target="_blank" rel="noreferrer"
                            className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-white hover:bg-white/60 dark:bg-white/10 transition-colors">
                            <FileText className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                            <span className="truncate">{doc.document_type}</span>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 italic">No documents.</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => handleApproveClick(org)}
                      disabled={!!processingId}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all border border-green-500/20 disabled:opacity-50">
                      <CheckCircle2 className="w-4 h-4" /> Approve & Assign Mentor
                    </button>
                    <button
                      onClick={() => handleReject(org.id)}
                      disabled={!!processingId}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all border border-red-500/20 disabled:opacity-50">
                      {processingId === org.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                      Reject
                    </button>
                  </div>
                </div>

              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Mentor Assignment Modal ── */}
      {approvingOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setApprovingOrg(null)} />

          {/* Modal Panel */}
          <div className="relative z-10 w-full max-w-2xl bg-[#0b1121] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">

            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-white/5">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
                  <UserCheck className="w-6 h-6 text-[#FFD700]" /> Assign a Mentor
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                  Approving <span className="text-slate-900 dark:text-white font-bold">{approvingOrg.name}</span> · Domain:{" "}
                  <span className="text-[#FFD700] font-bold">{approvingOrg.domains?.name}</span>
                </p>
              </div>
              <button onClick={() => setApprovingOrg(null)} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors p-2 rounded-xl hover:bg-white/60 dark:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mentor List */}
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
              {mentorsLoading ? (
                <div className="flex items-center justify-center py-12 gap-3 text-slate-500 dark:text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin" /> Loading available mentors...
                </div>
              ) : availableMentors.length === 0 ? (
                <div className="text-center py-12">
                  <UserCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500 dark:text-slate-400 font-medium">No mentors available for the <strong>{approvingOrg.domains?.name}</strong> domain in your hub.</p>
                  <p className="text-slate-500 text-sm mt-1">Add mentors first via the Mentors page.</p>
                </div>
              ) : (
                availableMentors.map((m: any) => {
                  const isSelected = selectedMentorId === m.id;
                  const capacityPct = Math.round((m.assignedCount / m.max_capacity) * 100);
                  return (
                    <div key={m.id} onClick={() => setSelectedMentorId(m.id)}
                      className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? "bg-[#FFD700]/10 border-[#FFD700]/40 shadow-[0_0_15px_rgba(255,215,0,0.1)]"
                          : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 hover:bg-white/60 dark:bg-white/10"
                      }`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-lg transition-all ${
                          isSelected ? "bg-[#FFD700] text-black" : "bg-white/60 dark:bg-white/10 text-slate-600 dark:text-slate-300"
                        }`}>
                          {m.user_profiles?.full_name?.[0]}
                        </div>
                        <div>
                          <p className="text-slate-900 dark:text-white font-bold">{m.user_profiles?.full_name}</p>
                          <p className="text-slate-500 dark:text-slate-400 text-xs">{m.user_profiles?.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <MapPin className="w-3 h-3 text-blue-400" />
                            <span className="text-xs text-slate-500">{m.location}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 justify-end mb-1">
                          <Activity className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                          <span className="text-xs font-bold text-slate-900 dark:text-white">{m.assignedCount}/{m.max_capacity}</span>
                        </div>
                        <div className="w-20 bg-white/60 dark:bg-white/10 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full bg-gradient-to-r from-[#FFD700] to-green-400 transition-all"
                            style={{ width: `${capacityPct}%` }} />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">capacity</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-200 dark:border-white/10 flex items-center gap-3">
              <button onClick={() => setApprovingOrg(null)}
                className="flex-1 py-3 rounded-xl font-bold text-sm bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:bg-white/10 transition-all border border-slate-200 dark:border-white/10">
                Cancel
              </button>
              <button
                onClick={handleApproveAndAssign}
                disabled={!selectedMentorId || !!processingId}
                className="flex-1 py-3 rounded-xl font-bold text-sm bg-[#FFD700] text-black hover:shadow-[0_0_20px_rgba(255,215,0,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {processingId ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Approve & Assign
              </button>
            </div>

          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
