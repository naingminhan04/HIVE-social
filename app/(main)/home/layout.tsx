import type { Metadata } from "next";
import { createMetadata } from "@/app/seo";

export const metadata: Metadata = createMetadata({
  title: "Home Feed",
  description:
    "Your HIVE home feed for fresh posts, community updates, reactions, comments, and everyday social discovery.",
  path: "/home",
  noIndex: true,
});

const HomeLayout = ({ children }: { children: React.ReactNode }) => children;

export default HomeLayout;
