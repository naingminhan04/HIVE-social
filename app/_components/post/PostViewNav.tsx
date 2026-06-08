"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { UserType } from "@/types/user";

const PostViewNav = ({ user }: { user: UserType }) => {
  const router = useRouter();

  return (
    <div className="flex h-14 w-full items-center justify-between bg-white/95 px-3 text-sm font-semibold backdrop-blur dark:bg-neutral-900/95 sm:text-base">
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.back()}
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-black/10 bg-white text-neutral-700 shadow-sm transition hover:bg-neutral-100 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
          aria-label="Go back"
        >
          <ArrowLeft size={18} />
        </button>
        <span className="text-neutral-950 dark:text-neutral-50">{`${user.name}'s Post`}</span>
      </div>
    </div>
  );
};

export default PostViewNav;
