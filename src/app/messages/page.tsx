"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabase/client";
import { getMyConversations, getConversation, sendMessage } from "@/lib/actions/network";
import { MessageSquare, Send, Search, User2, ArrowLeft } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { Suspense } from "react";

function MessagesContent() {
  const searchParams = useSearchParams();
  const withParam = searchParams.get("with");

  const [userId, setUserId] = useState<string>("");
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeContact, setActiveContact] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadConversations = useCallback(async (uid: string) => {
    const res = await getMyConversations(uid);
    if (res.success) setConversations(res.data || []);
    setLoadingConvs(false);
  }, []);

  const openConversation = useCallback(async (contact: any, uid: string) => {
    setActiveContact(contact);
    setLoadingMsgs(true);
    const res = await getConversation(uid, contact.id);
    if (res.success) setMessages(res.data || []);
    setLoadingMsgs(false);
    window.dispatchEvent(new Event("messages-read"));
    setTimeout(scrollToBottom, 100);
  }, []);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      await loadConversations(user.id);

      // If ?with= param exists, auto-open that conversation
      if (withParam) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("id, full_name, email")
          .eq("id", withParam)
          .single();
        if (profile) openConversation(profile, user.id);
      }
    }
    init();
  }, [withParam, loadConversations, openConversation]);

  // Realtime subscription
  useEffect(() => {
    if (!userId || !activeContact) return;
    const ch = supabase.channel(`messages-rt-${Date.now()}-${Math.random()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "network_messages" }, async (payload) => {
        const msg = payload.new as any;
        if (
          (msg.sender_id === userId && msg.receiver_id === activeContact.id) ||
          (msg.sender_id === activeContact.id && msg.receiver_id === userId)
        ) {
          setMessages(prev => [...prev, msg]);
          setTimeout(scrollToBottom, 100);

          // If we received a message in the active conversation, mark it as read immediately
          if (msg.receiver_id === userId) {
            await getConversation(userId, activeContact.id);
            window.dispatchEvent(new Event("messages-read"));
          }
        }
        await loadConversations(userId);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, activeContact, loadConversations]);

  const handleSend = async () => {
    if (!newMsg.trim() || !activeContact || !userId || sending) return;
    setSending(true);
    const res = await sendMessage(userId, activeContact.id, newMsg.trim());
    if (res.success) {
      setNewMsg("");
      const updated = await getConversation(userId, activeContact.id);
      if (updated.success) setMessages(updated.data || []);
      await loadConversations(userId);
      setTimeout(scrollToBottom, 100);
    } else {
      alert(res.error);
    }
    setSending(false);
  };

  const formatTime = (ts: string) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const formatDate = (ts: string) => {
    const d = new Date(ts);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Today";
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString();
  };

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-0px)] overflow-hidden">

        {/* Sidebar: Conversations List */}
        <div className={`w-80 border-r border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-black/20 flex flex-col ${activeContact ? "hidden md:flex" : "flex"}`}>
          <div className="p-4 border-b border-slate-200 dark:border-white/10">
            <h2 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2 text-lg mb-3">
              <MessageSquare className="w-5 h-5 text-indigo-400" /> Messages
            </h2>
            <div className="flex items-center gap-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2">
              <Search className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <input className="bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none flex-1" placeholder="Search conversations..." />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingConvs ? (
              <div className="p-6 text-slate-500 text-sm text-center">Loading...</div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No conversations yet.
              </div>
            ) : conversations.map((conv, i) => (
              <button
                key={i}
                onClick={() => openConversation(conv.contact, userId)}
                className={`w-full p-4 flex items-center gap-3 border-b border-white/5 hover:bg-white dark:bg-white/5 transition-all text-left ${activeContact?.id === conv.contact.id ? "bg-indigo-500/10 border-l-2 border-l-indigo-500" : ""}`}
              >
                <div className="w-10 h-10 bg-indigo-500/20 border border-indigo-500/30 rounded-full flex items-center justify-center font-bold text-indigo-400 shrink-0 text-sm">
                  {conv.contact.full_name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{conv.contact.full_name}</p>
                    <p className="text-[10px] text-slate-500 shrink-0 ml-1">{formatDate(conv.lastMsg.created_at)}</p>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{conv.lastMsg.content}</p>
                </div>
                {conv.unread > 0 && (
                  <span className="w-5 h-5 bg-indigo-500 text-slate-900 dark:text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">
                    {conv.unread}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        {activeContact ? (
          <div className="flex-1 flex flex-col bg-black/10">
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 flex items-center gap-3">
              <button
                onClick={() => setActiveContact(null)}
                className="md:hidden text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white p-1 rounded"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-9 h-9 bg-indigo-500/20 border border-indigo-500/30 rounded-full flex items-center justify-center font-bold text-indigo-400 text-sm">
                {activeContact.full_name?.[0]}
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white">{activeContact.full_name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{activeContact.email}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingMsgs ? (
                <div className="text-center text-slate-500">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="text-center text-slate-500 py-12">
                  <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No messages yet. Say hello! 👋</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isMine = msg.sender_id === userId;
                  return (
                    <div key={i} className={`flex gap-3 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isMine ? "bg-indigo-600 text-slate-900 dark:text-white" : "bg-white/60 dark:bg-white/10 text-slate-600 dark:text-slate-300"}`}>
                        {isMine ? "Me" : activeContact.full_name?.[0]}
                      </div>
                      <div className={`max-w-[70%] ${isMine ? "items-end" : "items-start"} flex flex-col gap-1`}>
                        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isMine ? "bg-indigo-600 text-slate-900 dark:text-white rounded-tr-none" : "bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-200 rounded-tl-none"}`}>
                          {msg.content}
                        </div>
                        <p className="text-[10px] text-slate-500">{formatTime(msg.created_at)} {isMine && (msg.is_read ? "· Read" : "· Sent")}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-white dark:bg-white/5">
              <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-3">
                <input
                  type="text"
                  value={newMsg}
                  onChange={e => setNewMsg(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-slate-200 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={sending || !newMsg.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-slate-900 dark:text-white p-3 rounded-xl transition-all flex items-center justify-center"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex-1 hidden md:flex items-center justify-center flex-col gap-4 text-center">
            <div className="w-20 h-20 bg-indigo-500/10 border border-indigo-500/20 rounded-3xl flex items-center justify-center">
              <MessageSquare className="w-10 h-10 text-indigo-400 opacity-60" />
            </div>
            <p className="text-slate-900 dark:text-white font-bold text-lg">Select a conversation</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs">Choose a connection from the left panel to start messaging.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<DashboardLayout><div className="flex h-full items-center justify-center text-slate-900 dark:text-white">Loading...</div></DashboardLayout>}>
      <MessagesContent />
    </Suspense>
  );
}
