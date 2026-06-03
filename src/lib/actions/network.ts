"use server";

import { supabaseAdmin } from "@/lib/supabase/server";

// ==========================================
// PROFILE DISCOVERY
// ==========================================

export async function searchProfiles(filters: {
  query?: string;
  type?: "Organization" | "Mentor" | "Manager" | "all";
  domain?: string;
  location?: string;
  stage?: string;
}) {
  try {
    const results: any[] = [];

    const searchTerm = filters.query?.trim() || "";

    // Search Organizations
    if (!filters.type || filters.type === "Organization" || filters.type === "all") {
      let q = supabaseAdmin
        .from("organizations")
        .select("id, name, description, stage, website, created_at, founder_id, domains:domains!primary_domain_id(name)");

      if (searchTerm) q = q.ilike("name", `%${searchTerm}%`);
      if (filters.stage) q = q.eq("stage", filters.stage);

      const { data, error } = await q.limit(20);
      if (error) console.error("Search Organizations error:", error);
      if (data) {
        const founderIds = data.map((o: any) => o.founder_id).filter(Boolean);
        let profiles: any[] = [];
        if (founderIds.length > 0) {
          const { data: pData } = await supabaseAdmin
            .from("user_profiles")
            .select("id, full_name")
            .in("id", founderIds);
          if (pData) profiles = pData;
        }

        results.push(...data.map((o: any) => ({
          ...o,
          _type: "Organization",
          _domain: o.domains?.name,
          user_profiles: profiles.find(p => p.id === o.founder_id) || { full_name: "Unknown" }
        })));
      }
    }

    // Search Mentors
    if (!filters.type || filters.type === "Mentor" || filters.type === "all") {
      let q = supabaseAdmin
        .from("mentors")
        .select("id, user_id, location, mentor_domains(domains(name))");

      // We can't ilike on full_name easily through an implicit join if foreign keys don't strictly align, 
      // but we can ilike on location or simply fetch and merge
      if (searchTerm) q = q.ilike("location", `%${searchTerm}%`);

      const { data, error } = await q.limit(20);
      if (error) console.error("Search Mentors error:", error);

      if (data) {
        const userIds = data.map((m: any) => m.user_id).filter(Boolean);
        let profiles: any[] = [];
        if (userIds.length > 0) {
          const { data: pData } = await supabaseAdmin
            .from("user_profiles")
            .select("id, full_name, email")
            .in("id", userIds);
          if (pData) profiles = pData;
        }

        results.push(...data.map((m: any) => ({
          ...m,
          _type: "Mentor",
          _domains: m.mentor_domains?.map((md: any) => md.domains?.name).filter(Boolean),
          user_profiles: profiles.find(p => p.id === m.user_id) || { full_name: "Unknown" }
        })));
      }
    }

    // Search Managers
    if (!filters.type || filters.type === "Manager" || filters.type === "all") {
      const { data, error } = await supabaseAdmin
        .from("managers")
        .select("id, user_id, location")
        .limit(20);
      if (error) console.error("Search Managers error:", error);

      if (data) {
        const userIds = data.map((m: any) => m.user_id).filter(Boolean);
        let profiles: any[] = [];
        if (userIds.length > 0) {
          const { data: pData } = await supabaseAdmin
            .from("user_profiles")
            .select("id, full_name, email")
            .in("id", userIds);
          if (pData) profiles = pData;
        }

        results.push(...data.map((m: any) => ({
          ...m,
          _type: "Manager",
          user_profiles: profiles.find(p => p.id === m.user_id) || { full_name: "Unknown" }
        })));
      }
    }

    return { success: true, data: results };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getPublicProfile(userId: string) {
  try {
    // Check what type this user is
    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("id, full_name, email, roles(name)")
      .eq("id", userId)
      .single();

    if (!profile) throw new Error("Profile not found");

    const role = (profile.roles as any)?.name;
    let extra: any = {};

    if (role === "Organization") {
      const { data: org } = await supabaseAdmin
        .from("organizations")
        .select("id, name, description, stage, website, domains(name), certificates(certificate_type, issue_date)")
        .eq("founder_id", userId)
        .single();
      extra = { org };
    } else if (role === "Mentor") {
      const { data: mentor } = await supabaseAdmin
        .from("mentors")
        .select("id, location, mentor_domains(domains(name))")
        .eq("user_id", userId)
        .single();
      extra = { mentor };
    } else if (role === "Manager") {
      const { data: manager } = await supabaseAdmin
        .from("managers")
        .select("id, location")
        .eq("user_id", userId)
        .single();
      extra = { manager };
    }

    return { success: true, data: { profile, role, ...extra } };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateProfile(userId: string, updates: {
  full_name?: string;
  org_name?: string;
  description?: string;
  website?: string;
  stage?: string;
}) {
  try {
    // 1. Update user profile name
    if (updates.full_name) {
      const { error } = await supabaseAdmin
        .from("user_profiles")
        .update({ full_name: updates.full_name })
        .eq("id", userId);
      if (error) throw error;
    }

    // 2. Update organization details
    const orgUpdates: any = {};
    if (updates.org_name) orgUpdates.name = updates.org_name;
    if (updates.description) orgUpdates.description = updates.description;
    if (updates.website !== undefined) orgUpdates.website = updates.website;
    if (updates.stage) orgUpdates.stage = updates.stage;

    if (Object.keys(orgUpdates).length > 0) {
      const { error } = await supabaseAdmin
        .from("organizations")
        .update(orgUpdates)
        .eq("founder_id", userId);
      if (error) throw error;
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ==========================================
// CONNECTIONS
// ==========================================

export async function sendConnectionRequest(senderId: string, receiverId: string) {
  try {
    // Check if connection already exists
    const { data: existing } = await supabaseAdmin
      .from("network_connections")
      .select("id, status")
      .or(`and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`)
      .single();

    if (existing) {
      return { success: false, error: `Connection already exists with status: ${existing.status}` };
    }

    const { data, error } = await supabaseAdmin
      .from("network_connections")
      .insert({ sender_id: senderId, receiver_id: receiverId, status: "Pending" })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Log metric
    await supabaseAdmin.from("network_metrics").insert({ user_id: senderId, metric_type: "connection_sent" });

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function respondToConnection(connectionId: string, status: "Accepted" | "Rejected") {
  try {
    const { data, error } = await supabaseAdmin
      .from("network_connections")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", connectionId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    if (status === "Accepted") {
      await supabaseAdmin.from("network_metrics").insert({ user_id: data.receiver_id, metric_type: "connection_accepted" });
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getMyConnections(userId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from("network_connections")
      .select("id, status, created_at, updated_at, sender_id, receiver_id")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("updated_at", { ascending: false });

    if (error) throw new Error(error.message);

    if (!data || data.length === 0) return { success: true, data: [] };

    // Fetch user details for all senders and receivers
    const userIds = [...new Set(data.flatMap(c => [c.sender_id, c.receiver_id]))];
    
    // We fetch user_profiles (with roles)
    const { data: users } = await supabaseAdmin
      .from("user_profiles")
      .select("id, full_name, email, roles(name)")
      .in("id", userIds);

    // Also fetch organizations if any users are founders
    const { data: orgs } = await supabaseAdmin
      .from("organizations")
      .select("founder_id, name, stage, description")
      .in("founder_id", userIds);

    const orgMap = (orgs || []).reduce((acc: any, o: any) => {
      acc[o.founder_id] = o;
      return acc;
    }, {});

    const usersMap = (users || []).reduce((acc: any, u: any) => {
      acc[u.id] = {
        ...u,
        role: (u.roles as any)?.name,
        org_name: orgMap[u.id]?.name || null,
        stage: orgMap[u.id]?.stage || null,
        description: orgMap[u.id]?.description || null,
      };
      return acc;
    }, {});

    const enriched = data.map(c => ({
      ...c,
      sender: usersMap[c.sender_id] || { id: c.sender_id },
      receiver: usersMap[c.receiver_id] || { id: c.receiver_id }
    }));

    return { success: true, data: enriched };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getPublicConnectionCount(userId: string) {
  try {
    const { count, error } = await supabaseAdmin
      .from("network_connections")
      .select("id", { count: "exact", head: true })
      .eq("status", "Accepted")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
    if (error) throw new Error(error.message);
    return { success: true, count: count || 0 };
  } catch (err: any) {
    return { success: false, error: err.message, count: 0 };
  }
}

export async function getConnectionStatus(userId: string, otherUserId: string) {
  try {
    const { data } = await supabaseAdmin
      .from("network_connections")
      .select("id, status, sender_id")
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
      .maybeSingle();

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ==========================================
// DIRECT MESSAGING
// ==========================================

export async function sendMessage(senderId: string, receiverId: string, content: string) {
  try {
    // Verify they are connected
    const { data: conn } = await supabaseAdmin
      .from("network_connections")
      .select("id")
      .eq("status", "Accepted")
      .or(`and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`)
      .maybeSingle();

    if (!conn) throw new Error("You must be connected to send messages.");

    const { data, error } = await supabaseAdmin
      .from("network_messages")
      .insert({ sender_id: senderId, receiver_id: receiverId, content, is_read: false })
      .select()
      .single();

    if (error) throw new Error(error.message);

    await supabaseAdmin.from("network_metrics").insert({ user_id: senderId, metric_type: "message_sent" });

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getConversation(userId: string, otherUserId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from("network_messages")
      .select("id, sender_id, receiver_id, content, is_read, created_at")
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);

    // Mark messages as read
    await supabaseAdmin
      .from("network_messages")
      .update({ is_read: true })
      .eq("sender_id", otherUserId)
      .eq("receiver_id", userId)
      .eq("is_read", false);

    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getMyConversations(userId: string) {
  try {
    // 1. Get all messages
    const { data: messagesData, error: msgError } = await supabaseAdmin
      .from("network_messages")
      .select("id, sender_id, receiver_id, content, is_read, created_at")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    // 2. Get all accepted connections
    const { data: connData, error: connError } = await supabaseAdmin
      .from("network_connections")
      .select("id, sender_id, receiver_id, created_at")
      .eq("status", "Accepted")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

    const msgs = messagesData || [];
    const conns = connData || [];

    // Collect all unique user IDs involved
    const userIds = [...new Set([
      ...msgs.flatMap(m => [m.sender_id, m.receiver_id]),
      ...conns.flatMap(c => [c.sender_id, c.receiver_id])
    ])].filter(id => id !== userId); // Only need other users

    // Fetch user profiles for resolution
    const { data: users } = await supabaseAdmin
      .from("user_profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    const usersMap = (users || []).reduce((acc: any, u: any) => {
      acc[u.id] = u;
      return acc;
    }, {});

    const convMap = new Map<string, any>();

    // First, populate all accepted connections with an empty message
    for (const c of conns) {
      const otherId = c.sender_id === userId ? c.receiver_id : c.sender_id;
      if (!usersMap[otherId]) continue;
      
      convMap.set(otherId, {
        contact: usersMap[otherId],
        lastMsg: { content: "Connected! Say hi 👋", created_at: c.created_at },
        unread: 0
      });
    }

    // Now overwrite with actual messages if they exist
    for (const msg of msgs) {
      const otherId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
      if (!usersMap[otherId]) continue;

      const existing = convMap.get(otherId);
      const isNewer = !existing || new Date(msg.created_at) > new Date(existing.lastMsg.created_at);
      
      // If no existing connection entry, or this message is newer
      if (!existing || isNewer) {
        convMap.set(otherId, {
          contact: usersMap[otherId],
          lastMsg: msg,
          unread: (msg.receiver_id === userId && !msg.is_read) ? 1 : 0
        });
      } else {
        // Just increment unread if applicable
        if (msg.receiver_id === userId && !msg.is_read) {
          existing.unread = (existing.unread || 0) + 1;
        }
      }
    }

    return { 
      success: true, 
      data: Array.from(convMap.values()).sort((a, b) => new Date(b.lastMsg.created_at).getTime() - new Date(a.lastMsg.created_at).getTime()) 
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ==========================================
// AI COLLABORATION SUGGESTIONS
// ==========================================

export async function generateCollaborationSuggestions(userId: string) {
  try {
    // Get user's profile and domain
    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("roles(name)")
      .eq("id", userId)
      .single();

    const role = (profile?.roles as any)?.name;
    const suggestions: any[] = [];

    if (role === "Organization") {
      const { data: org } = await supabaseAdmin
        .from("organizations")
        .select("domain_id, stage, domains(name)")
        .eq("founder_id", userId)
        .single();

      if (org) {
        // Find mentors in same domain
        const { data: mentors } = await supabaseAdmin
          .from("mentors")
          .select("user_id, user_profiles!user_id(id, full_name)")
          .eq("mentor_domains.domain_id", org.domain_id)
          .limit(5);

        // Find orgs in same domain (potential collaborators)
        const { data: peers } = await supabaseAdmin
          .from("organizations")
          .select("founder_id, name, stage, user_profiles!founder_id(id, full_name)")
          .eq("domain_id", org.domain_id)
          .neq("founder_id", userId)
          .eq("status", "Approved")
          .limit(5);

        for (const m of (mentors || [])) {
          suggestions.push({
            suggested_user_id: (m.user_profiles as any)?.id,
            reason: `Mentor in your domain: ${(org.domains as any)?.name}`,
            score: 90
          });
        }
        for (const p of (peers || [])) {
          suggestions.push({
            suggested_user_id: (p.user_profiles as any)?.id,
            reason: `${p.name} is also a ${p.stage} startup in ${(org.domains as any)?.name}`,
            score: 75
          });
        }
      }
    }

    // Store suggestions
    for (const s of suggestions) {
      if (!s.suggested_user_id) continue;
      await supabaseAdmin
        .from("network_ai_recommendations")
        .upsert({ user_id: userId, ...s }, { onConflict: "user_id,suggested_user_id" });
    }

    return { success: true, count: suggestions.length };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getCollaborationSuggestions(userId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from("network_ai_recommendations")
      .select("id, reason, score, suggested_user:suggested_user_id(id, full_name, email)")
      .eq("user_id", userId)
      .eq("is_dismissed", false)
      .order("score", { ascending: false })
      .limit(6);

    if (error) throw new Error(error.message);
    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function dismissSuggestion(id: string) {
  try {
    await supabaseAdmin.from("network_ai_recommendations").update({ is_dismissed: true }).eq("id", id);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getNetworkStats(userId: string) {
  try {
    const { data: connections } = await supabaseAdmin
      .from("network_connections")
      .select("id, status")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

    const accepted = connections?.filter(c => c.status === "Accepted").length || 0;
    const pending = connections?.filter(c => c.status === "Pending").length || 0;

    const { count: messageCount } = await supabaseAdmin
      .from("network_messages")
      .select("id", { count: "exact", head: true })
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

    const { count: unreadCount } = await supabaseAdmin
      .from("network_messages")
      .select("id", { count: "exact", head: true })
      .eq("receiver_id", userId)
      .eq("is_read", false);

    return { success: true, data: { accepted, pending, messageCount: messageCount || 0, unreadCount: unreadCount || 0 } };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
