import { MessageCircleMore } from "lucide-react";
import WorkInProgressPlaceholder from "@/app/_components/WorkInProgressPlaceholder";

const Chat = () => {
  return (
    <WorkInProgressPlaceholder
      title="Private Chat Is On The Way"
      description="We are still building one-to-one messaging. For now, this page is reserved while the chat experience is being put together."
      icon={MessageCircleMore}
    />
  );
};

export default Chat;
