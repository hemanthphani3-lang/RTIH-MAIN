"use client";

import { useEffect, useState, useCallback } from "react";
import { Server, Activity, CheckCircle, AlertTriangle, XCircle, RefreshCw } from "lucide-react";

type ProviderHealth = {
  status: string;
  model: string;
  available: boolean;
  lastChecked: string;
};

type HealthData = {
  grok?: ProviderHealth;
  gemini?: ProviderHealth;
  openrouter?: ProviderHealth;
};

export default function AiHealthWidget() {
  const [data, setData] = useState<HealthData>({});
  const [loading, setLoading] = useState(true);

  const checkHealth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/health/ai");
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error("Failed to fetch AI health", error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  const renderStatusIcon = (status: string, available: boolean) => {
    if (available) return <CheckCircle className="w-5 h-5 text-green-400" />;
    if (status.includes("Rate Limited") || status.includes("Unavailable")) return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
    return <XCircle className="w-5 h-5 text-red-400" />;
  };

  const renderStatusBadge = (status: string, available: boolean) => {
    if (available) return <span className="text-xs font-bold px-3 py-1 rounded-full border bg-green-500/20 text-green-400 border-green-500/30">Online</span>;
    if (status.includes("Rate Limited") || status.includes("Unavailable")) {
      return <span className="text-xs font-bold px-3 py-1 rounded-full border bg-yellow-500/20 text-yellow-400 border-yellow-500/30">{status}</span>;
    }
    return <span className="text-xs font-bold px-3 py-1 rounded-full border bg-red-500/20 text-red-400 border-red-500/30">{status}</span>;
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-3xl shadow-xl border border-white/10 overflow-hidden">
      <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/20">
        <h2 className="text-xl font-bold flex items-center gap-3 text-white">
          <Activity className="w-6 h-6 text-indigo-400" /> AI Infrastructure Status
        </h2>
        <button 
          onClick={checkHealth} 
          disabled={loading}
          className="flex items-center gap-2 bg-indigo-500/20 border border-indigo-500/30 hover:bg-indigo-500/30 text-indigo-300 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> 
          {loading ? 'Checking...' : 'Refresh'}
        </button>
      </div>

      <div className="divide-y divide-white/10">
        {loading && !Object.keys(data).length ? (
          <div className="p-8 text-center text-slate-400">Verifying AI Models...</div>
        ) : (
          Object.entries(data).map(([provider, info]) => (
            <div key={provider} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/5 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Server className="w-5 h-5 text-slate-300" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white capitalize">{provider}</h3>
                  <p className="text-xs text-slate-400 mt-1 font-mono">{info.model || "Unknown Model"}</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Last Checked</p>
                  <p className="text-sm font-medium text-slate-200">
                    {new Date(info.lastChecked).toLocaleTimeString()}
                  </p>
                </div>
                
                <div className="flex items-center gap-3 w-32 justify-end">
                  {renderStatusBadge(info.status, info.available)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
