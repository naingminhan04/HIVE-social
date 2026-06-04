import { Suspense } from "react";
import ChatClient from "@/app/_components/ChatClient";

const Chat = () => {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100dvh-60px)] items-center justify-center bg-white text-sm text-neutral-400 dark:bg-neutral-950 lg:min-h-dvh">
          Loading chat...
        </div>
      }
    >
      <ChatClient />
    </Suspense>
  );
};

export default Chat;
