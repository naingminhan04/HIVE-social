import type { Metadata } from "next";
import { createMetadata } from "@/app/seo";

export const metadata: Metadata = createMetadata({
  title: "Notifications",
  description:
    "Stay current with HIVE activity, mentions, reactions, comments, and the moments that need your attention.",
  path: "/notifications",
  noIndex: true,
});

const NotificationsLayout = ({ children }: { children: React.ReactNode }) => children;

export default NotificationsLayout;
