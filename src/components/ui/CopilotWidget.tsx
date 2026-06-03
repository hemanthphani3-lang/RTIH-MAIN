"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { queryCopilot } from "@/lib/actions/ai";
import { MessageSquare, X, Send, Bot, Sparkles, Loader2, Globe } from "lucide-react";
import { usePathname } from "next/navigation";

export default function CopilotWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [role, setRole] = useState<string>("Organization");
  const [messages, setMessages] = useState<{role: "user" | "ai", content: string}[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState("en");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (profile) setRole(profile.role);
    }
    loadRole();
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Don't show copilot on auth pages or public pages
  if (pathname === "/" || pathname === "/login" || pathname === "/register" || pathname.startsWith("/judge/")) {
    return null;
  }

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    const res = await queryCopilot(userMessage, role, language);
    
    setLoading(false);
    if (res.success) {
      setMessages(prev => [...prev, { role: "ai" as const, content: res.response || "I couldn't generate a response." }]);
    } else {
      setMessages(prev => [...prev, { role: "ai", content: "Sorry, I encountered an error. Please try again." }]);
    }
  };

  const getGreeting = () => {
    if (language === "te") return `నమస్కారం! నేను మీ ${role} AI అసిస్టెంట్ ని.`;
    if (language === "hi") return `नमस्ते! मैं आपका ${role} एआई सहायक हूँ।`;
    return `Hi! I'm your ${role} Copilot. How can I assist you today?`;
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-tr from-indigo-600 to-purple-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.5)] hover:scale-110 transition-all z-50 group border border-white/20"
        >
          <Sparkles className="w-6 h-6 text-white group-hover:animate-spin-slow" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-[#0b1121] border border-white/10 shadow-2xl rounded-2xl flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-5">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-white" />
              <div>
                <h3 className="font-bold text-white text-sm">Innovation Copilot</h3>
                <p className="text-[10px] text-indigo-200">{role} Mode</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select 
                value={language} 
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-black/20 text-white text-[10px] rounded px-1 py-0.5 border border-white/10 outline-none"
              >
                <option value="en">English</option>
                <option value="te">తెలుగు</option>
                <option value="hi">हिंदी</option>
              </select>
              <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/40">
            {/* Initial Greeting */}
            {messages.length === 0 && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="bg-white/5 border border-white/10 text-slate-300 p-3 rounded-2xl rounded-tl-none text-sm leading-relaxed">
                  {getGreeting()}
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === "user" 
                    ? "bg-slate-700/50 border border-white/10" 
                    : "bg-indigo-500/20 border border-indigo-500/30"
                }`}>
                  {msg.role === "user" ? <UserIcon /> : <Bot className="w-4 h-4 text-indigo-400" />}
                </div>
                <div className={`p-3 rounded-2xl text-sm leading-relaxed max-w-[80%] ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white rounded-tr-none"
                    : "bg-white/5 border border-white/10 text-slate-300 rounded-tl-none"
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="bg-white/5 border border-white/10 text-slate-400 p-3 rounded-2xl rounded-tl-none text-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="p-3 bg-white/5 border-t border-white/10 flex gap-2 shrink-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Copilot..."
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <button 
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white p-2 rounded-xl transition-colors flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      )}
    </>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-slate-300">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  );
}
