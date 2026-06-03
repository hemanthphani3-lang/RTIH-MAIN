import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="h-screen w-screen flex relative bg-slate-100 dark:bg-slate-900 overflow-hidden font-sans">
      {/* Background Image Setup */}
      <div 
        className="absolute inset-0 z-0 bg-[length:100%_100%] bg-center bg-no-repeat"
        style={{ backgroundImage: 'url("/login%20background.png")' }}
      >
      </div>

      <div className="relative z-10 flex flex-col md:flex-row w-full max-w-[1600px] mx-auto items-center justify-between p-8 md:py-16 md:pl-16 md:pr-12">
        
        {/* Left Side: Empty because the background image has all the text and branding baked in */}
        <div className="w-full md:w-1/2">
        </div>

        {/* Right Side: The Functional Login Board */}
        <div className="w-full md:w-5/12 mt-12 md:mt-0 flex justify-end">
          <LoginForm />
        </div>
        
      </div>
    </div>
  );
}
