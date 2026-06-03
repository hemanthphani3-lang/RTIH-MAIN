"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabase/client";
import { createOpportunity } from "@/lib/actions/opportunities";
import { createHackathon, addProblemStatement } from "@/lib/actions/hackathons";
import {
  Copy, PlusCircle, CheckCircle2, UserPlus, Link2, Calendar, Users,
  Plus, Rocket, Zap, Target, ChevronDown, ChevronUp, Eye, EyeOff, X
} from "lucide-react";
import { ALL_DOMAINS } from "@/lib/constants";

type Tab = "details" | "judges" | "problems";

export default function ManagerHackathons() {
  const [hackathons, setHackathons] = useState<any[]>([]);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Record<string, Tab>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [showLink, setShowLink] = useState<Record<string, boolean>>({});

  // Create Hackathon Modal State
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(1); // 1 = Opportunity, 2 = Hackathon Config
  const [creating, setCreating] = useState(false);
  const [newOppId, setNewOppId] = useState<string | null>(null);
  const [oppForm, setOppForm] = useState({
    title: "", description: "", domain: ALL_DOMAINS[0],
    location: "Visakhapatnam", mode: "Online", capacity: 100,
    regStart: "", regEnd: "", eventDate: "",
  });
  const [hackForm, setHackForm] = useState({
    minTeamSize: 1, maxTeamSize: 5,
    submissionDeadline: "", rules: "",
  });

  // Invite Judge State
  const [judgeMap, setJudgeMap] = useState<Record<string, { name: string; email: string }>>({});
  const [addingJudge, setAddingJudge] = useState<string | null>(null);

  // Problem Statement State
  const [psMap, setPsMap] = useState<Record<string, { title: string; description: string; sponsor: string }>>({});
  const [addingPs, setAddingPs] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    // Only fetch hackathons created by this manager
    const { data } = await supabase
      .from("opportunities")
      .select(`
        id, title, status, type, location, mode, capacity,
        registration_start_date, registration_end_date, event_date,
        hackathons(
          min_team_size, max_team_size, submission_deadline, rules,
          hackathon_judges(id, name, email, magic_token),
          hackathon_problem_statements(id, title, description, sponsor_name)
        ),
        opportunity_applications(id, status)
      `)
      .eq("type", "Hackathon")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      const formatted = data.map((d: any) => ({
        ...d,
        hackathon_judges: d.hackathons?.[0]?.hackathon_judges || d.hackathons?.hackathon_judges || [],
        hackathon_problem_statements: d.hackathons?.[0]?.hackathon_problem_statements || d.hackathons?.hackathon_problem_statements || []
      }));
      setHackathons(formatted);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const ch = supabase.channel("mgr-hackathons-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "opportunities" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "hackathon_judges" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "hackathon_problem_statements" }, loadData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadData]);

  // Step 1: Create the opportunity
  const handleCreateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const res = await createOpportunity({
      title: oppForm.title,
      description: oppForm.description,
      type: "Hackathon",
      domain: oppForm.domain,
      location: oppForm.location,
      mode: oppForm.mode,
      capacity: oppForm.capacity,
      stageRequirements: [],
    }, userId);
    if (res.success) {
      setNewOppId(res.opportunity.id);
      setStep(2);
    } else {
      alert("Error: " + res.error);
    }
    setCreating(false);
  };

  // Step 2: Configure the hackathon
  const handleConfigureHackathon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOppId) return;
    setCreating(true);
    const res = await createHackathon(newOppId, {
      maxTeamSize: hackForm.maxTeamSize,
      minTeamSize: hackForm.minTeamSize,
      submissionDeadline: hackForm.submissionDeadline,
      judgingCriteria: { innovation: 20, feasibility: 20, impact: 20, market_potential: 20, presentation: 20 },
      rules: hackForm.rules,
    });
    if (res.success) {
      setShowModal(false);
      setStep(1);
      setNewOppId(null);
      await loadData();
    } else {
      alert("Error: " + res.error);
    }
    setCreating(false);
  };

  const handleAddJudge = async (hackathonId: string) => {
    const j = judgeMap[hackathonId];
    if (!j?.name || !j?.email) return;
    setAddingJudge(hackathonId);
    const { error } = await supabase.from("hackathon_judges").insert({
      hackathon_id: hackathonId,
      name: j.name,
      email: j.email,
    });
    if (error) {
      alert("Error: " + error.message);
    } else {
      setJudgeMap(prev => ({ ...prev, [hackathonId]: { name: "", email: "" } }));
      await loadData();
    }
    setAddingJudge(null);
  };

  const handleAddProblemStatement = async (hackathonId: string) => {
    const ps = psMap[hackathonId];
    if (!ps?.title || !ps?.description) return;
    setAddingPs(hackathonId);
    const res = await addProblemStatement(hackathonId, {
      title: ps.title,
      description: ps.description,
      sponsorName: ps.sponsor || undefined,
    });
    if (res.success) {
      setPsMap(prev => ({ ...prev, [hackathonId]: { title: "", description: "", sponsor: "" } }));
      await loadData();
    } else {
      alert("Error: " + res.error);
    }
    setAddingPs(null);
  };

  const copyMagicLink = (token: string) => {
    const link = `${window.location.origin}/judge/${token}`;
    navigator.clipboard.writeText(link);
    setCopied(token);
    setTimeout(() => setCopied(null), 2500);
  };

  const getMagicLink = (token: string) => `${typeof window !== "undefined" ? window.location.origin : ""}/judge/${token}`;

  if (loading) return <DashboardLayout><div className="p-8 text-center text-white animate-pulse">Loading your hackathons...</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24">

        {/* Header */}
        <div className="flex items-center justify-between bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Hackathon Engine</h1>
            <p className="text-slate-400 mt-1 text-sm">Create and manage hackathons, invite judges, track submissions.</p>
          </div>
          <button onClick={() => { setShowModal(true); setStep(1); setNewOppId(null); }}
            className="bg-[#FFD700] text-black px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:shadow-[0_0_20px_rgba(255,215,0,0.4)] transition-all">
            <PlusCircle className="w-5 h-5" /> Create Hackathon
          </button>
        </div>

        {/* Hackathon Cards */}
        {hackathons.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-20 text-center">
            <Rocket className="w-16 h-16 text-slate-500 mx-auto mb-4 opacity-40" />
            <h3 className="text-xl font-bold text-white mb-2">No Hackathons Yet</h3>
            <p className="text-slate-400">Create your first hackathon to start managing teams and submissions.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {hackathons.map((h: any) => {
              const isExpanded = expandedId === h.id;
              const tab = activeTab[h.id] || "judges";
              const pendingApps = h.opportunity_applications?.filter((a: any) => a.status === "Submitted").length || 0;

              return (
                <div key={h.id} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
                  {/* Card Header */}
                  <div className="p-6 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-all"
                    onClick={() => setExpandedId(isExpanded ? null : h.id)}>
                    <div className="flex items-center gap-4">
                      <div className="bg-purple-500/20 border border-purple-500/30 p-3 rounded-2xl">
                        <Zap className="w-6 h-6 text-purple-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                            h.status === "Published" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                            h.status === "Draft" ? "bg-slate-500/20 text-slate-400 border-slate-500/30" :
                            "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                          }`}>{h.status}</span>
                          {pendingApps > 0 && <span className="text-[10px] font-bold bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/30 px-2 py-0.5 rounded-full">{pendingApps} pending apps</span>}
                        </div>
                        <h2 className="text-xl font-bold text-white">{h.title}</h2>
                        <p className="text-xs text-slate-400 mt-0.5">{h.location} · {h.mode} · {h.hackathon_judges?.length || 0} judges · {h.hackathon_problem_statements?.length || 0} tracks</p>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                  </div>

                  {/* Expanded Panel */}
                  {isExpanded && (
                    <div className="border-t border-white/10">
                      {/* Tabs */}
                      <div className="flex border-b border-white/10 bg-black/20">
                        {(["judges", "problems"] as Tab[]).map(t => (
                          <button key={t} onClick={() => setActiveTab(prev => ({ ...prev, [h.id]: t }))}
                            className={`px-6 py-3.5 text-sm font-bold uppercase tracking-widest transition-all ${
                              tab === t ? "text-white border-b-2 border-[#FFD700]" : "text-slate-400 hover:text-white"
                            }`}>
                            {t === "judges" ? "🧑‍⚖️ Judges & Magic Links" : "📋 Problem Statements"}
                          </button>
                        ))}
                      </div>

                      {/* Judges Tab */}
                      {tab === "judges" && (
                        <div className="p-6 space-y-6">
                          {/* Add Judge Form */}
                          <div className="bg-black/40 border border-white/5 rounded-2xl p-5">
                            <h4 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2"><UserPlus className="w-4 h-4 text-indigo-400" /> Invite New Judge</h4>
                            <div className="flex gap-3">
                              <input type="text" placeholder="Judge Full Name" value={judgeMap[h.id]?.name || ""}
                                onChange={e => setJudgeMap(p => ({ ...p, [h.id]: { ...p[h.id], name: e.target.value, email: p[h.id]?.email || "" } }))}
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500" />
                              <input type="email" placeholder="Judge Email Address" value={judgeMap[h.id]?.email || ""}
                                onChange={e => setJudgeMap(p => ({ ...p, [h.id]: { ...p[h.id], email: e.target.value, name: p[h.id]?.name || "" } }))}
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500" />
                              <button onClick={() => handleAddJudge(h.id)} disabled={addingJudge === h.id}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 rounded-xl font-bold text-sm transition-all disabled:opacity-50">
                                {addingJudge === h.id ? "Adding..." : "Add Judge"}
                              </button>
                            </div>
                          </div>

                          {/* Judge List */}
                          {h.hackathon_judges?.length === 0 ? (
                            <p className="text-slate-400 text-sm text-center py-4">No judges added yet. Invite judges above.</p>
                          ) : (
                            <div className="space-y-3">
                              {h.hackathon_judges?.map((j: any) => (
                                <div key={j.id} className="bg-black/40 border border-white/5 rounded-2xl p-4 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="font-bold text-white">{j.name}</p>
                                      <p className="text-xs text-slate-400">{j.email}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button onClick={() => setShowLink(p => ({ ...p, [j.id]: !p[j.id] }))}
                                        className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-white/10">
                                        {showLink[j.id] ? <><EyeOff className="w-3 h-3" /> Hide</> : <><Eye className="w-3 h-3" /> View Link</>}
                                      </button>
                                      <button onClick={() => copyMagicLink(j.magic_token)}
                                        className="flex items-center gap-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 border border-indigo-500/30 px-3 py-1.5 rounded-lg text-xs font-bold transition-all">
                                        {copied === j.magic_token ? <><CheckCircle2 className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy Link</>}
                                      </button>
                                    </div>
                                  </div>

                                  {/* Magic Link Display */}
                                  {showLink[j.id] && (
                                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 flex items-center gap-3">
                                      <Link2 className="w-4 h-4 text-indigo-400 shrink-0" />
                                      <p className="text-indigo-300 text-xs font-mono break-all flex-1">{getMagicLink(j.magic_token)}</p>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Problem Statements Tab */}
                      {tab === "problems" && (
                        <div className="p-6 space-y-6">
                          {/* Add PS Form */}
                          <div className="bg-black/40 border border-white/5 rounded-2xl p-5">
                            <h4 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2"><Target className="w-4 h-4 text-green-400" /> Add Challenge Track</h4>
                            <div className="space-y-3">
                              <div className="flex gap-3">
                                <input type="text" placeholder="Problem Statement Title" value={psMap[h.id]?.title || ""}
                                  onChange={e => setPsMap(p => ({ ...p, [h.id]: { ...p[h.id], title: e.target.value, description: p[h.id]?.description || "", sponsor: p[h.id]?.sponsor || "" } }))}
                                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-green-500" />
                                <input type="text" placeholder="Sponsor (optional)" value={psMap[h.id]?.sponsor || ""}
                                  onChange={e => setPsMap(p => ({ ...p, [h.id]: { ...p[h.id], sponsor: e.target.value, title: p[h.id]?.title || "", description: p[h.id]?.description || "" } }))}
                                  className="w-48 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-green-500" />
                              </div>
                              <textarea placeholder="Describe the problem statement in detail..." rows={3} value={psMap[h.id]?.description || ""}
                                onChange={e => setPsMap(p => ({ ...p, [h.id]: { ...p[h.id], description: e.target.value, title: p[h.id]?.title || "", sponsor: p[h.id]?.sponsor || "" } }))}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-green-500" />
                              <button onClick={() => handleAddProblemStatement(h.id)} disabled={addingPs === h.id}
                                className="bg-green-600 hover:bg-green-500 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50">
                                {addingPs === h.id ? "Adding..." : "Add Problem Statement"}
                              </button>
                            </div>
                          </div>

                          {h.hackathon_problem_statements?.length === 0 ? (
                            <p className="text-slate-400 text-sm text-center py-4">No problem statements yet.</p>
                          ) : (
                            <div className="space-y-3">
                              {h.hackathon_problem_statements?.map((ps: any, i: number) => (
                                <div key={ps.id} className="bg-black/40 border border-white/5 rounded-2xl p-4">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="w-6 h-6 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center text-xs font-bold text-green-400">{i + 1}</span>
                                      <p className="font-bold text-white">{ps.title}</p>
                                    </div>
                                    {ps.sponsor_name && <span className="text-[10px] bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/30 px-2 py-0.5 rounded font-bold">{ps.sponsor_name}</span>}
                                  </div>
                                  <p className="text-sm text-slate-400 ml-8">{ps.description}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE HACKATHON MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowModal(false)} />
          <div className="relative z-10 w-full max-w-2xl bg-[#0a0f1e] border border-white/10 rounded-3xl shadow-2xl p-8 max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200">

            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Step {step} of 2</p>
                <h2 className="text-2xl font-extrabold text-white">
                  {step === 1 ? "🚀 Create Hackathon" : "⚙️ Hackathon Configuration"}
                </h2>
              </div>
              <button onClick={() => setShowModal(false)} className="bg-white/5 hover:bg-white/10 border border-white/10 p-2 rounded-xl transition-all">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Step indicator */}
            <div className="flex gap-2 mb-8">
              <div className={`h-1.5 flex-1 rounded-full transition-all ${step >= 1 ? "bg-[#FFD700]" : "bg-white/10"}`} />
              <div className={`h-1.5 flex-1 rounded-full transition-all ${step >= 2 ? "bg-[#FFD700]" : "bg-white/10"}`} />
            </div>

            {step === 1 && (
              <form onSubmit={handleCreateOpportunity} className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Hackathon Title</label>
                  <input required type="text" value={oppForm.title}
                    onChange={e => setOppForm({ ...oppForm, title: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFD700]"
                    placeholder="e.g. RTIH AI Innovation Hackathon 2026" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Description</label>
                  <textarea required value={oppForm.description} rows={4}
                    onChange={e => setOppForm({ ...oppForm, description: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFD700]"
                    placeholder="Describe the hackathon, goals, who should participate..." />
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Target Domain</label>
                    <select required value={oppForm.domain}
                      onChange={e => setOppForm({ ...oppForm, domain: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white">
                      {ALL_DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Mode</label>
                    <select required value={oppForm.mode}
                      onChange={e => setOppForm({ ...oppForm, mode: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white">
                      <option>Online</option><option>Offline</option><option>Hybrid</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Location Hub</label>
                    <input required type="text" value={oppForm.location}
                      onChange={e => setOppForm({ ...oppForm, location: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Max Capacity</label>
                    <input required type="number" value={oppForm.capacity || ""}
                      onChange={e => setOppForm({ ...oppForm, capacity: parseInt(e.target.value) || ("" as any) })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
                  </div>
                </div>
                <div className="flex gap-4 pt-4 border-t border-white/10">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="flex-1 py-3 rounded-xl font-bold text-white bg-white/5 hover:bg-white/10 transition-colors">Cancel</button>
                  <button type="submit" disabled={creating}
                    className="flex-1 py-3 rounded-xl font-bold text-black bg-[#FFD700] hover:shadow-[0_0_20px_rgba(255,215,0,0.4)] transition-all disabled:opacity-50">
                    {creating ? "Creating..." : "Next: Configure →"}
                  </button>
                </div>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleConfigureHackathon} className="space-y-5">
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Min Team Size</label>
                    <input required type="number" min={1} value={hackForm.minTeamSize || ""}
                      onChange={e => setHackForm({ ...hackForm, minTeamSize: parseInt(e.target.value) || ("" as any) })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFD700]" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Max Team Size</label>
                    <input required type="number" min={1} value={hackForm.maxTeamSize || ""}
                      onChange={e => setHackForm({ ...hackForm, maxTeamSize: parseInt(e.target.value) || ("" as any) })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFD700]" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Submission Deadline</label>
                  <input required type="datetime-local" value={hackForm.submissionDeadline}
                    onChange={e => setHackForm({ ...hackForm, submissionDeadline: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFD700]" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Rules & Guidelines</label>
                  <textarea value={hackForm.rules} rows={4}
                    onChange={e => setHackForm({ ...hackForm, rules: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFD700]"
                    placeholder="Enter hackathon rules, judging criteria weights, eligibility, etc." />
                </div>
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 text-sm text-indigo-300">
                  <strong>Auto-configured:</strong> Judging criteria set to Innovation (20) + Feasibility (20) + Impact (20) + Market Potential (20) + Presentation (20) = 100 points.
                </div>
                <div className="flex gap-4 pt-4 border-t border-white/10">
                  <button type="button" onClick={() => setStep(1)}
                    className="flex-1 py-3 rounded-xl font-bold text-white bg-white/5 hover:bg-white/10 transition-colors">← Back</button>
                  <button type="submit" disabled={creating}
                    className="flex-1 py-3 rounded-xl font-bold text-black bg-[#FFD700] hover:shadow-[0_0_20px_rgba(255,215,0,0.4)] transition-all disabled:opacity-50">
                    {creating ? "Launching..." : "🚀 Launch Hackathon"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
