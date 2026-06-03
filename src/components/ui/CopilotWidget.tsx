"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { askCopilot } from "@/lib/actions/copilot";
import { MessageSquare, X, Send, Bot, Sparkles, Loader2, Globe } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCopilotStore } from "@/lib/store/copilotStore";
import ReactMarkdown from 'react-markdown';

export default function CopilotWidget() {
  const pathname = usePathname();
  const { 
    isOpen, setIsOpen, 
    role, setRole, 
    entityId, setEntityId, 
    messages, addMessage, 
    language, setLanguage, 
    currentModule, setCurrentModule,
    initSession, logout
  } = useCopilotStore();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Derive Current Module from Pathname
  useEffect(() => {
    const parts = pathname.split('/').filter(Boolean);
    // Path structure is usually /[role]/[module]/...
    if (parts.length > 1) {
      setCurrentModule(parts[1]);
    } else if (parts.length === 1) {
      setCurrentModule("dashboard");
    }
  }, [pathname, setCurrentModule]);

  useEffect(() => {
    async function loadRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
         logout();
         return;
      }
      
      setEntityId(user.id);
      const { data: profile } = await supabase.from("user_profiles").select("roles(name)").eq("id", user.id).single();
      const rolesData = profile?.roles as any;
      
      let currentRole = "Organization";
      if (rolesData && rolesData.name) {
          currentRole = rolesData.name;
          setRole(currentRole);
      }
      
      initSession(user.id, currentRole);
    }
    loadRole();
  }, [setEntityId, setRole, initSession, logout]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Don't show copilot on auth pages or public pages
  if (pathname === "/" || pathname === "/login" || pathname === "/register" || pathname.startsWith("/judge/")) {
    return null;
  }

  const handleSend = async (e?: React.FormEvent, customInput?: string) => {
    e?.preventDefault();
    const userMessage = customInput || input.trim();
    if (!userMessage || loading) return;

    setInput("");
    addMessage({ role: "user", content: userMessage });
    setLoading(true);

    const safeRole = role.toLowerCase();
    const languageHint = language === 'te' ? '(Please reply in Telugu) ' : language === 'hi' ? '(Please reply in Hindi) ' : '';
    const prompt = languageHint + userMessage;

    // We will slice the last 10 messages for context to avoid token overflow
    const history = messages.slice(-10);

    // Send the query, but now we also pass the currentModule to the AI to help with context execution!
    const res = await askCopilot(prompt, safeRole, entityId, currentModule, history);
    
    setLoading(false);
    if (res.success) {
      addMessage({ role: "ai", content: res.data || "I couldn't generate a response." });
    } else {
      addMessage({ role: "ai", content: res.error || "Sorry, I encountered an error. Please try again." });
    }
  };

  const getGreeting = () => {
    if (language === "te") return `నమస్కారం. నేను RTIH ఇన్నోవేషన్ కోపిలట్‌ని. నేను మీకు విశ్లేషించడానికి, శోధించడానికి, నివేదికలను రూపొందించడానికి మరియు మీ ప్రాప్యత పరిధిలోని సమాచారాన్ని అన్వేషించడానికి సహాయపడగలను. మీరు ఏమి చేయాలనుకుంటున్నారు?`;
    if (language === "hi") return `नमस्ते। मैं आरटीआईएच इनोवेशन कोपायलट हूं। मैं विश्लेषण, खोज, रिपोर्ट जनरेट करने और आपके एक्सेस स्कोप के भीतर जानकारी खोजने में आपकी मदद कर सकता हूं। आप क्या करना चाहेंगे?`;
    return `Hello. I am the RTIH Innovation Copilot. I can help you analyze, search, summarize, generate reports, create documents, recommend actions, and explore information available within your authorized access scope. What would you like to do?`;
  };

  const getSuggestions = () => {
    const safeRole = role.toLowerCase();
    
    if (safeRole === "manager") {
      if (currentModule === "mentors") return ["How many mentors are active?", "Generate mentor report", "Show mentor workload", "Find available mentors"];
      if (currentModule === "startups") return ["Show high-risk startups", "Generate startup report", "Show funding-ready startups", "Analyze startup health"];
      if (currentModule === "opportunities") return ["Generate opportunity report", "Show pending applications", "Analyze participation"];
      return ["Show startups below health score 60", "Generate domain report", "Show pending certifications", "Analyze mentor workload", "Identify intervention candidates"];
    }
    
    if (safeRole === "mentor") {
      return ["Analyze startup progress", "Generate mentorship report", "Show startups needing attention", "Prepare meeting brief", "Generate action items"];
    }
    
    if (safeRole === "admin") {
      if (currentModule === "dashboard" || currentModule === "") {
         return ["Generate ecosystem report", "Analyze founder drop-off", "Compare domains", "Show statewide risks"];
      }
      return ["Generate statewide report", "Compare domain growth", "Analyze founder drop-off", "Evaluate mentor performance", "Show ecosystem risks"];
    }

    // Default for Organization
    return ["What should I do next?", "Analyze my health score", "Recommend opportunities", "Generate funding readiness report", "Create a learning roadmap"];
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
                <h3 className="font-bold text-white text-sm">RTIH Innovation Copilot</h3>
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
              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="bg-white/5 border border-white/10 text-slate-300 p-3 rounded-2xl rounded-tl-none text-sm leading-relaxed">
                    {getGreeting()}
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-[10px] text-indigo-300 uppercase tracking-wider mb-2 font-semibold">Capabilities</p>
                      <div className="flex flex-wrap gap-1">
                        {["Analyze", "Search", "Generate", "Recommend", "Summarize", "Report"].map(cap => (
                          <span key={cap} className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-slate-400">{cap}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="pl-11 pr-2">
                  <div className="flex flex-col gap-2">
                    {getSuggestions().map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(undefined, suggestion)}
                        className="text-left text-xs bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-200 p-2.5 rounded-xl transition-colors hover:text-white"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
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
                    : "bg-white/5 border border-white/10 text-slate-300 rounded-tl-none prose prose-invert prose-sm"
                }`}>
                  {msg.role === "ai" ? (
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  ) : (
                    msg.content
                  )}
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
