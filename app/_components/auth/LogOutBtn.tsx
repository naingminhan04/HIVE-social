'use client'

import { logoutAction } from "@/app/_actions/logout";
import { useAuthStore } from "@/store/auth";
import { useRouter } from "nextjs-toploader/app";
import toast from "react-hot-toast";
import { useState } from "react";

export default function LogOutBtn({ className = "" }: { className?: string }) {
  const clearUser = useAuthStore((state) => state.logOut);
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogOut = async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    try {
      const result = await logoutAction();
      if (result.success) {
        toast.success("Logged out successfully");
        // Navigate to login page first to reduce flashing
        router.replace("/");
        // Clear user after navigation starts
        setTimeout(() => {
          clearUser();
          setIsLoggingOut(false);
        }, 100);
      } else {
        toast.error(result.error || "Logout failed");
        setIsLoggingOut(false);
      }
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("An error occurred during logout");
      setIsLoggingOut(false);
    }
  };

  return (
    <button 
      type="button" 
      onClick={handleLogOut} 
      className={`${className} ${isLoggingOut ? 'opacity-70 cursor-not-allowed' : ''}`}
      disabled={isLoggingOut}
    >
      {isLoggingOut ? 'Logging out...' : 'Log-Out'}
    </button>
  );
}
