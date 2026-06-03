"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function MyProfileRedirect() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.replace(`/profile/${user.id}`);
      } else {
        router.replace("/login");
      }
    });
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0b1121] flex items-center justify-center">
      <div className="animate-pulse text-[#FFD700] font-bold tracking-widest uppercase">
        Loading your profile...
      </div>
    </div>
  );
}
