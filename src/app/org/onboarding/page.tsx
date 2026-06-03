"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { registerOrganization, OrganizationFormData } from "@/lib/actions/org";
import { ALL_DOMAINS } from "@/lib/constants";
import { REGISTRATION_EVIDENCE } from "@/lib/milestones-config";
import { Upload, ChevronRight, ChevronLeft, Rocket, CheckCircle, FileText, ShieldCheck } from "lucide-react";

const VENTURE_STAGES = ["Ideation", "Prototype", "MVP", "Validation", "Funding Readiness", "Scale"] as const;
type VentureStage = typeof VENTURE_STAGES[number];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Files
  const [pitchDeck, setPitchDeck] = useState<File | null>(null);
  const [incorpDoc, setIncorpDoc] = useState<File | null>(null);

  // Form Data
  const [formData, setFormData] = useState<OrganizationFormData & { evidenceUrl: string; evidenceNote: string }>({
    fullName: "", email: "", password: "", mobile: "",
    orgName: "", description: "", problemStatement: "", solution: "", website: "",
    stage: "Ideation",
    primaryDomain: ALL_DOMAINS[0],
    secondaryDomains: [],
    evidenceUrl: "",
    evidenceNote: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDomainToggle = (domain: string) => {
    if (domain === formData.primaryDomain) return; // Prevent unselecting primary

    if (formData.secondaryDomains.includes(domain)) {
      setFormData({ ...formData, secondaryDomains: formData.secondaryDomains.filter(d => d !== domain) });
    } else {
      setFormData({ ...formData, secondaryDomains: [...formData.secondaryDomains, domain] });
    }
  };

  const uploadFile = async (file: File, pathPrefix: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${pathPrefix}-${Date.now()}.${fileExt}`;
    const { data, error } = await supabase.storage.from('documents').upload(fileName, file);
    if (error) throw error;
    // Get public URL
    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(fileName);
    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1. Upload documents if any
      let pitchDeckUrl;
      let incorporationUrl;

      if (pitchDeck) pitchDeckUrl = await uploadFile(pitchDeck, 'pitch_deck');
      if (incorpDoc) incorporationUrl = await uploadFile(incorpDoc, 'incorporation');

      // 2. Register Organization
      const submissionData = { ...formData, pitchDeckUrl, incorporationUrl };
      const res = await registerOrganization(submissionData);

      if (res.success) {
        // Sign in the user automatically so they go to dashboard
        if (formData.password) {
          await supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password
          });
        }
        alert("Registration Successful! Welcome to RTIH.");
        router.push("/org/dashboard");
      } else {
        throw new Error(res.error);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => setStep(s => Math.min(4, s + 1));
  const prevStep = () => setStep(s => Math.max(1, s - 1));

  const stageEvidence = REGISTRATION_EVIDENCE[formData.stage as VentureStage] || [];

  return (
    <div className="min-h-screen bg-[#020617] relative flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#020617] to-[#020617] z-0"></div>
      
      <div className="w-full max-w-4xl bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl p-8 md:p-12 z-10 animate-in fade-in zoom-in-95 duration-500 shadow-2xl">
        
        {/* Progress Tracker */}
        <div className="flex items-center justify-between mb-12 relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-white/60 dark:bg-white/10 rounded-full z-0">
            <div className="h-full bg-[#FFD700] rounded-full transition-all duration-500" style={{ width: `${((step - 1) / 3) * 100}%` }}></div>
          </div>
          {[1, 2, 3, 4].map((num) => (
            <div key={num} className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
              step >= num ? "bg-[#FFD700] text-black shadow-[0_0_15px_rgba(255,215,0,0.5)]" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10"
            }`}>
              {step > num ? <CheckCircle className="w-5 h-5" /> : num}
            </div>
          ))}
        </div>

        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center justify-center gap-3">
            <Rocket className="w-8 h-8 text-[#FFD700]" /> Join the RTIH Ecosystem
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Scale your innovation with dedicated mentorship and resources.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={step === 4 ? handleSubmit : (e) => { e.preventDefault(); nextStep(); }}>
          
          {/* STEP 1: Founder Details */}
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 border-b border-slate-200 dark:border-white/10 pb-4">1. Founder Profile</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 block">Full Name *</label>
                  <input required name="fullName" value={formData.fullName} onChange={handleChange}
                    className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white focus:border-[#FFD700]/50 focus:outline-none transition-all" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 block">Mobile Number *</label>
                  <input required name="mobile" value={formData.mobile} onChange={handleChange}
                    className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white focus:border-[#FFD700]/50 focus:outline-none transition-all" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 block">Email Address *</label>
                  <input required type="email" name="email" value={formData.email} onChange={handleChange}
                    className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white focus:border-[#FFD700]/50 focus:outline-none transition-all" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 block">Create Password *</label>
                  <input required type="password" name="password" value={formData.password} onChange={handleChange}
                    className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white focus:border-[#FFD700]/50 focus:outline-none transition-all" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Startup Overview */}
          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 border-b border-slate-200 dark:border-white/10 pb-4">2. Startup Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 block">Startup Name *</label>
                  <input required name="orgName" value={formData.orgName} onChange={handleChange}
                    className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white focus:border-[#FFD700]/50 focus:outline-none transition-all" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 block">Website (Optional)</label>
                  <input name="website" value={formData.website} onChange={handleChange} placeholder="https://"
                    className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white focus:border-[#FFD700]/50 focus:outline-none transition-all" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 block">One-Liner Pitch *</label>
                  <input required name="description" value={formData.description} onChange={handleChange} placeholder="What does your startup do in one sentence?"
                    className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white focus:border-[#FFD700]/50 focus:outline-none transition-all" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 block">Problem Statement *</label>
                  <textarea required name="problemStatement" value={formData.problemStatement} onChange={handleChange} rows={3}
                    className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white focus:border-[#FFD700]/50 focus:outline-none transition-all" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 block">Proposed Solution *</label>
                  <textarea required name="solution" value={formData.solution} onChange={handleChange} rows={3}
                    className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white focus:border-[#FFD700]/50 focus:outline-none transition-all" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Venture Stage & Domain */}
          {step === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 border-b border-slate-200 dark:border-white/10 pb-4">3. Venture Stage &amp; Domain</h2>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 block">
                  Current Venture Stage (Self-Declared) *
                </label>
                <select required name="stage" value={formData.stage} onChange={handleChange}
                  className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white focus:border-[#FFD700]/50 focus:outline-none transition-all appearance-none cursor-pointer">
                  {VENTURE_STAGES.map(s => (
                    <option key={s} className="bg-slate-100 dark:bg-slate-900" value={s}>{s}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-2 italic">
                  "This will be claimed as your starting stage and verified by your assigned Incubation Manager."
                </p>

                {/* Stage Evidence Info Box */}
                {stageEvidence.length > 0 && (
                  <div className="mt-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                    <p className="text-xs font-bold text-yellow-400 uppercase tracking-widest mb-3">
                      Evidence expected for <span className="text-yellow-300">{formData.stage}</span> stage
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {stageEvidence.map((item) => (
                        <span
                          key={item.label}
                          className={`text-xs border px-3 py-1 rounded-full font-medium ${
                            item.required
                              ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-300"
                              : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          {item.label} {item.required && "*"}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 block">Primary Domain *</label>
                <select required name="primaryDomain" value={formData.primaryDomain} onChange={handleChange}
                  className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white focus:border-[#FFD700]/50 focus:outline-none transition-all appearance-none cursor-pointer">
                  {ALL_DOMAINS.map(d => <option key={`p-${d}`} className="bg-slate-100 dark:bg-slate-900" value={d}>{d}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 block">Secondary Domains</label>
                <div className="flex flex-wrap gap-3">
                  {ALL_DOMAINS.map(domain => {
                    if (domain === formData.primaryDomain) return null;
                    const isSelected = formData.secondaryDomains.includes(domain);
                    return (
                      <div key={`s-${domain}`} onClick={() => handleDomainToggle(domain)}
                        className={`px-4 py-2 rounded-xl border text-sm font-medium cursor-pointer transition-all ${
                          isSelected ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300" : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:bg-white/60 dark:bg-white/10"
                        }`}>
                        {domain}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Evidence & Supporting Documents */}
          {step === 4 && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 border-b border-slate-200 dark:border-white/10 pb-4">4. Evidence &amp; Supporting Documents</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 -mt-2">
                Upload supporting evidence for your claimed <span className="text-[#FFD700] font-bold">{formData.stage}</span> stage.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Pitch Deck Upload */}
                <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 border-dashed rounded-2xl p-6 text-center hover:bg-white/60 dark:bg-white/10 transition-all cursor-pointer relative group">
                  <input type="file" accept=".pdf,.ppt,.pptx" onChange={(e) => setPitchDeck(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  <FileText className={`w-10 h-10 mx-auto mb-3 ${pitchDeck ? 'text-[#FFD700]' : 'text-slate-500 group-hover:text-slate-500 dark:text-slate-400'}`} />
                  <h3 className="text-slate-900 dark:text-white font-bold mb-1">{pitchDeck ? pitchDeck.name : "Upload Pitch Deck"}</h3>
                  <p className="text-xs text-slate-500">PDF, PPTX up to 10MB</p>
                  {pitchDeck && <div className="mt-3 text-xs bg-green-500/10 text-green-400 py-1 px-3 rounded-full inline-block">Ready to upload</div>}
                </div>

                {/* Incorporation Upload */}
                <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 border-dashed rounded-2xl p-6 text-center hover:bg-white/60 dark:bg-white/10 transition-all cursor-pointer relative group">
                  <input type="file" accept=".pdf,.jpeg,.jpg,.png" onChange={(e) => setIncorpDoc(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  <Upload className={`w-10 h-10 mx-auto mb-3 ${incorpDoc ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-500 dark:text-slate-400'}`} />
                  <h3 className="text-slate-900 dark:text-white font-bold mb-1">{incorpDoc ? incorpDoc.name : "Incorporation Certificate"}</h3>
                  <p className="text-xs text-slate-500">Optional. PDF, JPG</p>
                  {incorpDoc && <div className="mt-3 text-xs bg-green-500/10 text-green-400 py-1 px-3 rounded-full inline-block">Ready to upload</div>}
                </div>

              </div>

              {/* Product/MVP URL */}
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 block">Product/MVP URL (if applicable)</label>
                <input
                  name="evidenceUrl"
                  value={formData.evidenceUrl}
                  onChange={handleChange}
                  placeholder="https://..."
                  className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white focus:border-[#FFD700]/50 focus:outline-none transition-all"
                />
              </div>

              {/* Progress Notes */}
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 block">Progress Notes</label>
                <textarea
                  name="evidenceNote"
                  value={formData.evidenceNote}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Describe your current progress, what you have built, and any key achievements..."
                  className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white focus:border-[#FFD700]/50 focus:outline-none transition-all"
                />
              </div>

              <div className="bg-[#FFD700]/10 border border-[#FFD700]/20 p-4 rounded-xl flex items-start gap-4 mt-2">
                <ShieldCheck className="w-6 h-6 text-[#FFD700] flex-shrink-0" />
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  By submitting this application, you agree to the Terms of Service. Your startup will enter a verification phase and a Manager will review your details before assigning a Mentor.
                </p>
              </div>

            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-10 pt-6 border-t border-slate-200 dark:border-white/10">
            <button type="button" onClick={prevStep} disabled={step === 1 || loading}
              className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
                step === 1 ? "opacity-0 pointer-events-none" : "bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:bg-white/10"
              }`}>
              <ChevronLeft className="w-4 h-4" /> Back
            </button>

            {step < 4 ? (
              <button type="submit"
                className="bg-[#FFD700] text-black px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:shadow-[0_0_20px_rgba(255,215,0,0.4)] transition-all">
                Next Step <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button type="submit" disabled={loading}
                className="bg-[#FFD700] text-black px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:shadow-[0_0_20px_rgba(255,215,0,0.4)] transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                {loading ? "Submitting Application..." : "Complete Registration"} <CheckCircle className="w-4 h-4" />
              </button>
            )}
          </div>

        </form>
      </div>
    </div>
  );
}
