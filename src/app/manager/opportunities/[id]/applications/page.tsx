"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { getOpportunityById, getApplicationsForOpportunity, reviewApplication } from "@/lib/actions/opportunities";
import { supabase } from "@/lib/supabase/client";
import { CheckCircle2, XCircle, Clock, Loader2, ArrowLeft, Building2, User } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function ManagerOpportunityApplicationsPage() {
  const { id } = useParams() as { id: string };
  const [opportunity, setOpportunity] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [userId, setUserId] = useState("");

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);

    const [oppRes, appsRes] = await Promise.all([
      getOpportunityById(id),
      getApplicationsForOpportunity(id)
    ]);

    if (oppRes.success) setOpportunity(oppRes.data);
    if (appsRes.success) setApplications(appsRes.data);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [id]);

  const handleReview = async (applicationId: string, decision: "Accepted" | "Rejected" | "Waitlisted") => {
    if (!confirm(`Are you sure you want to ${decision.toLowerCase()} this application?`)) return;
    setProcessingId(applicationId);
    
    // Default comment for demo
    const comment = `Application ${decision.toLowerCase()} by Manager.`;
    
    const res = await reviewApplication(applicationId, decision, comment, userId);
    if (res.success) {
      await loadData();
    } else {
      alert("Error: " + res.error);
    }
    setProcessingId(null);
  };

  if (loading) return <DashboardLayout><div className="p-8 text-center text-slate-900 dark:text-white">Loading...</div></DashboardLayout>;
  if (!opportunity) return <div className="p-8 text-center text-slate-900 dark:text-white">Opportunity not found.</div>;

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
        
        {/* Header */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-6 rounded-3xl">
          <Link href="/manager/opportunities" className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Opportunities
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{opportunity.title}</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Review applications for this opportunity.</p>
            </div>
            <div className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-4 py-2 rounded-xl text-sm font-bold">
              {applications.length} Total Applications
            </div>
          </div>
        </div>

        {/* Applications List */}
        <div className="space-y-6">
          {applications.length === 0 ? (
            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-16 text-center">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No applications yet</h3>
              <p className="text-slate-500 dark:text-slate-400">Applications will appear here once organizations submit them.</p>
            </div>
          ) : (
            applications.map((app) => (
              <div key={app.id} className="bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl p-6 flex flex-col md:flex-row gap-6 hover:bg-white/60 dark:bg-white/10 transition-colors">
                
                <div className="flex-1 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-indigo-400" /> {app.organizations?.name}
                    </h2>
                    <span className={`px-3 py-1 text-xs font-bold rounded-lg border ${
                      app.status === 'Accepted' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                      app.status === 'Rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      app.status === 'Waitlisted' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                      'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }`}>{app.status}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500 mb-1">Stage</p>
                      <p className="text-slate-900 dark:text-white font-medium">{app.organizations?.stage}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1 flex items-center gap-1"><User className="w-4 h-4"/> Founder</p>
                      <p className="text-slate-900 dark:text-white font-medium">{app.organizations?.user_profiles?.full_name}</p>
                    </div>
                  </div>

                  {app.submission_data && (
                    <div className="pt-4 border-t border-slate-200 dark:border-white/10">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Pitch / Value Prop</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300">{app.submission_data.pitch}</p>
                    </div>
                  )}
                </div>

                {app.status === 'Submitted' && (
                  <div className="flex flex-col gap-3 justify-center border-t md:border-t-0 md:border-l border-slate-200 dark:border-white/10 pt-4 md:pt-0 md:pl-6 min-w-[200px]">
                    <button onClick={() => handleReview(app.id, 'Accepted')} disabled={!!processingId} className="w-full flex justify-center items-center gap-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 py-2.5 rounded-xl font-bold text-sm transition-colors">
                      {processingId === app.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle2 className="w-4 h-4"/>} Accept
                    </button>
                    <button onClick={() => handleReview(app.id, 'Waitlisted')} disabled={!!processingId} className="w-full flex justify-center items-center gap-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 py-2.5 rounded-xl font-bold text-sm transition-colors">
                      <Clock className="w-4 h-4"/> Waitlist
                    </button>
                    <button onClick={() => handleReview(app.id, 'Rejected')} disabled={!!processingId} className="w-full flex justify-center items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 py-2.5 rounded-xl font-bold text-sm transition-colors">
                      <XCircle className="w-4 h-4"/> Reject
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
