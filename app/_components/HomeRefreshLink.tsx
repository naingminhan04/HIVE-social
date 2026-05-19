"use client";

import Link from "next/link";
import { MouseEvent, ReactNode } from "react";

type HomeRefreshLinkProps = {
  children: ReactNode;
  className?: string;
  onNavigate?: () => void;
};

const scrollAllToTop = () => {
  if (typeof window === "undefined") return;

  window.scrollTo({ top: 0, behavior: "auto" });

  document
    .querySelectorAll<HTMLElement>("[data-home-scroll-target='true']")
    .forEach((element) => {
      element.scrollTo({ top: 0, behavior: "auto" });
    });
};

const HomeRefreshLink = ({
  children,
  className,
  onNavigate,
}: HomeRefreshLinkProps) => {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    onNavigate?.();
    scrollAllToTop();
    window.location.assign("/home");
  };

  return (
    <Link href="/home" className={className} onClick={handleClick}>
      {children}
    </Link>
  );
};

export default HomeRefreshLink;
