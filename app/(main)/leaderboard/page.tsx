import { Trophy } from "lucide-react";
import WorkInProgressPlaceholder from "@/app/_components/WorkInProgressPlaceholder";

const LeaderboardPage = () => {
  return (
    <WorkInProgressPlaceholder
      title="Leaderboard Coming Soon"
      description="Rankings and point highlights are still being worked on. This page will surface the leaderboard once that feature is ready."
      icon={Trophy}
    />
  );
};

export default LeaderboardPage;
