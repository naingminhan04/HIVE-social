"use client";

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { MouseEvent, ReactNode } from "react";
import toast from "react-hot-toast";

type HomeRefreshLinkProps = {
  children: ReactNode;
  className?: string;
  onNavigate?: () => void;
};

const scrollHomeFeedToTop = () => {
  if (typeof window === "undefined") return;

  window.scrollTo({ top: 0, behavior: "smooth" });
};

const HomeRefreshLink = ({
  children,
  className,
  onNavigate,
}: HomeRefreshLinkProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    onNavigate?.();
    scrollHomeFeedToTop();

    if (pathname !== "/home") {
      router.push("/home");
      return;
    }

    void toast.promise(
      queryClient.refetchQueries({
        queryKey: ["posts", "all"],
        exact: true,
      }),
      {
        loading: "Refreshing the feed",
        success: "Feed updated!",
        error: "Error refreshing feed",
      },
      {
        id: "feed-refresh",
      },
    );
  };

  return (
    <Link href="/home" className={className} onClick={handleClick}>
      {children}
    </Link>
  );
};

export default HomeRefreshLink;
