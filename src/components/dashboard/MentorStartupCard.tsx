"use client";

import { useState, useEffect } from "react";
import { ShieldAlert, FileText, CheckCircle, Clock, Plus, ListChecks, ShieldCheck } from "lucide-react";
import { submitMentorEvaluation, saveMentorNote, verifyActionItem } from "@/lib/actions/mentorship";
import { createActionItem } from "@/lib/actions/lifecycle";
import { supabase } from "@/lib/supabase/client";

export default function MentorStartupCard({ org, mentorId }: { org: any, mentorId: string }) {
  const [evalOpen, setEvalOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [actionItems, setActionItems] = useState<any[]>([]);

  // Eval state
  const [score, setScore] = useState(80);
  const [strengths, setStrengths] = useState("");
  const [weaknesses, setWeaknesses] = useState("");
  const [recs, setRecs] = useState("");

  // Note state
  const [note, setNote] = useState("");

  // New Action Item state
  const [aiTitle, setAiTitle] = useState("");
  const [aiDesc, setAiDesc] = useState("");
  const [aiDue, setAiDue] = useState("");
  const [aiPriority, setAiPriority] = useState("Medium");

  const health = org.health_scores?.[0] || { current_score: 0, status: 'No Data' };
  const risks = org.risk_flags || [];
  const pendingActions = (org.action_items || []).filter((a: any) => a.status === 'Pending').length;
  const completedActions = (org.action_items || []).filter((a: any) => a.status === 'Completed').length;

  async function loadActionItems() {
    const { data } = await supabase.from("action_items").select("*").eq("organization_id", org.id).order("created_at", { ascending: false });
    if (data) setActionItems(data);
  }

  useEffect(() => {
    if (actionsOpen) loadActionItems();
  }, [actionsOpen]);

  const handleEvalSubmit = async () => {
    const res = await submitMentorEvaluation(org.id, mentorId, score, strengths, weaknesses, recs);
    if (res.success) { alert("Evaluation submitted!"); setEvalOpen(false); }
    else alert("Error: " + res.error);
  };

  const handleNoteSubmit = async () => {
    const res = await saveMentorNote(org.id, mentorId, note);
    if (res.success) { alert("Private note saved!"); setNoteOpen(false); setNote(""); }
    else alert("Error: " + res.error);
  };

  const handleCreateAction = async () => {
    if (!aiTitle.trim()) return alert("Please enter a title.");
    const res = await createActionItem(org.id, mentorId, aiTitle, aiDesc, aiDue || null, aiPriority);
    if (res.success) {
      alert("Action item assigned!");
      setActionOpen(false); setAiTitle(""); setAiDesc(""); setAiDue(""); setAiPriority("Medium");
      await loadActionItems();
    } else alert("Error: " + res.error);
  };

  const handleVerify = async (itemId: string) => {
    const res = await verifyActionItem(itemId, org.id);
    if (res.success) { alert("Action item verified!"); await loadActionItems(); }
    else alert("Error: " + res.error);
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-white/10 transition hover:bg-white/[0.08] space-y-5">

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-2xl font-bold text-white">{org.name}</h3>
          <p className="text-sm text-slate-300 mt-1">{org.stage} • Founder: {org.user_profiles?.full_name}</p>
        </div>
        <div className="text-right bg-black/30 px-4 py-2 rounded-xl border border-white/10">
          <span className="text-2xl font-extrabold text-[#FFD700]">{health.current_score}</span>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Health</p>
        </div>
      </div>

      {/* Risk Badges */}
      {(risks.length > 0 || pendingActions > 0) && (
        <div className="flex gap-2 flex-wrap">
          {risks.map((r: any, idx: number) => (
            <span key={idx} className="bg-red-500/20 text-red-400 border border-red-500/30 text-xs px-2 py-1 rounded-md flex items-center gap-1 font-bold">
              <ShieldAlert className="w-3 h-3" /> {r.risk_type}
            </span>
          ))}
          {pendingActions > 0 && (
            <span className="bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/30 text-xs px-2 py-1 rounded-md flex items-center gap-1 font-bold">
              <Clock className="w-3 h-3" /> {pendingActions} Pending
            </span>
          )}
          {completedActions > 0 && (
            <span className="bg-green-500/10 text-green-400 border border-green-500/30 text-xs px-2 py-1 rounded-md flex items-center gap-1 font-bold">
              <CheckCircle className="w-3 h-3" /> {completedActions} To Verify
            </span>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => { setEvalOpen(!evalOpen); setNoteOpen(false); setActionOpen(false); setActionsOpen(false); }}
          className="bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 font-bold py-2 rounded-xl text-sm transition-all flex items-center justify-center gap-2">
          <CheckCircle className="w-4 h-4" /> Evaluate
        </button>
        <button onClick={() => { setNoteOpen(!noteOpen); setEvalOpen(false); setActionOpen(false); setActionsOpen(false); }}
          className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold py-2 rounded-xl text-sm transition-all flex items-center justify-center gap-2">
          <FileText className="w-4 h-4" /> Private Note
        </button>
        <button onClick={() => { setActionOpen(!actionOpen); setEvalOpen(false); setNoteOpen(false); setActionsOpen(false); }}
          className="bg-[#FFD700]/10 hover:bg-[#FFD700]/20 border border-[#FFD700]/30 text-[#FFD700] font-bold py-2 rounded-xl text-sm transition-all flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /> Assign Task
        </button>
        <button onClick={() => { setActionsOpen(!actionsOpen); setEvalOpen(false); setNoteOpen(false); setActionOpen(false); }}
          className="bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 font-bold py-2 rounded-xl text-sm transition-all flex items-center justify-center gap-2">
          <ListChecks className="w-4 h-4" /> Verify Tasks
        </button>
      </div>

      {/* Evaluation Form */}
      {evalOpen && (
        <div className="bg-black/40 p-5 rounded-2xl border border-indigo-500/20 space-y-4 animate-in fade-in slide-in-from-top-4">
          <h4 className="text-[#FFD700] font-bold text-sm tracking-widest uppercase">Submit Evaluation</h4>
          <div>
            <label className="text-xs text-slate-400 font-bold">Score (0-100)</label>
            <input type="number" min={0} max={100} value={score} onChange={e => setScore(Number(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white mt-1" />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-bold">Strengths</label>
            <textarea value={strengths} onChange={e => setStrengths(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white mt-1 text-sm h-20" />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-bold">Weaknesses</label>
            <textarea value={weaknesses} onChange={e => setWeaknesses(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white mt-1 text-sm h-20" />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-bold">Recommendations</label>
            <textarea value={recs} onChange={e => setRecs(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white mt-1 text-sm h-20" />
          </div>
          <button onClick={handleEvalSubmit}
            className="w-full bg-green-500 hover:bg-green-600 text-black font-bold py-2.5 rounded-xl shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-all">
            Submit Evaluation
          </button>
        </div>
      )}

      {/* Private Note Form */}
      {noteOpen && (
        <div className="bg-black/40 p-5 rounded-2xl border border-white/10 space-y-4 animate-in fade-in slide-in-from-top-4">
          <h4 className="text-white font-bold text-sm tracking-widest uppercase flex items-center gap-2">
            🔒 Private Note
            <span className="bg-red-500/20 text-red-400 text-[10px] px-2 py-0.5 rounded-full border border-red-500/30 normal-case tracking-normal font-medium">
              Organization Cannot See
            </span>
          </h4>
          <textarea value={note} onChange={e => setNote(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm h-32 placeholder-slate-500"
            placeholder="Internal observations, coaching notes, risk flags..." />
          <button onClick={handleNoteSubmit}
            className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold py-2.5 rounded-xl transition-all">
            Save Note Securely
          </button>
        </div>
      )}

      {/* Assign Action Item Form */}
      {actionOpen && (
        <div className="bg-black/40 p-5 rounded-2xl border border-[#FFD700]/20 space-y-4 animate-in fade-in slide-in-from-top-4">
          <h4 className="text-[#FFD700] font-bold text-sm tracking-widest uppercase">Assign Action Item</h4>
          <div>
            <label className="text-xs text-slate-400 font-bold">Title *</label>
            <input value={aiTitle} onChange={e => setAiTitle(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white mt-1 text-sm"
              placeholder="e.g. Conduct customer interviews" />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-bold">Description</label>
            <textarea value={aiDesc} onChange={e => setAiDesc(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white mt-1 text-sm h-20"
              placeholder="Detailed instructions..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 font-bold">Due Date</label>
              <input type="date" value={aiDue} onChange={e => setAiDue(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white mt-1 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-bold">Priority</label>
              <select value={aiPriority} onChange={e => setAiPriority(e.target.value)}
                className="w-full bg-[#0B1120] border border-white/10 rounded-lg p-2 text-white mt-1 text-sm">
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>
          </div>
          <button onClick={handleCreateAction}
            className="w-full bg-[#FFD700] hover:shadow-[0_0_15px_rgba(255,215,0,0.4)] text-black font-bold py-2.5 rounded-xl transition-all">
            Assign to Startup
          </button>
        </div>
      )}

      {/* Verify Completed Tasks */}
      {actionsOpen && (
        <div className="bg-black/40 p-5 rounded-2xl border border-green-500/20 space-y-3 animate-in fade-in slide-in-from-top-4">
          <h4 className="text-green-400 font-bold text-sm tracking-widest uppercase">Verify Completed Tasks</h4>
          {actionItems.length === 0 ? (
            <p className="text-slate-400 text-sm italic">No tasks assigned yet.</p>
          ) : (
            actionItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                <div>
                  <p className="text-white font-semibold text-sm">{item.title}</p>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded mt-0.5 inline-block ${
                    item.status === 'Verified' ? 'bg-green-500/20 text-green-400' :
                    item.status === 'Completed' ? 'bg-blue-500/20 text-blue-400' :
                    item.status === 'In Progress' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-slate-500/20 text-slate-400'
                  }`}>{item.status}</span>
                </div>
                {item.status === 'Completed' && (
                  <button onClick={() => handleVerify(item.id)}
                    className="bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all">
                    <ShieldCheck className="w-3.5 h-3.5" /> Verify
                  </button>
                )}
                {item.status === 'Verified' && (
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                )}
              </div>
            ))
          )}
        </div>
      )}

    </div>
  );
}
