"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { getOpportunityById, applyToOpportunity } from "@/lib/actions/opportunities";
import { supabase } from "@/lib/supabase/client";
import { ArrowLeft, Rocket, FileText, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

export default function OrgOpportunityApplyPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [opportunity, setOpportunity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState("");
  
  const [pitch, setPitch] = useState("");

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
      
      const res = await getOpportunityById(id);
      if (res.success) setOpportunity(res.data);
      setLoading(false);
    }
    loadData();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pitch.trim()) return alert("Please provide your pitch.");
    
    setSubmitting(true);
    const submissionData = { pitch };
    const res = await applyToOpportunity(id, submissionData, userId);
    
    if (res.success) {
      router.push(`/org/opportunities/${id}`);
    } else {
      alert("Error submitting application: " + res.error);
      setSubmitting(false);
    }
  };

  if (loading) return <DashboardLayout><div className="p-8 text-center text-slate-900 dark:text-white">Loading...</div></DashboardLayout>;
  if (!opportunity) return <div className="p-8 text-center text-slate-900 dark:text-white">Opportunity not found.</div>;

  return (
    <DashboardLayout>
      <div className="p-8 max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
        
        <Link href={`/org/opportunities/${id}`} className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Opportunity
        </Link>

        {/* Header */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-8 rounded-3xl text-center">
          <div className="w-16 h-16 bg-indigo-500/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Rocket className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">Apply for {opportunity.title}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Tell us why your startup is the perfect fit for this opportunity.</p>
        </div>

        {/* Application Form */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex items-start gap-3">
              <FileText className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-blue-100 font-medium">Your organization profile and documents will be automatically attached to this application.</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Value Proposition / Pitch</label>
              <p className="text-xs text-slate-500 mb-3">Explain how your solution aligns with the goals of this {opportunity.type.toLowerCase()}.</p>
              <textarea 
                required 
                rows={6}
                value={pitch}
                onChange={e => setPitch(e.target.value)}
                className="w-full bg-slate-200 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-600 focus:border-indigo-500 transition-colors"
                placeholder="Our startup is a great fit because..."
              />
            </div>

            <div className="pt-6 border-t border-slate-200 dark:border-white/10">
              <button 
                type="submit" 
                disabled={submitting}
                className="w-full py-4 rounded-xl font-extrabold text-lg text-black bg-[#FFD700] hover:shadow-[0_0_20px_rgba(255,215,0,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {submitting ? "Submitting..." : <><CheckCircle2 className="w-5 h-5" /> Submit Application</>}
              </button>
            </div>
            
          </form>
        </div>

      </div>
    </DashboardLayout>
  );
}
