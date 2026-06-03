import { MessagesSquare } from "lucide-react";
import WorkInProgressPlaceholder from "@/app/_components/WorkInProgressPlaceholder";

const Chat = () => {
  return (
    <WorkInProgressPlaceholder
      title="Chat Groups Are On The Way"
      description="Group chat belongs here now. The page is reserved while the backend contract for group lists, messages, and realtime updates is confirmed."
      icon={MessagesSquare}
    />
  );
};

export default Chat;
