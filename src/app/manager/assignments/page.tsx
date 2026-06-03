"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabase/client";
import { getApprovedStartupsForAssignment, getMentorsForAssignment, assignMentorToStartup } from "@/lib/actions/mentorship";
import { Building2, UserCheck, ChevronRight, Loader2, MapPin, CheckCircle2 } from "lucide-react";

type Stage = "select_startup" | "select_mentor";

export default function ManagerAssignmentsPage() {
  const [userId, setUserId] = useState<string>("");
  const [startups, setStartups] = useState<any[]>([]);
  const [mentors, setMentors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [stage, setStage] = useState<Stage>("select_startup");
  const [selectedStartup, setSelectedStartup] = useState<any>(null);

  const loadStartups = useCallback(async (uid: string) => {
    const res = await getApprovedStartupsForAssignment(uid);
    setStartups(res.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        loadStartups(user.id);
      }
    });
  }, [loadStartups]);

  const handleSelectStartup = async (startup: any) => {
    setSelectedStartup(startup);
    setMentors([]);
    setStage("select_mentor");

    const domainName = startup.domains?.name || "";
    const res = await getMentorsForAssignment(userId, domainName);
    setMentors(res.data || []);
  };

  const handleAssign = async (mentorId: string) => {
    if (!confirm(`Assign this Mentor to ${selectedStartup.name}?`)) return;
    setAssigning(true);
    const res = await assignMentorToStartup(selectedStartup.id, mentorId, userId);
    if (res.success) {
      alert("Mentor assigned successfully!");
      setStage("select_startup");
      setSelectedStartup(null);
      loadStartups(userId);
    } else {
      alert("Error: " + res.error);
    }
    setAssigning(false);
  };

  if (loading) return <div className="p-8 text-center text-white">Loading Assignments...</div>;

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">

        {/* Header */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Mentorship Assignments</h1>
            <p className="text-slate-400 mt-1 text-sm">Match approved startups with the right mentors in your hub.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${stage === "select_startup" ? "bg-[#FFD700] text-black border-[#FFD700]" : "bg-white/5 text-slate-400 border-white/10"}`}>
              1. Select Startup
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500" />
            <div className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${stage === "select_mentor" ? "bg-[#FFD700] text-black border-[#FFD700]" : "bg-white/5 text-slate-400 border-white/10"}`}>
              2. Pick Mentor
            </div>
          </div>
        </div>

        {/* Step 1: Select Startup */}
        {stage === "select_startup" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
            <h2 className="text-lg font-bold text-white uppercase tracking-widest text-sm text-slate-400">
              Approved Startups Awaiting Mentor Assignment
            </h2>
            {startups.length === 0 ? (
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-16 text-center">
                <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-bold text-white mb-2">All Assigned!</h3>
                <p className="text-slate-400">Every approved startup in your hub has a Mentor. Check the Startups pipeline for new applicants.</p>
              </div>
            ) : (
              startups.map((s: any) => (
                <div key={s.id} onClick={() => handleSelectStartup(s)}
                  className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 cursor-pointer hover:bg-white/10 hover:border-[#FFD700]/30 transition-all flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-500/20 to-purple-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center">
                      <Building2 className="w-7 h-7 text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{s.name}</h3>
                      <p className="text-sm text-slate-400 mt-0.5">{s.description}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">{s.domains?.name}</span>
                        <span className="text-[10px] bg-white/5 text-slate-400 border border-white/10 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">{s.stage}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-[#FFD700] transition-colors" />
                </div>
              ))
            )}
          </div>
        )}

        {/* Step 2: Select Mentor */}
        {stage === "select_mentor" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-4">
              <button onClick={() => { setStage("select_startup"); setSelectedStartup(null); }}
                className="text-sm text-slate-400 hover:text-white transition-colors font-medium flex items-center gap-1">
                ← Back
              </button>
              <div className="bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-xl">
                <p className="text-xs text-slate-400">Assigning Mentor for</p>
                <p className="text-sm font-bold text-white">{selectedStartup?.name}</p>
              </div>
            </div>

            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
              Available Mentors — {selectedStartup?.domains?.name} Domain
            </h2>

            {mentors.length === 0 ? (
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-16 text-center">
                <UserCheck className="w-16 h-16 text-slate-500 mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-bold text-white mb-2">No Mentors Available</h3>
                <p className="text-slate-400">There are no Mentors in your hub with capacity in the <strong>{selectedStartup?.domains?.name}</strong> domain.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {mentors.map((m: any) => (
                  <div key={m.id} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex flex-col gap-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#FFD700]/20 to-[#FFD700]/5 border border-[#FFD700]/20 rounded-2xl flex items-center justify-center">
                          <span className="text-[#FFD700] font-extrabold text-lg">{m.user_profiles?.full_name?.[0]}</span>
                        </div>
                        <div>
                          <h3 className="text-white font-bold">{m.user_profiles?.full_name}</h3>
                          <p className="text-slate-400 text-sm">{m.user_profiles?.email}</p>
                        </div>
                      </div>
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <MapPin className="w-3 h-3" /> {m.location}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {m.domains.map((d: string) => (
                        <span key={d} className="text-[10px] bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20 px-2 py-1 rounded-md font-bold uppercase tracking-wider">{d}</span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between border-t border-white/10 pt-4">
                      <div>
                        <p className="text-xs text-slate-500">Capacity Used</p>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="w-24 bg-white/10 rounded-full h-1.5">
                            <div className="h-1.5 bg-[#FFD700] rounded-full" style={{ width: `${(m.assignedCount / m.max_capacity) * 100}%` }} />
                          </div>
                          <span className="text-xs font-bold text-white">{m.assignedCount}/{m.max_capacity}</span>
                        </div>
                      </div>
                      <button onClick={() => handleAssign(m.id)} disabled={assigning}
                        className="bg-[#FFD700] text-black px-5 py-2 rounded-xl text-sm font-bold hover:shadow-[0_0_15px_rgba(255,215,0,0.4)] transition-all disabled:opacity-50 flex items-center gap-2">
                        {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                        Assign
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
