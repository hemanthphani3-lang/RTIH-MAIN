"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabase/client";
import { getOrgDashboardData } from "@/lib/actions/mentorship";
import { uploadDocument } from "@/lib/actions/org";
import { FileText, Download, Plus, X, Send } from "lucide-react";

export default function OrgDocumentsPage() {
  const [org, setOrg] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [isAdding, setIsAdding] = useState(false);
  const [documentType, setDocumentType] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
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

  const handleUpload = async () => {
    if (!org || !userId) return;
    if (!documentType.trim() || !fileUrl.trim()) {
      setSubmitError("Please fill out both the document type and URL.");
      return;
    }
    setSubmitLoading(true);
    setSubmitError("");
    const res = await uploadDocument(org.id, userId, documentType, fileUrl);
    if (res.success) {
      setIsAdding(false);
      setDocumentType("");
      setFileUrl("");
      await loadData();
    } else {
      setSubmitError(res.error || "Failed to upload document");
    }
    setSubmitLoading(false);
  };

  if (loading) return <DashboardLayout><div className="p-8 text-center text-slate-900 dark:text-white">Loading Documents...</div></DashboardLayout>;
  if (!org) return <div className="p-8 text-center text-slate-900 dark:text-white">No organization profile found.</div>;

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-6 rounded-3xl flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              <FileText className="w-8 h-8 text-[#FFD700]" /> Document Vault
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Access your securely stored pitch decks, registration files, and deliverables.</p>
          </div>
          <button 
            onClick={() => { setIsAdding(true); setSubmitError(""); }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-5 rounded-xl transition-all shadow-md"
          >
            <Plus className="w-5 h-5" /> Add Document
          </button>
        </div>

        {org.documents && org.documents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {org.documents.map((doc: any, i: number) => (
              <div key={i} className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-6 flex flex-col group hover:bg-white/60 dark:bg-white/10 transition-colors">
                <div className="w-12 h-12 bg-indigo-500/20 border border-indigo-500/30 rounded-xl flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 text-indigo-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 group-hover:text-indigo-400 transition-colors">{doc.document_type}</h3>
                <p className="text-xs text-slate-500 mb-6 flex-grow">Uploaded {new Date(doc.upload_date).toLocaleDateString()}</p>
                
                <a href={doc.file_url} target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white dark:bg-white/5 hover:bg-white/60 dark:bg-white/10 text-slate-900 dark:text-white font-bold text-sm transition-colors border border-slate-200 dark:border-white/10">
                  <Download className="w-4 h-4" /> Download / View
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-16 text-center">
            <FileText className="w-16 h-16 text-slate-500 mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No documents found</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              You haven't uploaded any documents yet.
            </p>
          </div>
        )}
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-8 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-500" /> Add New Document
              </h3>
              <button onClick={() => setIsAdding(false)} className="text-slate-500 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-white/5 p-2 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 block">Document Title / Category</label>
                <input
                  type="text"
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  placeholder="e.g. Q1 Pitch Deck, Financial Projections..."
                  className="w-full bg-white dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl p-3.5 text-slate-900 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all shadow-inner"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 block">Document URL</label>
                <input
                  type="url"
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-white dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl p-3.5 text-slate-900 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all shadow-inner"
                />
                <p className="text-xs text-slate-500 mt-2">Paste a secure link to your file (Google Drive, Dropbox, Notion, etc).</p>
              </div>
            </div>

            {submitError && <div className="bg-red-500/10 text-red-400 text-sm font-bold mt-6 p-3 rounded-xl border border-red-500/20">{submitError}</div>}

            <div className="flex gap-3 mt-8">
              <button onClick={() => setIsAdding(false)} className="flex-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 px-4 py-3.5 rounded-xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-white/10 transition-all">
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={submitLoading}
                className="flex-[2] bg-indigo-600 text-white px-4 py-3.5 rounded-xl font-extrabold text-sm hover:bg-indigo-500 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitLoading ? "Saving..." : <><Send className="w-4 h-4" /> Save Document</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
