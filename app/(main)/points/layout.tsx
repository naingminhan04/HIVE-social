import type { Metadata } from "next";
import { createMetadata } from "@/app/seo";

export const metadata: Metadata = createMetadata({
  title: "Points Center",
  description:
    "Manage your HIVE points, claim daily rewards, review transaction history, transfer points, and look up activity.",
  path: "/points",
  noIndex: true,
});

const PointsLayout = ({ children }: { children: React.ReactNode }) => children;

export default PointsLayout;
