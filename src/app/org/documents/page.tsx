"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabase/client";
import { getOrgDashboardData } from "@/lib/actions/mentorship";
import { FileText, Download } from "lucide-react";

export default function OrgDocumentsPage() {
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const res = await getOrgDashboardData(user.id);
    if (res.success) setOrg(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const ch = supabase.channel("org-documents")
      .on("postgres_changes", { event: "*", schema: "public", table: "documents" }, loadData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadData]);

  if (loading) return <DashboardLayout><div className="p-8 text-center text-white">Loading Documents...</div></DashboardLayout>;
  if (!org) return <div className="p-8 text-center text-white">No organization profile found.</div>;

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl">
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <FileText className="w-8 h-8 text-[#FFD700]" /> Document Vault
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Access your securely stored pitch decks, registration files, and deliverables.</p>
        </div>

        {org.documents && org.documents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {org.documents.map((doc: any, i: number) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col group hover:bg-white/10 transition-colors">
                <div className="w-12 h-12 bg-indigo-500/20 border border-indigo-500/30 rounded-xl flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 text-indigo-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-indigo-400 transition-colors">{doc.document_type}</h3>
                <p className="text-xs text-slate-500 mb-6 flex-grow">Uploaded {new Date(doc.upload_date).toLocaleDateString()}</p>
                
                <a href={doc.file_url} target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm transition-colors border border-white/10">
                  <Download className="w-4 h-4" /> Download / View
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-16 text-center">
            <FileText className="w-16 h-16 text-slate-500 mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-white mb-2">No documents found</h3>
            <p className="text-slate-400 max-w-md mx-auto">
              You haven't uploaded any documents yet.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
