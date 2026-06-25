import type { Metadata } from "next";
import { createMetadata, truncateMetadataText } from "@/app/seo";

type SearchLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ keyword: string }>;
};

const getKeyword = (keyword: string) => {
  try {
    return decodeURIComponent(keyword).trim();
  } catch {
    return keyword.trim();
  }
};

export const generateMetadata = async ({
  params,
}: Omit<SearchLayoutProps, "children">): Promise<Metadata> => {
  const { keyword } = await params;
  const searchTerm = getKeyword(keyword);
  const title = searchTerm ? `Search ${searchTerm}` : "Search";

  return createMetadata({
    title,
    description: truncateMetadataText(
      searchTerm
        ? `Search HIVE for posts and people matching "${searchTerm}" in a fast, focused discovery view.`
        : "Search HIVE for posts, people, conversations, and community activity.",
    ),
    path: `/search/${encodeURIComponent(searchTerm || keyword)}`,
    noIndex: true,
  });
};

const SearchLayout = ({ children }: SearchLayoutProps) => children;

export default SearchLayout;
