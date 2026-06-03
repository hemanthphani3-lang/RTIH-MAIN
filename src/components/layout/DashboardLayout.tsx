"use client";

import Sidebar from "./Sidebar";
import { LogOut, Sun, Moon } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to true since original app was dark

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'light') {
        setIsDarkMode(false);
        document.documentElement.classList.remove('dark');
      } else {
        // default or saved dark
        setIsDarkMode(true);
        document.documentElement.classList.add('dark');
      }
    }
  }, []);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen relative overflow-hidden bg-slate-50 dark:bg-[#0b1121] transition-colors duration-300">
      {/* Global Dashboard Background - Only show in dark mode */}
      <div 
        className="fixed inset-0 z-0 bg-[length:100%_100%] bg-center bg-no-repeat hidden dark:block"
        style={{ backgroundImage: 'url("/dashboard.png")' }}
      ></div>
      {/* Mesh/Gradient Overlay for Light Mode */}
      <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100 via-slate-50 to-slate-100 dark:hidden"></div>
      
      {/* Glassmorphic Overlay to ensure dashboard cards remain readable */}
      <div className="fixed inset-0 z-0 bg-slate-100/50 dark:bg-slate-900/10 backdrop-blur-[4px] pointer-events-none transition-colors duration-300"></div>

      <Sidebar />
      
      <div className="flex-1 ml-64 min-h-screen relative z-10 flex flex-col">
        {/* Global Top Header */}
        <header className="h-16 bg-white/70 dark:bg-white/5 backdrop-blur-md border-b border-slate-200 dark:border-white/10 flex items-center justify-end px-8 shrink-0 z-20 transition-colors duration-300">
           <div className="flex items-center gap-4">
             <button onClick={toggleTheme} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white bg-slate-200 dark:bg-black/20 hover:bg-slate-300 dark:hover:bg-black/40 rounded-xl transition-all border border-slate-300 dark:border-white/5 shadow-sm">
               {isDarkMode ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-indigo-600" />} 
               {isDarkMode ? "Light Mode" : "Dark Mode"}
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
