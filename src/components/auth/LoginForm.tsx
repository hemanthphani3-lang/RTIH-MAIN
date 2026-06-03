"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Lock, Mail, LogIn, ShieldCheck, User, Building, Briefcase, Shield } from "lucide-react";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("Admin");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select(`roles!inner ( name )`)
        .eq("id", data.user.id)
        .single();

      const userRole = (profile as any)?.roles?.name || "Organization";

      // If Organization, check if they are still Pending admin approval
      if (userRole.toLowerCase() === "organization") {
        const { data: verification } = await supabase
          .from("verification_requests")
          .select("status")
          .eq("organization_id", (await supabase.from("organizations").select("id").eq("founder_id", data.user.id).single()).data?.id)
          .single();

        if (verification?.status === "Pending") {
          await supabase.auth.signOut();
          setError("Your startup request is currently pending Admin approval.");
          setLoading(false);
          return;
        }
      }

      const rolePath = userRole.toLowerCase() === "organization" ? "org" : userRole.toLowerCase();
      window.location.href = `/${rolePath}/dashboard`;
    }
  };

  const roles = [
    { id: "Admin", icon: Shield },
    { id: "Manager", icon: Briefcase },
    { id: "Mentor", icon: User },
    { id: "Organization", icon: Building },
  ];

  return (
    <div className="w-full max-w-[480px] bg-[#1a2332]/40 backdrop-blur-xl rounded-[2rem] shadow-2xl p-8 md:p-10 border border-white/20 relative overflow-hidden text-white">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold tracking-tight">Welcome Back!</h2>
        <p className="mt-3 text-[15px] text-slate-300">Please login to your account</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold mb-3">Select Your Role</label>
          <div className="grid grid-cols-4 gap-3">
            {roles.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => setSelectedRole(role.id)}
                className={`relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                  selectedRole === role.id 
                    ? "border-[#FFD700] bg-white/5" 
                    : "border-white/20 bg-transparent hover:bg-white/5"
                }`}
              >
                {selectedRole === role.id && (
                  <div className="absolute -top-2 -right-2 w-5 h-5 bg-[#FFD700] rounded-full flex items-center justify-center text-black">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                <role.icon className={`w-8 h-8 mb-2 ${selectedRole === role.id ? "text-[#FFD700]" : "text-white"}`} />
                <span className="text-xs font-medium">{role.id}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Email / Username</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-slate-300" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="block w-full pl-11 pr-4 py-3.5 border border-white/20 rounded-xl text-sm focus:ring-[#FFD700] focus:border-[#FFD700] bg-[#1a2332]/50 text-white placeholder-slate-400"
              placeholder="Enter your email or username"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Password</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-slate-300" />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="block w-full pl-11 pr-12 py-3.5 border border-white/20 rounded-xl text-sm focus:ring-[#FFD700] focus:border-[#FFD700] bg-[#1a2332]/50 text-white placeholder-slate-400"
              placeholder="Enter your password"
            />
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center cursor-pointer">
              <svg className="h-5 w-5 text-slate-300 hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input 
              id="remember-me" 
              type="checkbox" 
              className="h-4 w-4 text-[#FFD700] focus:ring-[#FFD700] border-white/30 rounded bg-[#1a2332]/50 accent-[#FFD700]" 
              defaultChecked
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm font-medium text-white">Remember me</label>
          </div>
          <div className="text-sm">
            <a href="#" className="font-semibold text-[#FFD700] hover:text-yellow-300">Forgot Password?</a>
          </div>
        </div>

        {error && (
          <div className="text-red-400 text-sm bg-red-900/30 p-3 rounded-lg border border-red-500/30">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent rounded-xl shadow-md text-[16px] font-bold text-black bg-[#FFD700] hover:bg-[#F2CC00] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FFD700] transition-colors disabled:opacity-50 mt-6"
        >
          <LogIn className="w-5 h-5" />
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      <div className="mt-8 flex items-center justify-center gap-4">
        <div className="h-px bg-white/20 flex-1" />
        <span className="text-sm font-medium text-slate-300">or</span>
        <div className="h-px bg-white/20 flex-1" />
      </div>

      <div className="mt-6 text-center space-y-4">
        {selectedRole === "Organization" && (
          <p className="text-[14px] text-slate-300">
            Don't have an account?{" "}
            <a href="/register" className="font-semibold text-[#FFD700] hover:text-yellow-300 transition-colors">
              Sign up
            </a>
          </p>
        )}
        
        <p className="text-[13px] text-slate-300 flex items-center justify-center gap-1.5 font-medium">
          <ShieldCheck className="w-4 h-4 text-[#FFD700]" /> Secure Login - RTIH Portal
        </p>
      </div>
    </div>
  );
}
