"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function RegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // 1. Sign up user
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // 2. Fetch 'Organization' role ID
      const { data: roleData, error: roleError } = await supabase
        .from("roles")
        .select("id")
        .eq("name", "Organization")
        .single();

      if (roleError) {
        console.error("Role fetch error:", roleError);
      }

      // 3. Create user profile
      const { error: profileError } = await supabase
        .from("user_profiles")
        .insert({
          id: data.user.id,
          role_id: roleData?.id,
          full_name: fullName,
          email: email,
        });

      if (profileError) {
        setError("Failed to create profile: " + profileError.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
      // Redirect to onboarding wizard after a short delay
      setTimeout(() => {
        window.location.href = "/org/onboarding";
      }, 1500);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-md p-8 text-center bg-white/80 backdrop-blur-md rounded-2xl shadow-xl">
        <h3 className="text-2xl font-bold text-green-600 mb-2">Registration Successful!</h3>
        <p className="text-gray-600">Redirecting to the Organization Onboarding Wizard...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-white/70 backdrop-blur-md rounded-2xl shadow-xl border border-white/20">
      <div className="text-center">
        <h2 className="text-3xl font-extrabold text-gray-900">Create an Account</h2>
        <p className="mt-2 text-sm text-gray-500">Register your Organization to get started</p>
      </div>

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Full Name (Founder)</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white bg-opacity-50"
            placeholder="John Doe"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Email address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white bg-opacity-50"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white bg-opacity-50"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-2 rounded-md border border-red-100">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
        >
          {loading ? "Creating Account..." : "Register Organization"}
        </button>

        <div className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <a href="/login" className="font-medium text-blue-600 hover:text-blue-500">
            Sign in
          </a>
        </div>
      </form>
    </div>
  );
}
