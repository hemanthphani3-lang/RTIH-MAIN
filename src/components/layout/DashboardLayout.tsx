"use client";

import Sidebar from "./Sidebar";
import { LogOut, Sun, Moon } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isLightMode, setIsLightMode] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'light') {
        setIsLightMode(true);
        document.body.classList.add('light-mode');
      }
    }
  }, []);

  const toggleTheme = () => {
    const newMode = !isLightMode;
    setIsLightMode(newMode);
    if (newMode) {
      document.body.classList.add('light-mode');
      localStorage.setItem('theme', 'light');
    } else {
      document.body.classList.remove('light-mode');
      localStorage.setItem('theme', 'dark');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen relative overflow-hidden">
      {/* Global Dashboard Background */}
      <div 
        className="fixed inset-0 z-0 bg-[length:100%_100%] bg-center bg-no-repeat preserve-colors"
        style={{ backgroundImage: 'url("/dashboard.png")' }}
      ></div>
      {/* Glassmorphic Overlay to ensure dashboard cards remain readable */}
      <div className="fixed inset-0 z-0 bg-slate-900/10 backdrop-blur-[4px] pointer-events-none"></div>

      <Sidebar />
      
      <div className="flex-1 ml-64 min-h-screen relative z-10 flex flex-col">
        {/* Global Top Header */}
        <header className="h-16 bg-white/5 backdrop-blur-md border-b border-white/10 flex items-center justify-end px-8 shrink-0 z-20">
           <div className="flex items-center gap-4">
             <button onClick={toggleTheme} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-300 hover:text-white bg-black/20 hover:bg-black/40 rounded-xl transition-all border border-white/5 shadow-sm preserve-colors">
               {isLightMode ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-yellow-400" />} 
               {isLightMode ? "Dark Mode" : "Light Mode"}
             </button>
             <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500 rounded-xl transition-all border border-red-500/30 shadow-sm">
               <LogOut className="w-4 h-4" /> Sign Out
             </button>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto relative">
          {children}
        </div>
      </div>
    </div>
  );
}
