"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabase/client";
import { getOpportunityById } from "@/lib/actions/opportunities";
import { getTeamForOrganization, createTeam, submitHackathonProject, addTeamMember } from "@/lib/actions/hackathons";
import { ArrowLeft, FileText, Activity, Users, Send, PlusCircle, CheckCircle2, AlertCircle, Loader2, GitBranch, PlayCircle, Link2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function OrgOpportunityWorkspacePage() {
  const { id } = useParams() as { id: string };

  const [opportunity, setOpportunity] = useState<any>(null);
  const [workspace, setWorkspace] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [team, setTeam] = useState<any>(null);
  const [problemStatements, setProblemStatements] = useState<any[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Action states
  const [teamName, setTeamName] = useState("");
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [teamError, setTeamError] = useState("");

  const [newMember, setNewMember] = useState({ name: "", email: "" });
  const [addingMember, setAddingMember] = useState(false);

  const [submission, setSubmission] = useState({ title: "", desc: "", github: "", demo: "", video: "", pitchDeck: "", psId: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const res = await getOpportunityById(id);
    if (res.success) setOpportunity(res.data);

    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("founder_id", user.id)
      .single();

    if (!org) { setLoading(false); return; }

    setOrgId(org.id);

    const { data: ws } = await supabase
      .from("opportunity_workspaces")
      .select("*")
      .eq("opportunity_id", id)
      .eq("organization_id", org.id)
      .single();
    setWorkspace(ws);

    const { data: tl } = await supabase
      .from("opportunity_timeline")
      .select("*")
      .eq("opportunity_id", id)
      .eq("organization_id", org.id)
      .order("timestamp", { ascending: false });
    if (tl) setTimeline(tl);

    // Hackathon-specific data
    const teamRes = await getTeamForOrganization(id, org.id);
    if (teamRes.success) setTeam(teamRes.data);

    const { data: ps } = await supabase
      .from("hackathon_problem_statements")
      .select("*")
      .eq("hackathon_id", id);
    if (ps) setProblemStatements(ps);

    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateTeam = async () => {
    if (!teamName.trim()) { setTeamError("Please enter a team name."); return; }
    if (!orgId) { setTeamError("Organization not found."); return; }
    setCreatingTeam(true);
    setTeamError("");
    const res = await createTeam(id, orgId, teamName.trim());
    if (res.success) {
      setTeamName("");
      await loadData();
    } else {
      setTeamError(res.error || "Failed to create team. Team name may already be taken.");
    }
    setCreatingTeam(false);
  };

  const handleAddMember = async () => {
    if (!newMember.name.trim() || !newMember.email.trim()) return;
    if (!team?.id) return;
    setAddingMember(true);
    const res = await addTeamMember(team.id, newMember.name.trim(), newMember.email.trim(), "Member");
    if (res.success) {
      setNewMember({ name: "", email: "" });
      await loadData();
    } else {
      alert("Error adding member: " + res.error);
    }
    setAddingMember(false);
  };

  const handleSubmit = async () => {
    if (!submission.title.trim()) { setSubmitError("Project title is required."); return; }
    if (!submission.psId) { setSubmitError("Please select a challenge track."); return; }
    if (!team?.id) return;
    setSubmitting(true);
    setSubmitError("");
    setSubmitSuccess(false);
    const res = await submitHackathonProject(team.id, submission.psId, {
      title: submission.title.trim(),
      description: submission.desc,
      githubUrl: submission.github || undefined,
      demoUrl: submission.demo || undefined,
      videoUrl: submission.video || undefined,
      pitchDeckUrl: submission.pitchDeck || undefined,
    });
    if (res.success) {
      setSubmitSuccess(true);
      await loadData();
    } else {
      setSubmitError(res.error || "Submission failed. Please try again.");
    }
    setSubmitting(false);
  };

  if (loading) return (
    <DashboardLayout>
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    </DashboardLayout>
  );

  if (!workspace) return (
    <DashboardLayout>
      <div className="p-8 text-center text-white">Workspace not active or not found.</div>
    </DashboardLayout>
  );

  const existingSubmission = team?.hackathon_submissions?.[0];

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">

        <Link href="/org/applications" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Applications
        </Link>

        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-gradient-to-r from-indigo-500/20 to-purple-500/10 border border-indigo-500/30 p-8 rounded-3xl">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-bold text-green-400 uppercase tracking-widest">Active Workspace</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">{opportunity?.title}</h1>
            <p className="text-indigo-200 mt-1 text-sm">You are officially accepted. Manage your participation here.</p>
          </div>
          {opportunity?.event_date && (
            <div className="bg-black/20 border border-white/10 px-6 py-4 rounded-2xl shrink-0">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Event Date</p>
              <p className="text-xl font-bold text-[#FFD700]">{new Date(opportunity.event_date).toLocaleDateString()}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Main Tasks Area */}
          <div className="lg:col-span-2 space-y-6">

            {opportunity?.type === "Hackathon" ? (
              <>
                {/* ── TEAM MANAGEMENT ── */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-400" /> Team Management
                  </h2>

                  {!team ? (
                    // Register Team Form
                    <div className="space-y-3">
                      <p className="text-slate-400 text-sm mb-4">You haven't registered a team yet. Create one to start participating.</p>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          placeholder="Enter your team name..."
                          value={teamName}
                          onChange={e => { setTeamName(e.target.value); setTeamError(""); }}
                          onKeyDown={e => e.key === "Enter" && handleCreateTeam()}
                          className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                        />
                        <button
                          onClick={handleCreateTeam}
                          disabled={creatingTeam || !teamName.trim()}
                          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap"
                        >
                          {creatingTeam ? <><Loader2 className="w-4 h-4 animate-spin" /> Registering...</> : "Register Team"}
                        </button>
                      </div>
                      {teamError && (
                        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">
                          <AlertCircle className="w-4 h-4 shrink-0" /> {teamError}
                        </div>
                      )}
                    </div>
                  ) : (
                    // Team info + members
                    <div className="space-y-6">
                      <div className="flex items-center justify-between bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-5">
                        <div>
                          <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">Team Name</p>
                          <p className="text-2xl font-extrabold text-white">{team.name}</p>
                        </div>
                        <span className="bg-green-500/20 text-green-400 px-4 py-1.5 rounded-full text-xs font-bold border border-green-500/30 uppercase">
                          {team.status}
                        </span>
                      </div>

                      {/* Members list */}
                      <div>
                        <p className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-3">
                          Team Members ({team.hackathon_team_members?.length || 0})
                        </p>
                        <div className="space-y-2 mb-4">
                          {team.hackathon_team_members?.length === 0 ? (
                            <p className="text-slate-500 text-sm italic">No members added yet.</p>
                          ) : (
                            team.hackathon_team_members?.map((m: any) => (
                              <div key={m.id} className="flex justify-between items-center bg-black/40 p-3.5 rounded-xl border border-white/5">
                                <div>
                                  <p className="font-bold text-white text-sm">{m.member_name}</p>
                                  <p className="text-xs text-slate-400">{m.member_email}</p>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded font-bold ${m.role === "Leader" ? "bg-[#FFD700]/10 text-[#FFD700]" : "bg-white/10 text-slate-300"}`}>
                                  {m.role}
                                </span>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Add member */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Member name"
                            value={newMember.name}
                            onChange={e => setNewMember(p => ({ ...p, name: e.target.value }))}
                            className="w-2/5 bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                          />
                          <input
                            type="email"
                            placeholder="Member email"
                            value={newMember.email}
                            onChange={e => setNewMember(p => ({ ...p, email: e.target.value }))}
                            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                          />
                          <button
                            onClick={handleAddMember}
                            disabled={addingMember || !newMember.name.trim() || !newMember.email.trim()}
                            className="bg-white/10 hover:bg-white/20 disabled:opacity-50 px-4 rounded-xl flex items-center justify-center border border-white/10 transition-all"
                          >
                            {addingMember ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <PlusCircle className="w-5 h-5 text-white" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── SUBMISSION PORTAL ── */}
                {team && (
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Send className="w-5 h-5 text-green-400" /> Submission Portal
                      </h2>
                      {existingSubmission && (
                        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                          existingSubmission.status === "Submitted" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                          "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                        }`}>
                          {existingSubmission.status}
                        </span>
                      )}
                    </div>

                    {/* Prefill if editing */}
                    {existingSubmission && submission.title === "" && (
                      <div className="mb-4 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-sm text-indigo-300 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                        You have an existing submission: <strong>{existingSubmission.title}</strong>. Fill the form to update it.
                      </div>
                    )}

                    <div className="space-y-4">
                      {/* Challenge Track */}
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Challenge Track *</label>
                        <select
                          value={submission.psId}
                          onChange={e => setSubmission(p => ({ ...p, psId: e.target.value }))}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500"
                        >
                          <option value="">Select challenge track...</option>
                          {problemStatements.map(ps => <option key={ps.id} value={ps.id}>{ps.title}</option>)}
                        </select>
                        {problemStatements.length === 0 && (
                          <p className="text-xs text-slate-500 mt-1">No problem statements added yet by the manager.</p>
                        )}
                      </div>

                      {/* Project Title */}
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Project Title *</label>
                        <input
                          type="text"
                          placeholder="e.g. EcoTrack — Carbon Footprint Analyzer"
                          value={submission.title}
                          onChange={e => setSubmission(p => ({ ...p, title: e.target.value }))}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500"
                        />
                      </div>

                      {/* Description */}
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Description</label>
                        <textarea
                          placeholder="Briefly describe your solution, approach, and impact..."
                          rows={3}
                          value={submission.desc}
                          onChange={e => setSubmission(p => ({ ...p, desc: e.target.value }))}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500"
                        />
                      </div>

                      {/* Links grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 focus-within:border-green-500 transition-all">
                          <GitBranch className="w-4 h-4 text-slate-400 shrink-0" />
                          <input type="url" placeholder="GitHub Repository URL" value={submission.github}
                            onChange={e => setSubmission(p => ({ ...p, github: e.target.value }))}
                            className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder-slate-500" />
                        </div>
                        <div className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 focus-within:border-green-500 transition-all">
                          <Link2 className="w-4 h-4 text-slate-400 shrink-0" />
                          <input type="url" placeholder="Live Demo URL" value={submission.demo}
                            onChange={e => setSubmission(p => ({ ...p, demo: e.target.value }))}
                            className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder-slate-500" />
                        </div>
                        <div className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 focus-within:border-green-500 transition-all">
                          <PlayCircle className="w-4 h-4 text-slate-400 shrink-0" />
                          <input type="url" placeholder="Demo Video URL (YouTube/Drive)" value={submission.video}
                            onChange={e => setSubmission(p => ({ ...p, video: e.target.value }))}
                            className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder-slate-500" />
                        </div>
                        <div className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 focus-within:border-green-500 transition-all">
                          <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                          <input type="url" placeholder="Pitch Deck URL (Slides/Drive)" value={submission.pitchDeck}
                            onChange={e => setSubmission(p => ({ ...p, pitchDeck: e.target.value }))}
                            className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder-slate-500" />
                        </div>
                      </div>

                      {submitError && (
                        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                          <AlertCircle className="w-4 h-4 shrink-0" /> {submitError}
                        </div>
                      )}
                      {submitSuccess && (
                        <div className="flex items-center gap-2 text-green-400 text-sm bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
                          <CheckCircle2 className="w-4 h-4 shrink-0" /> Submission saved successfully!
                        </div>
                      )}

                      <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="w-full bg-[#FFD700] hover:shadow-[0_0_20px_rgba(255,215,0,0.4)] disabled:opacity-50 text-black py-3.5 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2"
                      >
                        {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : existingSubmission ? "Update Submission" : "Finalize & Submit"}
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mx-auto">
                  <FileText className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Opportunity Workspace</h3>
                <p className="text-slate-400 text-sm max-w-md mx-auto">
                  This workspace is active. Contact your manager for next steps or deliverable instructions.
                </p>
              </div>
            )}
          </div>

          {/* Timeline Sidebar */}
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Activity Timeline</h2>
              {timeline.length === 0 ? (
                <p className="text-slate-500 text-sm italic">No activity yet.</p>
              ) : (
                <div className="space-y-6">
                  {timeline.map((event, i) => (
                    <div key={event.id} className="relative flex gap-4">
                      {i !== timeline.length - 1 && (
                        <div className="absolute left-4 top-8 bottom-[-24px] w-px bg-white/10" />
                      )}
                      <div className="relative z-10 w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                        <Activity className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{event.event}</p>
                        {event.description && <p className="text-xs text-slate-400 mt-0.5">{event.description}</p>}
                        <p className="text-[10px] text-slate-500 mt-1">{new Date(event.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
