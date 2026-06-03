"use client";

import Sidebar from "./Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen relative overflow-hidden">
      {/* Global Dashboard Background */}
      <div 
        className="fixed inset-0 z-0 bg-[length:100%_100%] bg-center bg-no-repeat"
        style={{ backgroundImage: 'url("/dashboard.png")' }}
      ></div>
      {/* Glassmorphic Overlay to ensure dashboard cards remain readable */}
      <div className="fixed inset-0 z-0 bg-slate-900/10 backdrop-blur-[4px] pointer-events-none"></div>

      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen relative z-10 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
