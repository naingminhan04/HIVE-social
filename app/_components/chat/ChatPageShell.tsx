import type { ReactNode } from "react";

type ChatPageShellProps = {
  children: ReactNode;
};

const ChatPageShell = ({ children }: ChatPageShellProps) => {
  return (
    <main className="relative h-[calc(100dvh-60px)] w-full overflow-hidden bg-neutral-100 p-2 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50 lg:h-dvh lg:max-h-dvh">
      <div className="relative flex h-full min-h-0 w-full overflow-hidden rounded-xl bg-white shadow-sm dark:bg-neutral-900">
        <div id="chat-overlay-root" className="absolute inset-0" />
        {children}
      </div>
    </main>
  );
};

export default ChatPageShell;
