import type { Metadata } from "./post";

export type LeaderboardUser = {
  id: string;
  name: string;
  username: string;
  profilePic: string | null;
  role?: "USER" | "ADMIN" | "SUPER_ADMIN";
};

export type PointsLeaderboardUser = LeaderboardUser & {
  points: number;
  rank: number;
};

export type PointsLeaderboardResponse = {
  users: PointsLeaderboardUser[];
  me: PointsLeaderboardUser;
};

export type PopularLeaderboardUser = LeaderboardUser & {
  score: number;
  postLikes: number;
  profileViews: number;
  postViews: number;
  postsCount: number;
};

export type PopularLeaderboardResponse = {
  users: PopularLeaderboardUser[];
};

export type UsageLeaderboardSummary = {
  totalUsageTimeMs: number;
  totalUsageTimeText: string;
  totalAppOpenTimes?: number;
  completedSessions?: number;
  activeSessions?: number;
};

export type UsageLeaderboardUser = {
  date: string;
  rank: number;
  user: LeaderboardUser;
  summary: UsageLeaderboardSummary;
};

export type UsageLeaderboardResponse = {
  date: string;
  metadata: Metadata & {
    total?: number;
  };
  users: UsageLeaderboardUser[];
};
