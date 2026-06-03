"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, Globe } from "lucide-react";
import { processAIQuery } from "@/lib/actions/ai-copilot";

interface Message {
  role: "user" | "ai";
  content: string;
}

export default function AICopilotWorkspace({ userRole }: { userRole: string }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", content: `Hello! I am your RTIH Innovation Copilot. I am operating in ${userRole} mode. How can I assist you today?` }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState("en"); // 'en' or 'te'
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setInput("");
    setLoading(true);

    const res = await processAIQuery(userMsg, userRole, language);
    
    setMessages(prev => [...prev, { 
      role: "ai", 
      content: res.success && typeof res.data === "string" ? res.data : "I'm sorry, I encountered an error connecting to the AI core." 
    }]);
    setLoading(false);
  };

  return (
    <div className="h-[80vh] flex flex-col bg-[#1e293b] border border-slate-700 rounded-3xl overflow-hidden shadow-2xl relative">
      
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
            <Bot className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="font-extrabold text-white flex items-center gap-2">
              Innovation Copilot <Sparkles className="w-3 h-3 text-yellow-400" />
            </h2>
            <p className="text-xs text-slate-400 capitalize">{userRole} Intelligence Mode</p>
          </div>
        </div>
        
        {/* Multilingual Toggle */}
        <div className="flex items-center gap-2 bg-black/40 border border-slate-700 rounded-xl p-1">
          <Globe className="w-4 h-4 text-slate-400 ml-2" />
          <button 
            onClick={() => setLanguage('en')} 
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${language === 'en' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            EN
          </button>
          <button 
            onClick={() => setLanguage('te')} 
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${language === 'te' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            తెలుగు
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div ref={chatRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-slate-900/50 to-[#0f172a]">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center border ${
              msg.role === 'user' ? 'bg-slate-800 border-slate-700' : 'bg-indigo-900 border-indigo-500/50'
            }`}>
              {msg.role === 'user' ? <User className="w-4 h-4 text-slate-300" /> : <Bot className="w-4 h-4 text-indigo-400" />}
            </div>
            <div className={`max-w-[80%] rounded-2xl p-4 text-sm ${
              msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-sm' 
                : 'bg-white/5 border border-white/10 text-slate-200 rounded-tl-sm'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-4">
            <div className="w-8 h-8 shrink-0 rounded-full bg-indigo-900 border border-indigo-500/50 flex items-center justify-center">
              <Bot className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm p-4 flex gap-1 items-center">
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]" />
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-slate-900 border-t border-slate-800">
        <div className="relative flex items-center">
          <input 
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder={language === 'en' ? "Ask your Innovation Copilot..." : "మీ ఇన్నోవేషన్ కోపైలట్‌ని అడగండి..."}
            className="w-full bg-black/50 border border-slate-700 rounded-xl pl-4 pr-14 py-4 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all"
          />
          <button 
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="absolute right-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white p-2.5 rounded-lg transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-center text-[10px] text-slate-500 mt-2">
          AI Copilot uses context from your specific role and domain. Responses are verified against RTIH guidelines.
        </p>
      </div>

    </div>
  );
}
