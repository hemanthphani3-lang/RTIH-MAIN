"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { getOpportunityById, getOrgApplications } from "@/lib/actions/opportunities";
import { supabase } from "@/lib/supabase/client";
import { ArrowLeft, MapPin, Users, Calendar, Activity, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function OrgOpportunityDetailPage() {
  const { id } = useParams() as { id: string };
  const [opportunity, setOpportunity] = useState<any>(null);
  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const [oppRes, appsRes] = await Promise.all([
        getOpportunityById(id),
        getOrgApplications(user.id)
      ]);

      if (oppRes.success) setOpportunity(oppRes.data);
      if (appsRes.success) {
        // Find if they already applied
        const existingApp = appsRes.data.find((a: any) => a.opportunity_id === id);
        if (existingApp) setApplication(existingApp);
      }
      setLoading(false);
    }
    loadData();
  }, [id]);

  if (loading) return <DashboardLayout><div className="p-8 text-center text-white">Loading Opportunity Details...</div></DashboardLayout>;
  if (!opportunity) return <div className="p-8 text-center text-white">Opportunity not found.</div>;

  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
        
        <Link href="/org/opportunities" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Hub
        </Link>

        {/* Header */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 md:p-12 rounded-[2.5rem] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col items-start">
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="text-xs bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider">{opportunity.type}</span>
              {opportunity.domains && <span className="text-xs bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20 px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider">{opportunity.domains.name}</span>}
            </div>
            
            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-6 leading-tight">{opportunity.title}</h1>
            
            <div className="flex flex-wrap gap-6 text-sm text-slate-300 bg-black/40 p-4 rounded-2xl border border-white/5">
              <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-500" /> {opportunity.location} ({opportunity.mode})</span>
              <span className="flex items-center gap-2"><Users className="w-4 h-4 text-slate-500" /> {opportunity.capacity ? `${opportunity.capacity} spots` : 'Unlimited spots'}</span>
              <span className="flex items-center gap-2"><Activity className="w-4 h-4 text-slate-500" /> Status: {opportunity.status}</span>
            </div>
          </div>
        </div>

        {/* Content & Action */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
              <h3 className="text-lg font-bold text-white mb-4">About the Opportunity</h3>
              <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{opportunity.description}</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
              <h3 className="text-lg font-bold text-white mb-4">Eligibility Requirements</h3>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" /> 
                  <div>
                    <span className="font-bold text-white block mb-0.5">Startup Stages</span>
                    {opportunity.opportunity_eligibility?.[0]?.stage_requirements?.length > 0 
                      ? opportunity.opportunity_eligibility[0].stage_requirements.join(", ") 
                      : "Open to all stages"}
                  </div>
                </li>
                <li className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" /> 
                  <div>
                    <span className="font-bold text-white block mb-0.5">Domains</span>
                    {opportunity.opportunity_eligibility?.[0]?.domain_requirements?.length > 0 
                      ? opportunity.opportunity_eligibility[0].domain_requirements.join(", ") 
                      : opportunity.domains ? opportunity.domains.name : "Open to all domains"}
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gradient-to-b from-indigo-500/10 to-transparent border border-indigo-500/20 rounded-3xl p-6 text-center flex flex-col">
              <h3 className="font-bold text-white mb-6">Application Status</h3>
              
              {application ? (
                <div className="flex flex-col items-center justify-center flex-grow space-y-4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 ${
                    application.status === 'Accepted' ? 'bg-green-500/20 border-green-500/40 text-green-400' :
                    application.status === 'Rejected' ? 'bg-red-500/20 border-red-500/40 text-red-400' :
                    'bg-blue-500/20 border-blue-500/40 text-blue-400'
                  }`}>
                    {application.status === 'Accepted' ? <CheckCircle2 className="w-8 h-8" /> :
                     application.status === 'Rejected' ? <span className="text-2xl font-bold">X</span> :
                     <Activity className="w-8 h-8" />}
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">Current Status</p>
                    <p className={`text-xl font-extrabold ${
                      application.status === 'Accepted' ? 'text-green-400' :
                      application.status === 'Rejected' ? 'text-red-400' :
                      'text-blue-400'
                    }`}>{application.status}</p>
                  </div>
                  
                  {application.status === 'Accepted' && (
                    <Link href={`/org/workspace/${opportunity.id}`} className="mt-4 w-full py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold transition-colors">
                      Enter Workspace
                    </Link>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center flex-grow space-y-4">
                  <p className="text-sm text-slate-400">You have not applied for this opportunity yet.</p>
                  <Link href={`/org/opportunities/${opportunity.id}/apply`} className="w-full py-4 rounded-xl bg-[#FFD700] hover:shadow-[0_0_20px_rgba(255,215,0,0.4)] text-black font-extrabold text-lg transition-all">
                    Apply Now
                  </Link>
                </div>
              )}
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
               <h3 className="font-bold text-white mb-4 text-sm uppercase tracking-widest">Timeline</h3>
               <div className="space-y-4 text-sm">
                 <div className="flex justify-between">
                   <span className="text-slate-400">Applications Open</span>
                   <span className="text-white font-medium">{opportunity.registration_start_date ? new Date(opportunity.registration_start_date).toLocaleDateString() : 'Now'}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-slate-400">Deadline</span>
                   <span className="text-white font-medium">{opportunity.registration_end_date ? new Date(opportunity.registration_end_date).toLocaleDateString() : 'TBD'}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-slate-400">Event Date</span>
                   <span className="text-[#FFD700] font-bold">{opportunity.event_date ? new Date(opportunity.event_date).toLocaleDateString() : 'TBD'}</span>
                 </div>
               </div>
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
