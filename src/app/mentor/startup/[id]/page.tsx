"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { reviewMilestone, createActionItem } from "@/lib/actions/lifecycle";
import { ArrowLeft, CheckCircle, XCircle, Clock, Plus, LayoutDashboard, Target, Activity } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function MentorStartupDetail() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [mentorId, setMentorId] = useState("");
  const [org, setOrg] = useState<any>(null);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [actionItems, setActionItems] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);

  // Modals / Inputs
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [orgId]);

  async function loadData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: mentorData } = await supabase.from("mentors").select("id").eq("user_id", user.id).single();
    if (!mentorData) { router.push("/login"); return; }
    setMentorId(mentorData.id);

    // Fetch Org
    const { data: orgData } = await supabase.from("organizations").select("*, user_profiles(full_name, email)").eq("id", orgId).single();
    if (!orgData) return;
    setOrg(orgData);

    // Fetch Stages & Milestones
    const { data: stage } = await supabase.from("startup_stages").select("id").eq("name", orgData.stage).single();
    if (stage) {
      const { data: mData } = await supabase.from("milestones").select("*").eq("stage_id", stage.id).order("created_at");
      if (mData) setMilestones(mData);
    }

    // Fetch Submissions
    const { data: subData } = await supabase.from("milestone_submissions").select("*").eq("organization_id", orgId);
    if (subData) setSubmissions(subData);

    // Fetch Action Items
    const { data: aiData } = await supabase.from("action_items").select("*").eq("organization_id", orgId).order("created_at", { ascending: false });
    if (aiData) setActionItems(aiData);

    // Fetch Timeline
    const { data: tData } = await supabase.from("activity_timeline").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(10);
    if (tData) setTimeline(tData);

    setLoading(false);
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle) return;
    await createActionItem(orgId, mentorId, newTaskTitle, newTaskDesc, null);
    setNewTaskTitle("");
    setNewTaskDesc("");
    loadData();
  };

  const handleReview = async (submissionId: string, outcome: string) => {
    await reviewMilestone(submissionId, mentorId, outcome, reviewComment);
    setActiveReviewId(null);
    setReviewComment("");
    loadData();
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Startup Details...</div>;
  if (!org) return <div className="p-8 text-center text-red-500">Startup not found or unauthorized.</div>;

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center space-x-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <button onClick={() => router.back()} className="p-3 bg-white rounded-full shadow-sm hover:shadow hover:bg-gray-50 transition-all border border-gray-200 text-gray-600"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">{org.name}</h1>
            <p className="text-sm font-medium text-blue-600">{org.stage} • <span className="text-gray-500">Founder: {org.user_profiles?.full_name}</span></p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-8 animate-in fade-in slide-in-from-left-4 duration-500 delay-100 fill-mode-both">
            
            {/* Overview */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-4"><LayoutDashboard className="w-5 h-5 text-blue-600" /> Startup Overview</h2>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Problem Statement</h3>
                  <p className="text-gray-800 mt-1 font-medium">{org.problem_statement}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Solution</h3>
                  <p className="text-gray-800 mt-1 font-medium">{org.solution}</p>
                </div>
              </div>
            </div>

            {/* Milestone Review Engine */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-4"><Target className="w-5 h-5 text-purple-600" /> Milestone Review Engine</h2>
              <div className="space-y-4">
                {milestones.length === 0 && <p className="text-gray-500 text-sm italic">No milestones available for this stage.</p>}
                {milestones.map(m => {
                  const sub = submissions.find(s => s.milestone_id === m.id);
                  return (
                    <div key={m.id} className="border border-gray-200 rounded-xl p-5 hover:border-purple-300 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-gray-900 text-lg">{m.title}</h4>
                          <p className="text-sm text-gray-500 mt-1">{m.description}</p>
                        </div>
                        <span className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shadow-sm ${
                          !sub ? 'bg-gray-100 text-gray-600' :
                          sub.status === 'Submitted' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                          sub.status === 'Approved' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
                        }`}>
                          {!sub ? 'Pending Submission' : sub.status}
                        </span>
                      </div>
                      
                      {sub && sub.status === 'Submitted' && (
                        <div className="mt-5 bg-yellow-50/50 p-5 rounded-xl border border-yellow-100">
                          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Startup Submission Notes</p>
                          <p className="text-sm text-gray-800 italic bg-white p-4 rounded-lg border border-gray-200 mb-4 shadow-sm">" {sub.notes} "</p>
                          
                          {activeReviewId === sub.id ? (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                              <textarea 
                                value={reviewComment} 
                                onChange={e => setReviewComment(e.target.value)} 
                                placeholder="Add detailed mentor feedback, advice, or reasons for rejection..."
                                className="w-full text-sm p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                                rows={3}
                              />
                              <div className="flex gap-2">
                                <button onClick={() => handleReview(sub.id, 'Approved')} className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 hover:bg-green-700 shadow-sm transition-all"><CheckCircle className="w-4 h-4"/> Approve Milestone</button>
                                <button onClick={() => handleReview(sub.id, 'Rejected')} className="bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 hover:bg-red-700 shadow-sm transition-all"><XCircle className="w-4 h-4"/> Reject & Request Revisions</button>
                                <button onClick={() => setActiveReviewId(null)} className="text-gray-500 text-sm ml-2 hover:text-gray-700 font-medium px-2">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => setActiveReviewId(sub.id)} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm transition-all shadow-blue-600/20">Review Submission</button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Sidebar */}
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 delay-200 fill-mode-both">
            
            {/* Task Manager */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-4"><CheckCircle className="w-5 h-5 text-green-600" /> Action Items</h2>
              
              <form onSubmit={handleCreateTask} className="mb-6 space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-inner">
                <input required value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} placeholder="New Task Title" className="w-full text-sm p-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                <textarea value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)} placeholder="Task Description (Optional)" className="w-full text-sm p-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" rows={2} />
                <button type="submit" className="w-full bg-gray-900 text-white px-4 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors shadow-sm"><Plus className="w-4 h-4"/> Assign Task to Startup</button>
              </form>

              <div className="space-y-3">
                {actionItems.map(ai => (
                  <div key={ai.id} className="p-4 border border-gray-200 rounded-xl flex items-start gap-3 hover:bg-gray-50 transition-colors">
                    <div className="mt-0.5">
                      {ai.status === 'Completed' ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Clock className="w-5 h-5 text-orange-400" />}
                    </div>
                    <div>
                      <h4 className={`text-sm font-bold ${ai.status === 'Completed' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{ai.title}</h4>
                      {ai.description && <p className="text-xs text-gray-500 mt-1">{ai.description}</p>}
                    </div>
                  </div>
                ))}
                {actionItems.length === 0 && <p className="text-sm text-gray-500 text-center py-4 italic">No action items assigned yet.</p>}
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-6"><Activity className="w-5 h-5 text-orange-500" /> Activity Log</h2>
              <div className="space-y-0">
                {timeline.map((event, idx) => (
                  <div key={idx} className="relative pl-6 border-l-2 border-gray-200 last:border-l-0 pb-6 last:pb-0">
                    <div className="absolute w-3 h-3 bg-blue-600 rounded-full -left-[7px] top-1 ring-4 ring-white"></div>
                    <p className="text-xs font-bold text-blue-600 mb-1">{new Date(event.created_at).toLocaleDateString()} at {new Date(event.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    <p className="text-sm font-bold text-gray-900">{event.event}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{event.description}</p>
                  </div>
                ))}
                {timeline.length === 0 && <p className="text-sm text-gray-500 text-center py-4 italic">No recent activity.</p>}
              </div>
            </div>

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
