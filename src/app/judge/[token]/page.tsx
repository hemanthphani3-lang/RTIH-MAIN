"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getJudgeDataByToken, submitEvaluation } from "@/lib/actions/hackathons";
import { CheckCircle, Clock, FileText, PlayCircle, Code, Globe, Star, ChevronRight, XCircle, Users, Target } from "lucide-react";

export default function JudgePortal() {
  const params = useParams();
  const token = params.token as string;

  const [judge, setJudge] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [overview, setOverview] = useState<any>(null);
  const [problemStatements, setProblemStatements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [scores, setScores] = useState({ innovation: 0, feasibility: 0, impact: 0, market: 0, presentation: 0 });
  const [comments, setComments] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await getJudgeDataByToken(token);
      if (res.success) {
        setJudge(res.judge);
        setAssignments(res.assignments || []);
        setOverview(res.overview);
        setProblemStatements(res.problemStatements || []);
      } else {
        setError(res.error || "Failed to load judge profile. Link may be invalid.");
      }
      setLoading(false);
    }
    load();
  }, [token]);

  const handleScoreChange = (criteria: keyof typeof scores, val: string) => {
    let num = parseInt(val);
    if (isNaN(num)) num = 0;
    if (num > 20) num = 20; // Assuming 20 points per criteria = 100 total
    if (num < 0) num = 0;
    setScores((prev) => ({ ...prev, [criteria]: num }));
  };

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await submitEvaluation(judge.id, selectedSubmission.id, scores, comments);
    setSaving(false);
    if (res.success) {
      alert("Evaluation submitted successfully!");
      setAssignments((prev) =>
        prev.map((a) => (a.hackathon_submissions.id === selectedSubmission.id ? { ...a, status: "Evaluated" } : a))
      );
      setSelectedSubmission(null);
    } else {
      alert("Error: " + res.error);
    }
  };

  if (loading) return <div className="min-h-screen bg-black text-slate-900 dark:text-white flex items-center justify-center">Authenticating...</div>;
  if (error) return <div className="min-h-screen bg-black text-red-400 flex flex-col items-center justify-center gap-4"><XCircle className="w-12 h-12" />{error}</div>;

  return (
    <div className="min-h-screen bg-black text-slate-900 dark:text-white selection:bg-indigo-500/30">
      <div className="max-w-6xl mx-auto p-8">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-3xl p-8 mb-8">
          <h1 className="text-3xl font-extrabold mb-2 text-slate-900 dark:text-white">Judge Portal: {judge.hackathons.opportunities.title}</h1>
          <p className="text-slate-600 dark:text-slate-300">Welcome, <span className="font-bold text-indigo-400">{judge.name}</span>. Please review your assigned submissions below.</p>
        </div>

        {/* Hackathon Overview */}
        {overview && (
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-8 mb-8 animate-in fade-in zoom-in duration-500 delay-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white"><Target className="w-5 h-5 text-indigo-400" /> Problem Statements & Overview</h2>
              <div className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                <Users className="w-4 h-4" /> {overview.totalTeams} Total Teams Registered
              </div>
            </div>
            {problemStatements.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 text-sm">No problem statements have been defined yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {problemStatements.map((ps) => {
                  const teamsOnThis = overview.submissions.filter((s: any) => s.problem_statement_id === ps.id);
                  return (
                    <div key={ps.id} className="bg-slate-200 dark:bg-black/40 border border-white/5 rounded-2xl p-5 hover:bg-white dark:bg-white/5 transition-all">
                      <h3 className="font-bold text-slate-900 dark:text-white mb-2">{ps.title}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">{ps.description}</p>
                      
                      <div className="border-t border-slate-200 dark:border-white/10 pt-3">
                        <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">Teams Working On This ({teamsOnThis.length})</p>
                        {teamsOnThis.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {teamsOnThis.map((sub: any) => (
                              <span key={sub.id} className="text-xs bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 px-2 py-1 rounded-md">
                                {sub.hackathon_teams?.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500">No teams have submitted yet.</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Submissions List */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-indigo-400" /> Assigned Projects</h2>
            {assignments.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400">No projects assigned yet.</p>
            ) : (
              assignments.map((assignment) => {
                const sub = assignment.hackathon_submissions;
                const isSelected = selectedSubmission?.id === sub.id;
                return (
                  <div
                    key={assignment.id}
                    onClick={() => {
                      setSelectedSubmission(sub);
                      setScores({ innovation: 0, feasibility: 0, impact: 0, market: 0, presentation: 0 });
                      setComments("");
                    }}
                    className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                      isSelected ? "bg-indigo-500/20 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]" : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 hover:bg-white/60 dark:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{sub.hackathon_teams?.name}</span>
                      {assignment.status === "Evaluated" ? (
                        <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Done</span>
                      ) : (
                        <span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">{sub.title}</h3>
                    <p className="text-xs text-indigo-400 flex items-center gap-1 group-hover:gap-2 transition-all">Evaluate <ChevronRight className="w-3 h-3" /></p>
                  </div>
                );
              })
            )}
          </div>

          {/* Evaluation Area */}
          <div className="lg:col-span-2">
            {selectedSubmission ? (
              <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-8 animate-in fade-in zoom-in-95">
                <div className="mb-8 pb-8 border-b border-slate-200 dark:border-white/10">
                  <h2 className="text-3xl font-extrabold mb-2">{selectedSubmission.title}</h2>
                  <p className="text-sm font-bold text-indigo-400 mb-6 uppercase tracking-widest">{selectedSubmission.hackathon_problem_statements?.title}</p>
                  <p className="text-slate-600 dark:text-slate-300 mb-6">{selectedSubmission.description}</p>
                  
                  <div className="flex flex-wrap gap-4">
                    {selectedSubmission.github_url && (
                      <a href={selectedSubmission.github_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-white/60 dark:bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-sm font-bold transition-colors">
                        <Code className="w-4 h-4" /> GitHub
                      </a>
                    )}
                    {selectedSubmission.demo_url && (
                      <a href={selectedSubmission.demo_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 px-4 py-2 rounded-xl text-sm font-bold transition-colors">
                        <Globe className="w-4 h-4" /> Live Demo
                      </a>
                    )}
                    {selectedSubmission.pitch_deck_url && (
                      <a href={selectedSubmission.pitch_deck_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-white/60 dark:bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-sm font-bold transition-colors">
                        <FileText className="w-4 h-4" /> Pitch Deck
                      </a>
                    )}
                    {selectedSubmission.video_url && (
                      <a href={selectedSubmission.video_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-white/60 dark:bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-sm font-bold transition-colors">
                        <PlayCircle className="w-4 h-4" /> Video Pitch
                      </a>
                    )}
                  </div>
                </div>

                <form onSubmit={handleEvaluate} className="space-y-6">
                  <h3 className="text-xl font-bold flex items-center gap-2 mb-4"><Star className="w-5 h-5 text-[#FFD700]" /> Evaluation Form</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {['innovation', 'feasibility', 'impact', 'market', 'presentation'].map((criteria) => (
                      <div key={criteria} className="bg-slate-200 dark:bg-black/40 p-4 rounded-2xl border border-white/5">
                        <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-3 capitalize">{criteria} (0-20)</label>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          required
                          value={scores[criteria as keyof typeof scores]}
                          onChange={(e) => handleScoreChange(criteria as keyof typeof scores, e.target.value)}
                          className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    ))}
                  </div>
                  
                  <div className="bg-slate-200 dark:bg-black/40 p-4 rounded-2xl border border-white/5">
                    <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-3">Overall Comments & Feedback</label>
                    <textarea
                      required
                      rows={4}
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      placeholder="Provide constructive feedback for the team..."
                    />
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-white/10">
                    <div className="text-sm font-bold text-slate-500 dark:text-slate-400">
                      Total Score: <span className="text-2xl text-[#FFD700] ml-2">
                        {Object.values(scores).reduce((a, b) => a + b, 0)} / 100
                      </span>
                    </div>
                    <button
                      type="submit"
                      disabled={saving}
                      className="bg-indigo-600 hover:bg-indigo-500 text-slate-900 dark:text-white px-8 py-3 rounded-xl font-bold transition-all disabled:opacity-50"
                    >
                      {saving ? "Submitting..." : "Submit Evaluation"}
                    </button>
                  </div>
                </form>

              </div>
            ) : (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-slate-500 border border-white/5 border-dashed rounded-3xl bg-white/[0.02]">
                <FileText className="w-16 h-16 mb-4 opacity-20" />
                <p className="font-bold">Select a project to begin evaluation.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
