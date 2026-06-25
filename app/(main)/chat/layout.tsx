import type { Metadata } from "next";
import { createMetadata } from "@/app/seo";

export const metadata: Metadata = createMetadata({
  title: "Messages",
  description:
    "Private, focused HIVE conversations with a clean chat workspace built for staying close to your circle.",
  path: "/chat",
  noIndex: true,
});

const ChatLayout = ({ children }: { children: React.ReactNode }) => children;

export default ChatLayout;
