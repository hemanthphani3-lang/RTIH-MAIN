"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { getGovernanceLogs } from "@/lib/actions/governance";
import { Shield, FileText, AlertTriangle, UserCheck } from "lucide-react";

export default function GovernanceCenterPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await getGovernanceLogs(100);
      if (res.success) setLogs(res.data);
      setLoading(false);
    }
    load();
  }, []);

  const getIcon = (action: string) => {
    if (action.includes("APPROVED")) return <UserCheck className="w-5 h-5 text-green-500" />;
    if (action.includes("OVERRIDE")) return <AlertTriangle className="w-5 h-5 text-orange-500" />;
    if (action.includes("REVOKED")) return <Shield className="w-5 h-5 text-red-500" />;
    return <FileText className="w-5 h-5 text-blue-500" />;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">Loading Governance Logs...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Governance Center</h1>
            <p className="text-gray-500">Compliance ledger and manual overrides.</p>
          </div>
          <div className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg text-sm font-medium border border-blue-100 flex items-center">
            <Shield className="w-4 h-4 mr-2" /> Compliance Monitoring Active
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Entity</th>
                <th className="px-6 py-4">Admin/Manager</th>
                <th className="px-6 py-4">Details</th>
                <th className="px-6 py-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center mr-3 border border-gray-100">
                        {getIcon(log.action)}
                      </div>
                      <span className="font-medium text-gray-900">{log.action.replace(/_/g, ' ')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs capitalize">
                      {log.entity_type}
                    </span>
                    <div className="text-xs text-slate-500 dark:text-gray-400 mt-1 truncate w-24" title={log.entity_id}>
                      {log.entity_id.split('-')[0]}...
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {log.user_profiles?.full_name}
                    <div className="text-xs text-gray-500">{log.user_profiles?.email}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {log.details ? JSON.stringify(log.details) : "-"}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No governance logs recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
