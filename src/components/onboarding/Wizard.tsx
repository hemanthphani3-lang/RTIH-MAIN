"use client";

import { useState, useEffect } from "react";
import { registerOrganization } from "@/lib/actions/auth";
import { supabase } from "@/lib/supabase/client";

export default function Wizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [founderInfo, setFounderInfo] = useState({
    fullName: "",
    email: "",
    password: "",
    mobile: "",
    aadhaar: "",
    pan: "",
  });
  
  const [orgInfo, setOrgInfo] = useState({
    name: "",
    description: "",
    problem: "",
    solution: "",
    website: "",
    stage: "Idea Stage",
  });

  const [domainInfo, setDomainInfo] = useState({
    primary: "",
  });

  const [domains, setDomains] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("domains").select("*").then(({ data }) => {
      if (data) setDomains(data);
    });
  }, []);

  const handleNext = () => setCurrentStep((p) => p + 1);
  const handleBack = () => setCurrentStep((p) => p - 1);

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const result = await registerOrganization({
        email: founderInfo.email,
        password: founderInfo.password,
        fullName: founderInfo.fullName,
        mobile: founderInfo.mobile,
        orgName: orgInfo.name,
        orgDescription: orgInfo.description,
        orgProblem: orgInfo.problem,
        orgSolution: orgInfo.solution,
        orgWebsite: orgInfo.website,
        orgStage: orgInfo.stage,
        primaryDomain: domainInfo.primary
      });

      if (!result.success) throw new Error(result.error);

      window.location.href = "/org/pending";
    } catch (err: any) {
      alert("Error: " + err.message);
      setLoading(false);
    }
  };

  const inputClassName = "mt-1.5 block w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50 focus:border-[#FFD700] transition-all";
  const labelClassName = "block text-sm font-semibold text-slate-300";

  return (
    <div className="w-full max-w-3xl mx-auto p-8 md:p-12 bg-white/5 backdrop-blur-md rounded-[2rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] border border-white/20 mt-10 text-white">
      <div className="mb-10 text-center">
        <h2 className="text-4xl font-extrabold tracking-tight text-white mb-2">Organization Onboarding</h2>
        <p className="text-slate-400">Join the RTIH Innovation Ecosystem</p>
        
        <div className="flex items-center justify-center space-x-2 mt-8">
          {[1, 2, 3, 4, 5].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                  currentStep >= step 
                    ? "bg-[#FFD700] text-black shadow-[0_0_20px_rgba(255,215,0,0.4)]" 
                    : "bg-white/10 text-slate-400 border border-white/10"
                }`}
              >
                {currentStep > step ? "✓" : step}
              </div>
              {step < 5 && (
                <div
                  className={`w-12 md:w-20 h-1 rounded-full transition-all duration-300 mx-2 ${
                    currentStep > step ? "bg-[#FFD700]" : "bg-white/10"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="min-h-[360px]">
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <h3 className="text-2xl font-bold text-[#FFD700] mb-6">Founder Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className={labelClassName}>Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ratan Tata"
                  value={founderInfo.fullName}
                  onChange={(e) => setFounderInfo({ ...founderInfo, fullName: e.target.value })}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className={labelClassName}>Mobile Number</label>
                <input
                  type="tel"
                  placeholder="+91 9876543210"
                  value={founderInfo.mobile}
                  onChange={(e) => setFounderInfo({ ...founderInfo, mobile: e.target.value })}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className={labelClassName}>Aadhaar Number</label>
                <input
                  type="text"
                  placeholder="XXXX XXXX XXXX"
                  value={founderInfo.aadhaar}
                  onChange={(e) => setFounderInfo({ ...founderInfo, aadhaar: e.target.value })}
                  className={inputClassName}
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelClassName}>PAN Number</label>
                <input
                  type="text"
                  placeholder="ABCDE1234F"
                  value={founderInfo.pan}
                  onChange={(e) => setFounderInfo({ ...founderInfo, pan: e.target.value })}
                  className={inputClassName}
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <h3 className="text-2xl font-bold text-[#FFD700] mb-6">Organization Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className={labelClassName}>Startup Name</label>
                <input
                  type="text"
                  placeholder="Enter your startup name"
                  value={orgInfo.name}
                  onChange={(e) => setOrgInfo({ ...orgInfo, name: e.target.value })}
                  className={inputClassName}
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelClassName}>Problem Statement</label>
                <textarea
                  rows={3}
                  placeholder="What problem are you solving?"
                  value={orgInfo.problem}
                  onChange={(e) => setOrgInfo({ ...orgInfo, problem: e.target.value })}
                  className={inputClassName}
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelClassName}>Solution</label>
                <textarea
                  rows={3}
                  placeholder="How does your startup solve this problem?"
                  value={orgInfo.solution}
                  onChange={(e) => setOrgInfo({ ...orgInfo, solution: e.target.value })}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className={labelClassName}>Website</label>
                <input
                  type="url"
                  placeholder="https://yourstartup.com"
                  value={orgInfo.website}
                  onChange={(e) => setOrgInfo({ ...orgInfo, website: e.target.value })}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className={labelClassName}>Current Stage</label>
                <select
                  value={orgInfo.stage}
                  onChange={(e) => setOrgInfo({ ...orgInfo, stage: e.target.value })}
                  className={inputClassName}
                >
                  <option className="text-black">Idea Stage</option>
                  <option className="text-black">Validation Stage</option>
                  <option className="text-black">Prototype Stage</option>
                  <option className="text-black">MVP Stage</option>
                  <option className="text-black">Growth Stage</option>
                  <option className="text-black">Funding Stage</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <h3 className="text-2xl font-bold text-[#FFD700] mb-6">Domain Selection</h3>
            <div>
              <label className={labelClassName}>Primary Domain</label>
              <p className="text-sm text-slate-400 mb-4">Select the primary industry domain your startup operates within. This helps us match you with the right mentors.</p>
              <select
                value={domainInfo.primary}
                onChange={(e) => setDomainInfo({ ...domainInfo, primary: e.target.value })}
                className={inputClassName}
              >
                <option value="" className="text-black">Select Domain</option>
                {domains.map((d) => (
                  <option key={d.id} value={d.id} className="text-black">
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <h3 className="text-2xl font-bold text-[#FFD700] mb-6">Document Upload</h3>
            <div className="p-8 border-2 border-dashed border-white/20 rounded-2xl bg-white/5 text-center hover:bg-white/10 transition-colors cursor-pointer">
              <svg className="mx-auto h-12 w-12 text-[#FFD700] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm font-medium text-white mb-1">Click to upload or drag and drop</p>
              <p className="text-xs text-slate-400">PDF, PNG, JPG up to 10MB</p>
              <p className="text-sm text-slate-300 mt-4">Please upload your Pitch Deck or Prototype Screenshots.</p>
            </div>
          </div>
        )}

        {currentStep === 5 && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <h3 className="text-2xl font-bold text-[#FFD700] mb-6">Secure Account Setup</h3>
            <p className="text-sm text-slate-300 mb-6 bg-[#FFD700]/10 p-4 rounded-xl border border-[#FFD700]/20">
              Set up the login credentials for your startup. You will use these to securely log into your dashboard once an Administrator approves your application.
            </p>
            <div className="space-y-5">
              <div>
                <label className={labelClassName}>Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="founder@startup.com"
                  value={founderInfo.email}
                  onChange={(e) => setFounderInfo({ ...founderInfo, email: e.target.value })}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className={labelClassName}>Secure Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={founderInfo.password}
                  onChange={(e) => setFounderInfo({ ...founderInfo, password: e.target.value })}
                  className={inputClassName}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-10 pt-6 border-t border-white/10 flex items-center justify-between">
        {currentStep > 1 ? (
          <button
            onClick={handleBack}
            className="px-8 py-3.5 border border-white/20 rounded-xl text-white font-medium hover:bg-white/10 transition-all"
          >
            Go Back
          </button>
        ) : (
          <div />
        )}
        {currentStep < 5 ? (
          <button
            onClick={handleNext}
            className="px-8 py-3.5 bg-[#FFD700] text-black font-bold rounded-xl hover:bg-[#F2CC00] hover:shadow-[0_0_20px_rgba(255,215,0,0.4)] transition-all flex items-center gap-2"
          >
            Next Step
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading || !founderInfo.email || !founderInfo.password}
            className="px-8 py-3.5 bg-green-500 text-white font-bold rounded-xl hover:bg-green-400 hover:shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? "Submitting..." : "Submit Application"}
            {!loading && (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
