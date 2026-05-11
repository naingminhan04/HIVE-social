import { MessagesSquare } from "lucide-react";
import WorkInProgressPlaceholder from "@/app/_components/WorkInProgressPlaceholder";

const Chatrooms = () => {
  return (
    <WorkInProgressPlaceholder
      title="Chatrooms Are In Progress"
      description="Group conversations are not live yet. This space is being prepared for chatrooms and shared discussions."
      icon={MessagesSquare}
    />
  );
};

export default Chatrooms;
