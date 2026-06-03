"use client";

import { useEffect, useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { getOrganizationsPortfolio, getOrganizationDetails, updateOrganizationRisk, bulkUpdateOrganizations, aiOrganizationSearch, OrgFilters } from "@/lib/actions/admin-organizations";
import { 
  Building2, Search, Filter, ShieldAlert, Sparkles, AlertCircle, 
  CheckCircle2, Clock, ChevronRight, X, ArrowDownToLine, Users, Activity, Target, Shield, List
} from "lucide-react";
import { STAGE_BADGES, VentureStage } from "@/lib/milestones-config";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

export default function AdminOrganizationsPage() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiSearching, setIsAiSearching] = useState(false);

  const [filters, setFilters] = useState<OrgFilters>({
    search: "",
    domain: "All",
    stage: "All",
    riskStatus: "All",
    status: "All"
  });

  // Drawer state
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [drawerData, setDrawerData] = useState<any>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Bulk state
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  // Analytics
  const analytics = useMemo(() => {
    return {
      total: orgs.length,
      active: orgs.filter(o => o.status === "Approved").length,
      pending: orgs.filter(o => o.status === "Pending").length,
      highRisk: orgs.filter(o => o.calculated_risk === "High" || o.calculated_risk === "Critical").length,
      fundingReady: orgs.filter(o => o.verified_stage === "Funding Readiness").length,
    };
  }, [orgs]);

  useEffect(() => {
    loadOrgs();
  }, [filters]);

  const loadOrgs = async () => {
    setLoading(true);
    const res = await getOrganizationsPortfolio(filters, 200, 0);
    if (res.success) {
      setOrgs(res.data || []);
    } else {
      setError(res.error || "Failed to load organizations");
    }
    setLoading(false);
  };

  const handleAiSearch = async () => {
    if (!aiPrompt.trim()) {
      setFilters({ ...filters, search: "", domain: "All", stage: "All", riskStatus: "All" }); // reset
      return;
    }
    setIsAiSearching(true);
    const res = await aiOrganizationSearch(aiPrompt);
    if (res.success) {
      setOrgs(res.data || []);
    } else {
      alert("AI Search failed: " + res.error);
    }
    setIsAiSearching(false);
  };

  const handleOpenDrawer = async (orgId: string) => {
    setSelectedOrgId(orgId);
    setDrawerLoading(true);
    const res = await getOrganizationDetails(orgId);
    if (res.success) {
      setDrawerData(res.data);
    } else {
      alert("Failed to load details");
      setSelectedOrgId(null);
    }
    setDrawerLoading(false);
  };

  const handleBulkAction = async (action: string) => {
    if (selectedRowIds.size === 0) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (confirm(`Are you sure you want to perform ${action} on ${selectedRowIds.size} organizations?`)) {
      const res = await bulkUpdateOrganizations(Array.from(selectedRowIds), action, {}, user.id);
      if (res.success) {
        setSelectedRowIds(new Set());
        loadOrgs();
      } else {
        alert(res.error);
      }
    }
  };

  const toggleRowSelection = (id: string) => {
    const next = new Set(selectedRowIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedRowIds(next);
  };

  const exportCSV = () => {
    if (orgs.length === 0) return;
    const header = "Name,Founder,Stage,Risk,Health Score,Status,Created At\n";
    const rows = orgs.map(o => 
      `"${o.name}","${o.founder?.full_name || ''}","${o.verified_stage || 'Ideation'}","${o.calculated_risk}","${o.health_score || 0}","${o.status}","${new Date(o.created_at).toLocaleDateString()}"`
    ).join("\n");
    
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `startups_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <Building2 className="w-8 h-8 text-indigo-400" /> Startup Portfolio Management
            </h1>
            <p className="text-slate-400 mt-1 text-sm">Control center for all organizations in the ecosystem.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={exportCSV} className="bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all">
              <ArrowDownToLine className="w-4 h-4" /> Export CSV
            </button>
            {selectedRowIds.size > 0 && (
              <div className="flex gap-2 animate-in slide-in-from-right-4">
                <button onClick={() => handleBulkAction("REACTIVATE")} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-md">Approve Selected</button>
                <button onClick={() => handleBulkAction("ARCHIVE")} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-md">Archive Selected</button>
              </div>
            )}
          </div>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-sm">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Total</p>
            <p className="text-3xl font-extrabold text-white">{analytics.total}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-sm">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Active</p>
            <p className="text-3xl font-extrabold text-indigo-400">{analytics.active}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-sm">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Pending</p>
            <p className="text-3xl font-extrabold text-yellow-400">{analytics.pending}</p>
          </div>
          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 shadow-sm">
            <p className="text-xs text-red-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> High Risk</p>
            <p className="text-3xl font-extrabold text-red-500">{analytics.highRisk}</p>
          </div>
          <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-5 shadow-sm">
            <p className="text-xs text-green-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Target className="w-3 h-3"/> Funding Ready</p>
            <p className="text-3xl font-extrabold text-green-500">{analytics.fundingReady}</p>
          </div>
        </div>

        {/* AI Search & Filtering */}
        <div className="bg-[#1e293b] border border-slate-700/50 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Sparkles className="h-5 w-5 text-indigo-400 animate-pulse" />
            </div>
            <input 
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
              placeholder="Ask AI: 'Show me EV startups below health score 60' or 'Find high risk ideation phase startups'"
              className="block w-full pl-12 pr-20 py-4 bg-black/40 border border-indigo-500/30 rounded-2xl text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-sm"
            />
            <div className="absolute inset-y-0 right-2 flex items-center">
              <button onClick={handleAiSearch} disabled={isAiSearching} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md">
                {isAiSearching ? "Querying..." : "AI Search"}
              </button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2 text-slate-400 text-sm font-bold"><Filter className="w-4 h-4"/> Filters</div>
            <select value={filters.stage} onChange={e => setFilters({...filters, stage: e.target.value})} className="bg-black/30 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white">
              <option value="All">All Stages</option>
              {Object.keys(STAGE_BADGES).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filters.riskStatus} onChange={e => setFilters({...filters, riskStatus: e.target.value})} className="bg-black/30 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white">
              <option value="All">All Risk Levels</option>
              <option value="Low">Low Risk</option>
              <option value="Medium">Medium Risk</option>
              <option value="High">High Risk</option>
              <option value="Critical">Critical Risk</option>
            </select>
            <select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})} className="bg-black/30 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white">
              <option value="All">All Statuses</option>
              <option value="Approved">Active (Approved)</option>
              <option value="Pending">Pending</option>
              <option value="Archived">Archived</option>
            </select>
            <input value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} placeholder="Search name/founder..." className="bg-black/30 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white flex-1 min-w-[200px]" />
          </div>
        </div>

        {/* Datatable */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider font-bold">
                  <th className="p-4 w-12 text-center">
                    <input type="checkbox" onChange={(e) => {
                      if(e.target.checked) setSelectedRowIds(new Set(orgs.map(o => o.id)));
                      else setSelectedRowIds(new Set());
                    }} checked={orgs.length > 0 && selectedRowIds.size === orgs.length} className="rounded border-slate-700 bg-black/50 text-indigo-600 focus:ring-indigo-500" />
                  </th>
                  <th className="p-4">Organization</th>
                  <th className="p-4">Stage</th>
                  <th className="p-4">Health</th>
                  <th className="p-4">Risk</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {loading ? (
                  <tr><td colSpan={7} className="p-8 text-center text-slate-500 font-bold animate-pulse">Loading portfolio...</td></tr>
                ) : orgs.length === 0 ? (
                  <tr><td colSpan={7} className="p-16 text-center text-slate-500"><Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" /> No organizations found matching criteria.</td></tr>
                ) : (
                  orgs.map((org) => (
                    <tr key={org.id} className={`hover:bg-slate-800/50 transition-colors ${selectedRowIds.has(org.id) ? 'bg-indigo-900/10' : ''}`}>
                      <td className="p-4 text-center">
                        <input type="checkbox" checked={selectedRowIds.has(org.id)} onChange={() => toggleRowSelection(org.id)} className="rounded border-slate-700 bg-black/50 text-indigo-600 focus:ring-indigo-500" />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center font-bold text-indigo-400 shrink-0">
                            {org.name[0]}
                          </div>
                          <div>
                            <p className="font-extrabold text-white">{org.name}</p>
                            <p className="text-xs text-slate-400 font-medium">Founder: {org.founder?.full_name || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full border bg-white/5 border-white/10 text-slate-300`}>
                          {org.verified_stage || 'Ideation'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Activity className={`w-4 h-4 ${org.health_score > 70 ? 'text-green-400' : org.health_score > 40 ? 'text-yellow-400' : 'text-red-400'}`} />
                          <span className="font-extrabold text-white">{org.health_score || 0}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border ${
                          org.calculated_risk === 'Critical' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                          org.calculated_risk === 'High' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                          org.calculated_risk === 'Medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                          'bg-green-500/10 text-green-400 border-green-500/20'
                        }`}>
                          {org.calculated_risk || 'Low'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-xs font-bold">
                          {org.status === 'Approved' ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Clock className="w-4 h-4 text-yellow-400" />}
                          <span className={org.status === 'Approved' ? 'text-green-400' : 'text-yellow-400'}>{org.status}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <button onClick={() => handleOpenDrawer(org.id)} className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1">
                          View <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Organization Detail Drawer */}
      <div className={`fixed inset-y-0 right-0 w-full max-w-3xl bg-[#0f172a] shadow-[-10px_0_50px_rgba(0,0,0,0.5)] border-l border-slate-700 transform transition-transform duration-500 z-[100] flex flex-col ${selectedOrgId ? 'translate-x-0' : 'translate-x-full'}`}>
        {drawerLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full" />
          </div>
        ) : drawerData && (
          <>
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-md z-10 sticky top-0">
              <div>
                <h2 className="text-2xl font-extrabold text-white flex items-center gap-3">
                  {drawerData.name}
                  <span className={`text-[10px] uppercase px-2 py-0.5 rounded border ${drawerData.status === 'Approved' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
                    {drawerData.status}
                  </span>
                </h2>
                <p className="text-sm text-slate-400 mt-1">Founder: {drawerData.founder?.full_name} ({drawerData.founder?.email})</p>
              </div>
              <button onClick={() => setSelectedOrgId(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-8">
              
              {/* Grid 1: Basic Info & Health */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#1e293b] rounded-2xl p-5 border border-slate-700/50">
                  <p className="text-xs text-slate-500 font-bold uppercase mb-1">Current Stage</p>
                  <p className="text-xl font-extrabold text-white">{drawerData.verified_stage || 'Ideation'}</p>
                </div>
                <div className="bg-[#1e293b] rounded-2xl p-5 border border-slate-700/50">
                  <p className="text-xs text-slate-500 font-bold uppercase mb-1">Health Score</p>
                  <p className="text-xl font-extrabold text-white flex items-center gap-2">
                    {drawerData.health_score || 0} 
                    <Activity className={`w-5 h-5 ${drawerData.health_score > 70 ? 'text-green-400' : 'text-red-400'}`} />
                  </p>
                </div>
              </div>

              {/* Startup Info Section */}
              <section className="bg-black/20 border border-white/5 rounded-3xl p-6">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2"><Building2 className="w-4 h-4"/> Startup Information</h3>
                <div className="space-y-4 text-sm">
                  <div><strong className="text-slate-400 block mb-1">Description:</strong> <span className="text-slate-200">{drawerData.description || 'N/A'}</span></div>
                  <div><strong className="text-slate-400 block mb-1">Problem Statement:</strong> <span className="text-slate-200">{drawerData.problem_statement || 'N/A'}</span></div>
                  <div><strong className="text-slate-400 block mb-1">Solution:</strong> <span className="text-slate-200">{drawerData.solution || 'N/A'}</span></div>
                  <div><strong className="text-slate-400 block mb-1">Website:</strong> <a href={drawerData.website} target="_blank" className="text-indigo-400 hover:underline">{drawerData.website || 'N/A'}</a></div>
                  <div><strong className="text-slate-400 block mb-1">Registered:</strong> <span className="text-slate-200">{new Date(drawerData.created_at).toLocaleDateString()}</span></div>
                </div>
              </section>

              {/* Lifecycle & Milestones */}
              <section className="bg-black/20 border border-white/5 rounded-3xl p-6">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2"><Target className="w-4 h-4"/> Lifecycle & Milestones</h3>
                <div className="space-y-3">
                  {drawerData.milestones?.length === 0 ? <p className="text-slate-500 text-sm">No milestones submitted yet.</p> : 
                    drawerData.milestones.map((m: any) => (
                      <div key={m.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                        <div>
                          <p className="text-sm font-bold text-white">{m.milestone_title}</p>
                          <p className="text-xs text-slate-400">{new Date(m.submitted_at).toLocaleDateString()}</p>
                        </div>
                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded border ${m.status === 'Approved' || m.status === 'Verified' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
                          {m.status}
                        </span>
                      </div>
                    ))
                  }
                </div>
              </section>

              {/* Certifications */}
              <section className="bg-black/20 border border-white/5 rounded-3xl p-6">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2"><Shield className="w-4 h-4"/> Certifications</h3>
                {drawerData.certificates?.length === 0 ? <p className="text-slate-500 text-sm">No certificates issued.</p> : 
                  <div className="grid grid-cols-2 gap-3">
                    {drawerData.certificates.map((c: any) => (
                      <div key={c.id} className="bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-xl">
                        <p className="text-sm font-bold text-indigo-400">{c.certificate_type}</p>
                        <p className="text-xs text-slate-400 mt-1">{new Date(c.issue_date).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                }
              </section>

              {/* Activity Timeline */}
              <section className="bg-black/20 border border-white/5 rounded-3xl p-6">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2"><List className="w-4 h-4"/> Recent Activity</h3>
                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-700 before:to-transparent">
                  {drawerData.timeline?.length === 0 ? <p className="text-slate-500 text-sm pl-8">No timeline events recorded.</p> : 
                    drawerData.timeline.map((t: any, i: number) => (
                      <div key={t.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-5 h-5 rounded-full border border-indigo-500 bg-slate-900 text-indigo-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                          <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                        </div>
                        <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] bg-white/5 p-3 rounded-xl border border-white/10 shadow-sm">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-bold text-slate-200 text-sm">{t.event}</h4>
                            <time className="text-[10px] text-slate-500">{new Date(t.timestamp).toLocaleDateString()}</time>
                          </div>
                          <p className="text-xs text-slate-400">{t.description}</p>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </section>
            </div>
          </>
        )}
      </div>
      
      {/* Overlay for Drawer */}
      {selectedOrgId && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] transition-opacity" 
          onClick={() => setSelectedOrgId(null)} 
        />
      )}
    </DashboardLayout>
  );
}
