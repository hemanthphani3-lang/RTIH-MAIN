"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { LayoutDashboard, LogOut, Settings, Building, Users, FileText, Calendar, Map, Target, Link2, Rocket, Zap, Network, MessageSquare, Bell, BarChart2, ShieldCheck, Moon, Sun } from "lucide-react";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

export default function Sidebar() {
  const [role, setRole] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("user_profiles").select("roles(name)").eq("id", user.id).single();
      if (data && data.roles) setRole((data.roles as any).name);

      // Load unread count
      const fetchUnread = async () => {
        const { count } = await supabase
          .from("network_messages")
          .select("id", { count: "exact" })
          .eq("receiver_id", user.id)
          .eq("is_read", false);
        setUnreadCount(count || 0);
      };
      await fetchUnread();

      // Listen for new messages
      const ch = supabase.channel(`sidebar-unread-${Date.now()}-${Math.random()}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "network_messages", filter: `receiver_id=eq.${user.id}` }, () => {
          fetchUnread();
        })
        .subscribe();
      
      // Listen for local immediate read events
      window.addEventListener("messages-read", fetchUnread);
      
      return () => { 
        supabase.removeChannel(ch); 
        window.removeEventListener("messages-read", fetchUnread);
      };
    }
    loadData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const getLinks = () => {
    const base = [
      { name: "My Profile", icon: Users, path: "/profile/me" },
      { name: "Notifications", icon: Bell, path: "/notifications" },
      { name: "Settings", icon: Settings, path: "/settings" }
    ];
    
    if (role === "Admin") return [
      { name: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard" },
      { name: "Executive Intel", icon: BarChart2, path: "/admin/executive" },
      { name: "Governance", icon: ShieldCheck, path: "/admin/governance" },
      { name: "Staff", icon: Users, path: "/admin/staff" },
      { name: "Organizations", icon: Building, path: "/admin/organizations" },
      { name: "Opportunities", icon: Rocket, path: "/admin/opportunities" },
      { name: "Network", icon: Network, path: "/network" },
      { name: "Messages", icon: MessageSquare, path: "/messages" },
      ...base
    ];
    
    if (role === "Manager") return [
      { name: "Dashboard", icon: LayoutDashboard, path: "/manager/dashboard" },
      { name: "Mentors", icon: Users, path: "/manager/mentors" },
      { name: "Startups", icon: Building, path: "/manager/startups" },
      { name: "Assignments", icon: Link2, path: "/manager/assignments" },
      { name: "Opportunities", icon: Rocket, path: "/manager/opportunities" },
      { name: "Hackathon Engine", icon: Zap, path: "/manager/hackathons" },
      { name: "Network", icon: Network, path: "/network" },
      { name: "Messages", icon: MessageSquare, path: "/messages" },
      ...base
    ];
    
    if (role === "Mentor") return [
      { name: "Dashboard", icon: LayoutDashboard, path: "/mentor/dashboard" },
      { name: "Network", icon: Network, path: "/network" },
      { name: "Messages", icon: MessageSquare, path: "/messages" },
      ...base
    ];
    
    if (role === "Organization") return [
      { name: "Dashboard", icon: LayoutDashboard, path: "/org/dashboard" },
      { name: "Roadmap", icon: Map, path: "/org/roadmap" },
      { name: "Milestones", icon: Target, path: "/org/milestones" },
      { name: "Documents", icon: FileText, path: "/org/documents" },
      { name: "Opportunities", icon: Rocket, path: "/org/opportunities" },
      { name: "My Applications", icon: FileText, path: "/org/applications" },
      { name: "Network", icon: Network, path: "/network" },
      { name: "Messages", icon: MessageSquare, path: "/messages" },
      ...base
    ];
    
    return base;
  };

  const links = getLinks();

  return (
    <div className="w-64 h-screen bg-white/80 dark:bg-white/5 backdrop-blur-xl text-slate-900 dark:text-white flex flex-col fixed left-0 top-0 border-r border-slate-200 dark:border-white/10 shadow-xl dark:shadow-2xl z-50 transition-colors duration-300">
      <div className="p-6">
        <h2 className="text-2xl font-extrabold text-indigo-700 dark:text-[#FFD700] tracking-wider flex items-center gap-2 transition-colors duration-300">
          <Building className="w-6 h-6" /> RTIH
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest font-semibold transition-colors duration-300">{role || "Loading..."}</p>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
        {links.map(link => {
          const Icon = link.icon;
          const active = pathname === link.path || (pathname.startsWith(link.path + "/") && link.path.length > 1 && link.path !== "/settings");
          return (
            <Link key={link.name} href={link.path} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium relative ${active ? "bg-indigo-600 dark:bg-[#FFD700] text-white dark:text-black shadow-lg shadow-indigo-600/30 dark:shadow-[0_0_15px_rgba(255,215,0,0.3)]" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-indigo-700 dark:hover:text-white"}`}>
              <div className="relative">
                <Icon className="w-5 h-5" />
                {link.name === "Messages" && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white dark:border-black shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse"></span>
                )}
              </div>
              <span className="flex-1">{link.name}</span>
              {link.name === "Messages" && unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
