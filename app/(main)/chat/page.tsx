import { getChatsAction, getUnreadMessagesCountAction } from "@/app/_actions/chat";
import { ChatClient } from "@/app/_components/ChatClient";
import ChatListSection from "@/app/_components/chat/ChatListSection";
import { ChatNavigationProvider } from "@/app/_components/chat/ChatNavigation";
import ChatPageShell from "@/app/_components/chat/ChatPageShell";
import ChatPanelHeader from "@/app/_components/chat/ChatPanelHeader";
import ChatWorkspaceLayout from "@/app/_components/chat/ChatWorkspaceLayout";
import { visibleChatHasMessage } from "@/utils/chatDisplay";

type ChatPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const ChatPage = async ({ searchParams }: ChatPageProps) => {
  const params = await searchParams;
  const chatIdParam = params.chatId;
  const initialChatId =
    typeof chatIdParam === "string" ? chatIdParam.trim() || null : null;

  const [chatsResult, unreadResult] = await Promise.all([
    getChatsAction(),
    getUnreadMessagesCountAction(),
  ]);

  const initialChats = chatsResult.success
    ? chatsResult.data.chats.filter(visibleChatHasMessage)
    : [];
  const initialUnreadCount = unreadResult.success
    ? unreadResult.data.unreadMessagesCount
    : 0;

  return (
    <ChatNavigationProvider initialChats={initialChats} initialChatId={initialChatId}>
      <ChatPageShell>
        <ChatWorkspaceLayout
          list={
            <ChatListSection
              activeChatId={initialChatId}
              unreadCount={initialUnreadCount}
            />
          }
          panel={
            <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
              <ChatPanelHeader />
              <ChatClient
                initialChats={initialChats}
                initialChatId={initialChatId}
              />
            </div>
          }
        />
      </ChatPageShell>
    </ChatNavigationProvider>
  );
};

export default ChatPage;
