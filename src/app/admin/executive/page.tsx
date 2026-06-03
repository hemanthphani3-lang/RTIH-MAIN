"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { getEcosystemMetrics, getHubAndDomainIntelligence } from "@/lib/actions/analytics";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Users, TrendingUp, AlertTriangle, CheckCircle, ChevronLeft } from "lucide-react";

export default function ExecutiveDashboardPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [hubIntel, setHubIntel] = useState<any[]>([]);
  const [hubError, setHubError] = useState<string | null>(null);
  const [selectedHub, setSelectedHub] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  useEffect(() => {
    async function load() {
      const [metricsRes, hubRes] = await Promise.all([
        getEcosystemMetrics(),
        getHubAndDomainIntelligence()
      ]);
      console.log("HUB_RES:", hubRes);
      if (metricsRes.success) setMetrics(metricsRes.data);
      if (hubRes.success) {
        setHubIntel(hubRes.data || []);
      } else {
        setHubError(hubRes.error || "Unknown Error fetching hubs");
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">Loading Executive Insights...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
        <div className="flex items-center justify-between bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Executive Dashboard</h1>
            <p className="text-slate-400 mt-1 text-sm">Statewide Ecosystem Intelligence and Innovation Analytics.</p>
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 flex items-center justify-between hover:bg-white/10 transition-colors">
            <div>
              <p className="text-sm font-bold text-slate-300 uppercase tracking-widest">Total Organizations</p>
              <h3 className="text-4xl font-extrabold text-blue-400 mt-2">{metrics?.totalOrgs}</h3>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl">
              <Users className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 flex items-center justify-between hover:bg-white/10 transition-colors">
            <div>
              <p className="text-sm font-bold text-slate-300 uppercase tracking-widest">Active Startups</p>
              <h3 className="text-4xl font-extrabold text-green-400 mt-2">{metrics?.activeOrgs}</h3>
            </div>
            <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-2xl">
              <TrendingUp className="w-8 h-8 text-green-400" />
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 flex items-center justify-between hover:bg-white/10 transition-colors">
            <div>
              <p className="text-sm font-bold text-slate-300 uppercase tracking-widest">Graduated</p>
              <h3 className="text-4xl font-extrabold text-purple-400 mt-2">{metrics?.graduatedOrgs}</h3>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-2xl">
              <CheckCircle className="w-8 h-8 text-purple-400" />
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 flex items-center justify-between hover:bg-white/10 transition-colors">
            <div>
              <p className="text-sm font-bold text-slate-300 uppercase tracking-widest">Active Mentors</p>
              <h3 className="text-4xl font-extrabold text-orange-400 mt-2">{metrics?.totalMentors}</h3>
            </div>
            <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-2xl">
              <Users className="w-8 h-8 text-orange-400" />
            </div>
          </div>
        </div>

        {/* Charts Row */}
        {hubError && <div className="text-red-500 bg-red-500/10 p-4 rounded-xl mb-4">Error loading Hub Intel: {hubError}</div>}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-6 h-80 flex flex-col relative group">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-extrabold text-lg text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-400" /> 
                {selectedHub ? `${selectedHub} Domains` : `Hub Distribution`}
              </h3>
              {selectedHub && (
                <button 
                  onClick={() => setSelectedHub(null)}
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-bold bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20 transition-all"
                >
                  <ChevronLeft className="w-3 h-3" /> Back to Hubs
                </button>
              )}
            </div>
            
            {!selectedHub && <p className="absolute top-16 left-6 text-xs text-slate-400 z-10 hidden group-hover:block">Click a bar to view domains</p>}
            
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                {(() => {
                  const dataSource = selectedHub 
                    ? (hubIntel.find(h => h.name === selectedHub)?.domains || [])
                    : hubIntel;
                  
                  const paddedData = [
                    ...dataSource,
                    ...Array.from({ length: Math.max(0, 5 - dataSource.length) }).map((_, i) => ({ name: ' '.repeat(i + 1), total: 0, active: 0 }))
                  ];

                  return (
                    <BarChart data={paddedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff'}} />
                      <Bar 
                        dataKey="total" 
                        fill="#3b82f6" 
                        name="Total Startups" 
                        radius={[4, 4, 0, 0]} 
                        barSize={40} 
                        onClick={(data) => {
                          if (!selectedHub && data && data.name && data.name.trim() !== "") {
                            setSelectedHub(data.name);
                          }
                        }}
                        style={{ cursor: selectedHub ? 'default' : 'pointer' }}
                      />

                    </BarChart>
                  );
                })()}
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-6 h-80 flex flex-col">
            <h3 className="font-extrabold text-lg text-white mb-6 flex items-center gap-2"><CheckCircle className="w-5 h-5 text-purple-400" /> Startup Funnel (Stage)</h3>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics?.stageDistribution}
                    cx="50%" cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {metrics?.stageDistribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff'}} itemStyle={{color: '#fff'}} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
