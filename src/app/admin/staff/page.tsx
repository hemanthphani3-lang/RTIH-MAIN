"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, Plus, ShieldCheck, Briefcase, X, Eye, EyeOff, MapPin } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { createStaffUser, getAllMentors, getAllManagers } from "@/lib/actions/staff";
import { supabase } from "@/lib/supabase/client";
import { LOCATIONS, LOCATION_DOMAINS, LocationType } from "@/lib/constants";

export default function AdminStaffPage() {
  const [mentors, setMentors] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<"Mentor" | "Manager">("Mentor");

  const [role, setRole] = useState<"Mentor" | "Manager">("Mentor");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [location, setLocation] = useState<LocationType>("Visakhapatnam");
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    const [mRes, manRes] = await Promise.all([getAllMentors(), getAllManagers()]);
    setMentors(mRes.data || []);
    setManagers(manRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();

    // Live updates
    const channels = [
      supabase.channel("staff-mentors").on("postgres_changes", { event: "*", schema: "public", table: "mentors" }, loadData).subscribe(),
      supabase.channel("staff-managers").on("postgres_changes", { event: "*", schema: "public", table: "managers" }, loadData).subscribe(),
      supabase.channel("staff-profiles").on("postgres_changes", { event: "*", schema: "public", table: "user_profiles" }, loadData).subscribe(),
    ];

    return () => { channels.forEach(c => supabase.removeChannel(c)); };
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
    if (role === "Mentor" && selectedDomains.length === 0) return alert("Please select at least one domain.");
    
    setCreating(true);
    
    // Pass location for both, and pass selected domains for Mentors
    const res = await createStaffUser(
      email, 
      password, 
      fullName, 
      role, 
      location,
      role === "Mentor" ? selectedDomains : undefined
    );
    
    if (res.success) {
      alert(`${role} account created! They can log in immediately.`);
      setShowForm(false);
      setFullName(""); setEmail(""); setPassword(""); setSelectedDomains([]);
      // loadData will be triggered by realtime subscription
    } else {
      alert("Error: " + res.error);
    }
    setCreating(false);
  };

  if (loading) return <div className="p-8 text-center text-white">Loading Staff Directory...</div>;

  const displayed = activeTab === "Mentor" ? mentors : managers;

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">

        {/* Header */}
        <div className="flex items-center justify-between bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Staff Management</h1>
            <p className="text-slate-400 mt-1 text-sm flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse inline-block"></span>
              Live — {mentors.length} Mentors · {managers.length} Managers
            </p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-[#FFD700] text-black px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:shadow-[0_0_15px_rgba(255,215,0,0.4)] transition-all">
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "Cancel" : "Add Staff"}
          </button>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 animate-in fade-in slide-in-from-top-4 duration-300">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
              <Plus className="w-6 h-6 text-[#FFD700]" /> Create New Staff Account
            </h2>
            <form onSubmit={handleCreate} className="space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Role *</label>
                <div className="grid grid-cols-2 gap-3">
                  {(["Mentor", "Manager"] as const).map(r => (
                    <button type="button" key={r} onClick={() => setRole(r)}
                      className={`py-3 rounded-xl text-sm font-bold border transition-all flex items-center justify-center gap-2 ${
                        role === r
                          ? "bg-[#FFD700] text-black border-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.3)]"
                          : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                      }`}>
                      {r === "Mentor" ? <ShieldCheck className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />} {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Full Name *</label>
                  <input required value={fullName} onChange={e => setFullName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-slate-500 focus:border-[#FFD700]/50 focus:outline-none transition-all"
                    placeholder="e.g. Dr. Arjun Sharma" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Email *</label>
                  <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-slate-500 focus:border-[#FFD700]/50 focus:outline-none transition-all"
                    placeholder="staff@rtih.com" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Password *</label>
                  <div className="relative">
                    <input required type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-slate-500 focus:border-[#FFD700]/50 focus:outline-none transition-all pr-12"
                      placeholder="Min. 8 characters" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3.5 text-slate-400 hover:text-white transition-colors">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Assigned Location *</label>
                  <div className="relative">
                    <select 
                      value={location} 
                      onChange={(e) => {
                        setLocation(e.target.value as LocationType);
                        setSelectedDomains([]); // reset domains when location changes
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-[#FFD700]/50 focus:outline-none transition-all appearance-none cursor-pointer"
                    >
                      {LOCATIONS.map(loc => (
                        <option key={loc} value={loc} className="bg-slate-900">{loc}</option>
                      ))}
                    </select>
                    <MapPin className="absolute right-4 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Mentor Domains */}
                {role === "Mentor" && (
                  <div className="md:col-span-2 pt-2 border-t border-white/10 mt-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block flex items-center gap-2">
                      Select Mentor Domains *
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {LOCATION_DOMAINS[location].map(domain => {
                        const isSelected = selectedDomains.includes(domain);
                        return (
                          <div 
                            key={domain} 
                            onClick={() => toggleDomain(domain)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl border cursor-pointer transition-all ${
                              isSelected 
                                ? "bg-[#FFD700]/10 border-[#FFD700]/30 text-white" 
                                : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                            }`}
                          >
                            <span className="text-sm font-medium">{domain}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <button type="submit" disabled={creating}
                className="w-full bg-[#FFD700] text-black font-extrabold py-3.5 rounded-xl hover:shadow-[0_0_20px_rgba(255,215,0,0.4)] transition-all disabled:opacity-60 text-sm tracking-wide mt-2">
                {creating ? "Creating Account..." : `Create ${role} Account`}
              </button>
            </form>
          </div>
        )}

        {/* Tabs */}
        <div className="flex bg-white/5 backdrop-blur-xl border border-white/10 p-1.5 rounded-2xl w-fit gap-1">
          {(["Mentor", "Manager"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === tab ? "bg-[#FFD700] text-black shadow-[0_0_10px_rgba(255,215,0,0.3)]" : "text-slate-300 hover:text-white"
              }`}>
              {tab === "Mentor" ? <ShieldCheck className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
              {tab}s ({tab === "Mentor" ? mentors.length : managers.length})
            </button>
          ))}
        </div>

        {/* Staff Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayed.length === 0 ? (
            <div className="col-span-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-16 text-center">
              <Users className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-400 font-medium">No {activeTab}s yet. Create one above.</p>
            </div>
          ) : (
            displayed.map((s: any, idx: number) => (
              <div key={s.id || idx} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 hover:bg-white/10 transition-all flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#FFD700]/20 to-[#FFD700]/5 border border-[#FFD700]/20 rounded-2xl flex items-center justify-center">
                    <span className="text-[#FFD700] font-extrabold text-lg">
                      {s.user_profiles?.full_name?.[0]?.toUpperCase() || "?"}
                    </span>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                    activeTab === "Mentor" ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                  }`}>{activeTab}</span>
                </div>
                <h3 className="text-white font-bold text-lg">{s.user_profiles?.full_name}</h3>
                <p className="text-slate-400 text-sm mt-1">{s.user_profiles?.email}</p>
                
                {/* Location Badge */}
                {s.location && (
                  <div className="mt-4 pt-4 border-t border-white/10 flex-grow">
                    <span className="inline-flex items-center gap-1.5 bg-white/5 text-slate-300 border border-white/10 text-xs px-3 py-1.5 rounded-lg font-medium">
                      <MapPin className="w-3.5 h-3.5 text-blue-400" /> {s.location}
                    </span>
                  </div>
                )}
                
                {/* Mentor Domains */}
                {activeTab === "Mentor" && s.domains && s.domains.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/10 flex-grow">
                    <div className="flex flex-wrap gap-2">
                      {s.domains.map((d: string) => (
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
