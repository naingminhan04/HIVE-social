"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";

const OverlayPortal = ({ children }: { children: ReactNode }) => {
  if (typeof document === "undefined") {
    return null;
  }

  const portalRoot = document.getElementById("chat-overlay-root") ?? document.body;
  return createPortal(children, portalRoot);
};

export default OverlayPortal;
