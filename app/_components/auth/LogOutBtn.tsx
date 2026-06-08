'use client'

import { logoutAction } from "@/app/_actions/logout";
import { useAuthStore } from "@/store/auth";
import { useRouter } from "nextjs-toploader/app";
import toast from "react-hot-toast";

export default function LogOutBtn({ className = "" }: { className?: string }) {
  const clearUser = useAuthStore((state) => state.logOut);
  const router = useRouter();

  const handleLogOut = async () => {
    try {
      const result = await logoutAction();
      if (result.success) {
        clearUser();
        toast.success("Logged out successfully");
        router.replace("/");
      } else {
        toast.error(result.error || "Logout failed");
      }
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("An error occurred during logout");
    }
  };

  return (
    <button type="button" onClick={handleLogOut} className={className}>
      Log-Out
    </button>
  );
}
