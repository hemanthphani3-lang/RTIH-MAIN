"use client";

import { use, useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabase/client";
import { getPublicProfile, sendConnectionRequest, getConnectionStatus, getMyConnections, respondToConnection, getPublicConnectionCount, updateProfile } from "@/lib/actions/network";
import {
  ArrowLeft, Building2, UserCheck, Briefcase, Globe, MapPin, Award,
  UserPlus, MessageSquare, Check, Clock, X, Sparkles, Calendar,
  Users, Network, Pencil, Save, ShieldCheck, Activity, Target
} from "lucide-react";
import Link from "next/link";
import { STAGE_CONFIG, STAGE_BADGES, VentureStage } from "@/lib/milestones-config";

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [data, setData] = useState<any>(null);
  const [connStatus, setConnStatus] = useState<any>(null);
  const [connections, setConnections] = useState<any[]>([]);
  const [publicConnectionCount, setPublicConnectionCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [reviewProfileId, setReviewProfileId] = useState<string | null>(null);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: "",
    org_name: "",
    description: "",
    website: "",
    stage: ""
  });

  // Resolve "me" → real user id
  const [resolvedId, setResolvedId] = useState<string>("");

  const loadProfile = useCallback(async (uid: string, pid: string) => {
    const res = await getPublicProfile(pid);
    if (res.success) {
      setData(res.data);
      // Pre-fill edit form
      setEditForm({
        full_name: res.data.profile?.full_name || "",
        org_name: res.data.org?.name || "",
        description: res.data.org?.description || "",
        website: res.data.org?.website || "",
        stage: res.data.org?.stage || ""
      });
    }

    if (pid !== uid) {
      const connRes = await getConnectionStatus(uid, pid);
      if (connRes.success) setConnStatus(connRes.data);
      
      const countRes = await getPublicConnectionCount(pid);
      if (countRes.success) setPublicConnectionCount(countRes.count);
    } else {
      // Own profile — load connections
      const connList = await getMyConnections(uid);
      if (connList.success) setConnections(connList.data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);
      const pid = id === "me" ? user.id : id;
      setResolvedId(pid);
      await loadProfile(user.id, pid);
    }
    init();
  }, [id, loadProfile]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    const res = await updateProfile(currentUserId, editForm);
    if (res.success) {
      await loadProfile(currentUserId, resolvedId);
      setIsEditing(false);
    } else {
      alert("Failed to update profile: " + res.error);
    }
    setIsSaving(false);
  };

  const handleConnect = async () => {
    if (!currentUserId) return;
    setConnecting(true);
    const res = await sendConnectionRequest(currentUserId, resolvedId);
    if (res.success) setConnStatus({ status: "Pending", sender_id: currentUserId });
    else alert(res.error);
    setConnecting(false);
  };

  const handleRespond = async (connId: string, status: "Accepted" | "Rejected") => {
    const res = await respondToConnection(connId, status);
    if (!res.success) {
      alert("Failed to respond: " + res.error);
      return;
    }
    const connList = await getMyConnections(currentUserId);
    if (connList.success) setConnections(connList.data || []);
  };

  const isSelf = resolvedId === currentUserId;
  const accepted = connections.filter(c => c.status === "Accepted");
  const pending = connections.filter(c => c.status === "Pending" && (c.receiver as any)?.id === currentUserId);
  const sent = connections.filter(c => c.status === "Pending" && (c.sender as any)?.id === currentUserId);

  const getContact = (conn: any) => {
    const isSender = (conn.sender as any)?.id === currentUserId;
    return isSender ? conn.receiver : conn.sender;
  };

  if (loading) return <DashboardLayout><div className="p-8 text-slate-900 dark:text-white text-center">Loading profile...</div></DashboardLayout>;
  if (!data) return <DashboardLayout><div className="p-8 text-slate-900 dark:text-white text-center">Profile not found.</div></DashboardLayout>;

  const { profile, role, org, mentor, manager } = data;

  // Calculate Earned Badges based on Verified Stage
  let earnedBadges: any[] = [];
  if (role === "Organization" && org?.verified_stage) {
    const currentConfig = STAGE_CONFIG.find(s => s.stage === org.verified_stage);
    if (currentConfig) {
      const currentSeq = currentConfig.sequence;
      // You earn the badge for the stage you completed (previous stages).
      // Or we can just award all badges up to the previous stage sequence.
      earnedBadges = STAGE_CONFIG
        .filter(s => s.sequence < currentSeq)
        .map(s => ({ ...s, name: STAGE_BADGES[s.stage as VentureStage].name, icon: STAGE_BADGES[s.stage as VentureStage].icon }));
    }
  }

  const getRoleBg = () => {
    if (role === "Organization") return "from-indigo-500/20 to-indigo-500/5 border-indigo-500/30";
    if (role === "Mentor") return "from-green-500/20 to-green-500/5 border-green-500/30";
    return "from-yellow-500/20 to-yellow-500/5 border-yellow-500/30";
  };

  const getRoleIcon = () => {
    if (role === "Organization") return <Building2 className="w-6 h-6 text-indigo-400" />;
    if (role === "Mentor") return <UserCheck className="w-6 h-6 text-green-400" />;
    return <Briefcase className="w-6 h-6 text-yellow-400" />;
  };

  const renderAction = () => {
    if (isSelf) return null;
    if (!connStatus) return (
      <button onClick={handleConnect} disabled={connecting}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-slate-900 dark:text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all">
        <UserPlus className="w-4 h-4" /> {connecting ? "Sending..." : "Connect"}
      </button>
    );
    if (connStatus.status === "Pending") return (
      <span className="flex items-center gap-2 text-yellow-400 font-bold text-sm bg-yellow-500/10 border border-yellow-500/20 px-4 py-2 rounded-xl">
        <Clock className="w-4 h-4" /> Request Pending
      </span>
    );
    if (connStatus.status === "Accepted") return (
      <Link href={`/messages?with=${resolvedId}`}
        className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-slate-900 dark:text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all">
        <MessageSquare className="w-4 h-4" /> Send Message
      </Link>
    );
    return null;
  };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">

        {!isSelf && (
          <Link href="/network" className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Network
          </Link>
        )}

        {/* Profile Hero */}
        <div className={`bg-gradient-to-r ${getRoleBg()} border rounded-3xl p-8 flex flex-col md:flex-row items-start md:items-center gap-6`}>
          <div className="w-20 h-20 bg-white/60 dark:bg-white/10 border border-slate-300 dark:border-white/20 rounded-2xl flex items-center justify-center text-3xl font-extrabold text-slate-900 dark:text-white shrink-0 shadow-lg">
            {profile.full_name?.[0]}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {getRoleIcon()}
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{role}</span>
              {isSelf && <span className="text-[10px] bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20 px-2 py-0.5 rounded font-bold">You</span>}
            </div>
            {isEditing ? (
              <div className="space-y-2 mt-2">
                <input
                  type="text"
                  placeholder="Full Name"
                  className="bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-bold w-full max-w-sm focus:border-indigo-500 focus:outline-none"
                  value={editForm.full_name}
                  onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                />
                {role === "Organization" && (
                  <input
                    type="text"
                    placeholder="Startup Name"
                    className="bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-bold text-xl w-full max-w-sm focus:border-indigo-500 focus:outline-none"
                    value={editForm.org_name}
                    onChange={e => setEditForm({ ...editForm, org_name: e.target.value })}
                  />
                )}
              </div>
            ) : (
              <>
                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {role === "Organization" ? org?.name : profile.full_name}
                </h1>
                {role === "Organization" && <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Founder: {profile.full_name}</p>}
              </>
            )}
          </div>
          <div className="shrink-0 flex flex-wrap gap-3 mt-4 md:mt-0">
            {isSelf ? (
              isEditing ? (
                <button onClick={handleSaveProfile} disabled={isSaving} className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-slate-900 dark:text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md">
                  <Save className="w-4 h-4" /> {isSaving ? "Saving..." : "Save Changes"}
                </button>
              ) : (
                <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 bg-white/60 dark:bg-white/10 hover:bg-white/20 text-slate-900 dark:text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all">
                  <Pencil className="w-4 h-4" /> Edit Profile
                </button>
              )
            ) : null}
            {isSelf && !isEditing && (
              <Link href="/network" className="flex items-center gap-2 border border-slate-200 dark:border-white/10 hover:bg-white/60 dark:bg-white/10 text-slate-900 dark:text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all">
                <Network className="w-4 h-4" /> Discover Network
              </Link>
            )}
            {renderAction()}
          </div>
        </div>

        {/* Social Proof & Metrics (Founder Only) */}
        {role === "Organization" && org && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#1e293b] border border-slate-200 dark:border-slate-700/50 rounded-2xl p-5 text-center shadow-lg">
              <ShieldCheck className="w-6 h-6 text-[#FFD700] mx-auto mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Current Stage</p>
              <p className="text-lg font-extrabold text-slate-900 dark:text-white">{org.verified_stage || org.stage}</p>
            </div>
            <div className="bg-[#1e293b] border border-slate-200 dark:border-slate-700/50 rounded-2xl p-5 text-center shadow-lg">
              <Activity className="w-6 h-6 text-pink-400 mx-auto mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Health Score</p>
              <p className="text-lg font-extrabold text-slate-900 dark:text-white">{org.health_score ?? "N/A"}</p>
            </div>
            <div className="bg-[#1e293b] border border-slate-200 dark:border-slate-700/50 rounded-2xl p-5 text-center shadow-lg">
              <Award className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Badges Earned</p>
              <p className="text-lg font-extrabold text-slate-900 dark:text-white">{earnedBadges.length}</p>
            </div>
            <div className="bg-[#1e293b] border border-slate-200 dark:border-slate-700/50 rounded-2xl p-5 text-center shadow-lg">
              <Target className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Milestones</p>
              <p className="text-lg font-extrabold text-slate-900 dark:text-white">{(org as any)?.completed_milestones || (earnedBadges.length * 8)}+</p>
            </div>
          </div>
        )}

        {/* Connection Stats */}
        {isSelf ? (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Connections", value: accepted.length, color: "text-indigo-400", bg: "bg-indigo-500/5", border: "border-indigo-500/10" },
              { label: "Pending Requests", value: pending.length, color: "text-yellow-400", bg: "bg-yellow-500/5", border: "border-yellow-500/10" },
              { label: "Sent", value: sent.length, color: "text-slate-500 dark:text-slate-400", bg: "bg-white dark:bg-white/5", border: "border-slate-200 dark:border-white/10" },
            ].map(({ label, value, color, bg, border }) => (
              <div key={label} className={`${bg} border ${border} rounded-2xl p-5 text-center shadow-sm`}>
                <p className={`text-3xl font-extrabold ${color}`}>{value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-bold">{label}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 flex items-center justify-center gap-4">
            <Users className="w-6 h-6 text-indigo-400" />
            <div className="text-left">
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{publicConnectionCount}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Connections</p>
            </div>
          </div>
        )}

        {/* Founder Achievements */}
        {role === "Organization" && org && (
          <div className="bg-gradient-to-br from-[#0f172a] to-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-[#FFD700]" /> Founder Achievements
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Stage Badges</h3>
                {earnedBadges.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {earnedBadges.map((b, i) => (
                      <div key={i} className={`bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-center transition-all hover:-translate-y-1 hover:shadow-lg shadow-${b.color}-500/20`}>
                        <div className="text-4xl mb-2 filter drop-shadow-md">{b.icon}</div>
                        <p className="font-extrabold text-slate-900 dark:text-white text-sm">{b.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{b.stage} Complete</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-100 dark:bg-black/20 border border-white/5 rounded-2xl p-8 text-center">
                    <Target className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-bold">Complete your first stage to earn a badge!</p>
                  </div>
                )}
              </div>

              {org.certificates?.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Ecosystem Certifications</h3>
                  <div className="space-y-2">
                    {org.certificates.map((cert: any, i: number) => (
                      <div key={i} className="flex items-center justify-between bg-white dark:bg-black/30 border border-white/5 rounded-xl px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Award className="w-5 h-5 text-indigo-400" />
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{cert.certificate_type}</p>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 bg-white dark:bg-white/5 px-2 py-1 rounded-md font-bold">
                          <Calendar className="w-3 h-3" /> {new Date(cert.issue_date).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Org Info */}
        {role === "Organization" && org && (
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-8 space-y-6">
            <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Startup Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-1 font-bold">Verified Stage</p>
                      <input type="text" className="bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white text-sm w-full focus:border-indigo-500 focus:outline-none"
                        value={editForm.stage} onChange={e => setEditForm({ ...editForm, stage: e.target.value })} disabled />
                      <p className="text-[10px] text-slate-500 mt-1">Stage can only be updated via milestones review.</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1 font-bold">Website</p>
                      <input type="text" className="bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white text-sm w-full focus:border-indigo-500 focus:outline-none"
                        value={editForm.website} onChange={e => setEditForm({ ...editForm, website: e.target.value })} />
                    </div>
                  </div>
                ) : (
                  <>
                    {org.stage && (
                      <div>
                        <p className="text-xs text-slate-500 font-bold mb-1">Declared Stage</p>
                        <p className="text-slate-900 dark:text-white font-semibold">{org.stage}</p>
                      </div>
                    )}
                    {org.domains?.name && (
                      <div>
                        <p className="text-xs text-slate-500 font-bold mb-1">Primary Domain</p>
                        <span className="text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 text-xs px-3 py-1 rounded-full font-bold">{org.domains.name}</span>
                      </div>
                    )}
                    {org.website && (
                      <div>
                        <p className="text-xs text-slate-500 font-bold mb-1">Website</p>
                        <a href={org.website} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 font-medium hover:underline text-sm flex items-center gap-1.5">
                          <Globe className="w-4 h-4" /> {org.website}
                        </a>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div>
                {isEditing ? (
                  <div>
                    <p className="text-xs text-slate-500 mb-1 font-bold">About the Venture</p>
                    <textarea className="bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-sm w-full min-h-[120px] focus:border-indigo-500 focus:outline-none"
                      value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
                  </div>
                ) : (
                  org.description && (
                    <div>
                      <p className="text-xs text-slate-500 font-bold mb-2">About the Venture</p>
                      <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{org.description}</p>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mentor Info */}
        {role === "Mentor" && mentor && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-8 space-y-4">
              <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Mentor Profile</h2>
              <div className="space-y-4">
                {mentor.bio && <div><p className="text-xs text-slate-500 font-bold mb-1">Bio</p><p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{mentor.bio}</p></div>}
                {mentor.location && <div><p className="text-xs text-slate-500 font-bold mb-1">Hub Location</p><p className="text-slate-900 dark:text-white font-semibold flex items-center gap-1.5"><MapPin className="w-4 h-4 text-blue-400" />{mentor.location}</p></div>}
                {mentor.experience_years && <div><p className="text-xs text-slate-500 font-bold mb-1">Experience</p><p className="text-slate-900 dark:text-white font-semibold">{mentor.experience_years} years</p></div>}
                <div>
                  <p className="text-xs text-slate-500 font-bold mb-1">Availability</p>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${mentor.availability_status === "Available" ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20"}`}>
                    {mentor.availability_status || "Not set"}
                  </span>
                </div>
              </div>
            </div>
            {mentor.mentor_domains?.length > 0 && (
              <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-8 space-y-4">
                <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2"><Sparkles className="w-4 h-4 text-green-400" /> Expertise Domains</h2>
                <div className="flex flex-wrap gap-2 mt-4">
                  {mentor.mentor_domains.map((md: any, i: number) => (
                    <span key={i} className="text-sm font-bold bg-green-500/10 text-green-400 border border-green-500/20 px-4 py-2 rounded-xl">{md.domains?.name}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Manager Info */}
        {role === "Manager" && manager && (
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-8 space-y-4">
            <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Manager Info</h2>
            {manager.location && <div><p className="text-xs text-slate-500 font-bold mb-1">Hub Location</p><p className="text-slate-900 dark:text-white font-semibold flex items-center gap-1.5"><MapPin className="w-4 h-4 text-yellow-400" />{manager.location} Incubation Hub</p></div>}
          </div>
        )}

        {/* ── CONNECTIONS SECTION (own profile only, LinkedIn-style) ── */}
        {isSelf && (
          <div className="space-y-6 pt-6">

            {/* Incoming Requests */}
            {pending.length > 0 && (
              <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-3xl overflow-hidden shadow-lg">
                <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UserPlus className="w-5 h-5 text-yellow-400" />
                    <h2 className="font-extrabold text-slate-900 dark:text-white text-lg">Pending Requests</h2>
                  </div>
                  <span className="bg-yellow-500/20 text-yellow-400 text-xs font-bold px-3 py-1 rounded-full">{pending.length} New</span>
                </div>
                <div className="divide-y divide-white/5">
                  {pending.map(conn => {
                    const contact = getContact(conn);
                    return (
                      <div key={conn.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-white dark:bg-white/5 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-indigo-500/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center font-bold text-indigo-400 text-2xl shrink-0 shadow-inner">
                            {(contact as any)?.full_name?.[0]}
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900 dark:text-white text-lg">
                              {(contact as any)?.role === "Organization" && (contact as any)?.org_name 
                                ? (contact as any)?.org_name 
                                : (contact as any)?.full_name}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                              {(contact as any)?.role === "Organization" && (contact as any)?.org_name 
                                ? `Founder: ${(contact as any)?.full_name} • ${(contact as any)?.email}`
                                : (contact as any)?.email}
                            </p>
                            <button onClick={() => setReviewProfileId((contact as any)?.id)} className="text-indigo-400 text-xs font-bold hover:text-indigo-300 transition-colors mt-2 flex items-center gap-1 bg-indigo-500/10 px-3 py-1 rounded-full">
                              Review Profile
                            </button>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button onClick={() => handleRespond(conn.id, "Accepted")}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-green-500/10 border border-green-500/30 hover:bg-green-500/20 text-green-400 px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-sm">
                            <Check className="w-4 h-4" /> Accept
                          </button>
                          <button onClick={() => handleRespond(conn.id, "Rejected")}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-sm">
                            <X className="w-4 h-4" /> Decline
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* My Connections Grid */}
            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-lg">
              <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-indigo-400" />
                  <h2 className="font-extrabold text-slate-900 dark:text-white text-lg">My Network</h2>
                </div>
                <span className="text-slate-500 dark:text-slate-400 text-sm font-bold">{accepted.length} Connections</span>
              </div>
              
              {accepted.length === 0 ? (
                <div className="p-16 text-center">
                  <Network className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-500 dark:text-slate-400 font-bold mb-2 text-lg">Your network is empty</p>
                  <Link href="/network" className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors inline-block bg-indigo-500/10 px-4 py-2 rounded-xl border border-indigo-500/20">
                    Browse the Ecosystem Network
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:gap-px bg-white dark:bg-white/5">
                  {accepted.map(conn => {
                    const contact = getContact(conn);
                    return (
                      <div key={conn.id} className="p-6 bg-[#0f172a] flex items-center justify-between hover:bg-slate-100 dark:bg-slate-800 transition-colors group">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center font-bold text-indigo-400 text-xl shrink-0 group-hover:scale-105 transition-transform">
                            {(contact as any)?.full_name?.[0]}
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900 dark:text-white">{(contact as any)?.full_name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{(contact as any)?.email}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Link href={`/profile/${(contact as any)?.id}`}
                            className="text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-white font-bold border border-slate-300 dark:border-slate-700 px-3 py-2 rounded-xl hover:bg-slate-700 transition-all shadow-sm">
                            Profile
                          </Link>
                          <Link href={`/messages?with=${(contact as any)?.id}`}
                            className="flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-slate-900 dark:text-white w-9 h-9 rounded-xl transition-all shadow-md shadow-indigo-900/20">
                            <MessageSquare className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sent Requests */}
            {sent.length > 0 && (
              <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden">
                <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center gap-3">
                  <UserPlus className="w-4 h-4 text-slate-500" />
                  <h2 className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">Sent Requests ({sent.length})</h2>
                </div>
                <div className="divide-y divide-white/5">
                  {sent.map(conn => {
                    const contact = getContact(conn);
                    return (
                      <div key={conn.id} className="px-6 py-4 flex items-center justify-between hover:bg-white dark:bg-white/5 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl flex items-center justify-center text-sm font-bold text-slate-500 dark:text-slate-400">
                            {(contact as any)?.full_name?.[0]}
                          </div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{(contact as any)?.full_name}</p>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 px-3 py-1.5 rounded-full uppercase tracking-widest">Awaiting Response</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {reviewProfileId && (() => {
        const reviewContact = connections.flatMap(c => [c.sender, c.receiver]).find(u => u.id === reviewProfileId);
        if (!reviewContact) return null;
        const role = reviewContact.role;
        const isOrg = role === "Organization";
        
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={() => setReviewProfileId(null)}>
            <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 w-full max-w-sm rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200 relative" onClick={e => e.stopPropagation()}>
              <button onClick={() => setReviewProfileId(null)} className="absolute top-4 right-4 p-2 hover:bg-white/60 dark:bg-white/10 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </button>
              
              <div className="flex flex-col items-center text-center mt-2">
                <div className="w-24 h-24 bg-gradient-to-tr from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center text-4xl font-extrabold text-slate-900 dark:text-white mb-5 shadow-[0_0_30px_rgba(99,102,241,0.3)]">
                  {reviewContact.full_name?.[0]}
                </div>
                
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-4 py-1.5 rounded-full mb-3 border border-indigo-500/20">
                  {role}
                </span>
                
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2 leading-tight">
                  {isOrg && reviewContact.org_name ? reviewContact.org_name : reviewContact.full_name}
                </h3>
                
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 font-medium">
                  {isOrg && reviewContact.org_name ? `Founder: ${reviewContact.full_name}` : reviewContact.email}
                </p>

                {(isOrg && reviewContact.stage) && (
                  <div className="mb-6">
                    <span className="text-xs font-bold px-4 py-1.5 bg-green-500/10 text-green-400 rounded-full border border-green-500/20 flex items-center gap-2 w-fit mx-auto">
                      <Target className="w-3.5 h-3.5" /> Stage: {reviewContact.stage}
                    </span>
                  </div>
                )}
                
                {(isOrg && reviewContact.description) && (
                  <div className="bg-white dark:bg-black/30 rounded-xl p-4 mb-6 border border-white/5 w-full">
                    <p className="text-sm text-slate-600 dark:text-slate-300 italic">
                      "{reviewContact.description}"
                    </p>
                  </div>
                )}

                <div className="w-full bg-white dark:bg-white/5 rounded-2xl p-4 border border-slate-200 dark:border-white/10 text-left">
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">Contact Email</p>
                  <p className="text-sm text-slate-900 dark:text-white font-medium break-all">{reviewContact.email}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </DashboardLayout>
  );
}
