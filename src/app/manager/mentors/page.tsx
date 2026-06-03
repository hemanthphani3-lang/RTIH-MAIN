"use client";

import { useEffect, useState, useCallback } from "react";
import { ShieldCheck, Plus, X, Eye, EyeOff, Users, MapPin, CheckSquare, Square } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { createStaffUser, getAllMentors, getManagerLocation } from "@/lib/actions/staff";
import { supabase } from "@/lib/supabase/client";
import { LOCATION_DOMAINS, LocationType } from "@/lib/constants";

export default function ManagerMentorsPage() {
  const [mentors, setMentors] = useState<any[]>([]);
  const [managerLocation, setManagerLocation] = useState<LocationType | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Domains selection
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    try {
      // Get current user to find manager location
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr) console.warn("Auth check warning:", authErr);
      
      if (user) {
        const locRes = await getManagerLocation(user.id);
        if (locRes.success && locRes.location) {
          setManagerLocation(locRes.location as LocationType);
        }
      }

      const res = await getAllMentors();
      setMentors(res.data || []);
    } catch (err) {
      console.error("Error loading mentors data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const ch = supabase.channel("mgr-mentors")
      .on("postgres_changes", { event: "*", schema: "public", table: "mentors" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_profiles" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "mentor_domains" }, loadData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadData]);

  const toggleDomain = (domain: string) => {
    if (selectedDomains.includes(domain)) {
      setSelectedDomains(selectedDomains.filter(d => d !== domain));
    } else {
      setSelectedDomains([...selectedDomains, domain]);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) return alert("Please fill all required fields.");
    if (selectedDomains.length === 0) return alert("Please select at least one domain.");
    
    setCreating(true);
    // Role is Mentor, Location is managerLocation, Domain names passed in
    const res = await createStaffUser(email, password, fullName, "Mentor", managerLocation || undefined, selectedDomains);
    
    if (res.success) {
      alert("Mentor account created! They can log in immediately.");
      setShowForm(false);
      setFullName(""); setEmail(""); setPassword(""); setSelectedDomains([]);
      await loadData(); // Manually reload data to update UI immediately
    } else {
      alert("Error: " + res.error);
    }
    setCreating(false);
  };

  if (loading) return <DashboardLayout><div className="p-8 text-center text-slate-900 dark:text-white">Loading Mentors...</div></DashboardLayout>;

  const allowedDomains = managerLocation ? LOCATION_DOMAINS[managerLocation] : [];

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">

        {/* Header */}
        <div className="flex items-center justify-between bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-6 rounded-3xl">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Mentor Management</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse inline-block"></span>
              Live — {mentors.length} active mentors in the platform
            </p>
          </div>
          <div className="flex items-center gap-4">
            {managerLocation && (
              <span className="hidden md:inline-flex items-center gap-1.5 bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 text-xs px-3 py-1.5 rounded-lg font-medium">
                <MapPin className="w-3.5 h-3.5 text-blue-400" /> {managerLocation} Hub
              </span>
            )}
            <button onClick={() => setShowForm(!showForm)}
              className="bg-[#FFD700] text-black px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:shadow-[0_0_15px_rgba(255,215,0,0.4)] transition-all">
              {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showForm ? "Cancel" : "Add Mentor"}
            </button>
          </div>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl p-8 animate-in fade-in slide-in-from-top-4 duration-300">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-[#FFD700]" /> Create New Mentor Account
            </h2>
            <form onSubmit={handleCreate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 block">Full Name *</label>
                  <input required value={fullName} onChange={e => setFullName(e.target.value)}
                    className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white placeholder-slate-500 focus:border-[#FFD700]/50 focus:outline-none transition-all"
                    placeholder="e.g. Dr. Priya Nair" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 block">Email *</label>
                  <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white placeholder-slate-500 focus:border-[#FFD700]/50 focus:outline-none transition-all"
                    placeholder="mentor@rtih.com" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 block">Password *</label>
                  <div className="relative">
                    <input required type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                      className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white placeholder-slate-500 focus:border-[#FFD700]/50 focus:outline-none transition-all pr-12"
                      placeholder="Min. 8 characters" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Domain Checkboxes based on Manager Location */}
                <div className="md:col-span-2 pt-2 border-t border-slate-200 dark:border-white/10 mt-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 block flex items-center gap-2">
                    Select Mentor Domains * 
                    <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-md normal-case tracking-normal">
                      Restricted to {managerLocation} Hub
                    </span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {allowedDomains.map(domain => {
                      const isSelected = selectedDomains.includes(domain);
                      return (
                        <div 
                          key={domain} 
                          onClick={() => toggleDomain(domain)}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            isSelected 
                              ? "bg-[#FFD700]/10 border-[#FFD700]/30 text-slate-900 dark:text-white" 
                              : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:bg-white/10"
                          }`}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-[#FFD700] flex-shrink-0" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-500 flex-shrink-0" />
                          )}
                          <span className="text-sm font-medium">{domain}</span>
                        </div>
                      );
                    })}
                  </div>
                  {allowedDomains.length === 0 && (
                    <p className="text-sm text-red-400 italic">No domains configured for your location. Contact Administrator.</p>
                  )}
                </div>
              </div>
              <button type="submit" disabled={creating}
                className="w-full bg-[#FFD700] text-black font-extrabold py-3.5 rounded-xl hover:shadow-[0_0_20px_rgba(255,215,0,0.4)] transition-all disabled:opacity-60 disabled:cursor-not-allowed text-sm tracking-wide">
                {creating ? "Creating Account..." : "Create Mentor Account"}
              </button>
            </form>
          </div>
        )}

        {/* Mentor Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mentors.length === 0 ? (
            <div className="col-span-3 bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl p-16 text-center">
              <Users className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-500 dark:text-slate-400 font-medium">No mentors yet. Create the first one!</p>
            </div>
          ) : (
            mentors.map((m: any, idx: number) => (
              <div key={idx} className="bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl p-6 hover:bg-white/60 dark:bg-white/10 transition-all flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500/20 to-indigo-500/5 border border-indigo-500/20 rounded-2xl flex items-center justify-center">
                    <span className="text-indigo-400 font-extrabold text-lg">
                      {m.user_profiles?.full_name?.[0]?.toUpperCase() || "?"}
                    </span>
                  </div>
                  <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold px-3 py-1 rounded-full">Mentor</span>
                </div>
                <h3 className="text-slate-900 dark:text-white font-bold text-lg">{m.user_profiles?.full_name}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{m.user_profiles?.email}</p>
                
                {/* Mentor Domains */}
                {m.domains && m.domains.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10 flex-grow">
                    <div className="flex flex-wrap gap-2">
                      {m.domains.map((d: string) => (
                        <span key={d} className="bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20 text-[10px] uppercase tracking-wider px-2 py-1 rounded-md font-bold">
                          {d}
                        </span>
                      ))}
                    </div>
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
