import ChatPage from "../page";

type ChatSlugPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const ChatSlugPage = async ({ params, searchParams }: ChatSlugPageProps) => {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug).trim();
  const currentSearchParams = await searchParams;
  return ChatPage({
    searchParams: Promise.resolve({
      ...currentSearchParams,
      chatId: decodedSlug || undefined,
    }),
  });
};

export default ChatSlugPage;
