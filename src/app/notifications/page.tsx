"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabase/client";
import { getMyConnections, respondToConnection } from "@/lib/actions/network";
import { Bell, UserPlus, Check, X, Clock } from "lucide-react";
import Link from "next/link";

export default function NotificationsPage() {
  const [currentUserId, setCurrentUserId] = useState("");
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewProfileId, setReviewProfileId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);
      
      const res = await getMyConnections(user.id);
      if (res.success) {
        setPendingRequests((res.data || []).filter((c: any) => c.status === "Pending" && c.receiver?.id === user.id));
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleRespond = async (connId: string, status: "Accepted" | "Rejected") => {
    const res = await respondToConnection(connId, status);
    if (!res.success) {
      alert("Failed to respond: " + res.error);
      return;
    }
    setPendingRequests(prev => prev.filter(c => c.id !== connId));
  };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-indigo-500/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center">
            <Bell className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Notifications</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Manage your connection requests and alerts</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-slate-500 dark:text-slate-400 py-12">Loading notifications...</div>
        ) : pendingRequests.length === 0 ? (
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-12 text-center text-slate-500">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-sm">You have no new notifications.</p>
          </div>
        ) : (
          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-3xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-yellow-400" />
              <h2 className="font-bold text-slate-900 dark:text-white">Connection Requests</h2>
              <span className="ml-1 bg-yellow-500/20 text-yellow-400 text-xs px-2 py-0.5 rounded-full">{pendingRequests.length}</span>
            </div>
            <div className="divide-y divide-white/5">
              {pendingRequests.map(conn => {
                const contact = conn.sender;
                return (
                  <div key={conn.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white dark:bg-white/5 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-500/20 border border-indigo-500/30 rounded-full flex items-center justify-center font-bold text-indigo-400 text-lg shrink-0">
                        {contact?.full_name?.[0]}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-lg">
                          {(contact as any)?.role === "Organization" && (contact as any)?.org_name 
                            ? (contact as any)?.org_name 
                            : (contact as any)?.full_name}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {(contact as any)?.role === "Organization" && (contact as any)?.org_name 
                            ? `Founder: ${(contact as any)?.full_name} • ${(contact as any)?.email}`
                            : (contact as any)?.email}
                        </p>
                        <button onClick={() => setReviewProfileId((contact as any)?.id)} className="text-indigo-400 text-xs font-bold hover:underline mt-1 inline-block">
                          Review Profile
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleRespond(conn.id, "Accepted")}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-green-500/10 border border-green-500/30 hover:bg-green-500/20 text-green-400 px-5 py-2.5 rounded-xl text-sm font-bold transition-all">
                        <Check className="w-4 h-4" /> Accept
                      </button>
                      <button onClick={() => handleRespond(conn.id, "Rejected")}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 px-5 py-2.5 rounded-xl text-sm font-bold transition-all">
                        <X className="w-4 h-4" /> Decline
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {reviewProfileId && (() => {
        const reviewContact = pendingRequests.flatMap(c => [c.sender, c.receiver]).find(u => u.id === reviewProfileId);
        if (!reviewContact) return null;
        const role = reviewContact.role;
        const isOrg = role === "Organization";
        
        return (
          <div className="fixed inset-0 bg-slate-200 dark:bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setReviewProfileId(null)}>
            <div className="bg-white dark:bg-white/5 border border-slate-300 dark:border-white/20 w-full max-w-sm rounded-3xl p-8 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-300 relative" onClick={e => e.stopPropagation()}>
              <button onClick={() => setReviewProfileId(null)} className="absolute top-4 right-4 p-2 hover:bg-white/60 dark:bg-white/10 rounded-xl transition-colors">
                <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </button>
              
              <div className="flex flex-col items-center text-center mt-4">
                <div className="w-24 h-24 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-full flex items-center justify-center text-4xl font-extrabold text-slate-900 dark:text-white mb-4 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                  {reviewContact.full_name?.[0]}
                </div>
                
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-3 py-1 rounded-full mb-3">
                  {role}
                </span>
                
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1">
                  {isOrg && reviewContact.org_name ? reviewContact.org_name : reviewContact.full_name}
                </h3>
                
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                  {isOrg && reviewContact.org_name ? `Founder: ${reviewContact.full_name}` : reviewContact.email}
                </p>

                {(isOrg && reviewContact.stage) && (
                  <div className="mb-4">
                    <span className="text-xs font-bold px-3 py-1 bg-green-500/20 text-green-400 rounded-full border border-green-500/30">
                      Stage: {reviewContact.stage}
                    </span>
                  </div>
                )}
                {(isOrg && reviewContact.description) && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 italic border-l-2 border-indigo-500/50 pl-3 text-left">
                    "{reviewContact.description}"
                  </p>
                )}

                <div className="w-full bg-white dark:bg-white/5 rounded-2xl p-4 border border-white/5">
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">Contact Email</p>
                  <p className="text-sm text-slate-900 dark:text-white font-medium">{reviewContact.email}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </DashboardLayout>
  );
}
