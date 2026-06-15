"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";

type OverlayPortalProps = {
  children: ReactNode;
  /** Use the chat page overlay only for in-column floating controls (e.g. compose FAB). */
  container?: "body" | "chat";
};

const OverlayPortal = ({ children, container = "body" }: OverlayPortalProps) => {
  if (typeof document === "undefined") {
    return null;
  }

  const portalRoot =
    container === "chat"
      ? document.getElementById("chat-overlay-root") ?? document.body
      : document.body;

  return createPortal(children, portalRoot);
};

export default OverlayPortal;
