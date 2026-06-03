"use client";

import { use, useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { getOrganizationDetails } from "@/lib/actions/admin-organizations";
import { getActionItems, createActionItem, updateActionItemStatus } from "@/lib/actions/mentor-evaluations";
import { ShieldAlert, Target, Activity, Calendar, Plus, CheckCircle, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export default function MentorEvaluationPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const orgId = unwrappedParams.id;
  
  const [org, setOrg] = useState<any>(null);
  const [actionItems, setActionItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mentorId, setMentorId] = useState("");

  const [newItem, setNewItem] = useState({ title: "", description: "", priority: "Medium", dueDate: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [orgId]);

  const loadData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: mentor } = await supabase.from("mentors").select("id").eq("user_id", user.id).single();
      if (mentor) setMentorId(mentor.id);
    }

    const [orgRes, itemsRes] = await Promise.all([
      getOrganizationDetails(orgId),
      getActionItems(orgId)
    ]);

    if (orgRes.success) setOrg(orgRes.data);
    if (itemsRes.success) setActionItems(itemsRes.data || []);
    
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!newItem.title) return alert("Title required");
    setSubmitting(true);
    const res = await createActionItem(orgId, mentorId, newItem);
    if (res.success) {
      setNewItem({ title: "", description: "", priority: "Medium", dueDate: "" });
      await loadData();
    } else {
      alert("Error: " + res.error);
    }
    setSubmitting(false);
  };

  const toggleStatus = async (item: any) => {
    const newStatus = item.status === "Completed" ? "Pending" : "Completed";
    const res = await updateActionItemStatus(item.id, newStatus, orgId);
    if (res.success) loadData();
  };

  if (loading) return <DashboardLayout><div className="p-8 text-slate-400">Loading...</div></DashboardLayout>;
  if (!org) return <DashboardLayout><div className="p-8 text-red-400">Startup not found</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
        
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <Activity className="w-8 h-8 text-indigo-400" /> Evaluate: {org.name}
            </h1>
            <p className="text-slate-400 mt-1 text-sm">Assign Action Items and evaluate venture health.</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Health Score</p>
            <p className={`text-4xl font-extrabold ${org.health_score > 70 ? 'text-green-400' : 'text-red-400'}`}>{org.health_score || 0}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1 space-y-6">
            <div className="bg-black/30 border border-white/5 rounded-3xl p-6">
              <h3 className="font-extrabold text-white flex items-center gap-2 mb-4"><Plus className="w-5 h-5 text-indigo-400"/> New Action Item</h3>
              <div className="space-y-4">
                <input value={newItem.title} onChange={e => setNewItem({...newItem, title: e.target.value})} placeholder="Action Title..." className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white" />
                <textarea value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} placeholder="Detailed description..." rows={3} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white" />
                <select value={newItem.priority} onChange={e => setNewItem({...newItem, priority: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white">
                  <option value="Low">Low Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="High">High Priority</option>
                  <option value="Critical">Critical Priority</option>
                </select>
                <input type="date" value={newItem.dueDate} onChange={e => setNewItem({...newItem, dueDate: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white [color-scheme:dark]" />
                <button disabled={submitting} onClick={handleCreate} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl py-3 text-sm transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)]">
                  {submitting ? 'Creating...' : 'Assign Action Item'}
                </button>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 space-y-4">
            <h3 className="font-extrabold text-white text-xl flex items-center gap-2"><Target className="w-5 h-5 text-indigo-400" /> Pending & Past Action Items</h3>
            {actionItems.length === 0 ? (
              <div className="bg-white/5 border border-white/10 p-8 rounded-3xl text-center text-slate-500 font-medium">No action items assigned yet.</div>
            ) : (
              <div className="space-y-3">
                {actionItems.map(item => (
                  <div key={item.id} className={`p-5 rounded-2xl border flex items-start gap-4 transition-all ${item.status === 'Completed' ? 'bg-green-500/5 border-green-500/20 opacity-70' : 'bg-white/5 border-white/10'}`}>
                    <button onClick={() => toggleStatus(item)} className="mt-1 shrink-0 transition-transform hover:scale-110">
                      {item.status === 'Completed' ? <CheckCircle className="w-6 h-6 text-green-500" /> : <div className="w-6 h-6 rounded-full border-2 border-slate-500 hover:border-indigo-400" />}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className={`font-bold ${item.status === 'Completed' ? 'text-slate-400 line-through' : 'text-white'}`}>{item.title}</h4>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border ${item.priority === 'Critical' || item.priority === 'High' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-white/5 text-slate-400 border-white/10'}`}>
                          {item.priority}
                        </span>
                      </div>
                      {item.description && <p className="text-sm text-slate-400 mb-3">{item.description}</p>}
                      {item.due_date && (
                        <p className="text-xs font-bold flex items-center gap-1 text-yellow-400">
                          <Calendar className="w-3 h-3" /> Due: {new Date(item.due_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
