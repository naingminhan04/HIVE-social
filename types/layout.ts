import type { ReactNode } from "react";

export type MainLayoutProps = {
  children: ReactNode;
};

export type OverlayPortalProps = {
  children: ReactNode;
  container?: "body" | "chat";
};

export type ProviderProps = {
  children: ReactNode;
};
