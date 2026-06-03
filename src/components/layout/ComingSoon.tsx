import { Construction } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function ComingSoon({ title }: { title: string }) {
  return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center animate-in fade-in duration-500">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-12 rounded-3xl shadow-2xl max-w-lg w-full">
          <div className="w-20 h-20 bg-[#FFD700]/10 border border-[#FFD700]/30 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(255,215,0,0.2)]">
            <Construction className="w-10 h-10 text-[#FFD700]" />
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-3">{title}</h1>
          <p className="text-slate-400">
            This module is currently under construction. It will be fully implemented and activated in the upcoming platform expansion phases.
          </p>
          <button 
            onClick={() => window.history.back()}
            className="mt-8 bg-white/10 text-white font-bold px-6 py-2.5 rounded-xl border border-white/20 hover:bg-white/20 transition-all"
          >
            Go Back
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
