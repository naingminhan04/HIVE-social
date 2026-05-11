"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";

const OverlayPortal = ({ children }: { children: ReactNode }) => {
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(children, document.body);
};

export default OverlayPortal;
