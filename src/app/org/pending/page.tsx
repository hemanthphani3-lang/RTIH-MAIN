export default function PendingApproval() {
  return (
    <div className="min-h-screen relative flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Background Image Setup */}
      <div 
        className="absolute inset-0 z-0 bg-[length:100%_100%] bg-center bg-no-repeat"
        style={{ backgroundImage: 'url("/creation.png")' }}
      ></div>
      
      <div className="absolute inset-0 z-0 bg-black/10"></div>
      
      <div className="relative z-10 w-full max-w-lg text-center space-y-6 bg-white/5 backdrop-blur-md rounded-[2rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] border border-white/20 p-10 text-white">
        <div className="w-24 h-24 bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(255,215,0,0.2)]">
          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">Application Submitted!</h1>
        
        <p className="text-slate-300 leading-relaxed text-[15px]">
          Your startup application has been successfully received by the RTIH Innovation Hub.
          Our team is currently reviewing your details.
        </p>
        
        <div className="bg-black/30 backdrop-blur-sm p-5 rounded-xl border border-white/10 text-sm font-medium text-slate-300 mt-6">
          Your account is currently <strong className="text-[#FFD700]">Pending Approval</strong>. <br/>
          You will be able to log in to the secure Dashboard once an administrator approves your request.
        </div>
        
        <div className="pt-6">
          <a href="/login" className="inline-block w-full px-8 py-3.5 bg-[#FFD700] text-black font-bold rounded-xl hover:bg-[#F2CC00] hover:shadow-[0_0_20px_rgba(255,215,0,0.4)] transition-all">
            Return to Login
          </a>
        </div>
      </div>
    </div>
  );
}
