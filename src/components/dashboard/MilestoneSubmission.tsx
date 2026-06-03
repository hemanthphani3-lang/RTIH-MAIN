"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { submitMilestone } from "@/lib/actions/lifecycle";
import { CheckCircle2, Clock, Upload, Loader2, PlayCircle } from "lucide-react";

export default function MilestoneSubmission({ orgId, currentStageName }: { orgId: string, currentStageName: string }) {
  const [stageId, setStageId] = useState<string | null>(null);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Submission Form State
  const [selectedMilestone, setSelectedMilestone] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadMilestones() {
      if (!currentStageName) return;

      const { data: stage } = await supabase.from("startup_stages").select("id").eq("name", currentStageName).single();
      if (!stage) return;
      setStageId(stage.id);

      const { data: mData } = await supabase.from("milestones").select("*").eq("stage_id", stage.id);
      if (mData) setMilestones(mData);

      const { data: sData } = await supabase.from("milestone_submissions").select("*").eq("organization_id", orgId);
      if (sData) setSubmissions(sData);

      setLoading(false);
    }
    loadMilestones();
  }, [currentStageName, orgId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMilestone) return;

    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    await submitMilestone(orgId, selectedMilestone, notes, user?.id || orgId);
    
    // Refresh submissions
    const { data: sData } = await supabase.from("milestone_submissions").select("*").eq("organization_id", orgId);
    if (sData) setSubmissions(sData);

    setSubmitting(false);
    setSelectedMilestone(null);
    setNotes("");
  };

  if (loading) return <div className="p-4 bg-white rounded-xl shadow-sm animate-pulse h-32" />;

  return (
    <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl shadow-xl border border-white/10 text-white">
      <h3 className="text-xl font-bold mb-6">Stage Milestones</h3>
      <div className="space-y-4 mb-8">
        {milestones.map((milestone) => {
          const sub = submissions.find(s => s.milestone_id === milestone.id);
          const status = sub?.status || "Not Started";
          
          return (
            <div key={milestone.id} className="p-5 border border-white/10 bg-white/5 backdrop-blur-sm rounded-2xl flex items-start justify-between hover:bg-white/10 transition-all">
              <div className="pr-4">
                <h4 className="font-bold text-white">{milestone.title}</h4>
                <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">{milestone.description}</p>
              </div>
              <div className="shrink-0">
                {status === "Approved" ? (
                  <span className="flex items-center gap-1.5 text-sm font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-full"><CheckCircle2 className="w-4 h-4"/> Approved</span>
                ) : status === "Submitted" ? (
                  <span className="flex items-center gap-1.5 text-sm font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-full"><Clock className="w-4 h-4"/> In Review</span>
                ) : status === "Rejected" ? (
                  <button onClick={() => setSelectedMilestone(milestone.id)} className="text-sm font-bold text-red-400 underline hover:text-red-300">Needs Revision</button>
                ) : (
                  <button onClick={() => setSelectedMilestone(milestone.id)} className="flex items-center gap-1.5 text-sm font-bold text-[#FFD700] hover:text-[#F2CC00] bg-[#FFD700]/10 px-4 py-2 rounded-xl transition-all border border-[#FFD700]/20 hover:bg-[#FFD700]/20"><PlayCircle className="w-4 h-4"/> Start</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedMilestone && (
        <form onSubmit={handleSubmit} className="border-t border-white/10 pt-6 mt-6">
          <h4 className="font-bold mb-4 text-white">
            Submit: {milestones.find(m => m.id === selectedMilestone)?.title}
          </h4>
          <textarea
            required
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-black/20 border border-white/20 rounded-xl p-4 text-sm mb-4 focus:ring-2 focus:ring-[#FFD700] focus:border-[#FFD700] text-white placeholder-slate-400"
            rows={3}
            placeholder="Describe your progress and attach evidence..."
          />
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 bg-[#FFD700] text-black px-6 py-2.5 rounded-xl font-bold hover:shadow-[0_0_20px_rgba(255,215,0,0.3)] transition-all disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin"/> : <Upload className="w-5 h-5" />}
              Submit for Review
            </button>
            <button
              type="button"
              onClick={() => setSelectedMilestone(null)}
              className="px-6 py-2.5 text-slate-300 font-bold hover:bg-white/10 hover:text-white rounded-xl transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
