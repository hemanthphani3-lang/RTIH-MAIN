"use server";

import { supabaseAdmin } from "../supabase/server";

export async function searchProfiles(filters: { query?: string, type?: string, stage?: string }) {
  try {
    let results: any[] = [];
    
    if (!filters.type || filters.type === 'all' || filters.type === 'Organization') {
      let q = supabaseAdmin.from("organizations").select("id, founder_id, name, stage, domain_id, status");
      if (filters.stage) q = q.eq("stage", filters.stage);
      if (filters.query) q = q.ilike("name", `%${filters.query}%`);
      const { data } = await q;
      if (data) results = [...results, ...data.map(d => ({ ...d, _type: 'Organization' }))];
    }

    if (!filters.type || filters.type === 'all' || filters.type === 'Mentor') {
      let q = supabaseAdmin.from("mentors").select("id, user_id, bio, expertise, availability_status, user_profiles!mentors_user_id_fkey(full_name)");
      const { data } = await q;
      if (data) results = [...results, ...data.map(d => ({ ...d, _type: 'Mentor' }))];
    }

    return { success: true, data: results };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getPublicProfile(userId: string) {
  try {
    const { data: profile } = await supabaseAdmin.from("user_profiles").select("*").eq("id", userId).single();
    if (!profile) throw new Error("Not found");
    let ext = {};
    if (profile.role === 'Organization') {
      const { data } = await supabaseAdmin.from("organizations").select("*").eq("founder_id", userId).single();
      ext = { org_details: data };
    } else if (profile.role === 'Mentor') {
      const { data } = await supabaseAdmin.from("mentors").select("*").eq("user_id", userId).single();
      ext = { mentor_details: data };
    }
    return { success: true, data: { ...profile, ...ext } };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getPublicConnectionCount(userId: string) {
  try {
    const { count } = await supabaseAdmin.from("network_connections")
      .select("*", { count: 'exact', head: true })
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq("status", "Accepted");
    return { success: true, count: count || 0 };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getMyConnections(userId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from("network_connections")
      .select(`
        *,
        sender:sender_id(id, full_name, role, email),
        receiver:receiver_id(id, full_name, role, email)
      `)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

    if (error) throw new Error(error.message);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getConnectionStatus(userId: string, otherUserId: string) {
  try {
    const { data, error } = await supabaseAdmin.from("network_connections")
      .select("*")
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
      .maybeSingle();

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function sendConnectionRequest(senderId: string, receiverId: string) {
  try {
    const { error } = await supabaseAdmin.from("network_connections").insert({
      sender_id: senderId,
      receiver_id: receiverId,
      status: 'Pending'
    });
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function respondToConnection(connectionId: string, status: string) {
  try {
    const { error } = await supabaseAdmin.from("network_connections").update({ status }).eq("id", connectionId);
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateProfile(userId: string, type: string, payload: any) {
  try {
    if (type === 'Organization') {
      await supabaseAdmin.from("organizations").update(payload).eq("founder_id", userId);
    } else if (type === 'Mentor') {
      await supabaseAdmin.from("mentors").update(payload).eq("user_id", userId);
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getMyConversations(userId: string) {
  try {
    const { data: messages, error } = await supabaseAdmin.from("network_messages")
      .select(`
        *,
        sender:sender_id(id, full_name, email),
        receiver:receiver_id(id, full_name, email)
      `)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    const convosMap = new Map();
    for (const msg of (messages || [])) {
      const contact = msg.sender_id === userId ? msg.receiver : msg.sender;
      if (!convosMap.has(contact.id)) {
        convosMap.set(contact.id, {
          contact,
          lastMsg: msg,
          unread: msg.receiver_id === userId && !msg.is_read ? 1 : 0
        });
      } else {
        if (msg.receiver_id === userId && !msg.is_read) {
          convosMap.get(contact.id).unread += 1;
        }
      }
    }

    return { success: true, data: Array.from(convosMap.values()) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getConversation(userId: string, contactId: string) {
  try {
    const { data, error } = await supabaseAdmin.from("network_messages")
      .select("*")
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${userId})`)
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);

    await supabaseAdmin.from("network_messages")
      .update({ is_read: true })
      .eq("receiver_id", userId)
      .eq("sender_id", contactId)
      .eq("is_read", false);

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function sendMessage(senderId: string, receiverId: string, content: string) {
  try {
    const { data, error } = await supabaseAdmin.from("network_messages").insert({
      sender_id: senderId,
      receiver_id: receiverId,
      content,
      is_read: false
    }).select().single();

    if (error) throw new Error(error.message);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
