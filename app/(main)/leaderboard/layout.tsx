import type { Metadata } from "next";
import { createMetadata } from "@/app/seo";

export const metadata: Metadata = createMetadata({
  title: "Leaderboard",
  description:
    "Explore HIVE rankings across points, popularity, engagement, and daily usage in one focused leaderboard view.",
  path: "/leaderboard",
  noIndex: true,
});

const LeaderboardLayout = ({ children }: { children: React.ReactNode }) => children;

export default LeaderboardLayout;
