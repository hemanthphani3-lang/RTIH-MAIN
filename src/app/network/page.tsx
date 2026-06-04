"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabase/client";
import { searchProfiles, sendConnectionRequest, getConnectionStatus, respondToConnection } from "@/lib/actions/network";
import { Search, Users, Building2, Briefcase, UserCheck, Globe, MapPin, ChevronRight, Sparkles, UserPlus, Check, Clock, Filter } from "lucide-react";
import Link from "next/link";

const STAGES = ["Ideation", "Validation", "MVP", "Early Traction", "Growth", "Scale"];

export default function NetworkPage() {
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "Organization" | "Mentor" | "Manager">("all");
  const [stageFilter, setStageFilter] = useState("");
  const [connectionStatuses, setConnectionStatuses] = useState<Record<string, any>>({});
  const [connecting, setConnecting] = useState<string>("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
      handleSearch();
    }
    load();
  }, []);

  const handleSearch = useCallback(async () => {
    setLoading(true);
    const res = await searchProfiles({ query, type: typeFilter === "all" ? "all" : typeFilter, stage: stageFilter || undefined });
    if (res.success) {
      // Filter out current user from results
      const { data: { user } } = await supabase.auth.getUser();
      const activeUserId = user?.id || "";
      
      const filteredResults = (res.data || []).filter((r: any) => {
        const otherId = r._type === "Organization" ? r.founder_id : r.user_id;
        return otherId !== activeUserId;
      });
      
      setResults(filteredResults);

      // Fetch connection status for each profile
      if (user) {
        const statuses: Record<string, any> = {};
        for (const r of filteredResults) {
          const otherId = r._type === "Organization" ? r.founder_id : r.user_id;
          if (otherId && otherId !== user.id) {
            const s = await getConnectionStatus(user.id, otherId);
            if (s.success && s.data) statuses[otherId] = s.data;
          }
        }
        setConnectionStatuses(statuses);
      }
    }
    setLoading(false);
  }, [query, typeFilter, stageFilter]);

  const handleConnect = async (otherUserId: string) => {
    if (!currentUserId || !otherUserId) return;
    setConnecting(otherUserId);
    const res = await sendConnectionRequest(currentUserId, otherUserId);
    if (res.success) {
      setConnectionStatuses(prev => ({ ...prev, [otherUserId]: { status: "Pending", sender_id: currentUserId } }));
    } else {
      alert(res.error);
    }
    setConnecting("");
  };

  const getProfileUserId = (profile: any) => {
    if (profile._type === "Organization") return profile.founder_id;
    return profile.user_id;
  };

  const renderConnectionBtn = (profile: any) => {
    const uid = getProfileUserId(profile);
    if (!uid || uid === currentUserId) return null;
    const conn = connectionStatuses[uid];

    if (!conn) return (
      <button
        onClick={(e) => { e.preventDefault(); handleConnect(uid); }}
        disabled={connecting === uid}
        className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
      >
        <UserPlus className="w-3.5 h-3.5" />
        {connecting === uid ? "Sending..." : "Connect"}
      </button>
    );

    if (conn.status === "Pending") return (
      <span className="flex items-center gap-1 text-yellow-400 text-xs font-bold bg-yellow-500/10 border border-yellow-500/20 px-3 py-1.5 rounded-lg">
        <Clock className="w-3 h-3" /> Pending
      </span>
    );

    if (conn.status === "Accepted") return (
      <Link
        href={`/messages?with=${uid}`}
        className="flex items-center gap-1 text-green-400 text-xs font-bold bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-lg hover:bg-green-500/20 transition-all"
      >
        <Check className="w-3 h-3" /> Message
      </Link>
    );

    return null;
  };

  const getTypeIcon = (type: string) => {
    if (type === "Organization") return <Building2 className="w-4 h-4 text-indigo-400" />;
    if (type === "Mentor") return <UserCheck className="w-4 h-4 text-green-400" />;
    return <Briefcase className="w-4 h-4 text-yellow-400" />;
  };

  const getTypeColor = (type: string) => {
    if (type === "Organization") return "text-indigo-400 bg-indigo-500/10 border-indigo-500/20";
    if (type === "Mentor") return "text-green-400 bg-green-500/10 border-green-500/20";
    return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
  };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/10 border border-indigo-500/30 p-8 rounded-3xl relative overflow-hidden">
          <div className="absolute right-0 top-0 p-8 opacity-10"><Sparkles className="w-48 h-48 text-indigo-600 dark:text-indigo-400" /></div>
          <div className="relative z-10">
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              <Users className="w-8 h-8 text-indigo-600 dark:text-indigo-400" /> Innovation Network
            </h1>
            <p className="text-indigo-900 dark:text-indigo-200 mt-2 text-sm max-w-xl">
              Discover startups, mentors, and managers across the RTIH ecosystem. Connect and collaborate to accelerate your innovation journey.
            </p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 flex items-center gap-3 bg-slate-200 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 focus-within:border-indigo-500 transition-all">
              <Search className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search startups, mentors, managers..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                className="flex-1 bg-transparent text-slate-900 dark:text-white text-sm focus:outline-none placeholder-slate-500"
              />
            </div>
            <button
              onClick={handleSearch}
              className="bg-indigo-600 hover:bg-indigo-500 text-slate-900 dark:text-white px-6 rounded-xl font-bold text-sm transition-all"
            >
              Search
            </button>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <Filter className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            {(["all", "Organization", "Mentor", "Manager"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${typeFilter === t ? "bg-indigo-600 border-indigo-500 text-slate-900 dark:text-white" : "border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:border-white/30"}`}
              >
                {t === "all" ? "All Types" : t + "s"}
              </button>
            ))}
            <select
              value={stageFilter}
              onChange={e => setStageFilter(e.target.value)}
              className="bg-slate-200 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-xs rounded-full px-3 py-1.5 focus:outline-none"
            >
              <option value="">Any Stage</option>
              {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center text-slate-500 dark:text-slate-400 py-12">Searching the ecosystem...</div>
        ) : results.length === 0 ? (
          <div className="text-center text-slate-500 py-16">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No results found. Try a different search or filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {results.map((profile, idx) => {
              const uid = getProfileUserId(profile);
              return (
                <div key={idx} className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 flex flex-col gap-4 hover:bg-white/8 hover:border-slate-300 dark:border-white/20 transition-all">

                  {/* Type Badge */}
                  <div className="flex items-center justify-between">
                    <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${getTypeColor(profile._type)}`}>
                      {getTypeIcon(profile._type)} {profile._type}
                    </span>
                    {profile._type === "Mentor" && (
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${profile.availability_status === "Available" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20"}`}>
                        {profile.availability_status || "Unavailable"}
                      </span>
                    )}
                  </div>

                  {/* Name / Title */}
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight">
                      {profile._type === "Organization" ? profile.name : (profile.user_profiles as any)?.full_name}
                    </h3>
                    {profile._type === "Organization" && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Founder: {(profile.user_profiles as any)?.full_name}
                      </p>
                    )}
                    {profile._type === "Mentor" && profile.bio && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{profile.bio}</p>
                    )}
                    {profile._type === "Organization" && profile.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{profile.description}</p>
                    )}
                  </div>

                  {/* Meta Tags */}
                  <div className="flex flex-wrap gap-2">
                    {profile._type === "Organization" && profile.stage && (
                      <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded font-bold">{profile.stage}</span>
                    )}
                    {profile._type === "Organization" && profile._domain && (
                      <span className="text-[10px] bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20 px-2 py-0.5 rounded font-bold">{profile._domain}</span>
                    )}
                    {profile._type === "Mentor" && profile._domains?.map((d: string) => (
                      <span key={d} className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded font-bold">{d}</span>
                    ))}
                    {profile._type === "Mentor" && profile.location && (
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1"><MapPin className="w-3 h-3" />{profile.location}</span>
                    )}
                    {profile._type === "Manager" && profile.location && (
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1"><MapPin className="w-3 h-3" />{profile.location} Hub</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/5">
                    <Link
                      href={`/profile/${uid}`}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
                    >
                      View Profile <ChevronRight className="w-3 h-3" />
                    </Link>
                    {renderConnectionBtn(profile)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
