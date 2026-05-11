"use client";

import { useEffect, useState } from "react";

const PORTAL_BREAKPOINT_QUERY = "(min-width: 768px)";

export const usePortalBarVisible = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(PORTAL_BREAKPOINT_QUERY);
    const syncVisibility = () => setIsVisible(mediaQuery.matches);

    syncVisibility();
    mediaQuery.addEventListener("change", syncVisibility);

    return () => mediaQuery.removeEventListener("change", syncVisibility);
  }, []);

  return isVisible;
};

