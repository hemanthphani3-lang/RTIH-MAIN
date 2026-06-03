"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { getOrgApplications } from "@/lib/actions/opportunities";
import { supabase } from "@/lib/supabase/client";
import { FileText, CheckCircle2, Clock, XCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function OrgApplicationsPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const res = await getOrgApplications(user.id);
    if (res.success) setApplications(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const ch = supabase.channel("org-applications")
      .on("postgres_changes", { event: "*", schema: "public", table: "opportunity_applications" }, loadData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadData]);

  if (loading) return <DashboardLayout><div className="p-8 text-center text-slate-900 dark:text-white">Loading Applications...</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
        
        {/* Header */}
        <div className="flex items-center justify-between bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-6 rounded-3xl">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">My Applications</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Track your progress and status for all opportunity applications.</p>
          </div>
          <div className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-4 py-2 rounded-xl text-sm font-bold">
            {applications.length} Applications
          </div>
        </div>

        {/* List */}
        <div className="space-y-6">
          {applications.length === 0 ? (
            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-16 text-center">
              <FileText className="w-16 h-16 text-slate-500 mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No applications yet</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">You haven't applied to any opportunities. Head to the Hub to get started.</p>
              <Link href="/org/opportunities" className="bg-[#FFD700] text-black px-6 py-3 rounded-xl font-bold hover:shadow-[0_0_20px_rgba(255,215,0,0.4)] transition-all">
                Browse Opportunities
              </Link>
            </div>
          ) : (
            applications.map((app) => (
              <div key={app.id} className="bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:bg-white/60 dark:bg-white/10 transition-colors group">
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">{app.opportunities?.type}</span>
                    <span className="text-slate-600 text-[10px]">•</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Applied {new Date(app.created_at).toLocaleDateString()}</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-400 transition-colors">
                    {app.opportunities?.title}
                  </h2>
                </div>

                <div className="flex items-center gap-6 w-full md:w-auto">
                  <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 font-bold text-sm ${
                    app.status === 'Accepted' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                    app.status === 'Rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                    app.status === 'Waitlisted' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                    'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  }`}>
                    {app.status === 'Accepted' ? <CheckCircle2 className="w-4 h-4"/> :
                     app.status === 'Rejected' ? <XCircle className="w-4 h-4"/> :
                     <Clock className="w-4 h-4"/>}
                    {app.status}
                  </div>

                  {app.status === 'Accepted' ? (
                    <Link href={`/org/workspace/${app.opportunities?.id}`} className="flex items-center gap-2 text-sm font-bold bg-indigo-500 hover:bg-indigo-600 text-slate-900 dark:text-white px-5 py-2.5 rounded-xl transition-colors">
                      Workspace <ArrowRight className="w-4 h-4" />
                    </Link>
                  ) : (
                    <Link href={`/org/opportunities/${app.opportunities?.id}`} className="flex items-center gap-2 text-sm font-bold bg-white dark:bg-white/5 hover:bg-white/60 dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white px-5 py-2.5 rounded-xl transition-colors">
                      View Details
                    </Link>
                  )}
                </div>

              </div>
            ))
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}
