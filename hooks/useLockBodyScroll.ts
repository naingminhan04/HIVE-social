// hooks/useLockBodyScroll.ts
import { useEffect } from "react";

export function useLockBodyScroll(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    const scrollY = window.scrollY;
    const portalScrollContainer = document.getElementById(
      "portal-scroll-container",
    );
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    const originalStyles = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      paddingRight: document.body.style.paddingRight,
    };
    const originalPortalOverflow = portalScrollContainer?.style.overflow ?? "";

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    if (portalScrollContainer) {
      portalScrollContainer.style.overflow = "hidden";
    }

    // Preserve scrollbar space to avoid layout jump while the overlay is open.
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalStyles.overflow;
      document.body.style.position = originalStyles.position;
      document.body.style.top = originalStyles.top;
      document.body.style.width = originalStyles.width;
      document.body.style.paddingRight = originalStyles.paddingRight;

      if (portalScrollContainer) {
        portalScrollContainer.style.overflow = originalPortalOverflow;
      }

      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}
